import { Page, sleep, launchBrowser } from './cdp.mjs';

const child = await launchBrowser(20101, 'D:/tmp/p_caizi');
const URL = 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(URL, { width: 390, height: 844, mobile: true });
await sleep(1200);
const HELP = `
window.__h = {
  txt(){ return document.body.innerText; },
  btn(t){ const e=[...document.querySelectorAll('button')].find(x=>x.innerText.includes(t)); return e? (e.click(),'clicked:'+t) : 'NOBTN:'+t; },
  btns(){ return [...document.querySelectorAll('button')].map(b=>b.innerText.replace(/\\n/g,'|').slice(0,40)+(b.disabled?'[D]':'')); },
  setVal(v){ const i=document.querySelector('input,textarea'); if(!i) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,v); i.dispatchEvent(new Event('input',{bubbles:true})); return i.value; },
};
'ok'`;
await p.eval(HELP);
const log = (...a) => console.log(...a);
const T = async () => (await p.eval(`__h.txt()`));

const addItem = async (v) => { await p.eval(`__h.setVal(${JSON.stringify(v)})`); await sleep(150); await p.eval(`__h.btn('添加')`); await sleep(350); };

// 添加 3 个
await addItem('火锅'); await addItem('日料'); await addItem('烧烤');
log('=== 列表 ===', JSON.stringify((await T()).slice(0,300)));

log('--- 开始拍板 ---');
log(await p.eval(`__h.btn('开始拍板')`));
await sleep(900);
log('Q1:', JSON.stringify(await T()));

log('--- 检查是否有返回/上一步按钮 ---');
log('btns:', JSON.stringify(await p.eval(`__h.btns()`)));

// 答第一问：点第一个候选
log('--- 选第一个选项 ---');
log(await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('火锅')); if(b.length){b[0].click();return 'clicked'} return 'none'})()`));
await sleep(900);
log('Q2:', JSON.stringify(await T()));

log(await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('日料')); if(b.length){b[0].click();return 'clicked'} return 'none'})()`));
await sleep(900);
log('Q3:', JSON.stringify(await T()));

log(await p.eval(`(()=>{const b=[...document.querySelectorAll('button')].filter(x=>x.innerText.includes('烧烤')); if(b.length){b[0].click();return 'clicked'} return 'none'})()`));
await sleep(1200);
log('RESULT:', JSON.stringify(await T()));
log('btns:', JSON.stringify(await p.eval(`__h.btns()`)));
await p.shot('shot_caizi_result.png');

log('--- 点「我还是不服」挑战 ---');
log(await p.eval(`__h.btn('我还是不服')`));
await sleep(900);
log('CHALLENGE:', JSON.stringify(await T()));
log('btns:', JSON.stringify(await p.eval(`__h.btns()`)));

log('ERRORS:', JSON.stringify(p.errors));
await p.close();
child.kill();
