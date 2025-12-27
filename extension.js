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
    backgroundColor: 'statusBarItem.warningBackground',
    foregroundColor: 'statusBarItem.warningForeground',
  },
  {
    name: 'Tier3',
    types: ['uncommitted'],
    backgroundColor: 'statusBarItem.warningBackground',
    foregroundColor: 'statusBarItem.warningForeground',
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

const COLOR_DEFAULTS = {
  'statusBarItem.warningBackground': '#d9822b',
  'statusBarItem.warningForeground': '#ffffff',
};

const WARNING_COLOR_BY_TIER = {
  Tier2: {
    background: '#d9822b',
    foreground: '#ffffff',
  },
  Tier3: {
    background: '#f2c94c',
    foreground: '#000000',
  },
};
let lastWarningColorKey = null;

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

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

function getSettingsHtml() {
  const nonce = getNonce();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Git Dirty Alert Settings</title>
  <style>
    body { font-family: sans-serif; padding: 16px; }
    fieldset { margin: 12px 0; padding: 12px; }
    legend { font-weight: 600; }
    label { display: block; margin: 6px 0; }
    .row { display: flex; gap: 16px; flex-wrap: wrap; }
    .row > div { min-width: 220px; }
    .actions { margin-top: 16px; }
    .error { color: #c00; margin-top: 8px; }
    input[type="number"] { width: 80px; }
  </style>
</head>
<body>
  <h2>Git Dirty Alert Settings</h2>
  <div class="row">
    <div>
      <label>Polling seconds <input id="pollingSeconds" type="number" min="10"></label>
      <label><input id="includeUntracked" type="checkbox"> Include untracked</label>
      <label><input id="applyColorCustomizations" type="checkbox"> Apply color customizations</label>
      <label><input id="debug" type="checkbox"> Debug output</label>
    </div>
  </div>

  <fieldset>
    <legend>Tier 1</legend>
    <label><input type="checkbox" data-tier="tier1" data-type="ahead"> ahead</label>
    <label><input type="checkbox" data-tier="tier1" data-type="behind"> behind</label>
    <label><input type="checkbox" data-tier="tier1" data-type="uncommitted"> uncommitted</label>
    <label>Background <input type="text" id="tier1Bg"></label>
    <label>Foreground <input type="text" id="tier1Fg"></label>
  </fieldset>

  <fieldset>
    <legend>Tier 2</legend>
    <label><input type="checkbox" data-tier="tier2" data-type="ahead"> ahead</label>
    <label><input type="checkbox" data-tier="tier2" data-type="behind"> behind</label>
    <label><input type="checkbox" data-tier="tier2" data-type="uncommitted"> uncommitted</label>
    <label>Background <input type="text" id="tier2Bg"></label>
    <label>Foreground <input type="text" id="tier2Fg"></label>
  </fieldset>

  <fieldset>
    <legend>Tier 3</legend>
    <label><input type="checkbox" data-tier="tier3" data-type="ahead"> ahead</label>
    <label><input type="checkbox" data-tier="tier3" data-type="behind"> behind</label>
    <label><input type="checkbox" data-tier="tier3" data-type="uncommitted"> uncommitted</label>
    <label>Background <input type="text" id="tier3Bg"></label>
    <label>Foreground <input type="text" id="tier3Fg"></label>
  </fieldset>

  <div class="actions">
    <button id="save">Save</button>
    <div class="error" id="error"></div>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const error = document.getElementById('error');
    const tierTypeBoxes = document.querySelectorAll('input[data-tier][data-type]');

    function setTierTypes(tier, types) {
      tierTypeBoxes.forEach((box) => {
        if (box.dataset.tier === tier) {
          box.checked = types.includes(box.dataset.type);
        }
      });
    }

    function getTierTypes(tier) {
      const types = [];
      tierTypeBoxes.forEach((box) => {
        if (box.dataset.tier === tier && box.checked) {
          types.push(box.dataset.type);
        }
      });
      return types;
    }

    function loadConfig(cfg) {
      document.getElementById('pollingSeconds').value = cfg.pollingSeconds;
      document.getElementById('includeUntracked').checked = cfg.includeUntracked;
      document.getElementById('applyColorCustomizations').checked = cfg.applyColorCustomizations;
      document.getElementById('debug').checked = cfg.debug;

      setTierTypes('tier1', cfg.tiers.tier1.types);
      setTierTypes('tier2', cfg.tiers.tier2.types);
      setTierTypes('tier3', cfg.tiers.tier3.types);

      document.getElementById('tier1Bg').value = cfg.tiers.tier1.backgroundColor || '';
      document.getElementById('tier1Fg').value = cfg.tiers.tier1.foregroundColor || '';
      document.getElementById('tier2Bg').value = cfg.tiers.tier2.backgroundColor || '';
      document.getElementById('tier2Fg').value = cfg.tiers.tier2.foregroundColor || '';
      document.getElementById('tier3Bg').value = cfg.tiers.tier3.backgroundColor || '';
      document.getElementById('tier3Fg').value = cfg.tiers.tier3.foregroundColor || '';
    }

    document.getElementById('save').addEventListener('click', () => {
      error.textContent = '';
      const tiers = {
        tier1: {
          types: getTierTypes('tier1'),
          backgroundColor: document.getElementById('tier1Bg').value.trim(),
          foregroundColor: document.getElementById('tier1Fg').value.trim()
        },
        tier2: {
          types: getTierTypes('tier2'),
          backgroundColor: document.getElementById('tier2Bg').value.trim(),
          foregroundColor: document.getElementById('tier2Fg').value.trim()
        },
        tier3: {
          types: getTierTypes('tier3'),
          backgroundColor: document.getElementById('tier3Bg').value.trim(),
          foregroundColor: document.getElementById('tier3Fg').value.trim()
        }
      };

      const total = tiers.tier1.types.length + tiers.tier2.types.length + tiers.tier3.types.length;
      if (total === 0) {
        error.textContent = 'At least one alert type must be selected.';
        return;
      }

      vscode.postMessage({
        type: 'save',
        config: {
          pollingSeconds: Number(document.getElementById('pollingSeconds').value),
          includeUntracked: document.getElementById('includeUntracked').checked,
          applyColorCustomizations: document.getElementById('applyColorCustomizations').checked,
          debug: document.getElementById('debug').checked,
          tiers
        }
      });
    });

    window.addEventListener('message', (event) => {
      const message = event.data;
      if (message.type === 'init') {
        loadConfig(message.config);
      }
      if (message.type === 'error') {
        error.textContent = message.message;
      }
    });
  </script>
</body>
</html>`;
}

async function getCurrentSettings() {
  const config = vscode.workspace.getConfiguration('gitDirtyAlert');
  return {
    pollingSeconds: Number(config.get('pollingSeconds', 30)) || 30,
    includeUntracked: config.get('includeUntracked', true),
    applyColorCustomizations: config.get('applyColorCustomizations', true),
    debug: config.get('debug', false),
    tiers: config.get('tiers', DEFAULT_TIERS.reduce((acc, tier, index) => {
      acc[`tier${index + 1}`] = {
        types: tier.types.slice(),
        backgroundColor: tier.backgroundColor,
        foregroundColor: tier.foregroundColor,
      };
      return acc;
    }, {})),
  };
}

async function applySettings(config) {
  const settings = vscode.workspace.getConfiguration('gitDirtyAlert');
  await settings.update('pollingSeconds', config.pollingSeconds, vscode.ConfigurationTarget.Global);
  await settings.update('includeUntracked', config.includeUntracked, vscode.ConfigurationTarget.Global);
  await settings.update('applyColorCustomizations', config.applyColorCustomizations, vscode.ConfigurationTarget.Global);
  await settings.update('debug', config.debug, vscode.ConfigurationTarget.Global);
  await settings.update('tiers', config.tiers, vscode.ConfigurationTarget.Global);
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
    if (debug) {
      logDebug(
        `tier selected: ${tier.name} (bg: ${tier.backgroundColor || 'none'}, fg: ${tier.foregroundColor || 'none'})`
      );
    }
    await ensureWarningColorsForTier(tier.name, debug);
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

async function applyColorCustomizations() {
  const config = vscode.workspace.getConfiguration('gitDirtyAlert');
  const enable = config.get('applyColorCustomizations', true);
  const debug = config.get('debug', false);
  if (!enable) {
    return;
  }

  const workbenchConfig = vscode.workspace.getConfiguration('workbench');
  const current = workbenchConfig.get('colorCustomizations') || {};
  let updated = false;
  const next = { ...current };

  for (const [key, value] of Object.entries(COLOR_DEFAULTS)) {
    if (next[key] === undefined) {
      next[key] = value;
      updated = true;
    }
  }

  if (updated) {
    await workbenchConfig.update('colorCustomizations', next, vscode.ConfigurationTarget.Global);
    if (debug) {
      logDebug('Applied workbench.colorCustomizations for tier colors.');
    }
  } else if (debug) {
    logDebug('Workbench colorCustomizations already set for tier colors.');
  }
}

async function ensureWarningColorsForTier(tierName, debug) {
  const desired = WARNING_COLOR_BY_TIER[tierName];
  if (!desired) {
    return;
  }
  if (lastWarningColorKey === tierName) {
    return;
  }

  const config = vscode.workspace.getConfiguration('gitDirtyAlert');
  const enable = config.get('applyColorCustomizations', true);
  if (!enable) {
    return;
  }

  const workbenchConfig = vscode.workspace.getConfiguration('workbench');
  const current = workbenchConfig.get('colorCustomizations') || {};
  const next = { ...current };
  let updated = false;

  if (next['statusBarItem.warningBackground'] !== desired.background) {
    next['statusBarItem.warningBackground'] = desired.background;
    updated = true;
  }
  if (next['statusBarItem.warningForeground'] !== desired.foreground) {
    next['statusBarItem.warningForeground'] = desired.foreground;
    updated = true;
  }

  if (updated) {
    await workbenchConfig.update('colorCustomizations', next, vscode.ConfigurationTarget.Global);
    if (debug) {
      logDebug(`Updated warning colors for ${tierName}.`);
    }
  }
  lastWarningColorKey = tierName;
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
  context.subscriptions.push(vscode.commands.registerCommand('gitDirtyAlert.openSettings', async () => {
    const panel = vscode.window.createWebviewPanel(
      'gitDirtyAlertSettings',
      'Git Dirty Alert Settings',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );
    panel.webview.html = getSettingsHtml();
    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'save') {
        try {
          await applySettings(message.config);
          await applyColorCustomizations();
          refreshStatus();
        } catch (err) {
          panel.webview.postMessage({ type: 'error', message: String(err) });
        }
      }
    });
    const current = await getCurrentSettings();
    panel.webview.postMessage({ type: 'init', config: current });
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

  applyColorCustomizations().finally(() => {
    startPolling();
    refreshStatus();
  });
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
