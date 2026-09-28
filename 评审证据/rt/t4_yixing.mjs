import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20204, 'D:/tmp/p_yx4');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  fillRow(n,v){ const i=document.querySelectorAll('input')[n]; if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  field(){ const m=document.body.innerText.match(/第 (\\d+) 场 \\/ 共 (\\d+) 场/); return m? m[1]+'/'+m[2] : 'none'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const key = async (k, code, vk) => {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
  await sleep(650);
};

await p.eval(`__h.fillRow(1,'火锅')`); await sleep(200);
await p.eval(`__h.fillRow(2,'日料')`); await sleep(200);
await p.eval(`__h.btn('加一个')`); await sleep(400);
await p.eval(`__h.fillRow(3,'烧烤')`); await sleep(200);
await H(); await p.eval(`__h.btn('开始 PK')`); await sleep(1200); await H();
log('开始:', await p.eval(`__h.field()`));

log('=== 用键盘箭头完成 PK ===');
for (let i = 0; i < 10; i++) {
  await H();
  const f = await p.eval(`__h.field()`);
  if (f === 'none') { log('已离开 PK 页 @', i); break; }
  log('场次', f);
  await key('ArrowLeft', 'ArrowLeft', 37);
}
await H();
log('=== 结果页 ===');
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_yx_final.png');

log('');
log('=== 查看过程 ===');
log(await p.eval(`__h.btn('查看过程')`)); await sleep(900); await H();
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 改选（反悔）===');
await H();
const b = await p.eval(`JSON.stringify(__h.btns())`);
log('当前按钮:', b);
if (b.includes('改选')) { log(await p.eval(`__h.btn('改选')`)); await sleep(900); await H(); log(await T()); }
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
