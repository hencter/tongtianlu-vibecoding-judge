import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20303, 'D:/tmp/p_koi3');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1800);

// capture network
const fails = [];
p.ws.addEventListener('message', (raw) => {
  let m; try { m = JSON.parse(raw.data ?? raw); } catch { return; }
  if (m.method === 'Network.responseReceived' && m.params.response.status >= 400) {
    fails.push(m.params.response.status + ' ' + m.params.response.url);
  }
  if (m.method === 'Network.loadingFailed') {
    fails.push('FAILED ' + (m.params.errorText || '') + ' ' + (m.params.requestId || ''));
  }
  if (m.method === 'Network.requestWillBeSent') {
    p._req = p._req || {}; p._req[m.params.requestId] = m.params.request.url;
  }
});

const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  imgs(){ return [...document.querySelectorAll('img')].map(i=>({src:(i.getAttribute('src')||'').slice(0,120), alt:i.alt, complete:i.complete, nw:i.naturalWidth})); },
  drawn(){ return [...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.trim()==='卡面绘制中').length; },
  selected(){ return [...document.querySelectorAll('button')].filter(b=>b.className.includes('sel')||b.getAttribute('aria-pressed')==='true'||b.className.includes('active')).map(b=>b.innerText.replace(/\\n/g,'|').slice(0,20)); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);

log('=== 抽卡 ===');
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4000); await H();
log('404/失败请求:', JSON.stringify(fails, null, 1));
log('imgs:', JSON.stringify(await p.eval(`JSON.stringify(__h.imgs())`)));
log('卡面绘制中 元素数:', await p.eval(`__h.drawn()`));
await p.shot('shot_koi_cards.png');

log('');
log('=== 当前感觉 点 5 个（最多 3 个）===');
await p.eval(`try{localStorage.clear()}catch(e){}`);
await p.goto(URL); await sleep(2000); await H();
for (const s of ['很饿', '想吃辣', '想喝热汤', '想吃肉', '想清爽一点']) {
  await p.eval(`__h.btn(${JSON.stringify(s)})`); await sleep(400);
}
await H();
log('选中态:', JSON.stringify(await p.eval(`JSON.stringify(__h.selected())`)));
log('全部按钮 class 采样:', JSON.stringify(await p.eval(`JSON.stringify([...document.querySelectorAll('button')].slice(8,20).map(b=>b.innerText.replace(/\\n/g,'|')+' => '+b.className))`)));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
