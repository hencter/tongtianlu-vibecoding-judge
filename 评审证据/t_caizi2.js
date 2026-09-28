const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9403);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  const btns = () => cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],input,textarea')).map((el,i)=>({i, t:(el.innerText||el.placeholder||'').replace(/\\n/g,'|').slice(0,50), dis:el.disabled})))`);

  async function addOption(v) {
    await cdp.eval(`(()=>{const el=document.querySelector('input.adder__input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    await sleep(150);
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='添加'); b&&b.click(); return 1;})()`);
    await sleep(300);
  }
  async function pick(name) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const b=arr.find(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(name)})); if(b){b.click(); return 'OK';} return 'NOTFOUND '+${JSON.stringify(name)};})()`);
    await sleep(700); return r;
  }
  async function clickIdx(i) {
    await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); if(arr[${i}]){arr[${i}].click(); return 1;} return 0;})()`);
    await sleep(700);
  }
  async function restart() {
    // 回到首页
    await goto(cdp, 'https://decide-three-questions.app.workbuddy.host/');
  }

  try {
    // ===== 用例2：三问分别选不同选项（冲突裁决测试）=====
    P('########## 用例2：冲突裁决 现实=日料 / 内心=火锅 / 后悔=沙拉 ##########');
    await restart();
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('吃什么')); b&&b.click(); return 1;})()`);
    await sleep(400);
    await addOption('火锅'); await addOption('日料'); await addOption('沙拉');
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
    await sleep(800);
    P('Q1: ' + await txt().then(t => t.split('\n').filter(l => l.trim()).slice(2, 6).join(' / ')));
    P('Q1选日料: ' + await pick('日料'));
    P('Q2: ' + await txt().then(t => t.split('\n').filter(l => l.trim()).slice(2, 6).join(' / ')));
    P('Q2选火锅: ' + await pick('火锅'));
    P('Q3: ' + await txt().then(t => t.split('\n').filter(l => l.trim()).slice(2, 6).join(' / ')));
    P('Q3选沙拉: ' + await pick('沙拉'));
    P('=== 冲突裁决结果 ===\n' + await txt());

    // ===== 用例3：一致性（同样输入跑3次）=====
    P('\n########## 用例3：一致性 —— 相同输入重复3次 ##########');
    for (let r = 1; r <= 3; r++) {
      await restart();
      await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('买哪个')); b&&b.click(); return 1;})()`);
      await sleep(400);
      await addOption('A款'); await addOption('B款');
      await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
      await sleep(700);
      await pick('A款'); await pick('A款'); await pick('B款');
      const t = await txt();
      const lines = t.split('\n').filter(x => x.trim());
      P('第' + r + '次结果: ' + lines.slice(0, 12).join(' | '));
    }

    // ===== 用例4：边界 —— 只放1个选项 =====
    P('\n########## 用例4：边界 —— 只放1个选项 ##########');
    await restart();
    await addOption('唯一选项');
    P(await txt().then(t => t.split('\n').filter(x => x.trim()).slice(-6).join(' | ')));
    P('按钮状态: ' + await btns());

    // ===== 用例5：边界 —— 空输入 / 重复选项 =====
    P('\n########## 用例5：边界 —— 空输入点添加 ##########');
    await cdp.eval(`(()=>{const el=document.querySelector('input.adder__input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,''); el.dispatchEvent(new Event('input',{bubbles:true})); const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='添加'); b.click(); return 1;})()`);
    await sleep(500);
    P(await txt().then(t => t.split('\n').filter(x => x.trim()).slice(-8).join(' | ')));

    P('\n########## 用例6：边界 —— 重复同名选项 ##########');
    await restart();
    await addOption('火锅'); await addOption('火锅');
    P(await txt().then(t => t.split('\n').filter(x => x.trim()).slice(-10).join(' | ')));

    // ===== 用例7：超过6个上限 =====
    P('\n########## 用例7：超过 6 个上限 ##########');
    await restart();
    for (let i = 1; i <= 8; i++) await addOption('选项' + i);
    P(await txt().then(t => t.split('\n').filter(x => x.trim()).slice(8, 30).join(' | ')));

    // ===== 用例8：不同场景是否换题目 =====
    P('\n########## 用例8：换场景题目是否变化 ##########');
    for (const sc of ['买哪个', '先做什么', '比方案', '去哪里']) {
      await restart();
      await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes(${JSON.stringify(sc)})); b&&b.click(); return 1;})()`);
      await sleep(300);
      await addOption('甲'); await addOption('乙');
      await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
      await sleep(700);
      const t = await txt();
      P('场景[' + sc + '] Q1: ' + t.split('\n').filter(x => x.trim()).slice(2, 5).join(' / '));
    }

  } catch (e) {
    P('ERROR: ' + e.message + '\n' + e.stack);
  }
  fs.writeFileSync('out_caizi2.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill();
  process.exit(0);
})();
