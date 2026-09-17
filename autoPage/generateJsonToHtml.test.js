const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {prepareResources,generateMetaDescription,downloadUrls,detailPage,build} = require('./generateJsonToHtml');
const sample = {id:'one',title:'测试资源',description:'真实的资源描述。',url_slug:'example',urls:'["https://example.com/file"]',features:['功能一']};

test('重复 slug 与原脚本保持最后一条优先，缺失描述明确报告',()=>{
  const result = prepareResources([sample,{...sample,id:'two'}, {...sample,id:'empty',description:''}]);
  assert.equal(result.items.length,1); assert.equal(result.items[0].id,'two');
  assert.equal(result.report.duplicates.length,1); assert.equal(result.report.skipped.length,1);
});
test('拒绝路径穿越、保留名称和大小写冲突',()=>{
  for (const slug of ['../outside','a/b','index','page-2','CON','a?x','']) assert.throws(()=>prepareResources([{...sample,url_slug:slug}]));
  assert.throws(()=>prepareResources([sample,{...sample,url_slug:'EXAMPLE'}]));
});
test('下载链接支持数组、多链接和错误数据，过滤危险协议',()=>{
  assert.deepEqual(downloadUrls('invalid'),[]);
  assert.deepEqual(downloadUrls(['javascript:alert(1)','data:text/html,x','https://example.com','https://example.com']),['https://example.com']);
});
test('HTML 属性、正文与 JSON-LD 安全转义且可解析',()=>{
  const item = prepareResources([{...sample,title:'A "<& </script><img src=x>',description:'引号 " 与换行\n</script><script>alert(1)</script>'}]).items[0];
  const html = detailPage(item,[item]);
  const ld = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1];
  const graph = JSON.parse(ld)['@graph'];
  assert.equal(graph[1].name,item.title); assert.ok(!ld.includes('</script>'));
  assert.ok(!html.includes('<img src=x>')); assert.equal((html.match(/<h1>/g)||[]).length,1);
});
test('摘要保留真实内容，短描述不堆砌，长描述不截断 Unicode 字符',()=>{
  assert.equal(generateMetaDescription(sample),sample.description);
  const desc = generateMetaDescription({description:'😀'.repeat(200)});
  assert.ok(Array.from(desc).length<=160); assert.ok(!desc.includes('\uFFFD'));
});
test('全量生成的 canonical、静态链接与 sitemap 一致，重复生成零改动',()=>{
  const root = path.resolve(__dirname,'..');
  const first = build();
  const second = build();
  assert.equal(second.changed,0);
  const urls = JSON.parse(fs.readFileSync(path.join(__dirname,'url.txt'),'utf8'));
  assert.equal(new Set(urls).size,urls.length);
  assert.equal(urls.length,first.details+first.directories+1);
  for (const url of urls) {
    let relative = new URL(url).pathname;
    if (relative.endsWith('/')) relative += 'index.html';
    const html = fs.readFileSync(path.join(root,relative),'utf8');
    assert.ok(html.includes(`<link rel="canonical" href="${url}">`),url);
    assert.equal((html.match(/<h1[ >]/g)||[]).length,1,url);
    assert.equal((html.match(/name="viewport"/g)||[]).length,1,url);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(match[1]);
    for (const match of html.matchAll(/(?:href|src|action)="([^"]*)"/g)) {
      const reference = match[1];
      if (/^(?:https?:|#)/.test(reference)) continue;
      assert.ok(!reference.startsWith('/'),`${relative}: 根目录路径 ${reference}`);
      for (const base of ['https://example.org/', 'http://localhost:8000/MyLittlePony2025.github.io/', 'file:///D:/preview/MyLittlePony2025.github.io/']) {
        const resolved = new URL(reference,base+relative.slice(1));
        const site = new URL(base);
        assert.ok(resolved.pathname.startsWith(site.pathname),`${relative} -> ${resolved.href}`);
        const local = decodeURIComponent(resolved.pathname.slice(site.pathname.length));
        assert.ok(fs.existsSync(path.join(root,local)),`${relative} -> ${local}`);
      }
    }
    assert.ok(!html.includes('img.jpg')); assert.ok(!html.includes('/search?q='));
  }
});
