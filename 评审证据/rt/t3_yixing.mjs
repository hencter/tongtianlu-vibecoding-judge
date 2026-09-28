import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20203, 'D:/tmp/p_yx3');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  rows(){ return [...document.querySelectorAll('input')].length - 1; },
  setVal(n,v){ const i=document.querySelectorAll('input')[n]; if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  setLast(v){ const a=[...document.querySelectorAll('input')]; const i=a[a.length-1]; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  fillRow(n,v){ const i=document.querySelectorAll('input')[n]; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  clickOpt(t){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); if(b.length){b[b.length-1].click();return 'clicked:'+t} return 'NOOPT:'+t; },
  count(){ const m=document.body.innerText.match(/(\\d+) \\/ 8/); return m?m[1]:'?'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

log('=== 逐个慢速添加，看是否在 8 处停止 ===');
for (let i = 0; i < 12; i++) {
  await H();
  const r = await p.eval(`__h.fillRow(${i + 1}, 'C${i + 1}')`);
  await sleep(200);
  const clicked = await p.eval(`__h.btn('加一个')`);
  await sleep(350);
  const rows = await p.eval(`__h.rows()`);
  log(`第 ${i + 1} 次: fill=${r} ${clicked} rows=${rows}`);
  if (rows >= 13) break;
}
await H();
log('最终 rows =', await p.eval(`__h.rows()`), ' count =', await p.eval(`__h.count()`));
log('文本:', JSON.stringify((await T()).slice(0, 900)));

log('');
log('=== 用 3 个候选走 PK 流程 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.fillRow(1,'火锅')`); await sleep(200);
await p.eval(`__h.fillRow(2,'日料')`); await sleep(200);
await p.eval(`__h.btn('加一个')`); await sleep(400);
await p.eval(`__h.fillRow(3,'烧烤')`); await sleep(200);
await p.eval(`__h.btn('开始 PK')`); await sleep(1200); await H();
log('PK 第1场:', JSON.stringify(await T()));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_yx_pk.png');

let guard = 0;
while (guard++ < 25) {
  await H();
  const btns = await p.eval(`__h.btns()`);
  const left = btns.find(b => b.startsWith('选左边')) || btns.find(b => b.includes('选左边'));
  if (left) { await p.eval(`__h.btn('选左边')`); await sleep(700); continue; }
  break;
}
await H();
log('=== PK 结束 ===');
log(await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_yx_result.png');
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
