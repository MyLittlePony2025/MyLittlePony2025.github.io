// 延迟加载原有统计，服务不可用时不影响页面内容和交互。
(() => {
  const sdk = document.createElement('script');
  sdk.id = 'LA_COLLECT';
  sdk.src = 'https://sdk.51.la/js-sdk-pro.min.js';
  sdk.async = true;
  sdk.onload = () => window.LA?.init({ id:'3Qh1OAyzK3CUqior', ck:'3Qh1OAyzK3CUqior' });
  document.head.append(sdk);
})();
