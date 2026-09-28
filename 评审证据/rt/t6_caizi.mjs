import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20106, 'D:/tmp/p_caizi6');
const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  setVal(v){ const i=document.querySelector('input,textarea'); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  count(){ const m=document.body.innerText.match(/(\\d+) \\/ 6/); return m?m[1]:'?'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);

log('=== 真实双击（间隔 30ms）===');
await p.eval(`__h.setVal('火锅')`); await sleep(200);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('添加')); b.click(); return 1})()`);
await sleep(30);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('添加')); b.click(); return 1})()`);
await sleep(600);
log('双击后 count =', await p.eval(`__h.count()`));
log('文本:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 500)));

log('');
log('=== 连点 10 次后进入决策流程的后果 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.setVal('测试A')`); await sleep(200);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('添加')); for(let i=0;i<10;i++) b.click(); return 'ok'})()`);
await sleep(800);
log('count =', await p.eval(`__h.count()`));
await p.eval(`__h.btn('开始拍板')`); await sleep(1000);
log('进入流程后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 900)));
await p.shot('shot_caizi_11items.png');
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.setViewport(320, 640, true); await sleep(600);
log('窄屏溢出:', await p.eval(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:window.innerWidth})`));

log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
