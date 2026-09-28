import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20307, 'D:/tmp/p_koi7');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,44)+(b.disabled?'[D]':'')); },
  setVal(sel,v){ const i=document.querySelector(sel); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  check(i,v){ const c=document.querySelectorAll('input[type=checkbox]')[i]; if(!c) return 'nocb'; if(c.checked!==v){c.click();} return c.checked; },
  inputs(){ return [...document.querySelectorAll('input,textarea')].map((i,n)=>n+':'+i.tagName+':'+(i.placeholder||i.type)); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(2200); await H(); };

log('=== 1. 图鉴页 ===');
log(await p.eval(`__h.btn('图鉴')`)); await sleep(1500); await H();
log(await T());
await p.shot('shot_koi_gallery.png');

log('');
log('=== 2. 历史页 ===');
await H(); log(await p.eval(`__h.btn('历史')`)); await sleep(1500); await H();
log(await T());

log('');
log('=== 3. 设置页 ===');
await H(); log(await p.eval(`__h.btn('设置')`)); await sleep(1500); await H();
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 4. 极端条件：严格预算30内 + 严格时间15分钟 + 忌口全勾 + 自定义忌口 ===');
await reset();
await p.eval(`__h.btn('高级条件')`); await sleep(700); await H();
await p.eval(`__h.btn('30 元以内')`); await sleep(300);
await p.eval(`__h.btn('15 分钟内')`); await sleep(300);
await p.eval(`__h.btn('严格预算')`); await sleep(300);
await p.eval(`__h.btn('严格时间')`); await sleep(300);
await H();
log('勾选前 inputs:', await p.eval(`JSON.stringify(__h.inputs())`));
log('checkbox 数:', await p.eval(`document.querySelectorAll('input[type=checkbox]').length`));
for (let i = 0; i < 6; i++) { await p.eval(`__h.check(${i}, true)`); await sleep(200); }
await H();
log('忌口页:', JSON.stringify((await T()).slice(0, 900)));
log('inputs:', await p.eval(`JSON.stringify(__h.inputs())`));
await p.eval(`__h.setVal('input[type=text],textarea', '肉,面,饭,菜,汤,鱼,鸡,牛,猪,辣,甜,酸')`); await sleep(500);
await H();
log('填忌口后:', JSON.stringify((await T()).slice(0, 600)));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('极端条件抽卡:', JSON.stringify((await T()).slice(0, 1200)));
await p.shot('shot_koi_extreme.png');
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
