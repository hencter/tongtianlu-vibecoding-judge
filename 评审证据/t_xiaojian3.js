const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9423);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function clickText(t, nth = 0) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const hits=arr.filter(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(t)})||(x.innerText||'').includes(${JSON.stringify(t)})); const b=hits[${nth}]; if(b){b.click(); return 'OK';} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(500); return r;
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(800);
  }
  async function expand() { await clickText('高级条件'); }

  try {
    // ===== 用例1：默认条件 放出锦鲤 =====
    P('########## 用例1：默认（1人/随便/不赶时间/无感觉/半信半疑 60-40）##########');
    await fresh();
    await clickText('放出锦鲤'); await sleep(2500);
    P('=== 结果页 ===\n' + await txt());

    // ===== 用例2：一致性 —— 听现实的(80/20) 连续重跑 5 次 =====
    P('\n########## 用例2：一致性 ——「听现实的」80/20，重跑 5 次 ##########');
    await fresh();
    await clickText('听现实的');
    for (let i = 1; i <= 5; i++) {
      await clickText('放出锦鲤'); await sleep(2200);
      const t = await txt();
      const lines = t.split('\n').filter(x => x.trim());
      // 抓取结果区
      const idx = lines.findIndex(x => /就吃|今天吃|拍板|决定|锦鲤/.test(x));
      P('第' + i + '次: ' + lines.slice(Math.max(0, idx), idx + 14).join(' | '));
      await clickText('再抽一次').catch(() => {});
      await clickText('重新').catch(() => {});
      // 回到首页
      await clickText('首页'); await sleep(600);
      await clickText('听现实的');
    }

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian3.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
