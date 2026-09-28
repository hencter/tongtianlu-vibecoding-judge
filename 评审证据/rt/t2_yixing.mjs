import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20202, 'D:/tmp/p_yx2');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  vals(){ return [...document.querySelectorAll('input,textarea')].map(i=>i.value); },
  setVal(n,v){ const i=document.querySelectorAll('input,textarea')[n]; if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  setLast(v){ const a=[...document.querySelectorAll('input,textarea')]; const i=a[a.length-1]; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  clickOpt(t){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); if(b.length){b[b.length-1].click();return 'clicked:'+t} return 'NOOPT:'+t; },
  count(){ const m=document.body.innerText.match(/(\\d+) \\/ 8/); return m?m[1]:'?'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

log('=== A. 空候选直接开始 PK ===');
log(await p.eval(`__h.btn('开始 PK')`)); await sleep(1000);
log(await T());

log('');
log('=== B. 只有 1 个候选 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.setLast('火锅')`); await sleep(300);
log('count=', await p.eval(`__h.count()`));
log(await p.eval(`__h.btn('开始 PK')`)); await sleep(1000);
log(await T());

log('');
log('=== C. 快速连点「＋ 加一个」10 次（上限 8）===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('加一个')); for(let i=0;i<10;i++) b.click(); return 'ok'})()`);
await sleep(900);
log('count=', await p.eval(`__h.count()`));
log('文本:', JSON.stringify((await T()).slice(0, 500)));

log('');
log('=== D. 超长/特殊字符/emoji ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.setLast('A'.repeat(200))`); await sleep(300);
log('200字存入长度:', await p.eval(`[...document.querySelectorAll('input,textarea')].pop().value.length`));
await p.eval(`__h.setLast('🍜<script>x</script>')`); await sleep(300);
log('emoji:', await p.eval(`[...document.querySelectorAll('input,textarea')].pop().value`));
log('决定名 200字:', await p.eval(`__h.setVal(0,'B'.repeat(200))`));
log('决定名长度:', await p.eval(`document.querySelectorAll('input')[0].value.length`));

log('');
log('=== E. 重复候选 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.setLast('火锅')`); await sleep(250); await p.eval(`__h.btn('加一个')`); await sleep(400);
await p.eval(`__h.setLast('火锅')`); await sleep(250); await p.eval(`__h.btn('加一个')`); await sleep(400);
log('vals:', await p.eval(`JSON.stringify(__h.vals())`));
log('count=', await p.eval(`__h.count()`));
log(await p.eval(`__h.btn('开始 PK')`)); await sleep(1200);
log('PK 页:', JSON.stringify((await T()).slice(0, 400)));

log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
