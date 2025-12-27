const vscode = require('vscode');
const cp = require('child_process');

let statusItem = null;
let intervalId = null;
let output = null;

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

  if (debug && output) {
    output.show(true);
  }

  let total = 0;
  const perRepo = [];
  for (const folder of folders) {
    const count = await getDirtyCountForFolder(folder.uri.fsPath, includeUntracked, debug);
    total += count;
    perRepo.push({ name: folder.name, path: folder.uri.fsPath, count });
  }

  if (total > 0) {
    statusItem.text = `$(git-commit) ${total}`;
    const lines = perRepo.map((r) => `${r.name}: ${r.count}`);
    statusItem.tooltip = `Uncommitted changes: ${total}\n` + lines.join('\n');
    statusItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    statusItem.color = new vscode.ThemeColor('statusBarItem.errorForeground');
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
