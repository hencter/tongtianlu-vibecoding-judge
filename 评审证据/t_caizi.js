const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

const SETVAL = `(el, v) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, v);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}`;

(async () => {
  const { cdp, child } = await launch(9402);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  const btns = () => cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],input,textarea,[role=radio]')).map((el,i)=>({i, t:(el.innerText||el.placeholder||'').replace(/\\n/g,'|').slice(0,50), cls:(el.className||'').toString().slice(0,50), dis:el.disabled})))`);

  async function addOption(v) {
    await cdp.eval(`(()=>{const el=document.querySelector('input.adder__input'); const setter=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; setter.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return el.value;})()`);
    await sleep(200);
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='添加'); b.click(); return 1;})()`);
    await sleep(400);
  }
  async function clickText(t, exact) {
    const r = await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button,[role=button],[role=radio],label')).filter(x=>!x.disabled).find(x=> (${exact} ? (x.innerText||'').trim()===${JSON.stringify(t)} : (x.innerText||'').includes(${JSON.stringify(t)}))); if(b){b.click(); return 'OK:'+(b.innerText||'').trim().slice(0,30);} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(600);
    return r;
  }

  try {
    await goto(cdp, 'https://decide-three-questions.app.workbuddy.host/');

    // ---- 测试用例 1：吃什么场景，3 个选项 ----
    P('########## 用例1：吃什么 / 火锅、日料、沙拉 ##########');
    await clickText('吃什么');
    await addOption('火锅'); await addOption('日料'); await addOption('沙拉');
    P('--- 添加后 ---\n' + await txt());
    P('按钮: ' + await btns());

    P('点击开始拍板: ' + await clickText('开始拍板'));
    P('--- 第1问 ---\n' + await txt());
    P('按钮: ' + await btns());

    // 走完流程，最多 12 步
    for (let step = 0; step < 12; step++) {
      const b = JSON.parse(await btns());
      const t = await txt();
      if (/拍板|就是|结论|结果|就它|决定/.test(t) && step > 0) {
        P('--- 可能已进入结果，step=' + step + ' ---');
      }
      // 选择第一个非禁用的候选按钮（排除导航）
      const cand = b.filter(x => !x.dis && !/开始拍板|添加|再|重|返回|上一步|分享|复制/.test(x.t));
      if (cand.length === 0) { P('无更多可点按钮, step=' + step); break; }
      P('STEP' + step + ' 点击 -> ' + cand[0].t);
      await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button],[role=radio],label')).filter(x=>!x.disabled); const b=arr.find(x=>(x.innerText||'').includes(${JSON.stringify(cand[0].t.split('|')[0].trim())})|| (x.innerText||'')); return 1;})()`);
      // 用索引点击
      await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button],[role=radio],label')).filter(x=>!x.disabled); const el=arr[${cand[0].i}]; if(el){el.click(); return 'clicked';} return 'no';})()`);
      await sleep(900);
      P('--- step' + step + ' 后 ---\n' + await txt());
    }

  } catch (e) {
    P('ERROR: ' + e.message + '\n' + e.stack);
  }
  fs.writeFileSync('out_caizi.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill();
  process.exit(0);
})();
