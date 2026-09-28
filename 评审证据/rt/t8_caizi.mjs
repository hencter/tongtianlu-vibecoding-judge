import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20108, 'D:/tmp/p_caizi8');
const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  setVal(v){ const i=document.querySelector('input,textarea'); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
  hist(){ return history.length; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
log('history.length 首页:', await p.eval(`history.length`));
await p.eval(`__h.setVal('甲')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350);
await p.eval(`__h.setVal('乙')`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350);
await p.eval(`__h.btn('开始拍板')`); await sleep(800); await H();
log('history.length 流程页:', await p.eval(`history.length`));
log('当前:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 120)));
log('=== 按浏览器返回 ===');
await p.send('Page.navigateToHistoryEntry').catch(e => log('nav err', e.message));
const h = await p.send('Page.getNavigationHistory');
log('entries:', h.entries.length, 'index:', h.currentIndex);
if (h.currentIndex > 0) {
  await p.send('Page.navigateToHistoryEntry', { entryId: h.entries[h.currentIndex - 1].id });
  await sleep(2000);
  log('返回后 url:', await p.eval(`location.href`));
  log('返回后:', JSON.stringify((await p.eval(`document.body.innerText`)).slice(0, 200)));
}
log('=== Esc 键 ===');
await p.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
await sleep(600);
log('Esc 后:', JSON.stringify((await p.eval(`document.body.innerText`)).slice(0, 200)));
await p.close(); child.kill();
