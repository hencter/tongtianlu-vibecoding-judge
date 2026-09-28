const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9425);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function clickText(t, nth = 0) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const hits=arr.filter(x=>(x.innerText||'').includes(${JSON.stringify(t)})); const b=hits[${nth}]; if(b){b.click(); return 'OK';} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(400); return r;
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(800);
    await clickText('高级条件');
  }
  async function draw() { await clickText('放出锦鲤'); await sleep(2400); return await txt(); }
  function compact(t) {
    const lines = t.split('\n').map(x => x.trim()).filter(Boolean);
    // 抽取卡名 + 适配度 + 食运值 + 人均 + 时间 + 人数
    const out = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] === '适配度') out.push(`[适配${lines[i + 1]} 食运${lines[i + 3]}]`);
      if (/^¥/.test(lines[i]) || /^人均/.test(lines[i])) out.push(lines[i]);
      if (/分钟$/.test(lines[i])) out.push(lines[i]);
      if (/人$|个人一起吃/.test(lines[i])) out.push(lines[i]);
      if (/^本轮/.test(lines[i])) out.push(lines[i]);
      if (/现实对应/.test(lines[i])) out.push(lines[i] + lines[i + 1]);
    }
    return out.join(' | ');
  }

  try {
    // ===== 用例1：人数=5人以上（单独验证）=====
    P('########## 用例1：人数=5人以上（其它默认）##########');
    await fresh();
    P('点击: ' + await clickText('5 人以上'));
    P('确认chip: ' + await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='5 人以上'); return b.className;})()`));
    P(compact(await draw()));

    // ===== 用例2：忌口=不吃辣（硬限制）=====
    P('\n########## 用例2：忌口=不吃辣 + 想吃辣（矛盾），验证硬限制 ##########');
    await fresh();
    await clickText('忌口与过敏'); await sleep(600);
    P('忌口面板按钮: ' + await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],label,input[type=checkbox]')).map(e=>(e.innerText||'').trim().slice(0,20)).filter(Boolean).slice(-25))`));
    // 勾选不吃辣
    P('勾选: ' + await cdp.eval(`(()=>{const els=Array.from(document.querySelectorAll('label,button,[role=button]')); const t=els.find(e=>(e.innerText||'').includes('不吃辣')); if(!t) return 'notfound'; const cb=t.querySelector&&t.querySelector('input'); if(cb){cb.click(); return 'cb:'+cb.checked;} t.click(); return 'clicked';})()`));
    await sleep(400);
    P('勾选后状态: ' + await cdp.eval(`(()=>{const els=Array.from(document.querySelectorAll('label,button,[role=button]')); const t=els.find(e=>(e.innerText||'').includes('不吃辣')); return t? t.outerHTML.slice(0,300):'none';})()`));
    // 关闭面板
    await clickText('关闭'); await sleep(400);
    // 故意选"想吃辣"
    await clickText('想吃辣');
    P('--- 抽卡（硬限制：不吃辣；软偏好：想吃辣）---');
    P(compact(await draw()));

    // ===== 用例3：三档权重对比 =====
    P('\n########## 用例3：同一条件（2人/60-120元/60分钟内/很饿+想吃肉）下三档权重 ##########');
    for (const mode of ['听现实的', '半信半疑', '交给锦鲤']) {
      await fresh();
      await clickText('2 人'); await clickText('60—120 元'); await clickText('60 分钟内');
      await clickText('很饿'); await clickText('想吃肉');
      await clickText(mode);
      P('[' + mode + '] ' + compact(await draw()));
    }

    // ===== 用例4：严格预算生效验证 =====
    P('\n########## 用例4：30元以内 + 严格预算（开）##########');
    await fresh();
    await clickText('30 元以内');
    await cdp.eval(`(()=>{const cbs=document.querySelectorAll('input[type=checkbox]'); if(cbs[0]) cbs[0].click(); return JSON.stringify(Array.from(cbs).map(c=>c.checked));})()`);
    await sleep(400);
    P(compact(await draw()));

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian5.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
