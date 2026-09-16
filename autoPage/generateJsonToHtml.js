const fs = require("fs");
const path = require("path");

/**
 * 生成优化的 meta description，确保长度在 150-160 字符之间
 * 通过组合 description、features 和 keywords 来丰富内容
 * 符合 Bing Webmaster Tools 的 SEO 建议
 */
function generateMetaDescription(item) {
  const TARGET_MIN = 150;
  const TARGET_MAX = 160;

  let desc = (item.description || "").replace(/。$/, "");
  const features = item.features || [];
  const keywords = item.keywords || "";

  // 如果原始描述已经足够长，直接截断使用
  if (desc.length + 1 >= TARGET_MIN) {
    if (desc.length + 1 > TARGET_MAX) {
      desc = desc.substring(0, TARGET_MAX - 1);
    }
    return desc + "。";
  }

  // 拼接功能亮点来丰富描述
  if (features.length > 0) {
    desc += "。功能亮点：";
    for (let i = 0; i < features.length; i++) {
      const cleanFeature = features[i].replace(/。$/, "");
      const sep = i === 0 ? "" : "；";
      const next = desc + sep + cleanFeature;

      if (next.length < TARGET_MAX) {
        desc = next;
      } else {
        // 尽量填满剩余空间
        const remaining = TARGET_MAX - desc.length - sep.length - 1;
        if (remaining > 5) {
          desc += sep + cleanFeature.substring(0, remaining);
        }
        break;
      }
    }
  }

  // 如果拼接功能亮点后仍不足，追加关键词信息（只追加完整关键词，避免截断）
  if (desc.length < TARGET_MIN && keywords) {
    const kwArray = keywords.split(/[,，]\s*/);
    desc = desc.replace(/[；，、]+$/, "");
    desc += "。关键词：";
    for (const kw of kwArray) {
      if (desc.length + kw.length + 1 <= TARGET_MAX - 1) {
        desc += kw + "、";
      } else {
        break;
      }
    }
    desc = desc.replace(/[、]+$/, "");
  }

  // 如果仍然不足，追加通用补充语句
  if (desc.length < TARGET_MIN) {
    desc = desc.replace(/[；，、]+$/, "");
    const supplement = "。立即免费下载体验，操作简单便捷，畅享高效的使用感受，更多优质资源尽在本站，欢迎收藏。";
    desc += supplement;
    if (desc.length > TARGET_MAX - 1) {
      desc = desc.substring(0, TARGET_MAX - 1);
    }
  }

  // 清理尾部多余标点
  desc = desc.replace(/[；，、：]+$/, "");
  if (!desc.endsWith("。") && !desc.endsWith("！")) {
    desc += "。";
  }

  // 最终长度保护
  if (desc.length > TARGET_MAX) {
    desc = desc.substring(0, TARGET_MAX - 1);
    desc = desc.replace(/[；，、：]+$/, "");
    desc += "。";
  }

  return desc;
}

// 1. 读取数据文件
const resourcesPath = path.join(__dirname, "resourceList-test.json");
const rawData = fs.readFileSync(resourcesPath, "utf8");
const resources = JSON.parse(rawData);

// 2. 创建输出目录
const outputDir = path.join(__dirname, "../", "software");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

console.log(`开始批量生成 HTML，共 ${resources.length} 个文件...`);

// 获取当前日期和时间对象
const now = new Date();
// 获取年月日 (本地时间)
const year = now.getFullYear();
const month = now.getMonth() + 1; // 注意：月份是从 0 开始的，所以要 +1
const day = now.getDate();
// 简单的拼接格式化
const formattedDate = `${year}-${month}-${day}`;

let sitemap = "";
const mainUrl = "https://MyLittlePony2025.github.io/";
const prefix = "software/";
let urlAll = []

//目录的内容
let directoryContent = ''

// 3. 循环处理每个资源项
resources.forEach((item) => {
  // 跳过数据不够的
  if (!item.description) {
    return;
  }
  // --- 数据预处理 ---
  // 标题与SEO信息

  const pageTitle = item.seo_title || item.title;
  const metaDescription = generateMetaDescription(item);
  const metaKeywords = item.keywords || "";
  const ogUrl = `${mainUrl}${prefix}${item.url_slug}.html`; // 暂时保持固定，或者根据 id 生成: `.../${item.id}.html`

  // Hero区域
  const heroTitle = item.title;
  const heroDescription = item.description;

  // 特性列表 (JSON中已经是数组，直接使用)
  const features = item.features || [];

  // 下载链接处理
  let primaryDownloadUrl = "#";
  try {
    // JSON中 urls 是字符串化的数组 "[\"url\"]"，需要二次解析
    const parsedUrls = JSON.parse(item.urls);
    if (Array.isArray(parsedUrls) && parsedUrls.length > 0) {
      primaryDownloadUrl = parsedUrls[0];
    }
  } catch (e) {
    console.error(`ID: ${item.id} - URL解析失败，使用默认链接`);
  }

  const downloadLinks = [
    {
      url: primaryDownloadUrl,
      label: "立即下载",
    },
    {
      url: "https://www.kuake98.com/",
      label: "更多资源",
    },
  ];
  //文件名
  const filename = item.title
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_");

  // 图片 (JSON中没有图片字段，暂时使用默认占位符，保持结构不变)
  const imgUrl = "img.jpg";

  // --- 生成 HTML 内容 (保持原有结构) ---
  const htmlContent = `
<!DOCTYPE html>
<html lang="zh">
<script charset="UTF-8" id="LA_COLLECT" src="//sdk.51.la/js-sdk-pro.min.js"></script>
<script>LA.init({id:"3Qh1OAyzK3CUqior",ck:"3Qh1OAyzK3CUqior"})</script>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="index, follow" />
    <meta name="description" content="${metaDescription}" />
    <meta name="keywords" content="${metaKeywords}" />
    <meta property="og:title" content="${pageTitle}" />
    <meta property="og:description" content="${metaDescription}" />
    <meta property="og:url" content="${ogUrl}" />
    <meta property="og:image" content="${imgUrl}" />
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${pageTitle}">
    <meta name="twitter:description" content="${metaDescription}">
    <meta name="twitter:image" content="${imgUrl}">
    <title>${pageTitle}</title>
    <link rel="stylesheet" href="style.css">
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "${pageTitle}",
        "description": "${metaDescription}",
        "url": "${ogUrl}",
        "publisher": {
          "@type": "Organization",
          "name": "Aurora2025",
          "url": "https://MyLittlePony2025.github.io/",
          "logo": {
            "@type": "ImageObject",
            "url": "https://MyLittlePony2025.github.io/logo.png",
            "width": 200,
            "height": 200
          }
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://MyLittlePony2025.github.io/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    </script>
  </head>
  <body>
    <!-- 新增：左右广告容器 -->
    <div id="ad-left" class="ad-sidebar ad-left"></div>
    <div id="ad-right" class="ad-sidebar ad-right"></div>
    <div id="content">
      <header>
        <nav>
          <ul>
            <li><a href="/">首页</a></li>
            <li><a href="/">功能介绍</a></li>
            <li><a href="/">热门内容</a></li>
            <li><a href="/">联系我们</a></li>
          </ul>
        </nav>
      </header>
      <section id="hero">
        <div class="container">
          <h1>${heroTitle}</h1>
          <p>${heroDescription}</p>
        </div>
      </section>
      <section id="features" class="flex">
        <div class="img-box">
          <!-- 顶部 -->
          <div class="top-bar">
            <div class="breadcrumb">全部文件</div>
            <div class="view-switchers">
              <div class="btn-icon">
                <!-- 列表视图图标 -->
                <svg viewBox="0 0 24 24">
                  <path
                    d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"
                  />
                </svg>
              </div>
              <div class="btn-icon">
                <!-- 网格视图图标 -->
                <svg viewBox="0 0 24 24">
                  <path
                    d="M4 8h4V4H4v4zm6 12h4v-4h-4v4zm-6 0h4v-4H4v4zm0-6h4v-4H4v4zm6 0h4v-4h-4v4zm6-10v4h4V4h-4zm-6 4h4V4h-4v4zm6 6h4v-4h-4v4zm0 6h4v-4h-4v4z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <!-- 表头 -->
          <div class="file-list-header">
            <div class="col-checkbox">
              <div class="checkbox"></div>
            </div>
            <div class="col-name">
              <span>文件名</span>
              <span class="sort-icon">⬆</span>
              <!-- 简单模拟排序箭头 -->
            </div>
            <div
              class="col-size"
              style="text-align: right; padding-right: 30px"
            >
              大小
            </div>
            <div class="col-date" style="text-align: right">修改日期</div>
          </div>

          <!-- 文件项 -->
          <div class="file-item">
            <div class="col-checkbox">
              <div class="checkbox"></div>
            </div>

            <div class="file-name-container">
              <div class="file-info">
                <div class="file-icon">
                  <img
                    src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAMAAAC5zwKfAAAABGdBTUEAALGPC/xhBQAAAAFzUkdCAK7OHOkAAABFUExURUxpcfD0+urv9+vv+eLq8Ka3+e7x+uPn7t/l7+Dn7tvk++br+eLo+t3i7+Xp8Orv+0p1/5iy/Bta/16A/ypj/6/E+xBU//Vhs9kAAAAKdFJOUwD///8z4v/Yq1ws2aPNAAAC2ElEQVRYw+2YbXejIBCFK+RgwstQt2v//0/dAQIizBg1abcfepummFOf3ssMWnx7+9XP1nV0hwXOXVkedwY8EEO8OGcELVmkpCoaBnyhAC6MQSsMhZQInOdMrDUE6qAYi6MTnEEhp6k3qJJBtOgo3s0h0HDEO5BGCriRiY3gp5BwqIrDgczsHBtY5MiqIQ4q1YXKfHOwYbA47EvCZb6yJYlVXuawwi1IGIkm3OIV4DpvUd+KG4mXyE1JKqTsMo/bBqk5HJY57DNfNmosF6BSZNfEslx2NuG9FvMUcJLB9cuPSSwLMa1lxVtctyJdkoQTGcjD+lZkmzDzosPm0rXqm2b50SUptAjs4jYe68xME1a85HAzdJ2ZSFzDKIetv3XmERQr4kxGVW+PwNxB1tpIHA5ZoDwHVP8fqL4YOOwEyjMGXw8MyBcD2T7ciSOAggTK80DS4X7eTofPAL/FoZRPEHug3NRD5DGHNFF9CTBzDwOl2tahKu9hdg71lCVdHs0HkJ1D/Zklpjx6P2Czd/gnS0x5dAQIu4A+aQ9UHAFS2CPAuQBN0UNoD/ybJeY8qoAVlWYeA9r4bb0PB6Fd8d0b6eM/keIo0IF1BvfN1lnjTNhD+7CPNk6CkzgAQVf5PcvMefQRgRB34ojDHXX4MjjyPh7hC1xaYPQ9xVCyLrFs2N5HINoz8Q+gPYn2AxD4pWeqobGoOxCypfBmYn584Q9LA+nIAai11eE8PDswIcwr8gx4Dx4/Fz0Qf4UE2kb9fHh/n61zwBrqTCo9zoBvgWYFtNvAOzRNZZjcUCKzE6hrrYEuzmd6thObqwN+ZNm5DLXmkDaxAjjNwClgBcXZs68B1j5X9W6B5UYy2aWx9X7i2mFTRL0tujV5oN6hHsg71PoU0T4J1G1sFqj1OWIV+Ypr+QSxKU316PQC9VYK4mV2KR5xhSE+wlVYPWi5jfCMwiXXjbffp+I/Vf8AffaJcvkx+pwAAAAASUVORK5CYII="
                    alt="${heroTitle}"
                  />
                </div>
                <!-- 模拟文件图标 -->
                <span>${filename}</span>
              </div>

              <div class="file-actions">
                <!-- 下载图标 -->
                <svg class="action-icon" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <!-- 分享/链接图标 -->
                <svg class="action-icon" viewBox="0 0 24 24">
                  <path
                    d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"
                  />
                </svg>
              </div>
            </div>

            <div
              class="file-size"
              style="text-align: right; padding-right: 30px"
            >
              -
            </div>
            <div class="file-date">${formattedDate}</div>
          </div>
        </div>
        <div class="container features-list-box">
          <h2>软件特点</h2>
          <ul>
            ${features.map((feature) => `<li>${feature}</li>`).join("")}
          </ul>
          <div id="download-btns">
            ${downloadLinks
      .map(
        (link) =>
          `<a href="${link.url}" id="download-btn" class="download-btn" target="_blank">${link.label}</a>`
      )
      .join("")}
          </div>
        </div>
      </section>
       <section id="software-share">
        <div id="software-share-container">
          
        </div>
      </section>
      <footer>
        <div>
          <p>
            本站资源收集于网络，仅供学习和交流使用，本站一切资源不代表本站立场，如有不妥请联系本站处理！
          </p>
        </div>
      </footer>
      <script src="./script.js"></script>
    </div>
  </body>
</html>
`;
  // 生成sitemap.xml
  sitemap += `
  <url>
        <loc>${ogUrl}</loc>
        <lastmod>${formattedDate}</lastmod> 
        <changefreq>daily</changefreq>
        <priority>1.0</priority> 
  </url>`;

  // 生成目录内容
  directoryContent += `
  <li><a href="/software/${item.url_slug}.html" title="${pageTitle}">${item.url_slug}</a></li>
  `

  urlAll.push(ogUrl)

  // 4. 写入文件
  // 使用 item.title 作为文件名，并去除特殊字符，防止文件名非法
  // 也可以改用 item.id (如 `${item.id}.html`)
  const safeFilename = `${item.url_slug}.html`;
  const outputPath = path.join(outputDir, safeFilename);

  fs.writeFileSync(outputPath, htmlContent, "utf8");
  console.log(`生成成功: ${safeFilename}`);
});
const allSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemap}
</urlset>
`;
const outputSitemapDir = path.join(__dirname, "../", "software");
const outputSitemapPath = path.join(__dirname, "../", "sitemap.xml");
fs.writeFileSync(outputSitemapPath, allSitemap, "utf8");

const outputUrlPath = path.join(__dirname, "url.txt");
fs.writeFileSync(outputUrlPath, JSON.stringify(urlAll), "utf8");

const outputSubmitUrlPath = path.join(__dirname, "submiturl.txt");
fs.writeFileSync(outputSubmitUrlPath, urlAll.toString().replace(/,/g,'\n'), "utf8");

const robots = `User-agent: *
Disallow:
Sitemap: ${mainUrl}sitemap.xml
`;
const outputRobotsPath = path.join(__dirname, "../", "robots.txt");
fs.writeFileSync(outputRobotsPath, robots, "utf8");


// 目录的html
let directoryHtml = `<!DOCTYPE html>
<html lang="zh">
<script charset="UTF-8" id="LA_COLLECT" src="//sdk.51.la/js-sdk-pro.min.js"></script>
<script>LA.init({id:"3Qh1OAyzK3CUqior",ck:"3Qh1OAyzK3CUqior"})</script>
  <head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="夸克网盘资源为您提供海量优质软件资源，涵盖安卓模拟器、视频播放器、办公工具、系统优化等类别。所有资源均支持高速下载，界面清爽无广告，助您轻松获取所需工具。">
  <meta name="keywords" content="软件下载, 安卓模拟器, 视频播放器, 办公软件, 系统优化, 高速下载, 无广告, 资源聚合, 免费工具">
  <meta name="author" content="夸克98">
  <meta name="robots" content="index, follow">
  <meta name="googlebot" content="index, follow">
  <meta name="bingbot" content="index, follow">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#4caf50">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="夸克网盘资源 - 软件资源大全 | 免费下载高速稳定">
  <meta name="twitter:description" content="夸克网盘资源为您提供海量优质软件资源，涵盖安卓模拟器、视频播放器、办公工具、系统优化等类别。所有资源均支持高速下载，界面清爽无广告，助您轻松获取所需工具。">
  <meta name="twitter:image" content="https://MyLittlePony2025.github.io/logo.png">
  <meta property="og:title" content="夸克网盘资源 - 软件资源大全 | 免费下载高速稳定">
  <meta property="og:description" content="夸克网盘资源为您提供海量优质软件资源，涵盖安卓模拟器、视频播放器、办公工具、系统优化等类别。所有资源均支持高速下载，界面清爽无广告，助您轻松获取所需工具。">
  <meta property="og:url" content="https://MyLittlePony2025.github.io/software">
  <meta property="og:type" content="website">
  <meta property="og:image" content="https://MyLittlePony2025.github.io/logo.png">
  <title>夸克网盘资源 - 软件资源大全 | 免费下载高速稳定</title>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "夸克网盘资源 - 软件资源大全 | 免费下载高速稳定",
        "description": "夸克网盘资源为您提供海量优质软件资源，涵盖安卓模拟器、视频播放器、办公工具、系统优化等类别。所有资源均支持高速下载，界面清爽无广告，助您轻松获取所需工具。",
        "url": "https://MyLittlePony2025.github.io/software",
        "publisher": {
          "@type": "Organization",
          "name": "Aurora2025",
          "url": "https://MyLittlePony2025.github.io/software",
          "logo": {
            "@type": "ImageObject",
            "url": "https://MyLittlePony2025.github.io/logo.png",
            "width": 200,
            "height": 200
          }
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://MyLittlePony2025.github.io/search?q={search_term_string}",
          "query-input": "required name=search_term_string"
        }
      }
    </script>
  </head>
  <body> 
    <nav aria-label="breadcrumb">
        <ol>
            <li><a href="/">首页</a></li>
            <li>资源目录</li>
        </ol>
    </nav>
    <main>
        <h1>资源目录</h1>
        <section>
            <h2>软件</h2>
            <ul>
            ${directoryContent}
            </ul>
        </section>
    </main>
    <footer>
        <p>&copy; 2025 跨界资源网. All rights reserved.</p>
    </footer>
  </body>
  </html>
  `
  const outputDirectoryPath = path.join(outputSitemapDir, "index.html");
fs.writeFileSync(outputDirectoryPath, directoryHtml, "utf8");

console.log(`\n全部处理完成！文件保存在 software 文件夹中。`);
