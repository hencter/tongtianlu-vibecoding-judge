import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20306, 'D:/tmp/p_koi6');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  flip(i){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('点击翻牌')); if(b[i]){b[i].click(); return 'flip#'+i+'/'+b.length} return 'noflip:'+b.length; },
  opened(){ const m=document.body.innerText.match(/已翻开 (\\d+) \\/ 3/); return m?m[1]:'none'; },
  scrollInfo(){ const els=[...document.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+20); return els.map(e=>e.className.slice(0,60)+' sw='+e.scrollWidth+' cw='+e.clientWidth); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);

await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('可横向滚动容器:', JSON.stringify(await p.eval(`JSON.stringify(__h.scrollInfo())`)));
log('--- 依次点第 1/2/3 张的翻牌按钮 ---');
log(await p.eval(`__h.flip(0)`)); await sleep(1200); await H(); log('已翻开', await p.eval(`__h.opened()`));
log(await p.eval(`__h.flip(1)`)); await sleep(1200); await H(); log('已翻开', await p.eval(`__h.opened()`));
log(await p.eval(`__h.flip(2)`)); await sleep(1200); await H(); log('已翻开', await p.eval(`__h.opened()`));
log('--- 真实触摸滑动到第 2 张 ---');
await p.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 330, y: 500 }] });
await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 150, y: 500 }] });
await p.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 50, y: 500 }] });
await p.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await sleep(1200); await H();
log('滑动后 已翻开', await p.eval(`__h.opened()`));
log(await p.eval(`__h.flip(0)`)); await sleep(1200); await H();
log('滑动后翻牌 已翻开', await p.eval(`__h.opened()`));
const t = await p.eval(`__h.txt()`);
log('页面含反悔券:', t.includes('反悔券'));
log(JSON.stringify(t.slice(t.indexOf('已翻开') - 50, t.indexOf('已翻开') + 260)));
await p.shot('shot_koi_flip3.png');
await p.close(); child.kill();
