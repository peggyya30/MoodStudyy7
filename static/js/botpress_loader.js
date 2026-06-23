// ====== Botpress 動態加載邏輯 ======
// 此檔案由 teammate_script.js 移出，功能不變。
// 目的：讓貓咪聊天機器人的載入程式獨立管理，避免主程式過長。

// ====== Botpress 動態加載邏輯 ======
function loadBotpress() {
  if (document.getElementById('bp-inject-script')) {
    if (window.botpress) window.botpress.sendEvent({ type: "show" });
    const widget = document.getElementById('bp-web-widget-container');
    if (widget) widget.style.display = 'block';
    return;
  }
  const injectScript = document.createElement('script');
  injectScript.id = 'bp-inject-script';
  injectScript.src = 'https://cdn.botpress.cloud/webchat/v3.6/inject.js';
  const configScript = document.createElement('script');
  configScript.src = 'https://files.bpcontent.cloud/2026/06/10/15/20260610150935-LRH30M5J.js';
  configScript.defer = true;
  document.body.appendChild(injectScript);
  document.body.appendChild(configScript);
}

function hideBotpress() {
  if (window.botpress) window.botpress.sendEvent({ type: "hide" });
  const widget = document.getElementById('bp-web-widget-container');
  if (widget) widget.style.display = 'none';
}


window.loadBotpress = loadBotpress;
window.hideBotpress = hideBotpress;
