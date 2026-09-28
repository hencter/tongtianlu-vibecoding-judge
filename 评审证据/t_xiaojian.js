const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9421);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  const btns = () => cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],input,textarea')).map((el,i)=>({i,tag:el.tagName, t:(el.innerText||el.placeholder||el.value||'').replace(/\\n/g,'|').slice(0,50), cls:(el.className||'').toString().slice(0,50), dis:el.disabled})))`);

  try {
    await goto(cdp, 'https://koi-food-decider.app.workbuddy.host/');
    P('=== 标题 ===', await cdp.eval('document.title'));
    P('=== 首页 ===\n' + await txt());
    P('=== 元素 ===\n' + await btns());

    // 点"开始"类按钮
    const all = JSON.parse(await btns());
    P('\n所有按钮文本: ' + all.filter(x => x.tag === 'BUTTON').map(x => x.i + ':' + x.t).join(' ; '));

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_xiaojian.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
