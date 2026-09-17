const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {validateConfig,loadConfig} = require('./config');
const {createGenerator} = require('./generateJsonToHtml');
const {createSubmission} = require('./indexnow-submit');

test('公共配置规范化域名并拒绝无效地址',()=>{
  const base=loadConfig();
  const config=validateConfig({...base,siteUrl:'https://NEW.example.org/',apiBaseUrl:'https://api.example.org/v2/'});
  assert.equal(config.siteUrl,'https://new.example.org'); assert.equal(config.apiBaseUrl,'https://api.example.org/v2');
  for(const siteUrl of ['example.org','javascript:alert(1)','https://example.org/subdir','https://name:pass@example.org','https://example.org/?q=x']) {
    assert.throws(()=>validateConfig({...base,siteUrl}));
  }
  assert.throws(()=>validateConfig({...base,apiBaseUrl:'file:///x'}));
});

test('改一处域名生成新站点 SEO、运行时配置、推送清单和验证文件',()=>{
  const tempBase=fs.realpathSync(path.resolve(__dirname,'..'));
  const output=fs.mkdtempSync(path.join(tempBase,'.kuake-domain-test-'));
  try {
    const original=loadConfig();
    const config={...original,siteUrl:'https://new.example.org'};
    const generator=createGenerator(config);
    const rows=[{id:'1',title:'Test',description:'Test resource',url_slug:'test-resource',urls:['https://pan.quark.cn/s/test']}];
    generator.build(output,rows);
    for(const file of ['index.html','software/index.html','software/test-resource.html','sitemap.xml','robots.txt','autoPage/url.txt']) {
      const content=fs.readFileSync(path.join(output,file),'utf8');
      assert.ok(content.includes(config.siteUrl),file);
      assert.ok(!content.toLowerCase().includes(original.siteUrl.toLowerCase()),file);
    }
    const context={window:{}};
    vm.runInNewContext(fs.readFileSync(path.join(output,'site-config.js'),'utf8'),context);
    assert.equal(context.window.SITE_CONFIG.siteUrl,config.siteUrl);
    assert.equal(context.window.SITE_CONFIG.apiBaseUrl,original.apiBaseUrl);
    assert.equal(fs.readFileSync(path.join(output,config.indexNowKey+'.txt'),'utf8'),config.indexNowKey);
    const urls=JSON.parse(fs.readFileSync(path.join(output,'autoPage/url.txt'),'utf8'));
    const submission=createSubmission(config,urls);
    assert.equal(submission.host,'new.example.org');
    assert.equal(submission.keyLocation,`${config.siteUrl}/${config.indexNowKey}.txt`);
    const detail=fs.readFileSync(path.join(output,'software/test-resource.html'),'utf8');
    assert.ok(detail.includes('src="../site-config.js"'));
    assert.ok(detail.indexOf('src="../site-config.js"')<detail.indexOf('src="../detail.js"'));
    assert.equal(generator.build(output,rows).changed,0);
  } finally {
    // 只清理本测试在项目内创建的独立目录。
    const resolved=fs.realpathSync(output);
    assert.equal(path.dirname(resolved),tempBase);
    assert.ok(path.basename(resolved).startsWith('.kuake-domain-test-'));
    fs.rmSync(resolved,{recursive:true,force:true});
  }
});

test('更换域名却未重新生成时，阻止推送旧域名清单',()=>{
  assert.throws(()=>createSubmission({...loadConfig(),siteUrl:'https://new.example.org'},['https://old.example.org/']),/重新生成/);
});
