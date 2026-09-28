import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20201, 'D:/tmp/p_yx1');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  setVal(sel,v){ const i=document.querySelector(sel||'input,textarea'); if(!i) return 'noinput'; const proto = i.tagName==='TEXTAREA'?window.HTMLTextAreaElement.prototype:window.HTMLInputElement.prototype; const s=Object.getOwnPropertyDescriptor(proto,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  inputs(){ return [...document.querySelectorAll('input,textarea')].map((i,n)=>n+':'+i.tagName+':'+(i.placeholder||i.type)+':max'+(i.maxLength||'-')); },
  clickOpt(t){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); if(b.length){b[b.length-1].click();return 'clicked:'+t} return 'NOOPT:'+t; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

log('=== 首屏 ===');
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('inputs:', await p.eval(`JSON.stringify(__h.inputs())`));
log('ERRORS:', JSON.stringify(p.errors));
await p.shot('shot_yx_home.png');

log('');
log('=== 试试示例 ===');
log(await p.eval(`__h.btn('试试示例')`)); await sleep(900);
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.close(); child.kill();
