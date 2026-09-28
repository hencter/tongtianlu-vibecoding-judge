import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20301, 'D:/tmp/p_koi1');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2000);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  inputs(){ return [...document.querySelectorAll('input,textarea')].map((i,n)=>n+':'+i.tagName+':'+(i.placeholder||i.type)); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

log('=== 首屏 ===');
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('inputs:', await p.eval(`JSON.stringify(__h.inputs())`));
log('scrollH:', await p.eval(`document.body.scrollHeight`), 'innerH:', await p.eval(`window.innerHeight`));
log('ERRORS:', JSON.stringify(p.errors));
await p.shot('shot_koi_home.png');
await p.close(); child.kill();
