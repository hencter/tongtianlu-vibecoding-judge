const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9422);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function clickText(t, nth = 0) {
    const r = await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const hits=arr.filter(x=>(x.innerText||'').includes(${JSON.stringify(t)})); const b=hits[${nth}]; if(b){b.click(); return 'OK:'+(b.innerText||'').replace(/\\n/g,'|').slice(0,40);} return 'NOTFOUND:'+${JSON.stringify(t)};})()`);
    await sleep(600); return r;
  }
  async function fresh() {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await cdp.eval(`(()=>{try{localStorage.clear();sessionStorage.clear();}catch(e){} return 1;})()`);
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    await sleep(800);
  }

  try {
    await fresh();
    P('=== 展开高级条件 ===');
    P(await clickText('高级条件'));
    P(await txt());

    P('\n=== 元素（展开后）===');
    P(await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,input,select')).map((el,i)=>({i,t:(el.innerText||el.placeholder||el.value||'').replace(/\\n/g,'|').slice(0,45), cls:(el.className||'').toString().slice(0,30)})))`));

    P('\n=== 忌口设置面板 ===');
    P(await clickText('忌口与过敏'));
    P(await txt());

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian2.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
