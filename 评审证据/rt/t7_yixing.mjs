import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20207, 'D:/tmp/p_yx7');
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
  await sleep(600);
};
const reset = async () => {
  await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`);
  await p.goto(URL); await sleep(1800); await H();
};

log('=== 1. 8 个候选（重置后）===');
await reset();
for (let i = 1; i <= 8; i++) {
  await H();
  await p.eval(`__h.fillRow(${i}, 'X${i}')`); await sleep(150);
  if (i < 8) { await p.eval(`__h.btn('加一个')`); await sleep(300); }
}
await H();
log('起始页:', JSON.stringify((await T()).slice(0, 400)));
await p.eval(`__h.btn('开始 PK')`); await sleep(1400); await H();
log('首场:', await p.eval(`__h.field()`));
let n = 0;
for (let i = 0; i < 60; i++) { await H(); if ((await p.eval(`__h.field()`)) === 'none') break; await key('ArrowLeft', 'ArrowLeft', 37); n++; }
log('完成场数:', n);
await H();
log('8候选结果:', JSON.stringify((await T()).slice(0, 1100)));
await p.shot('shot_yx_8.png');

log('');
log('=== 2. 空行跳跃（重置后）===');
await reset();
await p.eval(`__h.fillRow(1,'甲')`); await sleep(200);
await p.eval(`__h.btn('加一个')`); await sleep(300);
await p.eval(`__h.btn('加一个')`); await sleep(300);
await p.eval(`__h.fillRow(3,'丙')`); await sleep(250);
await H();
log('首页:', JSON.stringify((await T()).slice(0, 400)));
await p.eval(`__h.btn('开始 PK')`); await sleep(1400); await H();
log('跳跃后:', JSON.stringify((await T()).slice(0, 400)));

log('');
log('=== 3. 只有空格的候选 ===');
await reset();
await p.eval(`__h.fillRow(1,'   ')`); await sleep(200);
await p.eval(`__h.fillRow(2,'乙')`); await sleep(200);
await H();
log('首页:', JSON.stringify((await T()).slice(0, 400)));
await p.eval(`__h.btn('开始 PK')`); await sleep(1400); await H();
log('空格候选:', JSON.stringify((await T()).slice(0, 400)));

log('');
log('=== 4. 完成一次后刷新：会回到哪 ===');
await reset();
await p.eval(`__h.fillRow(1,'甲')`); await sleep(200);
await p.eval(`__h.fillRow(2,'乙')`); await sleep(200);
await H(); await p.eval(`__h.btn('开始 PK')`); await sleep(1000);
await H(); await key('ArrowLeft', 'ArrowLeft', 37);
await H(); log(await p.eval(`__h.btn('就它了')`)); await sleep(1200);
await p.reload(); await sleep(2000); await H();
log('刷新后:', JSON.stringify((await T()).slice(0, 300)));
log('刷新后 btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
