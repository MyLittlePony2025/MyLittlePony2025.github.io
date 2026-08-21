   // 动态加载资源数据
   fetch("./resources.json")
   .then((response) => response.json())
   .then((data) => {
     createResource(data);
     //加载线上资源
     fetch("https://www.api.kuake98.com/resourceList")
       .then((response) => response.json())
       .then((onlineData) => {
         console.log(onlineData, "onlineData");
         onlineData = onlineData.map((item) => {
           let downloadURL = JSON.parse(item.urls)[0] || "#";
           return {
             ...item,
             downloadURL,
             name: item.title || "未知资源",
           };
         });
         setTimeout(() => { 
          createResource(onlineData);
        },5* 1000);
         updateResource(onlineData);
       })
       .catch((error) =>
         console.error("Error loading online resources:", error)
       );
   })
   .catch((error) => console.error("Error loading resources:", error));

 function createResource(data) {
   const container = document.getElementById("software-share-container");
   container.innerHTML = ""; // 清空所有子元素
   const categories = {};

   // 按分类分组资源
   data.forEach((item) => {
     if (!categories[item.classify]) {
       categories[item.classify] = [];
     }
     categories[item.classify].push(item);
   });

   // 动态生成分类模块
   Object.keys(categories).forEach((category) => {
     const categoryHeader = document.createElement("div");
     categoryHeader.className = "software-box-header";
     categoryHeader.innerHTML = `<h3>${category}分享</h3>`;

     const categoryBox = document.createElement("div");
     categoryBox.className = "software-box";

     categories[category].forEach((resource) => {
       const link = document.createElement("a");
       link.href = resource.downloadURL;
       link.className = "download-btn-more";
       link.setAttribute("aria-label", resource.name);
       link.textContent = resource.name;
       categoryBox.appendChild(link);
     });
     categoryHeader.appendChild(categoryBox);
     container.appendChild(categoryHeader);
   });
 }
 function updateResource(data) {
   const link = document.getElementById("download-btn");
   const href = link.getAttribute("href"); // 获取 href 属性的值
   const id = href?.split("/").pop();
   console.log(href, "href", "id", id);
   const target = data.filter((item) => item.id == id)[0];
   if (target && target.urls && target.urls.length > 0) {
     const downloadBtns = document.getElementById("download-btns");
     downloadBtns.innerHTML = ""; // 清空所有子元素
     const urls = JSON.parse(target.urls);
     urls.forEach((item, i) => {
       const a = document.createElement("a");
       a.href = item;
       a.className = "download-btn";
       a.setAttribute("aria-label", target.name);
       a.textContent = `下载${i + 1}`;
       downloadBtns.appendChild(a);
     });
     const a = document.createElement("a");
     a.href = "https://www.kuake98.com/";
     a.className = "download-btn";
     a.setAttribute("aria-label", "查看更多资源");
     a.textContent = "更多资源";
     downloadBtns.appendChild(a);
   }
}
 
// --- 新增广告加载逻辑 ---

/**
 * 初始化广告模块
 * @param {Object} data 广告数据 { left: {imageUrl, linkUrl}, right: {imageUrl, linkUrl} }
 */
function initAds(data) {
  if (data.show) {
    // 渲染左侧广告
    if (data.left) {
      renderAd('#ad-left', data.left);
    }
    
    // 渲染右侧广告
    if (data.right) {
      renderAd('#ad-right', data.right);
    }
  }
}

/**
 * 渲染单个广告 DOM
 */
function renderAd(selector, adInfo) {
  const container = document.querySelector(selector);
  if (!container || !adInfo.imageUrl) return;

  // 创建链接
  const link = document.createElement('a');
  link.href = adInfo.linkUrl || "javascript:void(0);";
  link.target = "_blank"; // 新窗口打开

  // 创建图片
  const img = document.createElement('img');
  img.src = adInfo.imageUrl;
  img.alt = "Advertisement";

  // 创建关闭按钮（可选）
  const closeBtn = document.createElement('div');
  closeBtn.className = 'ad-close';
  closeBtn.innerHTML = '&times;';
  closeBtn.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    container.style.display = 'none';
  };

  // 组装 DOM
  link.appendChild(img);
  link.appendChild(closeBtn); // 如果不需要关闭按钮，注释掉这一行
  container.appendChild(link);
}

// 页面加载完成后调用（后期可以在这里替换为 fetch 请求接口）
document.addEventListener('DOMContentLoaded', () => {
  
  // 假设这里是请求接口
  fetch('https://www.api.kuake98.com/ad').then(res => res.json()).then(data => initAds(data));
  
});