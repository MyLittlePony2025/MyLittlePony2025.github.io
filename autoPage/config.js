const fs = require('node:fs');
const path = require('node:path');

function validateConfig(input) {
  function parseUrl(field, allowPath) {
    let url;
    try { url = new URL(input[field]); } catch { throw new Error(`${field} 必须填写包含 https:// 或 http:// 的完整地址`); }
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (!allowPath && url.pathname !== '/')) {
      throw new Error(`${field} 地址无效：不支持账号、查询参数、锚点${allowPath ? '' : '或子目录'}`);
    }
    return allowPath ? url.href.replace(/\/+$/, '') : url.origin;
  }
  const siteUrl = parseUrl('siteUrl', false);
  const apiBaseUrl = parseUrl('apiBaseUrl', true);
  if (typeof input.name !== 'string' || !input.name.trim()) throw new Error('name 不能为空');
  if (typeof input.indexNowKey !== 'string' || !/^[a-zA-Z0-9-]{8,128}$/.test(input.indexNowKey)) throw new Error('indexNowKey 必须是 8–128 位字母、数字或连字符');
  return {siteUrl, apiBaseUrl, name:input.name.trim(), indexNowKey:input.indexNowKey};
}

function loadConfig() {
  return validateConfig(JSON.parse(fs.readFileSync(path.join(__dirname,'site.config.json'),'utf8')));
}

module.exports = {loadConfig, validateConfig};
