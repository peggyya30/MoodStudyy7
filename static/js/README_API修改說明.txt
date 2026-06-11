使用方式：
1. 把 chat.js 覆蓋原本的 chat.js
2. 把 config.js 放到同一層資料夾
3. 在 HTML 裡面確認載入順序是：
   <script src="config.js"></script>
   <script src="chat.js"></script>
4. 到 config.js 裡把 YOUR_GEMINI_API_KEY_HERE 改成你的 Gemini API Key

注意：
正式公開網站不建議直接把 API Key 放在前端，期末展示可以先這樣使用。
