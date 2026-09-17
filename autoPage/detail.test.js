const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function run({rows=[],ad={show:false},fail=false,apiBaseUrl='https://api.example.test/v2'}={}) {
  const element = tag=>({tag,children:[],listeners:{},attrs:{},append(...items){for(const item of items)this.children.push(...(item?.tag==='fragment'?item.children:[item]))},replaceChildren(...items){this.children=[];this.append(...items)},setAttribute(name,value){this.attrs[name]=value},addEventListener(name,callback){this.listeners[name]=callback}});
  const downloads=element('div'); downloads.children=['static link'];
  const main=element('main');
  const onlineStatus=element('p'), onlineGrid=element('div'), onlineMore=element('button'), onlineFilters=element('div');
  const requests=[];
  const context={window:{SITE_CONFIG:{apiBaseUrl}},URL,AbortController,setTimeout,clearTimeout,document:{
    querySelector:selector=>selector==='[data-resource-id]'?{dataset:{resourceId:'resource-id'}}:downloads,
    getElementById:id=>({'main':main,'online-status':onlineStatus,'online-grid':onlineGrid,'online-more':onlineMore,'online-filters':onlineFilters}[id]),createElement:element,createDocumentFragment:()=>element('fragment')
  },fetch:async url=>{requests.push(url);if (fail) throw new Error('offline');return {ok:true,json:async()=>url.endsWith('/ad')?ad:rows}}};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../detail.js'),'utf8'),context);
  await new Promise(resolve=>setImmediate(resolve));
  return {downloads,main,onlineStatus,onlineGrid,onlineMore,onlineFilters,requests};
}

test('线上资源与广告统一使用公共配置中的 API 地址',async()=>{
  const {requests}=await run({apiBaseUrl:'https://new-api.example.org/resources'});
  assert.deepEqual(requests,['https://new-api.example.org/resources/resourceList','https://new-api.example.org/resources/ad']);
});
test('按资源 ID 更新全部有效链接，忽略其他资源及危险协议',async()=>{
  const {downloads}=await run({rows:[{id:'other',urls:'["https://wrong.example"]'},{id:'resource-id',urls:'["https://example.com/a","javascript:alert(1)","https://example.com/b"]'}]});
  assert.equal(downloads.children.length,2); assert.equal(downloads.children[0].href,'https://example.com/a');
  assert.equal(downloads.children[1].href,'https://example.com/b'); assert.equal(downloads.children[0].rel,'noopener noreferrer');
});
test('不匹配当前 ID 时仍展示线上资源，支持完整分页且跳过坏数据',async()=>{
  const rows=Array.from({length:26},(_,i)=>({id:'other-'+i,title:'资源 '+i,urls:JSON.stringify(['https://example.com/'+i]),classify:'软件'}));
  rows.push(null,{title:'错误 JSON',urls:'bad'},{title:'危险链接',urls:['javascript:alert(1)']});
  const {onlineGrid,onlineStatus,onlineMore,downloads}=await run({rows});
  assert.equal(onlineGrid.children.length,24); assert.match(onlineStatus.textContent,/26.*24/);
  assert.equal(onlineMore.hidden,false); onlineMore.listeners.click();
  assert.equal(onlineGrid.children.length,26); assert.equal(onlineMore.hidden,true);
  assert.deepEqual(downloads.children,['static link']);
  assert.equal(onlineGrid.children[0].children[3].href,'https://example.com/0');
});
test('线上列表空数据和失败有明确提示，失败提供重试',async()=>{
  const empty=await run(); assert.match(empty.onlineStatus.textContent,/暂无/);
  assert.equal(empty.onlineFilters.hidden,true);
  const failed=await run({fail:true}); assert.match(failed.onlineStatus.textContent,/加载失败/);
  const retry=failed.onlineStatus.children.find(item=>item?.tag==='button');
  assert.equal(typeof retry.listeners.click,'function');
});
test('分类数量、切换和加载更多保持一致，空分类归入未分类',async()=>{
  const rows=Array.from({length:35},(_,i)=>({id:String(i),title:`资源 ${i}`,classify:i<30?' 软件 ':i<33?'音乐':i===33?'':null,urls:[`https://example.com/${i}`]}));
  rows.push({title:'无效资源',classify:'无效分类',urls:['javascript:alert(1)']});
  const {onlineFilters,onlineGrid,onlineStatus,onlineMore}=await run({rows});
  assert.deepEqual(onlineFilters.children.map(button=>button.textContent),['全部分类（35）','软件（30）','音乐（3）','未分类（2）']);
  const [all,software,music,uncategorized]=onlineFilters.children;
  software.listeners.click();
  assert.equal(software.attrs['aria-pressed'],'true'); assert.equal(all.attrs['aria-pressed'],'false');
  assert.equal(software.className,'filter-btn active');
  assert.equal(onlineGrid.children.length,24); onlineMore.listeners.click();
  assert.equal(onlineGrid.children.length,30); assert.equal(onlineMore.hidden,true);
  assert.ok(onlineGrid.children.every(card=>card.children[0].textContent==='软件'));
  music.listeners.click();
  assert.equal(onlineGrid.children.length,3); assert.match(onlineStatus.textContent,/音乐.*3.*3/);
  assert.ok(onlineGrid.children.every(card=>card.children[0].textContent==='音乐'));
  assert.equal(software.attrs['aria-pressed'],'false');
  uncategorized.listeners.click(); assert.equal(onlineGrid.children.length,2);
  assert.ok(onlineGrid.children.every(card=>card.children[0].textContent==='未分类'));
  all.listeners.click(); assert.equal(onlineGrid.children.length,24); assert.equal(onlineMore.hidden,false);
});
test('网络失败、缺失 ID 或错误 JSON 均保留静态下载链接',async()=>{
  for(const options of [{fail:true},{rows:[{id:'missing'}]},{rows:[{id:'resource-id',urls:'invalid'}]}]) {
    const {downloads}=await run(options); assert.deepEqual(downloads.children,['static link']);
  }
});
test('推广只接受安全链接，以非浮动区块追加至正文底部',async()=>{
  const {main}=await run({ad:{show:true,left:{imageUrl:'https://example.com/a.png',linkUrl:'https://example.com'},right:{imageUrl:'javascript:alert(1)',linkUrl:'https://example.com'}}});
  assert.equal(main.children.length,1); assert.equal(main.children[0].className,'sponsor-section');
  assert.equal(main.children[0].children.length,3); assert.equal(main.children[0].children[2].rel,'sponsored noopener noreferrer');
});
