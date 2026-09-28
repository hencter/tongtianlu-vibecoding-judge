const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9427);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };

  async function clickExact(t) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const b=arr.find(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(t)})); if(b){b.click(); return 'OK';} return 'MISS:'+${JSON.stringify(t)};})()`);
    await sleep(300); return r;
  }
  async function isOn(t) {
    return await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')); const b=arr.find(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(t)})); return b? (b.className||'').includes('chip-on')||(b.getAttribute&&b.getAttribute('aria-pressed')==='true') : 'nobtn';})()`);
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(1200);
  }
  async function expandAdvanced() {
    for (let i = 0; i < 3; i++) {
      const has = await cdp.eval(`document.body.innerText.includes('严格预算')`);
      if (has) return true;
      await clickExact('高级条件');
      await sleep(500);
    }
    return await cdp.eval(`document.body.innerText.includes('严格预算')`);
  }
  async function parseCards() {
    return JSON.parse(await cdp.eval(`(()=>{
      const lines=document.body.innerText.split('\\n').map(s=>s.trim()).filter(Boolean);
      const cards=[];
      for(let i=0;i<lines.length;i++){
        if(lines[i]==='适配度'){
          const fit=parseInt(lines[i+1],10); let luck=null;
          for(let j=i+1;j<Math.min(i+10,lines.length);j++){ if(lines[j]==='食运值'){luck=parseInt(lines[j+1],10);break;} }
          let name='';
          for(let j=i;j>=0;j--){ if(lines[j].startsWith('现实对应')){name=lines[j].replace('现实对应：','');break;} }
          cards.push({name,fit,luck});
        }
      }
      return JSON.stringify(cards);
    })()`));
  }
  async function run(mode, opts = {}) {
    await fresh();
    if (opts.advanced) {
      const ok = await expandAdvanced();
      if (!ok) P('  !!高级条件未展开');
    }
    P('  ' + await clickExact('2 人') + ' 2人=' + await isOn('2 人'));
    P('  ' + await clickExact('30—60 元') + ' 30-60=' + await isOn('30—60 元'));
    P('  ' + await clickExact('30 分钟内') + ' 30分钟=' + await isOn('30 分钟内'));
    P('  ' + await clickExact('很饿') + ' 很饿=' + await isOn('很饿'));
    P('  ' + await clickExact(mode));
    if (opts.strict) {
      const st = await cdp.eval(`(()=>{const c=document.querySelectorAll('input[type=checkbox]'); if(c.length===0) return 'NOCHECKBOX'; c.forEach(x=>{if(!x.checked)x.click();}); return 'set '+JSON.stringify(Array.from(c).map(x=>x.checked));})()`);
      P('  严格开关: ' + st);
      await sleep(400);
      P('  严格开关确认: ' + await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('input[type=checkbox]')).map(x=>x.checked))`));
    }
    await clickExact('放出锦鲤'); await sleep(2400);
    return await parseCards();
  }

  try {
    const N = 6;
    for (const mode of ['听现实的', '交给锦鲤']) {
      P('########## 档位【' + mode + '】× ' + N + ' 轮（2人 / 30—60元 / 30分钟内 / 很饿）##########');
      const fits = [], lucks = [], names = new Set();
      for (let i = 0; i < N; i++) {
        const cs = await run(mode);
        P('  轮' + (i + 1) + ': ' + cs.map(c => `${c.name}(适${c.fit}/运${c.luck})`).join(' , '));
        cs.forEach(c => { fits.push(c.fit); lucks.push(c.luck); names.add(c.name); });
      }
      const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
      P('  >> 平均适配度=' + avg(fits) + ' 平均食运=' + avg(lucks) + ' 出现过的菜品种类=' + names.size);
      P('');
    }

    P('########## 严格模式复验：2人 / 30元以内 / 15分钟内 / 严格预算+严格时间 ON ##########');
    await fresh();
    await expandAdvanced();
    await clickExact('30 元以内'); await clickExact('15 分钟内'); await clickExact('听现实的');
    const st = await cdp.eval(`(()=>{const c=document.querySelectorAll('input[type=checkbox]'); if(!c.length) return 'NOCHECKBOX'; c.forEach(x=>{if(!x.checked)x.click();}); return 'ok';})()`);
    P('开关: ' + st + ' -> ' + await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('input[type=checkbox]')).map(x=>x.checked))`));
    await sleep(400);
    await clickExact('放出锦鲤'); await sleep(2400);
    const cs = await parseCards();
    P('结果: ' + JSON.stringify(cs));
    P('完整文本:\n' + await cdp.eval(`document.body.innerText`));

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian7.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
