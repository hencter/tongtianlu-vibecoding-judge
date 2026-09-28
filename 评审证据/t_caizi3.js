const { launch, goto, sleep } = require('./cdp');
const fs = require('fs');

(async () => {
  const { cdp, child } = await launch(9404);
  const log = [];
  const P = (...a) => { const s = a.join(' '); log.push(s); console.log(s); };
  const txt = () => cdp.eval(`document.body.innerText`);
  async function addOption(v) {
    await cdp.eval(`(()=>{const el=document.querySelector('input.adder__input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return 1;})()`);
    await sleep(150);
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.trim()==='添加'); b&&b.click(); return 1;})()`);
    await sleep(300);
  }
  async function pick(name) {
    await cdp.eval(`(()=>{const arr=Array.from(document.querySelectorAll('button,[role=button]')).filter(x=>!x.disabled); const b=arr.find(x=>(x.innerText||'').trim().startsWith(${JSON.stringify(name)})); if(b){b.click(); return 1;} return 0;})()`);
    await sleep(700);
  }
  async function restart() { await goto(cdp, 'https://decide-three-questions.app.workbuddy.host/'); }

  try {
    P('########## 决胜阶段：三问各不相同，然后在决胜里选【沙拉】 ##########');
    await restart();
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('吃什么')); b&&b.click(); return 1;})()`);
    await sleep(400);
    await addOption('火锅'); await addOption('日料'); await addOption('沙拉');
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
    await sleep(700);
    await pick('日料'); await pick('火锅'); await pick('沙拉');
    P('决胜页: ' + await txt());
    P('>>> 决胜中选【沙拉】');
    await pick('沙拉');
    P('结果页:\n' + await txt());

    P('\n########## 决胜阶段：同样三问，决胜里选【日料】 ##########');
    await restart();
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('吃什么')); b&&b.click(); return 1;})()`);
    await sleep(400);
    await addOption('火锅'); await addOption('日料'); await addOption('沙拉');
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
    await sleep(700);
    await pick('日料'); await pick('火锅'); await pick('沙拉');
    P('>>> 决胜中选【日料】');
    await pick('日料');
    P('结果页:\n' + await txt());

    P('\n########## 2 选项：三问 选A/B/A ##########');
    await restart();
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('吃什么')); b&&b.click(); return 1;})()`);
    await sleep(400);
    await addOption('火锅'); await addOption('日料');
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('开始拍板')); b&&b.click(); return 1;})()`);
    await sleep(700);
    await pick('火锅'); await pick('日料'); await pick('火锅');
    P('结果页:\n' + await txt());

    P('\n########## "我还是不服" 按钮行为 ##########');
    await cdp.eval(`(()=>{const b=Array.from(document.querySelectorAll('button')).find(x=>x.innerText.includes('我还是不服')); if(b){b.click();return 'clicked';} return 'notfound';})()`);
    await sleep(800);
    P(await txt());

    P('\n########## 查看页面源码中的决策逻辑 ##########');
    const scripts = await cdp.eval(`JSON.stringify(Array.from(document.querySelectorAll('script[src]')).map(s=>s.src))`);
    P('脚本: ' + scripts);

  } catch (e) { P('ERROR: ' + e.message + '\n' + e.stack); }
  fs.writeFileSync('out_caizi3.txt', log.join('\n'), 'utf8');
  cdp.close(); child.kill(); process.exit(0);
})();
