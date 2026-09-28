import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20105, 'D:/tmp/p_caizi5');
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
  del(i){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()==='✕'); if(b[i]){b[i].click();return 'del'+i} return 'nodel:'+b.length; },
  items(){ return [...document.querySelectorAll('li')].map(l=>l.innerText.replace(/\\n/g,'')) ; },
  count(){ const m=document.body.innerText.match(/(\\d+) \\/ 6/); return m?m[1]:'?'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const tail = async () => { const t = await T(); const i = t.indexOf('候选选项'); return t.slice(i).replace(/\n/g, ' | '); };
const addItem = async (v) => { await H(); await p.eval(`__h.setVal(${JSON.stringify(v)})`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(400); };

log('=== B. 键盘：真实按键输入 + Enter 提交 ===');
await p.eval(`document.querySelector('input').focus()`);
for (const ch of ['火', '锅']) {
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', text: ch, key: ch });
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ch });
  await sleep(150);
}
await sleep(300);
log('真实键入后 input.value =', await p.eval(`document.querySelector('input').value`));
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(800);
log('Enter 后:', await tail());

log('');
log('=== C. 删除到 1 个 / 0 个 ===');
await p.goto(URL); await sleep(1500);
await addItem('甲'); await addItem('乙');
log('2 个:', await tail());
await p.eval(`__h.del(0)`); await sleep(500);
log('删 1 个后:', await tail());
await p.eval(`__h.del(0)`); await sleep(500);
log('删到 0 后:', await tail());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== D. 重复：大小写 / 前后空格 ===');
await p.goto(URL); await sleep(1500);
await addItem('Hotpot'); await addItem('hotpot');
log('大小写:', await tail());
await addItem('  火锅  '); await addItem('火锅');
log('空格:', await tail());

log('');
log('=== F. 三个候选，极端长名(24字) 显示 ===');
await p.goto(URL); await sleep(1500);
await addItem('一二三四五六七八九十一二三四五六七八九十一二三四'); // 24
log('24字:', await tail());
await addItem('A'.repeat(25)); await sleep(300);
log('25字:', await tail());

log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
