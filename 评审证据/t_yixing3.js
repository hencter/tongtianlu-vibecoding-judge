const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9413);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);

  async function setup(title, cands) {
    await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/');
    await sleep(600);
    await cdp.eval(`(()=>{const el=document.querySelector('input.title-input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,${JSON.stringify(title)}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    // 需要多少行就加多少
    const need = cands.length;
    for (let i = 0; i < need; i++) {
      const has = await cdp.eval(`document.querySelectorAll('input.candidate-input').length`);
      if (has <= i) { await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('加一个')); b&&b.click(); return 1;})()`); await sleep(250); }
    }
    for (let i = 0; i < need; i++) {
      await cdp.eval(`(()=>{const el=document.querySelectorAll('input.candidate-input')[${i}]; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,${JSON.stringify(cands[i])}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
      await sleep(120);
    }
    await sleep(400);
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); b&&b.click(); return 1;})()`);
    await sleep(900);
  }
  // 读取当前对阵
  async function matchInfo() {
    return await cdp.eval(`(()=>{const a=document.querySelector('.side-a'), b=document.querySelector('.side-b'); const hd=Array.from(document.querySelectorAll('*')).find(x=>/第\\s*\\d+\\s*场/.test(x.textContent||'')&&x.children.length<4); return JSON.stringify({head: hd? hd.textContent.trim().slice(0,30):'', a: a?a.innerText.replace(/\\n/g,''):'', b: b?b.innerText.replace(/\\n/g,''):''});})()`);
  }
  // 按名称点击左/右，'tie' 点平
  async function vote(side) {
    const r = await cdp.eval(`(()=>{ if(${JSON.stringify(side)}==='tie'){const t=document.querySelector('.tie-btn'); if(t){t.click();return 'TIE';} return 'notie';} const el=document.querySelector('.side-${side}'); if(el){const n=el.innerText.replace(/\\n/g,' ').trim(); el.click(); return 'VOTE:'+n;} return 'none';})()`);
    await sleep(700); return r;
  }
  async function voteByName(name) {
    const r = await cdp.eval(`(()=>{const a=document.querySelector('.side-a'), b=document.querySelector('.side-b'); if(a&&(a.innerText||'').includes(${JSON.stringify(name)})){a.click(); return 'A:'+${JSON.stringify(name)};} if(b&&(b.innerText||'').includes(${JSON.stringify(name)})){b.click(); return 'B:'+${JSON.stringify(name)};} return 'NOTFOUND:'+${JSON.stringify(name)};})()`);
    await sleep(700); return r;
  }

  try {
    // ===== 用例A：Condorcet 循环 A>B, B>C, C>A =====
    P('########## 用例A：循环偏好 火锅>日料, 日料>烧烤, 烧烤>火锅 ##########');
    await setup('今晚吃什么', ['火锅', '日料', '烧烤']);
    for (let m = 0; m < 6; m++) {
      const info = JSON.parse(await matchInfo());
      if (!info.a) { P('--- 已结束 ---'); break; }
      P('对阵: ' + JSON.stringify(info));
      // 按预设偏好投票
      const a = info.a.replace(/[←→\s]/g, ''), b = info.b.replace(/[←→\s]/g, '');
      const pref = { '火锅': ['日料', '烧烤'], '日料': ['烧烤'], '烧烤': ['火锅'] };
      // 规则：火锅>日料, 日料>烧烤, 烧烤>火锅（循环！）
      let winner = null;
      const order = { '火锅': 0, '日料': 1, '烧烤': 2 };
      if (a === '火锅' && b === '日料') winner = '火锅';
      else if (a === '日料' && b === '火锅') winner = '火锅';
      else if (a === '日料' && b === '烧烤') winner = '日料';
      else if (a === '烧烤' && b === '日料') winner = '日料';
      else if (a === '烧烤' && b === '火锅') winner = '烧烤';
      else if (a === '火锅' && b === '烧烤') winner = '烧烤';
      P('  -> 投给 ' + winner + ' : ' + await voteByName(winner));
    }
    P('=== 结果页 ===\n' + await txt());

    // ===== 用例B：全平局 =====
    P('\n########## 用例B：全部点"差不多" ##########');
    await setup('选哪个', ['甲', '乙', '丙']);
    for (let m = 0; m < 6; m++) {
      const info = JSON.parse(await matchInfo());
      if (!info.a) break;
      P('对阵: ' + JSON.stringify(info) + ' -> ' + await vote('tie'));
    }
    P('=== 结果页 ===\n' + await txt());

    // ===== 用例C：一致性（全选左边）重复 =====
    P('\n########## 用例C：一致性 —— 3 候选全投同一方 ##########');
    for (let r = 1; r <= 2; r++) {
      await setup('测试', ['A', 'B', 'C']);
      for (let m = 0; m < 6; m++) {
        const info = JSON.parse(await matchInfo());
        if (!info.a) break;
        await vote('a');
      }
      P('第' + r + '次: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(0, 16).join(' | ')));
    }

    // ===== 用例D：8 个候选（快速赛 + 循环赛）=====
    P('\n########## 用例D：8 个候选（应触发快速赛）##########');
    await setup('大乱斗', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    let guard = 0;
    const seq = [];
    while (guard < 40) {
      const info = JSON.parse(await matchInfo());
      if (!info.a) break;
      seq.push(info.head + ' ' + info.a + ' vs ' + info.b);
      await vote('a');
      guard++;
    }
    P('共 ' + guard + ' 场对阵:\n' + seq.join('\n'));
    P('=== 结果页 ===\n' + await txt());

    // ===== 用例E：边界 —— 只填1个 / 空候选 =====
    P('\n########## 用例E：边界 —— 只填1个候选 ##########');
    await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/');
    await sleep(600);
    await cdp.eval(`(()=>{const el=document.querySelector('input.candidate-input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,'唯一'); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    await sleep(400);
    P(await txt().then(t => t.split('\n').filter(x => x.trim()).slice(4, 14).join(' | ')));
    const dis = await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); return JSON.stringify({text:b.innerText, disabled:b.disabled, cls:b.className});})()`);
    P('开始PK按钮: ' + dis);
    // 强行点击
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); b.click(); return 1;})()`);
    await sleep(900);
    P('点击后: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(0, 10).join(' | ')));

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_yixing3.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
