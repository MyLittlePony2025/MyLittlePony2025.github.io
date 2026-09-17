
const fs = require('node:fs');
const path = require('node:path');
const {loadConfig, validateConfig} = require('./config');
const ROOT = path.resolve(__dirname, '..');

function createGenerator(inputConfig = loadConfig()) {
const config = validateConfig(inputConfig);
const SITE = config.siteUrl;
const BRAND = config.name;
const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();

function generateMetaDescription(item) {
  const description = cleanText(item.description);
  if (Array.from(description).length <= 160) return description;
  const excerpt = Array.from(description).slice(0, 157).join('');
  const end = Math.max(excerpt.lastIndexOf('。'), excerpt.lastIndexOf('！'), excerpt.lastIndexOf('？'));
  return end > 70 ? excerpt.slice(0, end + 1) : excerpt.replace(/[，、；：\s]+$/, '') + '…';
}

function downloadUrls(value) {
  try {
    const list = Array.isArray(value) ? value : JSON.parse(value);
    return Array.isArray(list) ? [...new Set(list.filter(url => {
      try { return typeof url === 'string' && ['https:', 'http:'].includes(new URL(url).protocol); }
      catch { return false; }
    }))] : [];
  } catch { return []; }
}

function prepareResources(rows) {
  if (!Array.isArray(rows)) throw new Error('资源文件必须是数组');
  const bySlug = new Map();
  const report = { total: rows.length, skipped: [], duplicates: [], missingLinks: [] };
  for (const row of rows) {
    if (!cleanText(row.description) || !cleanText(row.title)) {
      report.skipped.push({ id: row.id, title: row.title, reason: '缺少标题或描述' });
      continue;
    }
    const slug = row.url_slug;
    if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9_-]*$/i.test(slug) || /^(index|con|prn|aux|nul|com[1-9]|lpt[1-9]|page-\d+)$/i.test(slug)) {
      throw new Error(`不安全或保留的 url_slug: ${slug}`);
    }
    const key = slug.toLowerCase();
    const previous = bySlug.get(key);
    if (previous && previous.url_slug !== slug) throw new Error(`大小写冲突: ${slug}`);
    if (previous) report.duplicates.push({ slug, previousId: previous.id, retainedId: row.id });
    // 与原脚本最终输出一致：同 slug 保留最后一条，并记录冲突供编辑审核。
    const item = { ...row, title: cleanText(row.title), description: cleanText(row.description),
      classify: cleanText(row.classify) || '资源', features: Array.isArray(row.features) ? row.features.map(cleanText).filter(Boolean) : [],
      links: downloadUrls(row.urls) };
    if (!item.links.length) report.missingLinks.push(slug);
    bySlug.set(key, item);
  }
  return { items: [...bySlug.values()], report };
}

const itemPath = item => `/software/${item.url_slug}.html`;
const itemTitle = item => `${cleanText(item.seo_title) || item.title} | ${BRAND}`;
const organization = { '@type':'Organization', '@id':`${SITE}/#organization`, name:BRAND, url:`${SITE}/`, logo:`${SITE}/logo.png` };

// 浏览器引用相对于当前 HTML 文件解析，兼容根目录、子目录服务和本地文件。
// SEO 绝对 URL 不经过此转换。
function relativeReference(route, target) {
  const suffixStart = target.search(/[?#]/);
  const pathname = suffixStart < 0 ? target : target.slice(0, suffixStart);
  const suffix = suffixStart < 0 ? '' : target.slice(suffixStart);
  const currentFile = route.endsWith('/') ? route + 'index.html' : route;
  const targetFile = pathname.endsWith('/') ? pathname + 'index.html' : pathname;
  const relative = path.posix.relative(path.posix.dirname(currentFile), targetFile);
  return (relative.startsWith('.') ? relative : './' + relative) + suffix;
}

function layout({ title, description, route, body, schema, script = '', home = false }) {
  const canonical = SITE + route;
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#6f55ff">
  ${home ? '<meta name="google-site-verification" content="QJztLn55ZjD75EJiM5-v-cIwN1AbdgEL0-apsp6df-4">' : ''}
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/site.css">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="zh_CN">
  <meta property="og:site_name" content="${escapeHtml(BRAND)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${SITE}/logo.png">
  <meta property="og:image:alt" content="${escapeHtml(BRAND)} 标志">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${SITE}/logo.png">
  <script type="application/ld+json">${jsonLd({'@context':'https://schema.org', '@graph':[organization, ...schema]})}</script>
  <script src="/site-config.js" defer></script>
  <script src="/analytics.js" defer></script>
  ${script ? `<script src="${script}" defer></script>` : ''}
</head>
<body>
  <a class="skip-link" href="#main">跳至主要内容</a>
  <header class="site-header"><div class="shell header-inner">
    <a class="brand" href="/"><img src="/logo.png" width="36" height="36" alt=""><span>${escapeHtml(BRAND)}</span></a>
    <nav aria-label="主导航"><a href="/"${home ? ' aria-current="page"' : ''}>资源搜索</a><a href="/software/"${route === '/software/' ? ' aria-current="page"' : ''}>资源目录</a></nav>
  </div></header>
  <main id="main" class="shell">${body}</main>
  <footer class="site-footer"><div class="shell"><a class="brand-name" href="/">${escapeHtml(BRAND)}</a><p>发现资源，让查找更简单。</p><p>本站资源收集于网络，仅供学习和交流使用。资源内容与可用性请以来源页面为准。</p><a href="/software/">浏览资源目录</a></div></footer>
</body>
</html>
`.replace(/\b(href|src|action)="(\/(?!\/)[^"]*)"/g,
    (_, attribute, target) => `${attribute}="${relativeReference(route, target)}"`)
  .replace(/[ \t]+$/gm, '');
}

function card(item) {
  return `<article class="resource-card"><span class="tag">${escapeHtml(item.classify)}</span><h3><a href="${itemPath(item)}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.description)}</p><a class="text-link" href="${itemPath(item)}">查看详情 <span aria-hidden="true">↗</span></a></article>`;
}

function detailPage(item, items) {
  const route = itemPath(item);
  const categoryItems = items.filter(other => other.classify === item.classify);
  const position = categoryItems.findIndex(other => other.url_slug === item.url_slug);
  const related = [...categoryItems.slice(position + 1), ...categoryItems.slice(0, position)].slice(0, 6);
  return layout({ title:itemTitle(item), description:generateMetaDescription(item), route, script:'/detail.js',
    schema:[{ '@type':'WebPage', '@id':SITE+route+'#webpage', name:item.title, description:item.description, url:SITE+route, inLanguage:'zh-CN', publisher:{'@id':`${SITE}/#organization`} },
      { '@type':'BreadcrumbList', itemListElement:[{name:'首页',item:SITE+'/'},{name:'资源目录',item:SITE+'/software/'},{name:item.title,item:SITE+route}].map((entry,i)=>({'@type':'ListItem',position:i+1,...entry})) }],
    body:`<nav class="breadcrumb" aria-label="面包屑"><a href="/">首页</a><span>/</span><a href="/software/">资源目录</a><span>/</span><span aria-current="page">${escapeHtml(item.title)}</span></nav>
    <article class="detail-layout" data-resource-id="${escapeHtml(item.id)}"><div class="panel detail-content"><span class="eyebrow">资源详情 · ${escapeHtml(item.classify)}</span><h1>${escapeHtml(item.title)}</h1><p class="lead">${escapeHtml(item.description)}</p>
    ${item.features.length ? `<section class="features"><h2>资源亮点</h2><ul>${item.features.map(feature=>`<li>${escapeHtml(feature)}</li>`).join('')}</ul></section>` : ''}</div>
    <aside class="panel download-panel" aria-labelledby="download-title"><span class="resource-symbol" aria-hidden="true">↓</span><h2 id="download-title">获取资源</h2><p>查看网盘分享页面，获取资源文件与相关信息。</p><div class="download-links">${item.links.length ? item.links.map((url,i)=>`<a class="button${i ? ' secondary' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${item.links.length > 1 ? `打开下载链接 ${i+1}` : '打开网盘链接'} <span aria-hidden="true">↗</span></a>`).join('') : '<p role="status">暂未提供有效下载链接。</p>'}</div><p class="small">链接将在新窗口打开；如分享失效，可返回首页搜索其他资源。</p><a class="text-link" href="/?q=${encodeURIComponent(item.title)}">搜索相关资源 →</a></aside></article>
    <section class="section-block" aria-labelledby="related-title"><div class="section-heading"><div><span class="eyebrow">继续发现</span><h2 id="related-title">同类资源</h2></div><a class="text-link" href="/software/">浏览全部 →</a></div><div class="resource-grid">${related.map(card).join('')}</div></section>
    <section id="online-resources" class="section-block" aria-labelledby="online-title"><div class="section-heading"><h2 id="online-title">线上资源</h2></div><p class="small">按分类快速查找你需要的资源。</p><div id="online-filters" class="filters" role="group" aria-label="线上资源分类" hidden></div><p id="online-status" class="small" role="status" aria-live="polite">启用 JavaScript 可查看线上资源。</p><div id="online-grid" class="resource-grid"></div><button id="online-more" class="button secondary load-more" type="button" hidden>加载更多线上资源</button></section>` });
}

function homePage(items, categories) {
  const title = `夸克网盘资源搜索与资源目录 | ${BRAND}`;
  const description = `${BRAND}提供网盘资源搜索与分类浏览，涵盖软件、学习资料、电子书、影视和音乐。搜索资源名称，查看资源介绍、功能亮点与网盘分享链接。`;
  return layout({ title, description, route:'/', home:true, script:'/home.js',
    schema:[{'@type':'WebSite','@id':SITE+'/#website',name:BRAND,url:SITE+'/',description,inLanguage:'zh-CN',publisher:{'@id':SITE+'/#organization'}}],
    body:`<section class="hero"><span class="eyebrow">夸克网盘 · 资源导航</span><h1>你想找的资源，<span>从这里开始</span></h1><p>软件工具、学习资料、影视音乐，一站搜索，轻松发现。</p>
      <form id="searchForm" class="search-box" role="search" action="/" method="get"><label class="sr-only" for="searchInput">搜索资源名称或关键词</label><input type="search" id="searchInput" name="q" placeholder="输入资源名称或关键词…" autocomplete="off"><button class="button" type="submit">搜索资源</button></form>
      <div class="hero-links"><span>按分类探索，或直接搜索名称</span><a href="/software/">浏览 ${items.length} 个资源详情 →</a></div></section>
      <section class="section-block" aria-labelledby="resultsHeading"><div class="section-heading"><div><span class="eyebrow">资源发现</span><h2 id="resultsHeading">精选资源</h2></div><a class="text-link" href="/software/">完整目录 →</a></div>
      <div id="categoryContainer" class="filters" aria-label="资源分类"><button class="filter-btn active" type="button" data-category="" aria-pressed="true">全部分类</button>${categories.map(category=>`<button class="filter-btn" type="button" data-category="${escapeHtml(category.name)}" aria-pressed="false">${escapeHtml(category.name)}</button>`).join('')}</div>
      <p id="searchStatus" class="small" role="status" aria-live="polite">下方为精选资源，可通过搜索和分类查找更多内容。</p>
      <div id="resourceContainer" class="resource-grid">${items.slice(0,12).map(card).join('')}</div><button id="loadMore" class="button secondary load-more" type="button" hidden>加载更多</button>
      <noscript><p class="notice">搜索与筛选需要 JavaScript。您仍可通过<a href="/software/">完整资源目录</a>浏览所有详情。</p></noscript></section>` });
}

function directoryPage(items, page, count) {
  const route = page === 1 ? '/software/' : `/software/page-${page}.html`;
  const title = `资源目录${page > 1 ? ` · 第 ${page} 页` : ''} | ${BRAND}`;
  const description = `浏览${BRAND}资源目录第 ${page} 页（共 ${count} 页），查看资源介绍、功能亮点与网盘分享链接。`;
  const pageLink = n => n === 1 ? '/software/' : `/software/page-${n}.html`;
  return layout({title, description, route, schema:[{'@type':'CollectionPage',name:title,url:SITE+route,description,mainEntity:{'@type':'ItemList',itemListElement:items.map((item,i)=>({'@type':'ListItem',position:(page-1)*60+i+1,name:item.title,url:SITE+itemPath(item)}))}}],
    body:`<nav class="breadcrumb" aria-label="面包屑"><a href="/">首页</a><span>/</span><span aria-current="page">资源目录</span></nav><section class="directory-hero"><span class="eyebrow">浏览 · 发现 · 获取</span><h1>资源目录</h1><p>查看资源详情，找到适合你的工具与内容。</p></section><div class="section-heading"><h2>全部资源</h2><span class="small">第 ${page} / ${count} 页</span></div><div class="resource-grid">${items.map(card).join('')}</div><nav class="pagination" aria-label="目录分页">${Array.from({length:count},(_,i)=>`<a href="${pageLink(i+1)}"${page === i+1 ? ' aria-current="page"' : ''} aria-label="第 ${i+1} 页">${i+1}</a>`).join('')}</nav>` });
}

function writeChanged(file, content) {
  if (fs.existsSync(file) && fs.readFileSync(file,'utf8') === content) return false;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,content,'utf8');
  return true;
}

function build(root = ROOT, rows = JSON.parse(fs.readFileSync(path.join(__dirname,'resourceList-test.json'),'utf8'))) {
  const {items,report} = prepareResources(rows);
  if (!items.length) throw new Error('没有可生成的资源，终止构建');
  const categories = JSON.parse(fs.readFileSync(path.join(ROOT,'classify.json'),'utf8'));
  const pages = new Map([['index.html', homePage(items,categories)]]);
  for (const item of items) pages.set(itemPath(item).slice(1),detailPage(item,items));
  const pageCount = Math.ceil(items.length/60);
  for (let page=1;page<=pageCount;page++) pages.set(page===1?'software/index.html':`software/page-${page}.html`,directoryPage(items.slice((page-1)*60,page*60),page,pageCount));
  // 预先完成全部验证和渲染，再写文件，避免无效数据导致半批页面更新。
  const browserConfig = {siteUrl:SITE,apiBaseUrl:config.apiBaseUrl,name:BRAND};
  writeChanged(path.join(root,'site-config.js'),`// Generated from autoPage/site.config.json. Do not edit this file.\nwindow.SITE_CONFIG = Object.freeze(${jsonLd(browserConfig)});\n`);
  writeChanged(path.join(root,`${config.indexNowKey}.txt`),config.indexNowKey);
  let changed = 0;
  const urls = [];
  for (const [file,html] of pages) {
    if (writeChanged(path.join(root,file),html)) changed++;
    urls.push(SITE + '/' + file.replace(/(^|\/)index\.html$/, '$1'));
  }
  // 未提供可信内容更新时间时省略 lastmod，不将每次构建伪装成内容更新。
  writeChanged(path.join(root,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
  writeChanged(path.join(root,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
  writeChanged(path.join(root,'autoPage/url.txt'),JSON.stringify(urls,null,2)+'\n');
  writeChanged(path.join(root,'autoPage/build-report.json'),JSON.stringify({...report,generatedDetails:items.length,directoryPages:pageCount},null,2)+'\n');
  writeChanged(path.join(root,'resource-details.json'),JSON.stringify(items.flatMap(item=>item.links.map(url=>({url,path:itemPath(item)}))))+'\n');
  return {details:items.length,directories:pageCount,changed,skipped:report.skipped.length,duplicates:report.duplicates.length};
}

return { build, prepareResources, generateMetaDescription, downloadUrls, escapeHtml, detailPage };
}

if (require.main === module) {
  try { console.log('生成完成：',createGenerator().build()); }
  catch (error) { console.error(`生成失败：${error.message}`); process.exitCode = 1; }
}
else module.exports = { ...createGenerator(), createGenerator };
