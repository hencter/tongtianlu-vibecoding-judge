// Minimal CDP driver that owns its own headless Chrome process.
import { spawn } from 'child_process';
import fs0 from 'fs';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

export const CHROME = process.env.CHROME_BIN ||
  'C:/Users/hencter/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe';

let PORT = parseInt(process.env.CDP_PORT || '0', 10);
function base() { return `http://127.0.0.1:${PORT}`; }

export async function launchBrowser(port, profile = 'D:/tmp/cdpprof') {
  PORT = port;
  try { fs0.rmSync(profile, { recursive: true, force: true }); } catch {}
  fs0.mkdirSync(profile, { recursive: true });
  const child = spawn(CHROME, [
    '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
    '--disable-extensions', '--disable-background-networking',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
  ], { stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  for (let i = 0; i < 80; i++) {
    await sleep(300);
    try {
      const r = await fetch(`${base()}/json/version`);
      if (r.ok) return child;
    } catch {}
  }
  throw new Error('browser did not start');
}

async function http(path, method = 'GET') {
  const res = await fetch(base() + path, { method });
  return res.json();
}

export class Page {
  constructor(ws, id) {
    this.ws = ws; this.id = id; this.seq = 0;
    this.pending = new Map(); this.logs = []; this.errors = [];
    this.net = []; this.reqs = {};
    ws.addEventListener('message', (raw) => {
      let m; try { m = JSON.parse(raw.data ?? raw); } catch { return; }
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        if (m.error) reject(new Error(JSON.stringify(m.error))); else resolve(m.result);
        return;
      }
      if (m.method === 'Runtime.consoleAPICalled') {
        const t = m.params.type;
        const txt = (m.params.args || []).map(a => a.value ?? a.description ?? a.type).join(' ');
        this.logs.push(`[console.${t}] ${txt}`);
        if (t === 'error') this.errors.push(`console.error: ${txt}`);
      }
      if (m.method === 'Runtime.exceptionThrown') {
        const d = m.params.exceptionDetails || {};
        this.errors.push(`exception: ${d.text} ${d.exception?.description ?? ''}`.trim());
      }
      if (m.method === 'Log.entryAdded') {
        const e = m.params.entry || {};
        if (e.level === 'error') this.errors.push(`log: ${e.text}`);
      }
      if (m.method === 'Network.requestWillBeSent') {
        this.reqs[m.params.requestId] = m.params.request.url;
      }
      if (m.method === 'Network.responseReceived') {
        const st = m.params.response.status;
        if (st >= 400) this.net.push(st + ' ' + m.params.response.url);
      }
      if (m.method === 'Network.loadingFailed') {
        this.net.push('FAIL ' + (this.reqs[m.params.requestId] || '?') + ' ' + (m.params.errorText || ''));
      }
    });
  }

  static async open(url, { width = 390, height = 844, mobile = true } = {}) {
    let t = null;
    try { t = await http('/json/new?about:blank', 'PUT'); } catch {}
    if (!t || !t.webSocketDebuggerUrl) {
      const list = await http('/json/list');
      t = list.find(x => x.type === 'page' && x.url === 'about:blank') || list[0];
      if (t && t.url !== 'about:blank') {
        await fetch(base() + '/json/new?about:blank', { method: 'PUT' }).catch(() => {});
        await sleep(600);
        const l2 = await http('/json/list');
        t = l2.find(x => x.url === 'about:blank') || l2[l2.length - 1];
      }
    }
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const p = new Page(ws, t.id);
    await p.send('Page.enable');
    await p.send('Runtime.enable');
    await p.send('Log.enable');
    await p.setViewport(width, height, mobile);
    if (url) await p.goto(url);
    return p;
  }

  async setViewport(width, height, mobile) {
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 2, mobile });
  }

  send(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); }
      }, 30000);
    });
  }

  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr, awaitPromise: true, returnByValue: true, userGesture: true,
    });
    if (r.exceptionDetails) {
      return { __error: (r.exceptionDetails.text || '') + ' ' + (r.exceptionDetails.exception?.description ?? '') };
    }
    return r.result?.value;
  }

  async goto(url) { const r = await this.send('Page.navigate', { url }); await sleep(2500); return r; }
  async reload() { await this.send('Page.reload', { ignoreCache: false }); await sleep(2500); }
  async wait(ms) { await sleep(ms); }

  async shot(path) {
    const r = await this.send('Page.captureScreenshot', { format: 'png' });
    fs0.writeFileSync(path, Buffer.from(r.data, 'base64'));
    return path;
  }

  async close() {
    try { await fetch(base() + '/json/close/' + this.id); } catch {}
    try { this.ws.close(); } catch {}
  }
}

export { sleep };
