import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20304, 'D:/tmp/p_koi4');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,44)+(b.disabled?'[D]':'')); },
  drawn(){ return [...document.querySelectorAll('*')].filter(e=>e.children.length===0 && e.textContent.trim()==='卡面绘制中').length; }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

log('首页 4xx/失败:', JSON.stringify(p.net, null, 1));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(5000); await H();
log('抽卡后 4xx/失败:', JSON.stringify(p.net, null, 1));
log('卡面绘制中数量:', await p.eval(`__h.drawn()`));

log('');
log('=== 翻开三张卡，看是否有反悔券与详情页 ===');
await H();
log(await p.eval(`__h.btn('点击翻牌')`)); await sleep(1200);
await H(); log(await p.eval(`__h.btn('点击翻牌')`)); await sleep(1200);
await H(); log(await p.eval(`__h.btn('点击翻牌')`)); await sleep(1500);
await H();
log('翻完:', JSON.stringify((await T()).slice(0, 1500)));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await p.shot('shot_koi_flip.png');
log('翻卡后 4xx:', JSON.stringify(p.net));

log('');
log('=== 查看奇遇 ===');
await H(); log(await p.eval(`__h.btn('查看奇遇')`)); await sleep(1200); await H();
log('奇遇:', JSON.stringify((await T()).slice(0, 1200)));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
