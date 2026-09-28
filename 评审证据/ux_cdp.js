// 极简 CDP 驱动：真实打开页面、点击、输入、截图
const fs = require('fs');

const PORT = process.env.CDP_PORT || '9444';
const stepsFile = process.argv[2];
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));

const log = (...a) => console.log(...a);

async function newTab(url) {
  let res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' });
  if (!res.ok) res = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent(url)}`);
  const t = await res.json();
  return t.webSocketDebuggerUrl;
}

function mkConn(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const listeners = [];
  const ready = new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { res, rej } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? rej(new Error(JSON.stringify(msg.error))) : res(msg.result);
    } else if (msg.method) {
      listeners.forEach(f => f(msg));
    }
  };
  async function send(method, params = {}) {
    await ready;
    const mid = ++id;
    ws.send(JSON.stringify({ id: mid, method, params }));
    return new Promise((res, rej) => {
      pending.set(mid, { res, rej });
      setTimeout(() => { if (pending.has(mid)) { pending.delete(mid); rej(new Error('timeout ' + method)); } }, 30000);
    });
  }
  return { ws, send, ready, on: f => listeners.push(f) };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const first = steps.find(s => s.do === 'goto');
  const wsUrl = await newTab(first ? first.url : 'about:blank');
  const conn = mkConn(wsUrl);
  await conn.ready;
  await conn.send('Page.enable');
  await conn.send('Runtime.enable');
  await conn.send('Log.enable').catch(() => {});

  let started = false;
  for (const s of steps) {
    try {
      if (s.do === 'goto') {
        if (!started) { started = true; await sleep(1200); }
        else {
          await conn.send('Page.navigate', { url: s.url });
          await sleep(s.ms || 2500);
        }
        log('[goto]', s.url);
      } else if (s.do === 'wait') {
        await sleep(s.ms || 1000);
      } else if (s.do === 'reload') {
        await conn.send('Page.reload', {}); await sleep(s.ms || 2500); log('[reload]');
      } else if (s.do === 'mobile') {
        await conn.send('Emulation.setDeviceMetricsOverride', {
          width: s.w, height: s.h, deviceScaleFactor: 2, mobile: true
        });
        await conn.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
        log('[mobile]', s.w + 'x' + s.h);
      } else if (s.do === 'desktop') {
        await conn.send('Emulation.clearDeviceMetricsOverride', {});
        log('[desktop]');
      } else if (s.do === 'text') {
        const r = await conn.send('Runtime.evaluate', {
          expression: 'document.body.innerText', returnByValue: true
        });
        log('--- TEXT ---\n' + (r.result.value || '').slice(0, 4000) + '\n--- END ---');
      } else if (s.do === 'html') {
        const r = await conn.send('Runtime.evaluate', {
          expression: 'document.body.innerHTML', returnByValue: true
        });
        log('--- HTML ---\n' + (r.result.value || '').slice(0, 6000) + '\n--- END ---');
      } else if (s.do === 'clickables') {
        const r = await conn.send('Runtime.evaluate', {
          expression: `(() => {
            const out = [];
            document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=tab],[role=radio],[role=checkbox],label').forEach((el,i)=>{
              const r = el.getBoundingClientRect();
              if (r.width===0 && r.height===0) return;
              out.push({i, tag:el.tagName, type:el.type||'', ph:el.placeholder||'', text:(el.innerText||el.value||'').replace(/\\s+/g,' ').trim().slice(0,60), x:Math.round(r.x+r.width/2), y:Math.round(r.y+r.height/2), w:Math.round(r.width), h:Math.round(r.height)});
            });
            return JSON.stringify(out);
          })()`, returnByValue: true
        });
        log('--- CLICKABLES ---\n' + r.result.value + '\n--- END ---');
      } else if (s.do === 'clickText') {
        const r = await conn.send('Runtime.evaluate', {
          expression: `(() => {
            const target = ${JSON.stringify(s.text)};
            const exact = ${JSON.stringify(!!s.exact)};
            const cands=[...document.querySelectorAll('button,a,input,textarea,[role=button],[role=tab],[role=radio],[role=checkbox],[role=option],li,div,span,label')];
            let best=null;
            for (const el of cands) {
              const own=[...el.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').replace(/\\s+/g,' ').trim();
              const full=(el.innerText||el.value||'').replace(/\\s+/g,' ').trim();
              const b=el.getBoundingClientRect();
              if (b.width===0&&b.height===0) continue;
              const ok = exact ? (own===target||full===target) : (own.includes(target)||full.includes(target));
              if (!ok) continue;
              if (!best || b.width*b.height < best.__a) { best=el; best.__a=b.width*b.height; }
            }
            if(!best) return null;
            best.scrollIntoView({block:'center'});
            const b=best.getBoundingClientRect();
            return JSON.stringify({x:Math.round(b.x+b.width/2), y:Math.round(b.y+b.height/2), tag:best.tagName, t:(best.innerText||best.value||'').replace(/\\s+/g,' ').slice(0,80)});
          })()`, returnByValue: true
        });
        if (!r.result.value) { log('[clickText] NOT FOUND:', s.text); continue; }
        const p = JSON.parse(r.result.value);
        await sleep(300);
        for (const type of ['mousePressed', 'mouseReleased']) {
          await conn.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
        }
        log('[clickText]', s.text, '->', JSON.stringify(p));
        await sleep(s.ms || 900);
      } else if (s.do === 'clickAt') {
        for (const type of ['mousePressed', 'mouseReleased']) {
          await conn.send('Input.dispatchMouseEvent', { type, x: s.x, y: s.y, button: 'left', clickCount: 1 });
        }
        log('[clickAt]', s.x, s.y);
        await sleep(s.ms || 900);
      } else if (s.do === 'clickBtn') {
        const r = await conn.send('Runtime.evaluate', {
          expression: `(() => {
            const target = ${JSON.stringify(s.text)};
            const exact = ${JSON.stringify(!!s.exact)};
            const cands=[...document.querySelectorAll('button,[role=button]')].filter(e=>{const b=e.getBoundingClientRect();return b.width||b.height;});
            let best=null;
            for (const el of cands) {
              const full=(el.innerText||el.value||'').replace(/\\s+/g,' ').trim();
              const b=el.getBoundingClientRect();
              const ok = exact ? full===target : full.includes(target);
              if (!ok) continue;
              if (!best || b.width*b.height < best.__a) { best=el; best.__a=b.width*b.height; }
            }
            if(!best) return null;
            best.scrollIntoView({block:'center'});
            const b=best.getBoundingClientRect();
            return JSON.stringify({x:Math.round(b.x+b.width/2), y:Math.round(b.y+b.height/2), t:(best.innerText||'').replace(/\\s+/g,' ').slice(0,60)});
          })()`, returnByValue: true
        });
        if (!r.result.value) { log('[clickBtn] NOT FOUND:', s.text); continue; }
        const p = JSON.parse(r.result.value);
        await sleep(250);
        for (const type of ['mousePressed', 'mouseReleased']) {
          await conn.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
        }
        log('[clickBtn]', s.text, '->', JSON.stringify(p));
        await sleep(s.ms || 900);
      } else if (s.do === 'clickIdx') {
        const r = await conn.send('Runtime.evaluate', {
          expression: `(() => {
            const els=[...document.querySelectorAll('button,a,input,textarea,select,[role=button],[role=tab],[role=radio],[role=checkbox],label')].filter(e=>{const r=e.getBoundingClientRect();return r.width||r.height;});
            const el = els[${s.idx}]; if(!el) return null;
            el.scrollIntoView({block:'center'});
            const b = el.getBoundingClientRect();
            return JSON.stringify({x:Math.round(b.x+b.width/2), y:Math.round(b.y+b.height/2), tag:el.tagName, t:(el.innerText||el.value||'').slice(0,60)});
          })()`, returnByValue: true
        });
        if (!r.result.value) { log('[clickIdx] NOT FOUND', s.idx); continue; }
        const p = JSON.parse(r.result.value);
        await sleep(300);
        for (const type of ['mousePressed', 'mouseReleased']) {
          await conn.send('Input.dispatchMouseEvent', { type, x: p.x, y: p.y, button: 'left', clickCount: 1 });
        }
        log('[clickIdx]', s.idx, '->', JSON.stringify(p));
        await sleep(s.ms || 900);
      } else if (s.do === 'type') {
        const r = await conn.send('Runtime.evaluate', {
          expression: `(() => {
            let el;
            if (${JSON.stringify(s.sel || '')}) el = document.querySelector(${JSON.stringify(s.sel)});
            if (!el) {
              const vis=[...document.querySelectorAll('input,textarea')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&e.offsetParent!==null;});
              el = vis[${s.n || 0}];
            }
            if(!el) return null;
            el.scrollIntoView({block:'center'});
            el.focus();
            const b=el.getBoundingClientRect();
            return JSON.stringify({x:Math.round(b.x+b.width/2), y:Math.round(b.y+b.height/2), tag:el.tagName, ph:el.placeholder||''});
          })()`, returnByValue: true
        });
        if (!r.result.value) { log('[type] no input found'); continue; }
        const p = JSON.parse(r.result.value);
        await sleep(200);
        await conn.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: p.x, y: p.y, button: 'left', clickCount: 1 });
        await conn.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: p.x, y: p.y, button: 'left', clickCount: 1 });
        log('[type] focus', JSON.stringify(p));
        await conn.send('Input.insertText', { text: s.text });
        await sleep(s.ms || 700);
      } else if (s.do === 'key') {
        await conn.send('Input.dispatchKeyEvent', {
          type: 'keyDown', key: s.key, code: s.code || s.key,
          windowsVirtualKeyCode: (s.key === 'Enter' ? 13 : 0), text: s.text || ''
        });
        await conn.send('Input.dispatchKeyEvent', {
          type: 'keyUp', key: s.key, code: s.code || s.key,
          windowsVirtualKeyCode: (s.key === 'Enter' ? 13 : 0)
        });
        log('[key]', s.key);
        await sleep(s.ms || 900);
      } else if (s.do === 'eval') {
        const r = await conn.send('Runtime.evaluate', { expression: s.expr, returnByValue: true, awaitPromise: true });
        log('[eval]', JSON.stringify(r.result.value));
      } else if (s.do === 'shot') {
        const r = await conn.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        fs.writeFileSync(s.path, Buffer.from(r.data, 'base64'));
        log('[shot]', s.path);
      } else if (s.do === 'console') {
        log('[console] see below');
      } else if (s.do === 'errors') {
        const r = await conn.send('Runtime.evaluate', { expression: 'window.__errs||[]', returnByValue: true });
        log('[errors]', JSON.stringify(r.result.value));
      } else if (s.do === 'scroll') {
        await conn.send('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 600, y: 500, deltaX: 0, deltaY: s.dy || 600 });
        await sleep(600);
        log('[scroll]', s.dy);
      } else if (s.do === 'scrollBottom') {
        await conn.send('Runtime.evaluate', { expression: 'window.scrollTo(0, document.body.scrollHeight)' });
        await sleep(700); log('[scrollBottom]');
      } else if (s.do === 'back') {
        await conn.send('Runtime.evaluate', { expression: 'history.back()' }); await sleep(1500); log('[back]');
      }
    } catch (e) {
      log('[ERR]', s.do, e.message);
    }
  }
  conn.ws.close();
  log('=== DONE ===');
}

main().catch(e => { console.error('FATAL', e); process.exit(1); });
