import { Page, sleep, launchBrowser } from './cdp.mjs';
const child = await launchBrowser(20309, 'D:/tmp/p_koi9');
const URL = 'https://koi-food-decider.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(2500);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  toggle(i){ const c=document.querySelectorAll('input[type=checkbox]')[i]; if(!c) return 'nocb'; c.click(); return c.checked; },
  cards(){ const t=document.body.innerText; const i=t.indexOf('锦鲤带回了三张卡'); if(i<0) return 'NOCARDS'; const s=t.slice(i); const j=s.indexOf('已翻开'); return s.slice(0, j>0?j:1200); },
  spicy(){ const t=document.body.innerText; const m=t.match(/辣+/g); return m?m.join(','):'无辣标记'; },
  prices(){ const t=document.body.innerText; return (t.match(/人均 ¥[\\d—]+/g)||[]).join(' | '); },
  times(){ const t=document.body.innerText; return (t.match(/[\\d]+—[\\d]+ 分钟/g)||[]).join(' | '); }
};'ok'`;
const H = async () => { await p.eval(HELP); };
await H();
const log = (...a) => console.log(...a);
const reset = async () => { await p.eval(`try{localStorage.clear();sessionStorage.clear();}catch(e){}`); await p.goto(URL); await sleep(2200); await H(); };

log('########## 忌口「不吃辣」硬限制 —— 连续 3 轮验证 ##########');
await reset();
await p.eval(`__h.btn('设置')`); await sleep(1200); await H();
await p.eval(`__h.btn('不吃辣')`); await sleep(500);
await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.trim()==='关闭'); if(b) b.click(); return 1})()`); await sleep(800); await H();
log('首页忌口:', (await p.eval(`__h.txt()`)).includes('已设 1 项') ? '已设 1 项 ✓' : '未设置 ✗');
for (let r = 0; r < 3; r++) {
  await H();
  if (!(await p.eval(`document.body.innerText`)).includes('锦鲤带回了三张卡')) {
    await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500);
  }
  await H();
  log(`轮 ${r + 1} 辣标记:`, await p.eval(`__h.spicy()`));
  log(`轮 ${r + 1} 卡名:`, JSON.stringify((await p.eval(`__h.cards()`)).match(/现实对应：[^\\n]+/g)));
  await p.eval(`__h.btn('重新填条件')`); await sleep(1500);
}

log('');
log('########## 严格预算 30 元以内 —— 连续 3 轮 ##########');
await reset();
await p.eval(`__h.btn('高级条件')`); await sleep(700); await H();
await p.eval(`__h.btn('30 元以内')`); await sleep(400);
await p.eval(`__h.toggle(0)`); await sleep(400);
for (let r = 0; r < 3; r++) {
  await H();
  if (!(await p.eval(`document.body.innerText`)).includes('锦鲤带回了三张卡')) { await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); }
  await H();
  log(`轮 ${r + 1} 人均:`, await p.eval(`__h.prices()`));
  await p.eval(`__h.btn('重新填条件')`); await sleep(1500);
}

log('');
log('########## 严格时间 15 分钟内 —— 连续 3 轮 ##########');
await reset();
await p.eval(`__h.btn('高级条件')`); await sleep(700); await H();
await p.eval(`__h.btn('15 分钟内')`); await sleep(400);
await p.eval(`__h.toggle(1)`); await sleep(400);
for (let r = 0; r < 3; r++) {
  await H();
  if (!(await p.eval(`document.body.innerText`)).includes('锦鲤带回了三张卡')) { await p.eval(`__h.btn('放出锦鲤')`); await sleep(4500); }
  await H();
  log(`轮 ${r + 1} 时间:`, await p.eval(`__h.times()`));
  await p.eval(`__h.btn('重新填条件')`); await sleep(1500);
}
log('ERRORS:', JSON.stringify(p.errors));
await p.close(); child.kill();
