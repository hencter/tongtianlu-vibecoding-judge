import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20107, 'D:/tmp/p_caizi7');
const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  setVal(v){ const i=document.querySelector('input,textarea'); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  clickOpt(t){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes(t)); if(b.length){b[b.length-1].click();return 'clicked:'+t} return 'NOOPT:'+t; },
  ph(){ const i=document.querySelector('input'); return i? i.placeholder : 'noinput'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); return await p.eval(`__h.txt()`); };

log('=== 场景按钮是否生效（看 placeholder）===');
log('默认 ph:', await p.eval(`__h.ph()`));
for (const s of ['吃什么', '去哪里', '买哪个', '先做什么', '比方案', '随便决定']) {
  await p.eval(`__h.btn(${JSON.stringify(s)})`); await sleep(400);
  log(`点 ${s} -> ph =`, await p.eval(`__h.ph()`));
}

log('');
log('=== 场景=先做什么，走完流程看问题文案 ===');
await p.eval(`__h.btn('先做什么')`); await sleep(400);
await p.eval(`__h.setVal('写周报')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(400);
await p.eval(`__h.setVal('改简历')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(400);
await p.eval(`__h.btn('开始拍板')`); await sleep(900);
log('Q1:', JSON.stringify((await T()).slice(0, 200)));

log('');
log('=== 无限挑战：连续点「我还是不服」 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`__h.setVal('火锅')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350);
await p.eval(`__h.setVal('日料')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350);
await p.eval(`__h.setVal('烧烤')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350);
await p.eval(`__h.btn('开始拍板')`); await sleep(700);
for (let i = 0; i < 3; i++) { await p.eval(`__h.clickOpt('火锅')`); await sleep(800); }
await H();
for (let r = 0; r < 5; r++) {
  const has = (await p.eval(`__h.btns()`)).some(b => b.includes('我还是不服'));
  log(`轮 ${r}: 有不服按钮=${has}`);
  if (!has) break;
  await p.eval(`__h.btn('我还是不服')`); await sleep(900); await H();
  log(' 挑战页:', JSON.stringify((await T()).slice(0, 200)));
  const opts = await p.eval(`JSON.stringify(__h.btns())`);
  log(' 挑战选项:', opts);
  await p.eval(`__h.clickOpt('日料')`); await sleep(900); await H();
  log(' 二选一后:', JSON.stringify((await T()).slice(0, 260)));
}
log('最终 btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
