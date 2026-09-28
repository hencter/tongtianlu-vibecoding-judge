import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20302, 'D:/tmp/p_koi2');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1800);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btnAll(t){ const e=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); return e.map((b,i)=>{b.click();return 'clicked'+i}); },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,44)+(b.disabled?'[D]':'')); },
  setVal(sel,v){ const i=document.querySelector(sel); if(!i) return 'noinput'; const proto=i.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype; const s=Object.getOwnPropertyDescriptor(proto,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  inputs(){ return [...document.querySelectorAll('input,textarea')].map((i,n)=>n+':'+i.tagName+':'+(i.placeholder||i.type)); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(2000); await H(); };

log('=== 1. 默认条件直接「放出锦鲤」===');
log(await p.eval(`__h.btn('放出锦鲤')`)); await sleep(3500); await H();
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_koi_draw.png');

log('');
log('=== 2. 「当前感觉」最多 3 个，试着点 5 个 ===');
await reset();
for (const s of ['很饿', '想吃辣', '想喝热汤', '想吃肉', '想清爽一点']) {
  await p.eval(`__h.btn(${JSON.stringify(s)})`); await sleep(350);
}
await H();
log('选了5个后:', JSON.stringify((await T()).slice(0, 900)));

log('');
log('=== 3. 高级条件展开 ===');
await reset();
log(await p.eval(`__h.btn('高级条件')`)); await sleep(800); await H();
log('展开后:', JSON.stringify((await T()).slice(0, 1400)));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('inputs:', await p.eval(`JSON.stringify(__h.inputs())`));
await p.shot('shot_koi_advanced.png');
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
