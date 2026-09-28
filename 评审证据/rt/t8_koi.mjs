import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20308, 'D:/tmp/p_koi8');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  cb(){ return [...document.querySelectorAll('input[type=checkbox]')].map((c,i)=>i+':'+(c.checked?'ON':'off')+' | '+ (c.closest('label')?c.closest('label').innerText.replace(/\\n/g,' ').slice(0,40):'?')); },
  toggle(i){ const c=document.querySelectorAll('input[type=checkbox]')[i]; if(!c) return 'nocb'; c.click(); return c.checked; },
  cards(){ const t=document.body.innerText; const i=t.indexOf('锦鲤带回了三张卡'); return i<0? 'NOCARDS' : t.slice(i, i+1400); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(2200); await H(); };

log('=== A. 严格预算 + 30 元以内 ===');
await reset();
await p.eval(`__h.btn('高级条件')`); await sleep(700); await H();
log('checkbox 初始:', await p.eval(`JSON.stringify(__h.cb())`));
await p.eval(`__h.btn('30 元以内')`); await sleep(400);
await p.eval(`__h.toggle(0)`); await sleep(400); await H();
log('勾选后:', await p.eval(`JSON.stringify(__h.cb())`));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('抽卡结果:\n' + await p.eval(`__h.cards()`));

log('');
log('=== B. 严格时间 + 15 分钟内 ===');
await reset();
await p.eval(`__h.btn('高级条件')`); await sleep(700); await H();
await p.eval(`__h.btn('15 分钟内')`); await sleep(400);
await p.eval(`__h.toggle(1)`); await sleep(400); await H();
log('勾选后:', await p.eval(`JSON.stringify(__h.cb())`));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('抽卡结果:\n' + await p.eval(`__h.cards()`));

log('');
log('=== C. 忌口：设置「不吃辣」后是否还抽到辣菜 ===');
await reset();
await p.eval(`__h.btn('设置')`); await sleep(1200); await H();
log('设置页按钮:', await p.eval(`JSON.stringify([...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,30)))`));
await p.eval(`__h.btn('不吃辣')`); await sleep(500); await H();
log('不吃辣点击后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(-400)));
// 关闭设置
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='关闭'); if(b) b.click(); return 'ok'})()`);
await sleep(800); await H();
log('首页忌口状态:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 700)));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('抽卡结果:\n' + await p.eval(`__h.cards()`));
log('4xx:', JSON.stringify(p.net));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
