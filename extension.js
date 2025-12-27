const vscode = require('vscode');
const cp = require('child_process');

let statusItem = null;
let intervalId = null;
let output = null;

const ALERT_TYPES = new Set(['ahead', 'behind', 'uncommitted']);
const DEFAULT_TIERS = [
  {
    name: 'Tier1',
    types: ['ahead'],
    backgroundColor: 'statusBarItem.errorBackground',
    foregroundColor: 'statusBarItem.errorForeground',
  },
  {
    name: 'Tier2',
    types: ['behind'],
    backgroundColor: 'gitDirtyAlert.tier2Background',
    foregroundColor: 'gitDirtyAlert.tier2Foreground',
  },
  {
    name: 'Tier3',
    types: ['uncommitted'],
    backgroundColor: 'gitDirtyAlert.tier3Background',
    foregroundColor: 'gitDirtyAlert.tier3Foreground',
  },
];

const LEGACY_DEFAULTS = {
  tier1: {
    types: ['ahead'],
    backgroundColor: 'statusBarItem.errorBackground',
    foregroundColor: 'statusBarItem.errorForeground',
  },
  tier2: {
    types: ['behind'],
    backgroundColor: 'statusBarItem.warningBackground',
    foregroundColor: 'statusBarItem.warningForeground',
  },
  tier3: {
    types: ['uncommitted'],
    backgroundColor: 'statusBarItem.prominentBackground',
    foregroundColor: 'statusBarItem.prominentForeground',
  },
};

function logDebug(msg) {
  if (!output) {
    return;
  }
  const time = new Date().toISOString();
  output.appendLine(`[${time}] ${msg}`);
}

function execGit(args, cwd) {
  return new Promise((resolve) => {
    cp.execFile('git', args, { cwd }, (err, stdout, stderr) => {
      if (err) {
        resolve({ ok: false, out: String(stdout || '') + String(stderr || ''), err });
        return;
      }
      resolve({ ok: true, out: String(stdout || '') + String(stderr || ''), err: null });
    });
  });
}

async function getDirtyCountForFolder(folderPath, includeUntracked, debug) {
  const args = ['status', '--porcelain'];
  if (!includeUntracked) {
    args.push('--untracked-files=no');
  }

  const res = await execGit(args, folderPath);
  if (!res.ok) {
    if (debug) {
      logDebug(`git status failed in ${folderPath}: ${res.out}`);
    }
    return 0;
  }

  const lines = res.out.split(/\r?\n/).filter(Boolean);
  if (debug) {
    logDebug(`git status in ${folderPath}: ${lines.length} changes`);
  }
  return lines.length;
}

function parseAheadBehind(summaryLine) {
  const aheadMatch = summaryLine.match(/ahead (\d+)/);
  const behindMatch = summaryLine.match(/behind (\d+)/);
  return {
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
  };
}

async function getAheadBehindForFolder(folderPath, debug) {
  const res = await execGit(['status', '-sb'], folderPath);
  if (!res.ok) {
    if (debug) {
      logDebug(`git status -sb failed in ${folderPath}: ${res.out}`);
    }
    return { ahead: 0, behind: 0 };
  }

  const line = res.out.split(/\r?\n/).find((l) => l.startsWith('## ')) || '';
  const parsed = parseAheadBehind(line);
  if (debug) {
    logDebug(`git status -sb in ${folderPath}: ahead ${parsed.ahead}, behind ${parsed.behind}`);
  }
  return parsed;
}

function normalizeTier(raw, fallback) {
  const hasRawTypes = raw && Object.prototype.hasOwnProperty.call(raw, 'types');
  const types = Array.isArray(raw?.types) ? raw.types.filter((t) => ALERT_TYPES.has(t)) : [];
  return {
    name: fallback.name,
    types: hasRawTypes ? types : fallback.types.slice(),
    backgroundColor: typeof raw?.backgroundColor === 'string' ? raw.backgroundColor : fallback.backgroundColor,
    foregroundColor: typeof raw?.foregroundColor === 'string' ? raw.foregroundColor : fallback.foregroundColor,
  };
}

function loadTiers(config) {
  const raw = config.get('tiers', {});
  const looksLegacy =
    Array.isArray(raw?.tier1?.types) &&
    Array.isArray(raw?.tier2?.types) &&
    Array.isArray(raw?.tier3?.types) &&
    raw.tier1.types.join(',') === LEGACY_DEFAULTS.tier1.types.join(',') &&
    raw.tier2.types.join(',') === LEGACY_DEFAULTS.tier2.types.join(',') &&
    raw.tier3.types.join(',') === LEGACY_DEFAULTS.tier3.types.join(',') &&
    raw.tier1.backgroundColor === LEGACY_DEFAULTS.tier1.backgroundColor &&
    raw.tier1.foregroundColor === LEGACY_DEFAULTS.tier1.foregroundColor &&
    raw.tier2.backgroundColor === LEGACY_DEFAULTS.tier2.backgroundColor &&
    raw.tier2.foregroundColor === LEGACY_DEFAULTS.tier2.foregroundColor &&
    raw.tier3.backgroundColor === LEGACY_DEFAULTS.tier3.backgroundColor &&
    raw.tier3.foregroundColor === LEGACY_DEFAULTS.tier3.foregroundColor;
  const source = looksLegacy ? {} : raw;
  const tiers = [
    normalizeTier(source?.tier1, DEFAULT_TIERS[0]),
    normalizeTier(source?.tier2, DEFAULT_TIERS[1]),
    normalizeTier(source?.tier3, DEFAULT_TIERS[2]),
  ];

  const anySelected = tiers.some((tier) => tier.types.some((t) => ALERT_TYPES.has(t)));
  if (!anySelected) {
    return DEFAULT_TIERS.map((tier) => ({ ...tier, types: tier.types.slice() }));
  }
  return tiers;
}

function pickTier(tiers, totals) {
  for (const tier of tiers) {
    const triggered = tier.types.some((t) => totals[t] > 0);
    if (triggered) {
      return tier;
    }
  }
  return null;
}

async function refreshStatus() {
  if (!statusItem) {
    return;
  }

  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length === 0) {
    statusItem.hide();
    return;
  }

  const config = vscode.workspace.getConfiguration('gitDirtyAlert');
  const includeUntracked = config.get('includeUntracked', true);
  const debug = config.get('debug', false);
  const tiers = loadTiers(config);

  if (debug && output) {
    output.show(true);
  }

  let totalUncommitted = 0;
  let totalAhead = 0;
  let totalBehind = 0;
  const perRepo = [];
  for (const folder of folders) {
    const count = await getDirtyCountForFolder(folder.uri.fsPath, includeUntracked, debug);
    const ab = await getAheadBehindForFolder(folder.uri.fsPath, debug);
    totalUncommitted += count;
    totalAhead += ab.ahead;
    totalBehind += ab.behind;
    perRepo.push({
      name: folder.name,
      path: folder.uri.fsPath,
      uncommitted: count,
      ahead: ab.ahead,
      behind: ab.behind,
    });
  }

  const totals = {
    ahead: totalAhead,
    behind: totalBehind,
    uncommitted: totalUncommitted,
  };
  const tier = pickTier(tiers, totals);

  if (tier) {
    statusItem.text = `$(git-commit) A:${totalAhead} B:${totalBehind} U:${totalUncommitted}`;
    const lines = perRepo.map(
      (r) => `${r.name}: ahead ${r.ahead}, behind ${r.behind}, uncommitted ${r.uncommitted}`
    );
    statusItem.tooltip = `ahead: ${totalAhead}, behind: ${totalBehind}, uncommitted: ${totalUncommitted}\n` + lines.join('\n');
    statusItem.backgroundColor = tier.backgroundColor ? new vscode.ThemeColor(tier.backgroundColor) : undefined;
    statusItem.color = tier.foregroundColor ? new vscode.ThemeColor(tier.foregroundColor) : undefined;
    statusItem.show();
  } else {
    statusItem.hide();
  }
}

function startPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }

  const config = vscode.workspace.getConfiguration('gitDirtyAlert');
  const seconds = Math.max(10, Number(config.get('pollingSeconds', 30)) || 30);
  intervalId = setInterval(refreshStatus, seconds * 1000);
}

function activate(context) {
  output = vscode.window.createOutputChannel('Git Dirty Alert');
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.command = 'gitDirtyAlert.openScm';

  context.subscriptions.push(output);
  context.subscriptions.push(statusItem);
  context.subscriptions.push(vscode.commands.registerCommand('gitDirtyAlert.openScm', () => {
    vscode.commands.executeCommand('workbench.view.scm');
  }));

  context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(refreshStatus));
  context.subscriptions.push(vscode.workspace.onDidCreateFiles(refreshStatus));
  context.subscriptions.push(vscode.workspace.onDidDeleteFiles(refreshStatus));
  context.subscriptions.push(vscode.workspace.onDidRenameFiles(refreshStatus));
  context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(refreshStatus));
  context.subscriptions.push(vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration('gitDirtyAlert')) {
      startPolling();
      refreshStatus();
    }
  }));

  startPolling();
  refreshStatus();
}

function deactivate() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (statusItem) {
    statusItem.dispose();
    statusItem = null;
  }
  if (output) {
    output.dispose();
    output = null;
  }
}

module.exports = {
  activate,
  deactivate,
};
