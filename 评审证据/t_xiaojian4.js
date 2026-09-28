const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9424);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function clickText(t, nth = 0) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const hits=arr.filter(x=>(x.innerText||'').includes(${JSON.stringify(t)})); const b=hits[${nth}]; if(b){b.click(); return 'OK';} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(450); return r;
  }
  async function toggleByLabel(label) {
    return await cdp.eval(`(()=>{const els=Array.from(document.querySelectorAll('input[type=checkbox]')); const labels=Array.from(document.querySelectorAll('label')); for(const l of labels){ if((l.innerText||'').includes(${JSON.stringify(label)})){ const cb=l.querySelector('input[type=checkbox]')|| (l.control); if(cb){cb.click(); return 'TOGGLED:'+l.innerText.trim().slice(0,20);} } } return 'NOLABEL:'+${JSON.stringify(label)};})()`);
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(800);
    await clickText('高级条件');
  }
  async function draw() {
    await clickText('放出锦鲤'); await sleep(2500);
    return await txt();
  }
  // 提取三张卡的 名称/适配度/食运值
  async function cards() {
    return await cdp.eval(`(()=>{
      const out=[];
      document.querySelectorAll('*').forEach(()=>{});
      const t=document.body.innerText;
      return t;
    })()`);
  }

  try {
    // ===== 用例A：严格条件 预算30内 + 15分钟内 + 想吃辣 =====
    P('########## 用例A：1人 / 30元以内 / 15分钟内 / 想吃辣 / 听现实的80-20 ##########');
    await fresh();
    await clickText('30 元以内'); await clickText('15 分钟内'); await clickText('想吃辣'); await clickText('听现实的');
    P('--- 抽卡 ---');
    P(await draw());

    // ===== 用例B：极端 —— 5人以上 + 30元以内 + 15分钟内 + 严格预算 + 严格时间 + 自己做 =====
    P('\n########## 用例B（极端）：5人以上 / 30元以内 / 15分钟内 / 严格预算 / 严格时间 / 自己做 ##########');
    await fresh();
    await clickText('5 人以上'); await clickText('30 元以内'); await clickText('15 分钟内');
    await clickText('自己做');
    // 打开严格预算 / 严格时间 开关
    const sw = await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('input[type=checkbox]')).map((c,i)=>({i, checked:c.checked, near:(c.closest('label')||c.parentElement||{}).innerText||''})))`);
    P('开关状态: ' + sw);
    await cdp.eval(`(()=>{document.querySelectorAll('input[type=checkbox]').forEach(c=>{if(!c.checked) c.click();}); return 1;})()`);
    await sleep(400);
    P('开关已开: ' + await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('input[type=checkbox]')).map(c=>c.checked))`));
    P('--- 抽卡 ---');
    P(await draw());

    // ===== 用例C：忌口硬限制 =====
    P('\n########## 用例C：忌口硬限制 —— 打开忌口面板 ##########');
    await fresh();
    P(await clickText('忌口与过敏'));
    P(await txt());

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian4.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
