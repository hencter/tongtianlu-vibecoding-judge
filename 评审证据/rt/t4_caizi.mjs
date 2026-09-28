import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20104, 'D:/tmp/p_caizi4');
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
  del(i){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.trim()==='✕'); if(b[i]){b[i].click();return 'del'+i} return 'nodel'; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { const v = await p.eval(`typeof __h==='undefined' ? 'NOHELPER' : __h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };
const addItem = async (v) => { await H(); await p.eval(`__h.setVal(${JSON.stringify(v)})`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350); };

log('=== A. 随机按钮「随便决定」 ===');
await addItem('火锅'); await addItem('日料'); await addItem('烧烤');
await H(); log(await p.eval(`__h.btn('随便决定')`)); await sleep(1200); await H();
log('AFTER 随便决定:', await T());
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== B. 键盘 Tab/Enter 可用性 ===');
await p.goto(URL); await sleep(1500); await H();
await p.eval(`document.querySelector('input').focus()`);
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', text: '火锅' });
await p.eval(`__h.setVal('火锅')`);
await sleep(200);
log('Enter 提交: before=', (await T()).slice(0, 40).replace(/\n/g, '|'));
await p.send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r' });
await p.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
await sleep(700); await H();
log('Enter 提交 after:', (await T()).slice(200, 420).replace(/\n/g, '|'));

log('');
log('=== C. 删除到 1 个 / 0 个 ===');
await p.goto(URL); await sleep(1500); await H();
await addItem('甲'); await addItem('乙');
log('2 个时 btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.eval(`__h.del(0)`); await sleep(500); await H();
log('删到 1 个:', (await T()).slice(200, 420).replace(/\n/g, '|'));
await p.eval(`__h.del(0)`); await sleep(500); await H();
log('删到 0 个:', (await T()).slice(200, 420).replace(/\n/g, '|'));

log('');
log('=== D. 重复校验：大小写/空格 ===');
await p.goto(URL); await sleep(1500); await H();
await addItem('Hotpot');
await addItem('hotpot'); await H();
log('大小写不同:', JSON.stringify((await T()).slice(200, 400)));
await addItem('  火锅  ');
await addItem('火锅'); await H();
log('前后空格:', JSON.stringify((await T()).slice(200, 500)));

log('');
log('=== E. 决胜平局后能否有重开入口 ===');
await p.goto(URL); await sleep(1500); await H();
await addItem('火锅'); await addItem('日料'); await addItem('烧烤');
await H(); await p.eval(`__h.btn('开始拍板')`); await sleep(700);
await p.eval(`__h.clickOpt('火锅')`); await sleep(800);
await p.eval(`__h.clickOpt('日料')`); await sleep(800);
await p.eval(`__h.clickOpt('烧烤')`); await sleep(900); await H();
log('决胜页:', await T());
log('决胜 btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.eval(`__h.clickOpt('日料')`); await sleep(1200); await H();
log('决胜后 FINAL:', await T());
log('FINAL btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
