# 项目分析与 SEO / UI 改动说明

## 更换域名：只改公共配置，再一键生成

唯一手工配置入口：`autoPage/site.config.json`。

| 配置项 | 用途 | 只更换网站域名时 |
| --- | --- | --- |
| `siteUrl` | 正式站点完整地址，例如 `https://www.example.com` | 修改这一项，不带子目录、查询参数或锚点 |
| `name` | 网站名称 | 按需修改 |
| `apiBaseUrl` | 线上资源和广告接口的公共地址，支持 API 路径前缀 | 后端没有迁移则保持不变，不要随网站域名一起替换 |
| `indexNowKey` | IndexNow 验证 Key，生成同名验证文件 | 按需修改 |

保存后双击项目根目录的 **`generate.cmd`**，或执行：

```powershell
node autoPage/generateJsonToHtml.js
```

一个生成命令会同步更新：首页、全部详情和目录分页的 canonical / OG / Twitter / JSON-LD、sitemap.xml、robots.txt、autoPage/url.txt、IndexNow Key 验证文件以及浏览器公共配置 `site-config.js`。本地 CSS、脚本、图片及站内导航继续使用相对路径。

`site-config.js` 是自动生成文件，不要手工修改。页面会先加载它，再运行 `detail.js`；原有三份历史 `script.js` 中的网站与接口地址也已改为读取此公共配置，若以后复用它们，也必须先加载 `site-config.js`。

`autoPage/config.js` 负责校验和规范化配置。`indexnow-submit.js` 使用相同配置；域名与 URL 清单不一致时拒绝推送，提示重新生成。生成命令不会自动推送、上传、修改 DNS 或设置 GitHub Pages 自定义域名。

第三方地址（网盘分享链接、51.la SDK、IndexNow 服务、Schema.org 协议）不属于本站域名，不会被批量替换。`submiturl*.txt` 是不参与生成和推送的历史记录。

## 项目结构与原有问题

这是一个直接由 GitHub Pages 托管的静态站点，没有 package.json、框架或打包步骤。主入口实际是根目录 `index.html`，没有 `index.htm`。

| 文件 / 目录 | 原有职责与分析 |
| --- | --- |
| `index.html` | 首页，内联 CSS 和 IndexedDB 搜索逻辑；首页元信息使用 www.kuake98.com，与子页域名不一致；没有 canonical，viewport 重复。搜索、分类、滚动分页分别维护结果，滚动后会混入未筛选内容；写入数据库时未等待事务完成。 |
| `resourcesVersion.json` | 指定首页使用 resources01、resources02 两份数据及版本号。 |
| `resources01.json` / `resources02.json` | 分别有 3,220 / 3,415 条记录；可能含重复下载地址。新首页按下载地址去重，保留后出现记录，延续原数据库 put 的覆盖语义。 |
| `resources.json` | 1,368 条历史资源；原首页当前并未使用这份数据。 |
| `classify.json` | 首页 20 个资源分类。 |
| `autoPage/resourceList-test.json` | 详情生成源，虽然名称带 test，实际上是生产构建数据。共 1,212 条，1,204 条有描述，去重后 1,184 个详情地址。当前有效记录的 classify 全部是“软件”；没有擅自重新分类或改写资源事实。 |
| `autoPage/generateJsonToHtml.js` | 原先生成详情、无样式目录、sitemap 和 robots；重复 slug 会覆盖页面却重复加入 sitemap，插值未转义，JSON-LD 直接拼接可能被引号破坏。 |
| `software/*.html` | 原有 1,184 个详情页和一个目录页。详情有仿网盘文件列表、无实际功能的图标、构建当天伪装的文件修改日期，主题与首页不一致。 |
| 根目录、`autoPage/`、`software/` 中旧 `style.css` / `script.js` | 三份历史样式和详情脚本；新页面统一引用新的共享资源，不再加载这些旧文件。保留旧文件以便比对，避免误删其他用途。 |
| `software/resources.json` | 原详情相关推荐的历史数据，1,267 条；新推荐由构建源生成静态站内链接。 |
| `autoPage/indexnow-submit.js` / `url.txt` | 原推送脚本内嵌整批 URL，容易落后于页面实际内容；现读取本次生成清单。 |
| `autoPage/submiturl*.txt` | 旧手工提交记录；保留，不参与本次构建。 |
| `sitemap.xml` / `robots.txt` | 原 sitemap 遗漏首页和目录，含重复 URL，且每次生成全部改为当天；现重建。 |
| `logo.png` / `favicon.ico` / 验证文件 | 保留品牌图标、Google / Bing 及域名验证资料。51.la 原统计 ID 保留。 |

## 已实现的改动

### SEO 与生成器

- 在 `site.config.json` 统一正式站点域名和品牌。默认使用本项目 GitHub Pages 域名；URL 主机名由标准 URL 类规范化为小写。
- 首页、详情和目录分页统一 canonical、OG、Twitter、favicon、`zh-CN` 和单一 viewport；分享图片使用真实存在的站点 logo。
- 首页使用 WebSite / Organization，目录使用 CollectionPage / ItemList，详情使用 WebPage / BreadcrumbList。删除不存在的 `/search` SearchAction，不再将目录和所有资源一律包装成 SoftwareApplication。
- 描述来源于实际数据，短描述不凑字数、不拼关键词或宣传语；长描述优先在句末截断。保留原 seo_title，不编造评分、价格或更新时间。
- 首页有静态精选内容和目录入口；每个详情页有面包屑、同类资源链接；目录按每页 60 条生成 20 页，全部使用真实 `<a href>` 链接。
- sitemap 收录首页、20 个目录页和 1,184 个详情页，共 1,205 个唯一 URL。没有可靠更新时间则省略 lastmod；去掉统一 daily 和 priority。
- HTML 文本 / 属性转义、JSON-LD 安全序列化、HTTP(S) 链接校验、slug 路径穿越 / Windows 保留名 / 分页名检查。
- 重复 slug 仍保留最后一条，与旧页面一致，同时写入 `build-report.json`；缺少描述的 8 条仍跳过，不虚构内容。全部数据验证和模板渲染完成后再写入文件。
- 内容不变则不重写文件；再次运行生成器应报告 changed: 0。保留全部旧详情 URL。
- `indexnow-submit.js` 改为读取统一域名及 `url.txt`。本次没有运行推送，也没有发布到远程。

### UI 与交互

- 新增 `site.css`：沿用首页紫色 #6f55ff，统一浅色背景、白色卡片、圆角、细边框、间距、字体、导航与页脚。共享样式只维护一份。
- 首页：突出搜索区，分类按钮、结果数量、卡片简介和加载更多；桌面三列、平板两列、手机单列。
- 详情：资源介绍与亮点为主栏，下载为独立侧栏，手机按单列排列；移除仿文件管理器和虚构修改日期；相关推荐在构建时生成。
- `home.js`：关键词和分类组合筛选、Enter 提交、`?q=` 直达搜索、每次 48 条分页、空结果提示、请求超时和失败重试。替换旧 IndexedDB 流程，依赖浏览器 HTTP 缓存及资源版本参数；不改动用户已有 IndexedDB 数据。
- `resource-details.json`：按下载 URL 将首页结果关联到现有详情页；没有详情的资源保留原网盘直达能力。
- `detail.js`：恢复 resourceList 的线上资源列表展示，与静态同类资源共存；每次展示 24 条，可继续加载，并提供空列表提示和失败重试。列表不依赖当前资源 ID 匹配，坏记录不会中断其他记录展示。保留原 API 的下载链接刷新功能，按真实资源 ID 匹配，支持所有有效下载链接；API 异常保留静态下载入口。广告仍读原 API，但放在正文底部、可关闭、懒加载，并标记 sponsored，不再左右悬浮遮挡。
- `analytics.js`：异步加载原 51.la 统计，不阻塞正文解析。
- 无障碍：单一 h1、语义化 main/nav/section、搜索 label、分类 aria-pressed、分页 aria-current、状态提示、键盘焦点、跳转正文和减少动画支持。

## 构建与验证

在项目根目录执行（Node.js 18 或更新版本，不需要安装依赖）：

```powershell
node autoPage/generateJsonToHtml.js
node --test autoPage/config.test.js autoPage/generateJsonToHtml.test.js autoPage/home.test.js autoPage/detail.test.js
```

**现在 `index.html` 也是生成文件。** 修改首页内容或布局请编辑生成器的 `homePage()` / `layout()`；详情改 `detailPage()`，目录改 `directoryPage()`，共享视觉改 `site.css`，之后重新构建。不要只编辑某一个生成的 HTML，否则下次构建会覆盖。

域名调整按文档开头的公共配置说明操作。网站域名与 API 地址独立配置，避免迁移网站时误改线上资源接口。

本次验证覆盖：21 项 Node 测试；1,205 页的 canonical、本地链接、h1、viewport、JSON-LD；全部 HTML 标签闭合和重复 ID；XML sitemap 解析与去重；重复构建零改动。首页、详情交互使用 DOM 测试替身，覆盖筛选分页、失败降级和 API 链接替换。路径回归检查覆盖站点根目录、父目录启动服务的项目子目录和 file:// 三种地址。域名迁移测试在独立测试目录构建新域名页面，验证 SEO、运行时配置、验证文件、推送清单及 API 地址独立性，并在测试后清理该目录。

### 本地资源路径修复

页面中的 CSS、JavaScript、图标、图片、站内链接和搜索表单统一由模板转换为相对于当前 HTML 文件的路径。首页引用 `./site.css`、`./home.js`；software 目录中的页面引用 `../site.css`、`../detail.js`。目录入口显式指向 `index.html`，直接打开本地文件时也能跳转。首页 JSON 请求和动态详情链接同样使用相对路径。canonical、OG 及结构化数据中的正式站点绝对 URL 不受影响。

直接双击 HTML 可以查看静态布局及详情，但浏览器通常不允许 file:// 页面 fetch 本地 JSON，因此首页会明确提示通过 HTTP 服务使用搜索。推荐从项目根目录启动下述服务，也支持从工作区父目录启动后访问 `/MyLittlePony2025.github.io/`。

本次环境未提供浏览器，无法进行真实桌面 / 手机截图、浏览器交互或 Lighthouse 验收；也未逐一访问外部网盘确认分享是否有效。可在本地 `python -m http.server 8000 --bind 127.0.0.1` 后打开 `http://127.0.0.1:8000/` 预览，避免直接 file:// 打开导致 fetch 失败。

构建不会自动删除旧文件。以后从数据源移除资源或减少目录页时，应另行审核旧 URL 的保留、重定向或删除策略。本次没有移除源资源，因此没有遗留失效详情页。

## 参考依据

- [Google：统一规范网址](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google：构建 sitemap 与可信 lastmod](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google：描述摘要](https://developers.google.com/search/docs/appearance/snippet)

这些改动改善可抓取性、元数据一致性和阅读体验，不代表搜索引擎必然收录或排名提升。源数据中的资源名称、描述真实性与重复版本仍需内容层面的持续维护。

线上列表回归验证：模拟接口数据测试覆盖完整分页、无当前 ID 匹配、无效链接、错误 JSON、空数据与请求失败。当前运行环境请求真实 API 返回 fetch failed，尚未完成真实接口及浏览器联调。

线上分类导航：按接口 `classify` 动态生成“全部分类”和各分类按钮，展示有效资源数量；默认显示全部，当前分类紫色高亮。切换分类重置到前 24 条，加载更多仅追加当前分类；空白分类归入“未分类”。分类名称会去掉首尾空格，并按接口首次出现顺序排列。复用首页可换行的分类样式，支持键盘操作和 aria-pressed 选中状态。测试覆盖分类计数、切换、分页隔离及未分类资源。
