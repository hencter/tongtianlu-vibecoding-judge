import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20205, 'D:/tmp/p_yx5');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btnN(n){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('历史')); if(b[n]){b[n].click();return 'clicked历史#'+n} return 'no'+b.length; },
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
  await sleep(700);
};
const setup = async () => {
  await p.goto(URL); await sleep(1500); await H();
  await p.eval(`__h.fillRow(1,'火锅')`); await sleep(200);
  await p.eval(`__h.fillRow(2,'日料')`); await sleep(200);
  await p.eval(`__h.btn('加一个')`); await sleep(400);
  await p.eval(`__h.fillRow(3,'烧烤')`); await sleep(200);
  await H(); await p.eval(`__h.btn('开始 PK')`); await sleep(1000);
};

log('=== 1. PK 中途刷新（状态/续赛）===');
await setup(); await H();
await key('ArrowLeft', 'ArrowLeft', 37); // 完成第一场
log('刷新前:', await p.eval(`__h.field()`));
await p.reload(); await sleep(2000); await H();
log('刷新后:', await T());
log('刷新后 btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 2. 续赛后完成 → 就它了 → 历史按钮 ===');
await H();
if ((await T()).includes('继续上次')) { await p.eval(`__h.btn('继续上次')`); await sleep(1200); await H(); }
log('场:', await p.eval(`__h.field()`));
for (let i = 0; i < 6; i++) { await H(); if ((await p.eval(`__h.field()`)) === 'none') break; await key('ArrowLeft', 'ArrowLeft', 37); }
await H();
log('结果页 btns:', await p.eval(`JSON.stringify(__h.btns())`));
log(await p.eval(`__h.btn('就它了')`)); await sleep(1200); await H();
log('确认后:', JSON.stringify((await T()).slice(0, 400)));
log('确认后 btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 3. 打开历史 ===');
await H(); log(await p.eval(`__h.btnN(1)`)); await sleep(1000); await H();
log('历史页:', JSON.stringify((await T()).slice(0, 700)));
log('历史页 btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_yx_history.png');

log('');
log('=== 4. 窄屏 320 溢出 ===');
await p.setViewport(320, 640, true); await sleep(800); await H();
log(await p.eval(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:window.innerWidth})`));
await p.shot('shot_yx_320.png');

log('');
log('=== 5. 复制结果 ===');
await p.setViewport(390, 844, true);
await setup(); await H();
for (let i = 0; i < 6; i++) { await H(); if ((await p.eval(`__h.field()`)) === 'none') break; await key('ArrowLeft', 'ArrowLeft', 37); }
await H();
log(await p.eval(`__h.btn('复制结果')`)); await sleep(1200); await H();
log('复制后:', JSON.stringify((await T()).slice(-500)));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
