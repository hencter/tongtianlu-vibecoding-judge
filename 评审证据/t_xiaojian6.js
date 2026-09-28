const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9426);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function clickText(t, nth = 0) {
    await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const hits=arr.filter(x=>(x.innerText||'').includes(${JSON.stringify(t)})); const b=hits[${nth}]; if(b){b.click(); return 1;} return 0;})()`);
    await sleep(350);
  }
  async function home() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(700);
  }
  // 抽取当前结果页三张卡的 (适配度, 食运值, 卡名)
  async function parseCards() {
    return await cdp.eval(`(()=>{
      const t=document.body.innerText;
      const lines=t.split('\\n').map(s=>s.trim()).filter(Boolean);
      const cards=[];
      for(let i=0;i<lines.length;i++){
        if(lines[i]==='适配度'){
          const fit=parseInt(lines[i+1],10);
          let luck=null;
          for(let j=i;j<Math.min(i+8,lines.length);j++){ if(lines[j]==='食运值'){ luck=parseInt(lines[j+1],10); break; } }
          // 往上找菜名（现实对应那行）
          let name='';
          for(let j=i;j>=0;j--){ if(lines[j].startsWith('现实对应')){ name=lines[j]; break; } }
          cards.push({name:name.replace('现实对应：',''), fit, luck});
        }
      }
      return JSON.stringify(cards);
    })()`);
  }
  async function draw() { await clickText('放出锦鲤'); await sleep(2200); return JSON.parse(await parseCards()); }

  try {
    const N = 8;
    for (const mode of ['听现实的', '交给锦鲤']) {
      const fits = [], lucks = [];
      P('########## 权重档位【' + mode + '】采样 ' + N + ' 轮（2人/30-60元/30分钟内/很饿）##########');
      for (let i = 0; i < N; i++) {
        await home();
        await clickText('高级条件');
        await clickText('2 人'); await clickText('30—60 元'); await clickText('30 分钟内'); await clickText('很饿');
        await clickText(mode);
        const cs = await draw();
        P('  轮' + (i + 1) + ': ' + cs.map(c => `${c.name}(适${c.fit}/运${c.luck})`).join(' , '));
        cs.forEach(c => { fits.push(c.fit); lucks.push(c.luck); });
      }
      const avg = a => (a.reduce((x, y) => x + y, 0) / a.length).toFixed(1);
      P('  >> 平均适配度=' + avg(fits) + '  平均食运值=' + avg(lucks) + '  样本数=' + fits.length);
      P('');
    }

    // ===== 严格预算复验 =====
    P('########## 严格预算复验：30元以内 + 严格预算ON + 严格时间ON/15分钟内 ##########');
    await home();
    await clickText('高级条件');
    await clickText('30 元以内'); await clickText('15 分钟内');
    const st1 = await cdp.eval(`(()=>{const c=document.querySelectorAll('input[type=checkbox]'); c.forEach(x=>{if(!x.checked)x.click();}); return JSON.stringify(Array.from(c).map(x=>x.checked));})()`);
    P('开关状态: ' + st1);
    await sleep(400);
    P('开关状态(确认): ' + await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('input[type=checkbox]')).map(x=>x.checked))`));
    const cs = await draw();
    P('结果: ' + cs.map(c => c.name + '(适' + c.fit + ')').join(' , '));
    P('完整文本:\n' + await txt());

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian6.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
