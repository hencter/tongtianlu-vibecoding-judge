import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20208, 'D:/tmp/p_yx8');
const URL = 'https://paiban-decide-now.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  fillRow(n,v){ const i=document.querySelectorAll('input')[n]; if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  rows(){ return document.querySelectorAll('input').length - 1; },
  count(){ const m=document.body.innerText.match(/(\\d+) \\/ 8/); return m?m[1]:'?'; },
  delRow(i){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()==='×'); if(b[i]){b[i].click();return 'ok'} return 'no:'+b.length; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(1800); await H(); };

log('=== 1. Enter 快速新增连按（上限 8）===');
await reset();
for (let i = 0; i < 9; i++) {
  await H();
  await p.eval(`(()=>{const a=[...document.querySelectorAll('input')]; const inp=a[a.length-1]; inp.focus(); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(inp,'E'+${i}); inp.dispatchEvent(new Event('input',{bubbles:true})); return 1})()`);
  await sleep(150);
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await sleep(350);
  await H();
  log(`Enter#${i}: rows=${await p.eval(`__h.rows()`)} count=${await p.eval(`__h.count()`)}`);
}

log('');
log('=== 2. 连点造成 13 行后，开始 PK 会怎样 ===');
await reset();
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('加一个')); for(let i=0;i<10;i++) b.click(); return 1})()`);
await sleep(800); await H();
log('rows=', await p.eval(`__h.rows()`), 'count=', await p.eval(`__h.count()`));
for (let i = 0; i < 13; i++) { await H(); await p.eval(`__h.fillRow(${i + 1}, 'Y' + ${i + 1})`); await sleep(120); }
await H();
log('填满后 count=', await p.eval(`__h.count()`), 'rows=', await p.eval(`__h.rows()`));
await p.eval(`__h.btn('开始 PK')`); await sleep(1400); await H();
log('PK:', JSON.stringify((await T()).slice(0, 300)));

log('');
log('=== 3. 删除行 ===');
await reset();
await p.eval(`__h.fillRow(1,'甲')`); await sleep(200);
await p.eval(`__h.fillRow(2,'乙')`); await sleep(200);
log('删除前 rows/count:', await p.eval(`__h.rows()`), await p.eval(`__h.count()`));
await p.eval(`__h.delRow(0)`); await sleep(500); await H();
log('删除后 rows/count:', await p.eval(`__h.rows()`), await p.eval(`__h.count()`));

log('');
log('=== 4. Tab 键可达性 ===');
await reset();
await p.eval(`document.querySelectorAll('input')[1].focus()`);
for (let i = 0; i < 6; i++) {
  await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(200);
  log('focus:', await p.eval(`(()=>{const a=document.activeElement; return a.tagName+':'+(a.innerText||a.placeholder||a.value||'').slice(0,20)})()`));
}
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
