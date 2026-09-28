import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20103, 'D:/tmp/p_caizi3');
const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);

const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  setVal(v){ const i=document.querySelector('input,textarea'); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  clickOpt(t){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); if(b.length){b[b.length-1].click();return 'clicked:'+t} return 'NOOPT:'+t; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { const v = await p.eval(`typeof __h==='undefined' ? 'NOHELPER' : __h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const addItem = async (v) => { await H(); await p.eval(`__h.setVal(${JSON.stringify(v)})`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350); };

await addItem('火锅'); await addItem('日料'); await addItem('烧烤');

log('=== 流程中刷新（状态污染测试）===');
await H(); await p.eval(`__h.btn('开始拍板')`); await sleep(800);
log('before reload:', (await T()).slice(0, 120));
await p.reload(); await sleep(1800); await H();
log('AFTER RELOAD:', (await T()).slice(0, 300));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('=== 走完 3 问（都选火锅）+ 决胜 ===');
await addItem('火锅'); await addItem('日料'); await addItem('烧烤');
await H(); await p.eval(`__h.btn('开始拍板')`); await sleep(700);
for (let i = 0; i < 3; i++) { await H(); await p.eval(`__h.clickOpt('火锅')`); await sleep(800); }
log('after 3 answers:', await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
const txt1 = await T();
if (/决胜|平局/.test(txt1)) { await p.eval(`__h.clickOpt('火锅')`); await sleep(1100); await H(); }
log('FINAL:', await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_caizi_final.png');

log('=== 点「我还是不服」 ===');
log(await p.eval(`__h.btn('我还是不服')`)); await sleep(900); await H();
log('AFTER 不服:', await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('=== 窄屏 320 溢出检查 ===');
await p.setViewport(320, 640, true); await sleep(800); await H();
log(await p.eval(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:window.innerWidth, bodySw:document.body.scrollWidth, overflow: document.documentElement.scrollWidth>window.innerWidth+1})`));
await p.shot('shot_caizi_320.png');

log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
