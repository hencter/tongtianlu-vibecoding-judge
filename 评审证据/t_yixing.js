const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9411);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  const btns = () => cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('button,[role=button],input,textarea,[contenteditable]')).map((el,i)=>({i, tag:el.tagName, t:(el.innerText||el.placeholder||'').replace(/\\n/g,'|').slice(0,60), cls:(el.className||'').toString().slice(0,50), dis:el.disabled})))`);

  try {
    await goto(cdp, 'https://paiban-decide-now.app.workbuddy.host/');
    P('=== 标题 ===', await cdp.eval('document.title'));
    P('=== 首页文本 ===\n' + await txt());
    P('=== 元素 ===\n' + await btns());

    // 填决定名称
    await cdp.eval(`(()=>{const el=document.querySelector('input'); if(!el) return 'noinput'; const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el,'今晚吃什么'); el.dispatchEvent(new Event('input',{bubbles:true})); return el.value;})()`);
    await sleep(300);
    P('填名称后: ' + await txt().then(t=>t.split('\n').filter(x=>x.trim()).slice(0,8).join(' | ')));
    P('元素: ' + await btns());

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_yixing.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
