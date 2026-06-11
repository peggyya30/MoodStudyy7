MoodStudy 園丁 AI v2 使用方式

這份檔案是新版 chat.js。
它會讓右下角「心靈園丁」變成比較大方向的聊天機器人，
可以回答：
- 學習建議
- 任務拆解
- 生活任務，例如整理房間
- 壓力紓解
- 報告、簡報、專案規劃
- 一般陪聊與方向建議

使用方式：
1. 把 chat.js 放到 static/js/chat.js
2. 覆蓋原本的 chat.js
3. 確認 index.html 最下面有：
   <script src="./static/js/config.js?v=8"></script>
   <script src="./static/js/chat.js?v=8"></script>

注意：
如果你是 GitHub Pages，建議路徑用 ./static/js/，不要用 /static/js/。
