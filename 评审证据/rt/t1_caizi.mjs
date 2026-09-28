import { Page, sleep } from './cdp.mjs';

const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);

const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,30)+(b.disabled?'[D]':'')); },
  inp(i){ return document.querySelector('input,textarea'); },
  setVal(v){ const i=document.querySelector('input,textarea'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  typeReal(v){ const i=document.querySelector('input,textarea'); i.focus(); return v; }
};
'ok'`;

await p.eval(HELP);

const log = (...a) => console.log(...a);

// --- T1: empty input add ---
log('--- T1 空输入点添加 ---');
log(await p.eval(`__h.setVal(''); 'set'`));
await sleep(300);
log(await p.eval(`__h.btn('添加')`));
await sleep(500);
log('after empty add, text:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 400)));

// --- T2: whitespace only ---
log('--- T2 纯空格 ---');
await p.eval(`__h.setVal('   ')`);
await sleep(200);
log(await p.eval(`__h.btn('添加')`));
await sleep(500);
log('after ws add:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 400)));

// --- T3: 超长文本 ---
log('--- T3 超长文本(200字符) ---');
await p.eval(`__h.setVal('A'.repeat(200))`);
await sleep(200);
log(await p.eval(`__h.btn('添加')`));
await sleep(500);
log('after long add:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 600)));
log('input value now:', await p.eval(`__h.inp().value.length`));

// --- T4: emoji + 特殊字符 ---
log('--- T4 emoji/特殊字符 ---');
await p.eval(`__h.setVal('🍜<script>alert(1)</script>')`);
await sleep(200);
log(await p.eval(`__h.btn('添加')`));
await sleep(500);
log('after emoji add:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 600)));

// --- T5: duplicate ---
log('--- T5 重复项 ---');
await p.eval(`__h.setVal('火锅')`); await sleep(200); log(await p.eval(`__h.btn('添加')`)); await sleep(400);
await p.eval(`__h.setVal('火锅')`); await sleep(200); log(await p.eval(`__h.btn('添加')`)); await sleep(400);
log('after dup:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 700)));

// --- T6: 快速连点添加 ---
log('--- T6 快速连点添加 x10 ---');
await p.eval(`__h.setVal('测试A')`);
await sleep(200);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('添加')); for(let i=0;i<10;i++) b.click(); return 'ok';})()`);
await sleep(800);
log('after rapid:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 900)));

// --- T7: 超过6个 ---
log('--- T7 尝试加到 6 个以上 ---');
for (const v of ['甲','乙','丙','丁','戊','己','庚','辛']) {
  await p.eval(`__h.setVal(${JSON.stringify(v)})`);
  await sleep(150);
  await p.eval(`__h.btn('添加')`);
  await sleep(300);
}
log('after 8 adds:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 1000)));
log('buttons:', JSON.stringify(await p.eval(`__h.btns()`)));

log('ERRORS:', JSON.stringify(p.errors));
log('LOGS:', JSON.stringify(p.logs.slice(0,10)));
await p.shot('shot_caizi_t1.png');
await p.close();
