(() => {
  'use strict';
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  const container = document.getElementById('resourceContainer');
  const status = document.getElementById('searchStatus');
  const more = document.getElementById('loadMore');
  const filters = document.getElementById('categoryContainer');
  const heading = document.getElementById('resultsHeading');
  let resources = [], filtered = [], shown = 0, ready = false, category = '';
  const pageSize = 48;
  input.value = new URLSearchParams(location.search).get('q') || '';
  let query = input.value.trim();
  const safeUrl = value => { try { return ['http:','https:'].includes(new URL(value).protocol); } catch { return false; } };
  const getJson = async url => {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),15000);
    try {
      const response = await fetch(url,{signal:controller.signal});
      if (!response.ok) throw new Error(`${url}: ${response.status}`);
      return await response.json();
    } finally { clearTimeout(timeout); }
  };
  function makeCard(resource) {
    const card = document.createElement('article'); card.className = 'resource-card';
    const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = resource.classify || '资源';
    const title = document.createElement('h3');
    const titleLink = document.createElement('a'); titleLink.textContent = resource.name;
    const link = document.createElement('a'); link.className = 'text-link';
    for (const anchor of [titleLink,link]) {
      anchor.href = resource.detailPath ? `.${resource.detailPath}` : resource.downloadURL;
      if (!resource.detailPath) { anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
    }
    link.textContent = resource.detailPath ? '查看详情 ↗' : '打开网盘链接 ↗';
    title.append(titleLink);
    const description = document.createElement('p'); description.textContent = resource.description || '查看分享页面了解资源内容。';
    card.append(tag,title,description,link); return card;
  }
  function appendPage() {
    const fragment = document.createDocumentFragment();
    filtered.slice(shown, shown + pageSize).forEach(resource => fragment.append(makeCard(resource)));
    shown = Math.min(shown+pageSize,filtered.length); container.append(fragment);
    more.hidden = shown >= filtered.length;
    status.textContent = filtered.length ? `找到 ${filtered.length} 个资源，已显示 ${shown} 个。` : '没有找到匹配资源，请尝试其他关键词或分类。';
  }
  function search() {
    if (location.protocol === 'file:') { load(); return; }
    if (!ready) { status.textContent = '资源正在加载，完成后将显示筛选结果。'; return; }
    const keyword = query.toLocaleLowerCase();
    filtered = resources.filter(resource => (!category || resource.classify === category) && (!keyword || `${resource.name} ${resource.description || ''}`.toLocaleLowerCase().includes(keyword)));
    heading.textContent = query ? `“${query}”的搜索结果` : category || '全部资源';
    shown = 0; container.replaceChildren(); appendPage();
  }
  form.addEventListener('submit',event=>{
    event.preventDefault(); query = input.value.trim();
    if (location.protocol === 'file:') { load(); return; }
    const url = new URL(location.href); query ? url.searchParams.set('q',query) : url.searchParams.delete('q');
    history.replaceState(null,'',url); search();
  });
  filters.addEventListener('click',event=>{
    const button = event.target.closest('button[data-category]'); if (!button) return;
    category = button.dataset.category;
    filters.querySelectorAll('button').forEach(other=>{ const active = other===button; other.classList.toggle('active',active); other.setAttribute('aria-pressed',String(active)); });
    search();
  });
  more.addEventListener('click',appendPage);
  async function load() {
    if (location.protocol === 'file:') {
      status.textContent = '当前为本地文件预览，可浏览静态资源详情；搜索需要通过本地 HTTP 服务打开本页。';
      return;
    }
    status.textContent = '正在加载资源…';
    try {
      const versions = await getJson('./resourcesVersion.json');
      if (!Array.isArray(versions) || !versions.length || versions.some(v=>!/^resources[\w-]*$/.test(v.name))) throw new Error('无效版本清单');
      const [batches,details] = await Promise.all([
        Promise.all(versions.map(version=>getJson(`./${version.name}.json?v=${encodeURIComponent(version.version)}`))),
        getJson('./resource-details.json').catch(()=>[])
      ]);
      if (batches.some(batch=>!Array.isArray(batch))) throw new Error('无效资源数据');
      const detailByUrl = new Map(details.filter(item=>/^\/software\/[a-z0-9_-]+\.html$/i.test(item.path)).map(item=>[item.url,item.path]));
      const unique = new Map();
      batches.flat().forEach(resource=>{ if (resource && typeof resource.name === 'string' && safeUrl(resource.downloadURL)) unique.set(resource.downloadURL,{...resource,detailPath:detailByUrl.get(resource.downloadURL)}); });
      resources = [...unique.values()]; ready = true; search();
    } catch (error) {
      status.textContent = '资源加载失败，您仍可浏览下方精选资源或完整资源目录。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'filter-btn'; retry.textContent = '重新加载'; retry.addEventListener('click',load); status.append(' ',retry);
      console.error(error);
    }
  }
  load();
})();
