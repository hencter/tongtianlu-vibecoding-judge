import { Page, sleep } from './cdp.mjs';

const url = process.argv[2] || 'https://decide-three-questions.app.workbuddy.host/';
const p = await Page.open(url);
await sleep(1500);
const info = await p.eval(`JSON.stringify({
  title: document.title,
  url: location.href,
  rootChildren: document.getElementById('root')?.children.length ?? -1,
  text: (document.body.innerText||'').slice(0,2500),
  btns: Array.from(document.querySelectorAll('button')).map(b=>({t:b.innerText.slice(0,40),d:b.disabled})),
  inputs: Array.from(document.querySelectorAll('input,textarea')).map(i=>({tag:i.tagName,ph:i.placeholder,type:i.type,max:i.maxLength})),
  overflowX: document.documentElement.scrollWidth > window.innerWidth + 1 ? document.documentElement.scrollWidth + '>' + window.innerWidth : 'no'
})`);
console.log(info);
console.log('ERRORS:', JSON.stringify(p.errors));
console.log('LOGS:', JSON.stringify(p.logs.slice(0, 20)));
await p.close();
