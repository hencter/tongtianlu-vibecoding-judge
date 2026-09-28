import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20206, 'D:/tmp/p_yx6');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  btnExact(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.replace(/\\s/g,'')===t); return e?(e.click(),'clicked:'+t):'NOBTN:'+t; },
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
  await sleep(600);
};

log('=== 1. 全部选「差不多」（全平局）===');
await p.eval(`__h.fillRow(1,'甲')`); await sleep(200);
await p.eval(`__h.fillRow(2,'乙')`); await sleep(200);
await p.eval(`__h.btn('加一个')`); await sleep(400);
await p.eval(`__h.fillRow(3,'丙')`); await sleep(200);
await H(); await p.eval(`__h.btn('开始 PK')`); await sleep(1000); await H();
for (let i = 0; i < 8; i++) { await H(); if ((await p.eval(`__h.field()`)) === 'none') break; await key('ArrowDown', 'ArrowDown', 40); }
await H();
const t1 = await T();
log('全平结果:', JSON.stringify(t1.slice(0, 1200)));
log('全平 btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_yx_alldraw.png');

log('');
log('=== 2. 改选（等等，我好像更想选别的）===');
await H();
log(await p.eval(`__h.btn('等等，我好像更想选别的')`)); await sleep(1000); await H();
log('改选页:', JSON.stringify((await T()).slice(0, 700)));
log('改选 btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 3. 8 个候选 ===');
await p.goto(URL); await sleep(1500); await H();
for (let i = 1; i <= 8; i++) {
  await H();
  await p.eval(`__h.fillRow(${i}, 'X${i}')`); await sleep(150);
  if (i < 8) { await p.eval(`__h.btn('加一个')`); await sleep(300); }
}
await H(); await p.eval(`__h.btn('开始 PK')`); await sleep(1200); await H();
log('8候选首场:', await p.eval(`__h.field()`));
let n = 0;
for (let i = 0; i < 40; i++) { await H(); if ((await p.eval(`__h.field()`)) === 'none') break; await key('ArrowLeft', 'ArrowLeft', 37); n++; }
log('完成场数:', n);
await H();
log('8候选结果:', JSON.stringify((await T()).slice(0, 800)));
await p.shot('shot_yx_8.png');

log('');
log('=== 4. 空行跳跃（只填 1、3 行，中间留空）===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.fillRow(1,'甲')`); await sleep(200);
await p.eval(`__h.btn('加一个')`); await sleep(300);
await p.eval(`__h.btn('加一个')`); await sleep(300);
await p.eval(`__h.fillRow(3,'丙')`); await sleep(200);
await H(); log('count 文本:', JSON.stringify((await T()).slice(0, 60)));
await p.eval(`__h.btn('开始 PK')`); await sleep(1200); await H();
log('跳跃后:', JSON.stringify((await T()).slice(0, 300)));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
