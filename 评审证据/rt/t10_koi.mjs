import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20310, 'D:/tmp/p_koi10');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,44)+(b.disabled?'[D]':'')); },
  spiceTags(){ const t=document.body.innerText; return (t.match(/^辣+$/gm)||[]).join(','); },
  names(){ const t=document.body.innerText; return (t.match(/现实对应：[^\\n]+/g)||[]).join(' | '); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(2200); await H(); };

log('########## 忌口不吃辣 x 6 轮 ##########');
await reset();
await p.eval(`__h.btn('设置')`); await sleep(1200); await H();
await p.eval(`__h.btn('不吃辣')`); await sleep(500);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='关闭'); if(b) b.click(); return 1})()`); await sleep(800);
let hit = 0;
for (let r = 0; r < 6; r++) {
  await H();
  if (!(await p.eval(`document.body.innerText`)).includes('锦鲤带回了三张卡')) { await p.eval(`__h.btn('放出锦鲤')`); await sleep(4200); }
  await H();
  const sp = await p.eval(`__h.spiceTags()`);
  if (sp) hit++;
  log(`轮${r + 1} 辣标签=[${sp}] 卡=${await p.eval(`__h.names()`)}`);
  await p.eval(`__h.btn('重新填条件')`); await sleep(1400);
}
log(`>>> 6 轮中有 ${hit} 轮抽到含辣标签的卡（忌口=不吃辣）`);

log('');
log('########## 快速连点「放出锦鲤」##########');
await reset();
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('放出锦鲤')); for(let i=0;i<8;i++) b.click(); return 1})()`);
await sleep(5000); await H();
log('连点后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 400)));

log('');
log('########## 完成一次决定 → 历史 → 刷新 ##########');
await reset();
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4200); await H();
await p.eval(`__h.btn('就吃这个')`); await sleep(2000); await H();
log('就吃这个后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 900)));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
await H(); const has = (await p.eval(`__h.btns()`));
if (JSON.stringify(has).includes('完成这次决定')) { await p.eval(`__h.btn('完成这次决定')`); await sleep(1800); await H(); }
log('完成后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 700)));
await p.reload(); await sleep(2500); await H();
log('刷新后:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 500)));
await p.eval(`__h.btn('历史')`); await sleep(1500); await H();
log('历史页:', JSON.stringify((await p.eval(`__h.txt()`)).slice(0, 700)));

log('');
log('########## 窄屏 320 溢出 ##########');
await reset();
await p.setViewport(320, 640, true); await sleep(1000); await H();
log(await p.eval(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:window.innerWidth})`));
await p.eval(`__h.btn('放出锦鲤')`); await sleep(4200); await H();
log('抽卡页 320:', await p.eval(`JSON.stringify({sw:document.documentElement.scrollWidth, iw:window.innerWidth})`));
await p.shot('shot_koi_320.png');
log('ERRORS:', JSON.stringify(p.errors.slice(0, 6)));
await p.close(); child.kill();
