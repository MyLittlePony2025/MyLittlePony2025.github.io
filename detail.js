// 线上资源展示、当前下载链接更新与广告；静态内容不依赖接口。
(() => {
  const safeUrl = value => { try { return typeof value === 'string' && ['https:','http:'].includes(new URL(value).protocol); } catch { return false; } };
  const request = async route => {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),8000);
    try {
      const response = await fetch(`${window.SITE_CONFIG.apiBaseUrl}/${route}`,{signal:controller.signal});
      if (!response.ok) throw new Error('接口不可用');
      return await response.json();
    } finally { clearTimeout(timeout); }
  };
  const validUrls = value => {
    try {
      const urls = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(urls) ? [...new Set(urls.filter(safeUrl))] : [];
    } catch { return []; }
  };
  const onlineStatus = document.getElementById('online-status');
  const onlineGrid = document.getElementById('online-grid');
  const onlineMore = document.getElementById('online-more');
  const onlineFilters = document.getElementById('online-filters');
  let onlineItems = [], filteredItems = [], shown = 0, selectedCategory = '';
  let categoryButtons = [];
  function selectCategory(category) {
    selectedCategory = category;
    filteredItems = category ? onlineItems.filter(item=>item.classify === category) : onlineItems;
    categoryButtons.forEach(({button,value})=>{
      const active = value === category;
      button.className = active ? 'filter-btn active' : 'filter-btn';
      button.setAttribute('aria-pressed',String(active));
    });
    shown = 0; onlineGrid.replaceChildren(); appendOnline();
  }
  function renderCategories() {
    const counts = new Map();
    onlineItems.forEach(item=>counts.set(item.classify,(counts.get(item.classify)||0)+1));
    onlineFilters.replaceChildren(); categoryButtons = [];
    // 保留接口中分类首次出现的顺序，数量仅统计可展示的有效资源。
    for (const [value,count] of [['',onlineItems.length],...counts]) {
      const button = document.createElement('button');
      button.type = 'button'; button.textContent = `${value || '全部分类'}（${count}）`;
      button.setAttribute('aria-controls','online-grid');
      button.addEventListener('click',()=>selectCategory(value));
      categoryButtons.push({button,value}); onlineFilters.append(button);
    }
    onlineFilters.hidden = !onlineItems.length;
    selectCategory(counts.has(selectedCategory) ? selectedCategory : '');
  }
  function appendOnline() {
    const fragment = document.createDocumentFragment();
    filteredItems.slice(shown,shown+24).forEach(resource=>{
      const card = document.createElement('article'); card.className = 'resource-card';
      const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = resource.classify || '资源';
      const heading = document.createElement('h3');
      const title = document.createElement('a'); title.textContent = resource.title;
      const link = document.createElement('a'); link.className = 'text-link'; link.textContent = '打开网盘链接 ↗';
      for (const anchor of [title,link]) { anchor.href = resource.url; anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; }
      heading.append(title);
      const description = document.createElement('p'); description.textContent = resource.description || '查看分享页面了解资源内容。';
      card.append(tag,heading,description,link); fragment.append(card);
    });
    onlineGrid.append(fragment);
    shown = Math.min(shown+24,filteredItems.length);
    onlineMore.hidden = shown >= filteredItems.length;
    onlineStatus.textContent = filteredItems.length ? `${selectedCategory || '全部分类'}：共 ${filteredItems.length} 个线上资源，已显示 ${shown} 个。` : '暂无可展示的线上资源。';
  }
  onlineMore.addEventListener('click',appendOnline);
  function updateDownload(rows) {
    const id = document.querySelector('[data-resource-id]')?.dataset.resourceId;
    const resource = rows.find(row=>row && String(row.id) === id);
    if (!resource) return;
    const valid = validUrls(resource.urls);
    if (!valid.length) return;
    const fragment = document.createDocumentFragment();
    valid.forEach((url,i)=>{
      const link = document.createElement('a');
      link.href = url; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.className = i ? 'button secondary' : 'button';
      link.textContent = valid.length > 1 ? `打开下载链接 ${i+1} ↗` : '打开网盘链接 ↗';
      fragment.append(link);
    });
    document.querySelector('.download-links')?.replaceChildren(fragment);
  }
  async function loadOnline() {
    onlineStatus.textContent = '正在加载线上资源…';
    try {
      const rows = await request('resourceList');
      if (!Array.isArray(rows)) throw new Error('资源列表格式错误');
      onlineItems = rows.flatMap(row=>{
        if (!row) return [];
        const title = typeof row.title === 'string' ? row.title.trim() : '';
        const urls = validUrls(row.urls);
        const classify = typeof row.classify === 'string' && row.classify.trim() ? row.classify.trim() : '未分类';
        return title && urls.length ? [{title,url:urls[0],description:row.description,classify}] : [];
      });
      renderCategories();
      // 列表展示独立于当前资源是否能按 ID 匹配。
      updateDownload(rows);
    } catch {
      onlineStatus.textContent = '线上资源暂时加载失败，您仍可使用上方资源与下载链接。';
      const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'filter-btn'; retry.textContent = '重新加载';
      retry.addEventListener('click',loadOnline); onlineStatus.append(' ',retry);
    }
  }
  loadOnline();
  request('ad').then(data=>{
    if (!data?.show) return;
    const ads = [data.left,data.right].filter(ad=>ad && safeUrl(ad.imageUrl) && safeUrl(ad.linkUrl));
    if (!ads.length) return;
    const section = document.createElement('aside'); section.className = 'sponsor-section'; section.setAttribute('aria-label','推广信息');
    const label = document.createElement('span'); label.className = 'small'; label.textContent = '推广信息';
    const close = document.createElement('button'); close.type = 'button'; close.className = 'filter-btn'; close.textContent = '关闭推广'; close.addEventListener('click',()=>section.remove());
    section.append(label,close);
    ads.forEach(ad=>{
      const link = document.createElement('a'); link.href = ad.linkUrl; link.target = '_blank'; link.rel = 'sponsored noopener noreferrer';
      const image = document.createElement('img'); image.src = ad.imageUrl; image.alt = '推广内容'; image.loading = 'lazy'; image.width = 240; image.height = 160;
      link.append(image); section.append(link);
    });
    document.getElementById('main').append(section);
  }).catch(()=>{});
})();
