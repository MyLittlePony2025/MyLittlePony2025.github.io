const https = require("https");
const fs = require("node:fs");
const path = require("node:path");
const { loadConfig } = require('./config');

// ================= 配置区域 =================
function createSubmission(config = loadConfig(), urls = JSON.parse(fs.readFileSync(path.join(__dirname, 'url.txt'), 'utf8'))) {
  const siteUrl = new URL(config.siteUrl);
  if (!Array.isArray(urls) || !urls.length || urls.some(url => {
    try { return new URL(url).origin !== siteUrl.origin; } catch { return true; }
  })) throw new Error('URL 清单与当前站点域名不匹配，请先重新生成页面');
  return {
    host: siteUrl.hostname,
    key: config.indexNowKey,
    keyLocation: `${siteUrl.origin}/${config.indexNowKey}.txt`,
    urlList: urls
  };
}
// ===========================================

/**
 * 执行 IndexNow 推送
 */
function submitToIndexNow() {
  const CONFIG = createSubmission();
  // 构造请求体数据
  const postData = JSON.stringify({
    host: CONFIG.host,
    key: CONFIG.key,
    keyLocation: CONFIG.keyLocation,
    urlList: CONFIG.urlList,
  });

  // 必应的 IndexNow 端点
  const options = {
    hostname: "api.indexnow.org",
    path: "/indexnow",
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": Buffer.byteLength(postData),
    },
  };

  console.log(`正在准备推送 ${CONFIG.urlList.length} 个 URL 到 IndexNow...`);

  const req = https.request(options, (res) => {
    let responseBody = "";

    res.on("data", (chunk) => {
      responseBody += chunk;
    });

    res.on("end", () => {
      // IndexNow 成功通常返回 200 或 202
      if (res.statusCode === 200 || res.statusCode === 202) {
        console.log(`✅ 推送成功！状态码: ${res.statusCode}`);
        console.log(`已提交域名: ${CONFIG.host}`);
      } else {
        console.error(`❌ 推送失败。状态码: ${res.statusCode}`);
        console.error(`响应信息: ${responseBody}`);
        // 常见错误处理
        if (res.statusCode === 400)
          console.error("提示：请求格式错误，请检查 URL 格式或 Key 是否正确。");
        if (res.statusCode === 403)
          console.error("提示：Key 无效或未在网站根目录找到验证文件。");
        if (res.statusCode === 422)
          console.error("提示：域名不匹配或 URL 不属于该域名。");
      }
    });
  });

  req.on("error", (e) => {
    console.error(`❌ 请求过程中发生错误: ${e.message}`);
  });

  // 写入数据并结束请求
  req.write(postData);
  req.end();
}

// 运行函数
if (require.main === module) {
  try { submitToIndexNow(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { createSubmission };
