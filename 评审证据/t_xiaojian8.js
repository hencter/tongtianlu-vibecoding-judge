const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');
(async () => {
  const { cdp, child } = await launch(9428);
  const log = []; const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  async function clickExact(t) {
    await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const b=arr.find(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(t)})); if(b){b.click();return 1;} return 0;})()`);
    await sleep(350);
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/'); await sleep(1200);
  }
  try {
    P('########## 冲突感觉：想吃辣 + 想清爽一点 + 想喝热汤（三选满）##########');
    await fresh();
    await clickExact('想吃辣'); await clickExact('想清爽一点'); await clickExact('想喝热汤');
    // 再点第4个，验证"最多3个"
    P('点第4个(很饿): ' + await clickExact('很饿'));
    P('第4个是否选中: ' + await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>(x.innerText||'').trim().startsWith('很饿')); return (b.className||'').includes('chip-on');})()`));
    await clickExact('听现实的');
    await clickExact('放出锦鲤'); await sleep(2400);
    P(await cdp.eval(`document.body.innerText`));

    P('\n########## 图鉴规模 ##########');
    await fresh(); await clickExact('图鉴'); await sleep(1000);
    const t = await cdp.eval(`document.body.innerText`);
    P(t.split('\n').filter(x => x.trim()).slice(0, 25).join(' | '));

  } catch (e) { P('ERROR: ' + e.message); }
  fs.writeFileSync('out_xiaojian8.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
