MoodStudy teammate_script.js 修正版說明

已修正：
1. To-Do List 的 AI拆解會讀取 config.js 的 window.GEMINI_API_KEY
2. 不再使用檔案內固定的 YOUR_GEMINI_API_KEY_HERE
3. 修正「整理房間」被誤判成「整理筆記」的問題
4. AI prompt 已改成可拆解生活任務、學習任務、行政任務與專案任務

使用方式：
1. 解壓縮
2. 把 teammate_script.js 放到 static/js/teammate_script.js
3. 覆蓋原本的 teammate_script.js
4. index.html 建議確認載入順序：
   <script src="./static/js/config.js?v=9"></script>
   <script src="./static/js/teammate_script.js?v=9"></script>

若你的 index.html 目前是先載入 teammate_script.js，再載入 config.js，
To-Do 的 AI 拆解會讀不到 API Key。
所以 config.js 要放在 teammate_script.js 前面。
