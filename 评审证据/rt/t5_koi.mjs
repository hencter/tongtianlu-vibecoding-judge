import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20305, 'D:/tmp/p_koi5');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  flip(i){ const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('点击翻牌')); if(b[i]){b[i].click(); return 'flip#'+i+'/'+b.length} return 'noflip:'+b.length; },
  flips(){ return [...document.querySelectorAll('button')].filter(x=>x.innerText.includes('点击翻牌')).length; },
  opened(){ const m=document.body.innerText.match(/已翻开 (\\d+) \\/ 3/); return m?m[1]:'none'; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,44)+(b.disabled?'[D]':'')); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const T = async () => { await H(); const v = await p.eval(`__h.txt()`); return typeof v === 'string' ? v : JSON.stringify(v); };

await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); await H();
log('翻开前:', await p.eval(`__h.opened()`), '翻牌按钮数:', await p.eval(`__h.flips()`));
log(await p.eval(`__h.flip(0)`)); await sleep(1200); await H();
log('-> 已翻开:', await p.eval(`__h.opened()`), '翻牌按钮数:', await p.eval(`__h.flips()`));
log(await p.eval(`__h.flip(0)`)); await sleep(1200); await H();
log('-> 已翻开:', await p.eval(`__h.opened()`), '翻牌按钮数:', await p.eval(`__h.flips()`));
log(await p.eval(`__h.flip(0)`)); await sleep(1200); await H();
log('-> 已翻开:', await p.eval(`__h.opened()`), '翻牌按钮数:', await p.eval(`__h.flips()`));
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));

log('');
log('=== 左右滑动查看其它卡（第 2、3 张翻牌）===');
for (let i = 0; i < 6; i++) {
  await H();
  const n = await p.eval(`__h.flips()`);
  log(`轮${i} 翻牌按钮数=${n} 已翻开=${await p.eval(`__h.opened()`)}`);
  if (n === 0) break;
  await p.eval(`__h.flip(0)`); await sleep(1000);
  // 尝试滑动
  await p.eval(`(()=>{const el=document.querySelector('[class*="snap"],[class*="overflow-x"]'); if(el) el.scrollLeft += 400; return 'scrolled'})()`);
  await sleep(700);
}
await H();
log('最终 已翻开:', await p.eval(`__h.opened()`));
log('是否出现反悔券:', (await T()).includes('反悔券') ? 'yes' : 'no');
log('btns:', await p.eval(`JSON.stringify(__h.btns())`));
log('4xx:', JSON.stringify(p.net));
await p.shot('shot_koi_flip2.png');
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
