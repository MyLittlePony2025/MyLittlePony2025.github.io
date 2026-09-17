const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// 小型 DOM 测试替身：验证筛选/分页状态流，不替代浏览器布局验收。
class Element {
  constructor(tag='div') { this.tag=tag; this.children=[]; this.listeners={}; this.attrs={}; this.dataset={}; this.value=''; this.hidden=false; this._text=''; this.classList={toggle:()=>{}}; }
  set textContent(value) { this._text=String(value); this.children=[]; }
  get textContent() { return this._text; }
  append(...items) { for (const item of items) { if (item?.tag==='fragment') this.children.push(...item.children); else this.children.push(item); } }
  replaceChildren(...items) { this.children=[]; this.append(...items); }
  setAttribute(key,value) { this.attrs[key]=value; }
  addEventListener(name,callback) { this.listeners[name]=callback; }
  closest() { return this; }
  querySelectorAll() { return this.children; }
  fire(name,event={}) { this.listeners[name]?.({preventDefault(){},...event}); }
}
async function launch({search='',fail=false,protocol='http:'}={}) {
  const ids=Object.fromEntries(['searchForm','searchInput','resourceContainer','searchStatus','loadMore','categoryContainer','resultsHeading'].map(id=>[id,new Element()]));
  const all=new Element('button'); all.dataset.category='';
  const software=new Element('button'); software.dataset.category='软件';
  ids.categoryContainer.append(all,software);
  const initial=new Element(); initial.textContent='静态精选'; ids.resourceContainer.append(initial);
  const rows=Array.from({length:120},(_,i)=>({name:`工具 ${i}`,description:'资源说明',classify:i%2?'软件':'音乐',downloadURL:`https://example.com/${i}`}));
  rows.push({...rows[0]},{name:'危险链接',downloadURL:'javascript:alert(1)'});
  const requests=[];
  const context={document:{getElementById:id=>ids[id],createElement:tag=>new Element(tag),createDocumentFragment:()=>new Element('fragment')},location:{search,protocol,href:'http://localhost:8000/MyLittlePony2025.github.io/index.html'+search},history:{replaceState(){}},URL,URLSearchParams,AbortController,setTimeout,clearTimeout,console:{error(){}},fetch:async url=>{
    requests.push(url);
    if (fail) throw new Error('network');
    const data=url.includes('resourcesVersion')?[{name:'resources01',version:'1'}]:url.includes('resource-details')?[{url:'https://example.com/0',path:'/software/example.html'}]:rows;
    return {ok:true,json:async()=>data};
  }};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../home.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {ids,software,all,requests};
}
test('首页去重、过滤不安全链接，分批加载且不重复',async()=>{
  const {ids}=await launch();
  assert.match(ids.searchStatus.textContent,/120/); assert.equal(ids.resourceContainer.children.length,48);
  ids.loadMore.fire('click'); assert.equal(ids.resourceContainer.children.length,96);
  ids.loadMore.fire('click'); assert.equal(ids.resourceContainer.children.length,120); assert.equal(ids.loadMore.hidden,true);
});
test('分类与关键词组合筛选，分页不混入其他分类',async()=>{
  const {ids,software}=await launch();
  ids.categoryContainer.fire('click',{target:software}); assert.match(ids.searchStatus.textContent,/60/);
  ids.loadMore.fire('click'); assert.equal(ids.resourceContainer.children.length,60);
  assert.ok(ids.resourceContainer.children.every(card=>card.children[0].textContent==='软件'));
  ids.searchInput.value='工具 11'; ids.searchForm.fire('submit'); assert.match(ids.searchStatus.textContent,/6 个/);
  assert.equal(ids.resourceContainer.children.length,6);
  ids.searchInput.value='not-found'; ids.searchForm.fire('submit'); assert.equal(ids.resourceContainer.children.length,0); assert.equal(ids.loadMore.hidden,true);
});
test('支持 URL 搜索参数和加载失败静态降级',async()=>{
  const searched=await launch({search:'?q=工具%20119'}); assert.equal(searched.ids.resourceContainer.children.length,1);
  const failed=await launch({fail:true}); assert.equal(failed.ids.resourceContainer.children[0].textContent,'静态精选'); assert.match(failed.ids.searchStatus.textContent,/加载失败/);
});
test('子目录预览的 JSON 请求和动态详情链接均为相对路径',async()=>{
  const {ids,requests}=await launch();
  assert.deepEqual(requests.sort(),['./resource-details.json','./resources01.json?v=1','./resourcesVersion.json'].sort());
  assert.equal(ids.resourceContainer.children[0].children[1].children[0].href,'./software/example.html');
});
test('直接打开本地文件保留静态内容，并提示使用 HTTP 服务搜索',async()=>{
  const {ids,requests}=await launch({protocol:'file:'});
  assert.equal(requests.length,0); assert.match(ids.searchStatus.textContent,/HTTP/);
  assert.equal(ids.resourceContainer.children[0].textContent,'静态精选');
});
