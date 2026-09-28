const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9414);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);

  async function fresh() {
    await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/');
    await sleep(700);
  }
  async function setup(title, cands) {
    await fresh();
    await cdp.eval(`(()=>{const el=document.querySelector('input.title-input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,${JSON.stringify(title)}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    for (let i = 0; i < cands.length; i++) {
      const has = await cdp.eval(`document.querySelectorAll('input.candidate-input').length`);
      if (has <= i) { await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('加一个')); b&&b.click(); return 1;})()`); await sleep(250); }
    }
    for (let i = 0; i < cands.length; i++) {
      await cdp.eval(`(()=>{const el=document.querySelectorAll('input.candidate-input')[${i}]; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,${JSON.stringify(cands[i])}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
      await sleep(120);
    }
    await sleep(400);
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); b&&b.click(); return 1;})()`);
    await sleep(1000);
    const ok = await cdp.eval(`!!document.querySelector('.side-a')`);
    if (!ok) P('!! 未进入 PK 界面，页面：' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(0, 12).join(' | ')));
    return ok;
  }
  async function matchInfo() {
    return await cdp.eval(`(()=>{const a=document.querySelector('.side-a'), b=document.querySelector('.side-b'); const h=Array.from(document.querySelectorAll('*')).filter(x=>/^第\\s*\\d+\\s*场/.test((x.textContent||'').trim())&&x.children.length<=3).pop(); return JSON.stringify({head:h?h.textContent.trim().slice(0,40):'', a:a?a.innerText.replace(/\\n/g,' ').trim():'', b:b?b.innerText.replace(/\\n/g,' ').trim():''});})()`);
  }
  async function vote(side) {
    await cdp.eval(`(()=>{ if(${JSON.stringify(side)}==='tie'){const t=document.querySelector('.tie-btn'); if(t){t.click();return 1;}} const el=document.querySelector('.side-${side}'); if(el){el.click(); return 1;} return 0;})()`);
    await sleep(650);
  }
  async function voteByName(name) {
    const r = await cdp.eval(`(()=>{const a=document.querySelector('.side-a'), b=document.querySelector('.side-b'); if(a&&(a.innerText||'').includes(${JSON.stringify(name)})){a.click(); return 'A:'+${JSON.stringify(name)};} if(b&&(b.innerText||'').includes(${JSON.stringify(name)})){b.click(); return 'B:'+${JSON.stringify(name)};} return 'NOTFOUND:'+${JSON.stringify(name)};})()`);
    await sleep(650); return r;
  }

  try {
    // ===== 用例B：全平局 =====
    P('########## 用例B（重测）：3 候选全点"差不多" ##########');
    await setup('选哪个', ['甲', '乙', '丙']);
    let n = 0;
    while (n < 10) { const i = JSON.parse(await matchInfo()); if (!i.a) break; P('  ' + i.a + ' VS ' + i.b + ' -> 平'); await vote('tie'); n++; }
    P('=== 全平结果 ===\n' + await txt());

    // ===== 用例D：8 候选 =====
    P('\n########## 用例D（重测）：8 候选 ##########');
    const ok = await setup('大乱斗', ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    P('进入PK: ' + ok);
    let guard = 0; const seq = [];
    while (guard < 45) {
      const i = JSON.parse(await matchInfo()); if (!i.a) break;
      seq.push('[' + i.head + '] ' + i.a + ' VS ' + i.b);
      await vote('a'); guard++;
    }
    P('共 ' + guard + ' 场:\n' + seq.join('\n'));
    P('=== 8候选结果 ===\n' + await txt());

    // ===== 用例E：边界 —— 只填1个候选 =====
    P('\n########## 用例E（重测）：只填1个候选 ##########');
    await fresh();
    await cdp.eval(`(()=>{const el=document.querySelector('input.candidate-input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,'唯一'); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    await sleep(500);
    P('页面: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(4, 14).join(' | ')));
    P('开始PK按钮: ' + await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); return JSON.stringify({disabled:b.disabled, cls:b.className});})()`));
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始 PK')); b.click(); return 1;})()`);
    await sleep(1000);
    P('强行点击后: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(0, 12).join(' | ')));

    // ===== 用例F：0 候选 =====
    P('\n########## 用例F：清空所有候选 ##########');
    await fresh();
    await cdp.eval(`(()=>{document.querySelectorAll('.row-remove').forEach(b=>b.click()); return 1;})()`);
    await sleep(600);
    P('页面: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(4, 14).join(' | ')));

    // ===== 用例G：重复候选名 =====
    P('\n########## 用例G：重复候选名 ##########');
    await setup('重名测试', ['火锅', '火锅', '日料']);
    let g2 = 0; const seq2 = [];
    while (g2 < 10) { const i = JSON.parse(await matchInfo()); if (!i.a) break; seq2.push(i.a + ' VS ' + i.b); await voteByName('日料').catch(() => vote('a')); g2++; }
    P('对阵: ' + seq2.join(' / '));
    P('结果: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(0, 14).join(' | ')));

    // ===== 用例H：一致性 —— 相同投票序列跑2次 =====
    P('\n########## 用例H：一致性 ##########');
    for (let r = 1; r <= 2; r++) {
      await setup('一致性', ['X', 'Y', 'Z']);
      let c = 0;
      while (c < 10) { const i = JSON.parse(await matchInfo()); if (!i.a) break; await voteByName('X').catch(() => vote('a')); c++; }
      P('第' + r + '次: ' + await txt().then(t => t.split('\n').filter(x => x.trim()).slice(3, 10).join(' | ')));
    }

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_yixing4.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
