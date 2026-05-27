const vscode = require('vscode');
const cp = require('child_process');

let statusItem = null;
let intervalId = null;
let output = null;
let refreshInProgress = false;
let refreshQueued = false;
let watchIntervalId = null;
let watchUntil = 0;
let cooldownUntil = 0;
let cooldownHitCount = 0;

const PRODUCT_NAME = 'Git Simple Alert';
const CONFIG_SECTION = 'gitSimpleAlert';
const STATUS_ICON = '$(sync-ignored)';
const FETCH_TIMEOUT_MS = 30000;
const ALERT_TYPES = new Set(['ahead', 'behind', 'uncommitted']);
const DEFAULT_TIERS = [
  {
    name: 'Tier1',
    types: ['ahead', 'uncommitted'],
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
    types: [],
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
const fetchStateByFolder = new Map();

function logDebug(msg) {
  if (!output) {
    return;
  }
  const time = new Date().toISOString();
  output.appendLine(`[${time}] ${msg}`);
}

function execGit(args, cwd, timeoutMs = FETCH_TIMEOUT_MS) {
  return new Promise((resolve) => {
    let settled = false;
    let timer = null;
    const child = cp.execFile('git', args, { cwd }, (err, stdout, stderr) => {
      if (settled) {
        return;
      }
      settled = true;
      if (timer) {
        clearTimeout(timer);
      }
      if (err) {
        resolve({ ok: false, out: String(stdout || '') + String(stderr || ''), err });
        return;
      }
      resolve({ ok: true, out: String(stdout || '') + String(stderr || ''), err: null });
    });
    timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      resolve({ ok: false, out: `git ${args.join(' ')} timed out after ${timeoutMs}ms`, err: new Error('timeout') });
    }, timeoutMs);
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
  <title>Git Simple Alert Settings</title>
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
  <h2>Git Simple Alert Settings</h2>
  <div class="row">
    <div>
      <label>Polling seconds <input id="pollingSeconds" type="number" min="10"></label>
      <label>Fetch interval seconds <input id="fetchIntervalSeconds" type="number" min="15"></label>
      <label>Watch duration seconds <input id="watchDurationSeconds" type="number" min="15"></label>
      <label>Watch fetch interval seconds <input id="watchFetchIntervalSeconds" type="number" min="5"></label>
      <label>Watch cooldown seconds <input id="watchCooldownSeconds" type="number" min="5"></label>
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
      document.getElementById('fetchIntervalSeconds').value = cfg.fetchIntervalSeconds;
      document.getElementById('watchDurationSeconds').value = cfg.watchDurationSeconds;
      document.getElementById('watchFetchIntervalSeconds').value = cfg.watchFetchIntervalSeconds;
      document.getElementById('watchCooldownSeconds').value = cfg.watchCooldownSeconds;
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
          fetchIntervalSeconds: Number(document.getElementById('fetchIntervalSeconds').value),
          watchDurationSeconds: Number(document.getElementById('watchDurationSeconds').value),
          watchFetchIntervalSeconds: Number(document.getElementById('watchFetchIntervalSeconds').value),
          watchCooldownSeconds: Number(document.getElementById('watchCooldownSeconds').value),
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
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  return {
    pollingSeconds: Math.max(10, Number(config.get('pollingSeconds', 30)) || 30),
    fetchIntervalSeconds: Math.max(15, Number(config.get('fetchIntervalSeconds', 60)) || 60),
    watchDurationSeconds: Math.max(15, Number(config.get('watchDurationSeconds', 60)) || 60),
    watchFetchIntervalSeconds: Math.max(5, Number(config.get('watchFetchIntervalSeconds', 10)) || 10),
    watchCooldownSeconds: Math.max(5, Number(config.get('watchCooldownSeconds', 15)) || 15),
    includeUntracked: config.get('includeUntracked', false),
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
  const settings = vscode.workspace.getConfiguration(CONFIG_SECTION);
  await settings.update('pollingSeconds', config.pollingSeconds, vscode.ConfigurationTarget.Global);
  await settings.update('fetchIntervalSeconds', config.fetchIntervalSeconds, vscode.ConfigurationTarget.Global);
  await settings.update('watchDurationSeconds', config.watchDurationSeconds, vscode.ConfigurationTarget.Global);
  await settings.update('watchFetchIntervalSeconds', config.watchFetchIntervalSeconds, vscode.ConfigurationTarget.Global);
  await settings.update('watchCooldownSeconds', config.watchCooldownSeconds, vscode.ConfigurationTarget.Global);
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

function getFetchState(folderPath) {
  if (!fetchStateByFolder.has(folderPath)) {
    fetchStateByFolder.set(folderPath, { lastFetchAt: 0, inProgress: false });
  }
  return fetchStateByFolder.get(folderPath);
}

async function fetchForFolder(folderPath, debug, reason) {
  const state = getFetchState(folderPath);
  if (state.inProgress) {
    if (debug) {
      logDebug(`git fetch skipped in ${folderPath}: already in progress`);
    }
    return false;
  }

  state.inProgress = true;
  try {
    const res = await execGit(['fetch', '--no-tags', '--quiet'], folderPath);
    state.lastFetchAt = Date.now();
    if (debug) {
      if (res.ok) {
        logDebug(`git fetch (${reason}) in ${folderPath}: ok`);
      } else {
        logDebug(`git fetch (${reason}) failed in ${folderPath}: ${res.out}`);
      }
    }
    return res.ok;
  } finally {
    state.inProgress = false;
  }
}

async function fetchDueFolders(folders, fetchIntervalSeconds, debug) {
  if (fetchIntervalSeconds <= 0) {
    return;
  }

  const now = Date.now();
  const intervalMs = fetchIntervalSeconds * 1000;
  const jobs = [];
  for (const folder of folders) {
    const folderPath = folder.uri.fsPath;
    const state = getFetchState(folderPath);
    if (now - state.lastFetchAt >= intervalMs) {
      jobs.push(fetchForFolder(folderPath, debug, 'scheduled'));
    }
  }
  await Promise.all(jobs);
}

async function fetchAllWorkspaceFolders(reason) {
  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length === 0) {
    return;
  }

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const debug = config.get('debug', false);
  await Promise.all(folders.map((folder) => fetchForFolder(folder.uri.fsPath, debug, reason)));
}

function getWatchStatusLine() {
  const now = Date.now();
  if (watchUntil > now) {
    return `Watching remote for ${Math.ceil((watchUntil - now) / 1000)}s.`;
  }
  if (cooldownUntil > now) {
    return `Remote watch cooling down for ${Math.ceil((cooldownUntil - now) / 1000)}s.`;
  }
  return '';
}

function compactTooltip(lines) {
  return lines.filter((line) => line !== '').join('\n');
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

function getDisplayOrder(config, tiers) {
  const raw = config.get('tiers', {});
  const order = [];
  const seen = new Set();
  const tierKeys = ['tier1', 'tier2', 'tier3'];

  for (let i = 0; i < tierKeys.length; i += 1) {
    const key = tierKeys[i];
    const rawTypes = Array.isArray(raw?.[key]?.types) ? raw[key].types : null;
    const types = rawTypes || tiers[i]?.types || [];
    types.forEach((t) => {
      if (ALERT_TYPES.has(t) && !seen.has(t)) {
        seen.add(t);
        order.push(t);
      }
    });
  }

  return order;
}

function formatTotals(order, totals) {
  const map = {
    ahead: { short: 'A', long: 'Ahead' },
    behind: { short: 'B', long: 'Behind' },
    uncommitted: { short: 'U', long: 'Uncommitted' },
  };
  const text = order.map((t) => `${map[t].short}:${totals[t]}`).join(' ');
  const header = order.map((t) => `${map[t].long}:${totals[t]}`).join(' ');
  return { text, header, map };
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
  if (refreshInProgress) {
    refreshQueued = true;
    return;
  }

  refreshInProgress = true;
  try {
    await refreshStatusInner();
  } finally {
    refreshInProgress = false;
    if (refreshQueued) {
      refreshQueued = false;
      refreshStatus();
    }
  }
}

async function refreshStatusInner() {
  if (!statusItem) {
    return;
  }

  const folders = vscode.workspace.workspaceFolders || [];
  if (folders.length === 0) {
    statusItem.hide();
    return;
  }

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const includeUntracked = config.get('includeUntracked', false);
  const debug = config.get('debug', false);
  const fetchIntervalSeconds = Math.max(15, Number(config.get('fetchIntervalSeconds', 60)) || 60);
  const tiers = loadTiers(config);
  const displayOrder = getDisplayOrder(config, tiers);

  if (debug && output) {
    output.show(true);
  }

  await fetchDueFolders(folders, fetchIntervalSeconds, debug);

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
    const display = formatTotals(displayOrder, totals);
    statusItem.text = `${STATUS_ICON} ${display.text}`;
    const lines = perRepo.map((r) =>
      `[${r.name}] ${displayOrder.map((t) => `${display.map[t].short}:${r[t]}`).join(' ')}`
    );
    const watchLine = getWatchStatusLine();
    statusItem.tooltip = compactTooltip([
      PRODUCT_NAME,
      watchLine,
      display.header,
      ...lines,
      'Click for actions.',
    ]);
    statusItem.backgroundColor = tier.backgroundColor ? new vscode.ThemeColor(tier.backgroundColor) : undefined;
    statusItem.color = tier.foregroundColor ? new vscode.ThemeColor(tier.foregroundColor) : undefined;
    statusItem.show();
  } else {
    const watchLine = getWatchStatusLine();
    statusItem.text = STATUS_ICON;
    statusItem.tooltip = compactTooltip([
      PRODUCT_NAME,
      watchLine,
      'No alerts.',
      'Click to watch remote or open Source Control.',
    ]);
    statusItem.backgroundColor = undefined;
    statusItem.color = undefined;
    statusItem.show();
  }
}

function startPolling() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (watchIntervalId) {
    clearInterval(watchIntervalId);
    watchIntervalId = null;
  }

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const seconds = Math.max(10, Number(config.get('pollingSeconds', 30)) || 30);
  intervalId = setInterval(refreshStatus, seconds * 1000);
}

async function applyColorCustomizations() {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
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

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
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

async function watchRemoteNow() {
  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const durationSeconds = Math.max(15, Number(config.get('watchDurationSeconds', 60)) || 60);
  const cooldownBaseSeconds = Math.max(5, Number(config.get('watchCooldownSeconds', 15)) || 15);
  const now = Date.now();

  if (now < cooldownUntil) {
    cooldownHitCount = Math.min(cooldownHitCount + 1, 3);
    const cooldownSeconds = Math.min(cooldownBaseSeconds * Math.pow(2, cooldownHitCount), 60);
    cooldownUntil = now + cooldownSeconds * 1000;
    refreshStatus();
    return;
  }

  cooldownHitCount = 0;
  watchUntil = now + durationSeconds * 1000;
  cooldownUntil = now + cooldownBaseSeconds * 1000;

  await fetchAllWorkspaceFolders('manual-watch');
  refreshStatus();
  startWatchPolling();
}

function startWatchPolling() {
  if (watchIntervalId) {
    clearInterval(watchIntervalId);
    watchIntervalId = null;
  }

  const config = vscode.workspace.getConfiguration(CONFIG_SECTION);
  const intervalSeconds = Math.max(5, Number(config.get('watchFetchIntervalSeconds', 10)) || 10);
  watchIntervalId = setInterval(async () => {
    if (Date.now() >= watchUntil) {
      clearInterval(watchIntervalId);
      watchIntervalId = null;
      refreshStatus();
      return;
    }
    await fetchAllWorkspaceFolders('manual-watch');
    refreshStatus();
  }, intervalSeconds * 1000);
}

async function showActions() {
  const picked = await vscode.window.showQuickPick(
    [
      { label: 'Watch Remote Now', command: 'gitSimpleAlert.watchRemoteNow' },
      { label: 'Open Source Control', command: 'gitSimpleAlert.openScm' },
      { label: 'Open Git Simple Alert Settings', command: 'gitSimpleAlert.openSettings' },
    ],
    { placeHolder: 'Git Simple Alert' }
  );

  if (picked) {
    vscode.commands.executeCommand(picked.command);
  }
}

function activate(context) {
  output = vscode.window.createOutputChannel(PRODUCT_NAME);
  statusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusItem.command = 'gitSimpleAlert.showActions';

  context.subscriptions.push(output);
  context.subscriptions.push(statusItem);
  context.subscriptions.push(vscode.commands.registerCommand('gitSimpleAlert.showActions', showActions));
  context.subscriptions.push(vscode.commands.registerCommand('gitSimpleAlert.watchRemoteNow', watchRemoteNow));
  context.subscriptions.push(vscode.commands.registerCommand('gitSimpleAlert.openScm', () => {
    vscode.commands.executeCommand('workbench.view.scm');
  }));
  context.subscriptions.push(vscode.commands.registerCommand('gitSimpleAlert.openSettings', async () => {
    const panel = vscode.window.createWebviewPanel(
      'gitSimpleAlertSettings',
      'Git Simple Alert Settings',
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
    if (e.affectsConfiguration(CONFIG_SECTION)) {
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
  if (watchIntervalId) {
    clearInterval(watchIntervalId);
    watchIntervalId = null;
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
