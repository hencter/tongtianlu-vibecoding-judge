const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9412);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  const btns = () => cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],input')).map((el,i)=>({i, t:(el.innerText||el.value||el.placeholder||'').replace(/\\n/g,'|').slice(0,60), cls:(el.className||'').toString().slice(0,45), dis:el.disabled})))`);

  async function setVal(sel, idx, v) {
    return await cdp.eval(`(()=>{const els=document.querySelectorAll(${JSON.stringify(sel)}); const el=els[${idx}]; if(!el) return 'noel'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true})); return el.value;})()`);
  }
  async function addRow() {
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('加一个')); b&&b.click(); return 1;})()`);
    await sleep(300);
  }
  async function clickText(t) {
    const r = await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled).find(x=>(x.innerText||'').includes(${JSON.stringify(t)})); if(b){b.click(); return 'OK:'+(b.innerText||'').trim().slice(0,20);} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(700); return r;
  }
  async function restart() { await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/'); await sleep(500); }

  try {
    // ============ 用例1：3个候选，跑完整 PK ============
    P('########## 用例1：3 候选（火锅/日料/烧烤）完整 PK ##########');
    await restart();
    await setVal('input.title-input', 0, '今晚吃什么');
    await setVal('input.candidate-input', 0, '火锅');
    await setVal('input.candidate-input', 1, '日料');
    await setVal('input.candidate-input', 2, '烧烤');
    await sleep(400);
    P('填入后: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(5, 20).join(' | ')));
    P('按钮: ' + await btns());

    P('点击开始PK: ' + await clickText('开始 PK'));
    P('=== PK 第1场 ===\n' + await txt());
    P('按钮: ' + await btns());

    // 循环点击，直到出结果
    let step = 0;
    let results = [];
    while (step < 30) {
      const b = JSON.parse(await btns());
      const t = await txt();
      // 找到候选卡片按钮（class 含 pk / choice / card）
      const cand = b.filter(x => !x.dis && /card|pk|opt|choice|vs/i.test(x.cls));
      if (cand.length === 0) {
        P('无候选按钮，step=' + step);
        P('当前页:\n' + t);
        break;
      }
      // 收集本轮对阵信息
      const m = t.match(/第?\s*(\d+)\s*[/|场]/);
      P('--- step' + step + ' 对阵: ' + t.split('\n').filter(x => x.trim()).slice(0, 6).join(' / ') + ' | 候选按钮: ' + cand.map(c => c.t).join(' , '));
      // 策略：奇数轮选第一个，偶数轮选第二个
      const pickIdx = cand[step % cand.length].i;
      await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')); arr[${pickIdx}] && arr[${pickIdx}].click(); return 1;})()`);
      await sleep(800);
      results.push(await txt());
      step++;
    }
    P('=== 最终页 ===\n' + await txt());

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_yixing2.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
