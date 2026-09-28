// 极简 CDP 驱动：自行拉起本机 Chrome，通过 DevTools Protocol 做真实交互
const { spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');
const fs = require('fs');

const CHROME = process.env.CHROME_PATH ||
  'C:/Program Files/Google/Chrome/Application/chrome.exe';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on('error', reject);
  });
}

async function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const v = await getJSON(`http://127.0.0.1:${port}/json/version`);
      if (v && v.webSocketDebuggerUrl) return v;
    } catch (e) { /* not up yet */ }
    await sleep(300);
  }
  throw new Error('Chrome CDP 未在超时时间内就绪');
}

class CDP {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); this.events = []; }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = e => reject(new Error('ws error'));
      this.ws.onmessage = ev => {
        const msg = JSON.parse(ev.data);
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else if (msg.method) {
          this.events.push(msg);
        }
      };
    });
  }

  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout: ' + method)); }
      }, 30000);
    });
  }

  async eval(expr) {
    const r = await this.send('Runtime.evaluate', {
      expression: expr, returnByValue: true, awaitPromise: true, userGesture: true
    });
    if (r.exceptionDetails) {
      return { __error: r.exceptionDetails.exception?.description || JSON.stringify(r.exceptionDetails) };
    }
    return r.result?.value;
  }

  close() { try { this.ws.close(); } catch (e) {} }
}

async function launch(port = 9333) {
  const profile = path.join(os.tmpdir(), 'cdpjudge' + Date.now());
  const child = spawn(CHROME, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + profile,
    '--window-size=1280,900',
    '--remote-allow-origins=*',
    'about:blank'
  ], { stdio: 'ignore', detached: false });

  const version = await waitForPort(port);
  // 新建标签页以便拿到可调试 target
  const target = await new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: '/json/new?about:blank', method: 'PUT' }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.end();
  });
  const cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  await cdp.send('Log.enable');
  return { cdp, child, target };
}

async function goto(cdp, url) {
  await cdp.send('Page.navigate', { url });
  await sleep(2500);
  // 等待 document ready
  for (let i = 0; i < 20; i++) {
    const st = await cdp.eval('document.readyState');
    if (st === 'complete' || st === 'interactive') break;
    await sleep(500);
  }
  await sleep(1200);
}

module.exports = { launch, goto, sleep, CDP };
