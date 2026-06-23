const app = document.getElementById("app");

window.getLocalDateString = function (d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const todayKey = window.getLocalDateString();

// Botpress 載入邏輯已移至 static/js/botpress_loader.js

/* ===== Gemini AI 設定 =====
請在 static/js/config.js 中設定：
window.GEMINI_API_KEY = "AQ.Ab8RN6IabH-Ipbaolemnz0lkm896tFdCIwnuhMXYFTYO6zX0Ng";
window.GEMINI_MODEL = "gemini-2.0-flash";

注意：正式上線不建議把 API Key 放在前端，期末展示可暫時使用。
*/
const GEMINI_API_KEY = window.GEMINI_API_KEY || "";
const GEMINI_MODEL = window.GEMINI_MODEL || "gemini-2.0-flash";

const TOKEN_REWARD_MAIN = 3;
const TOKEN_REWARD_SUB = 1;
const MAX_DAILY_TOKENS = 15;

function showToast(message) {
  let toast = document.getElementById("token-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "token-toast";
    toast.className = "toast-message";
    document.body.appendChild(toast);
  }
  toast.innerText = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

function updateTokens(amount) {
  const today = window.getLocalDateString();
  let savedDate = localStorage.getItem(`lms_daily_earned_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`);
  let dailyEarned = parseInt(localStorage.getItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 0;

  if (savedDate !== today) {
    dailyEarned = 0;
    localStorage.setItem(`lms_daily_earned_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, today);
  }

  let tokens = parseInt(localStorage.getItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 15;

  if (amount > 0) {
    const spaceLeft = MAX_DAILY_TOKENS - dailyEarned;
    if (spaceLeft <= 0) {
      showToast("🎉 完成任務！(今日代幣獲取已達上限 " + MAX_DAILY_TOKENS + " 枚)");
      if (typeof window.confetti === 'function') window.confetti();
      return;
    }
    const actualEarned = Math.min(amount, spaceLeft);
    tokens += actualEarned;
    dailyEarned += actualEarned;
    localStorage.setItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyEarned);
    showToast("🎉 恭喜完成任務！獲得 " + actualEarned + " 枚代幣！");
    if (typeof window.confetti === 'function') window.confetti();
  } else if (amount < 0) {
    // 扣回機制 Clawback
    tokens += amount;
    if (tokens < 0) tokens = 0;

    // 從每日額度扣回來，讓使用者可以再次賺取
    if (dailyEarned > 0) {
      dailyEarned += amount;
      if (dailyEarned < 0) dailyEarned = 0;
      localStorage.setItem(`lms_daily_earned_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyEarned);
    }
    showToast("⚠️ 任務狀態變更，已扣回 " + Math.abs(amount) + " 枚代幣");
  }

  localStorage.setItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, tokens);

  // Update token display in topbar
  const tokenDisplay = document.getElementById("topbar-token-count");
  if (tokenDisplay) tokenDisplay.innerText = tokens;
}

const now = new Date();

function defaultUserState() {
  return {
    mood: "尚未填寫",
    stress: "-",
    note: "",
    pressureReason: [],
    streak: 0,
    lastCheckinDate: "",
    checkinDates: [],
    checkinTaskStatus: {},
    moodRecords: [],
    pressureRecords: [],
    todos: [
      { text: "整理今天的筆記重點", time: "20 分鐘", done: false, subtasks: [] },
      { text: "完成數學作業練習題", time: "40 分鐘", done: false, subtasks: [] },
      { text: "閱讀一篇英文課文", time: "30 分鐘", done: false, subtasks: [] }
    ],
    theme: "yellow",
    fontSize: "normal",
    fontFamily: "default",
    chatMessages: [
      { role: "ai", text: "嗨嗨，我是 MoodStudy AI 學習助手！你可以跟我聊學習、壓力、心情，或只是想放鬆一下。" }
    ]
  };
}

let state = defaultUserState();

function getLoginInfo() {
  return JSON.parse(localStorage.getItem("moodstudy_login") || "null");
}

function getCurrentUsername() {
  const login = getLoginInfo();
  return login?.username || "guest";
}

function getCurrentDataKey() {
  return `moodstudy_data_${getCurrentUsername()}`;
}

function loadCurrentUserState() {
  const key = getCurrentDataKey();
  const saved = localStorage.getItem(key);
  state = saved ? { ...defaultUserState(), ...JSON.parse(saved) } : defaultUserState();
  ensureDataShape();
  ensureSettings();
  applySettings();
}

function resetToGuestState() {
  state = defaultUserState();
  applySettings();
}

const demoAccounts = {
  student: { username: "student", password: "1234", name: "王小明" },
  teacher: { username: "1399", password: "1399", name: "教師管理者" }
};

function getRegisteredAccounts() {
  return JSON.parse(localStorage.getItem("moodstudy_registered_accounts") || "{}");
}

function saveRegisteredAccounts(accounts) {
  localStorage.setItem("moodstudy_registered_accounts", JSON.stringify(accounts));
}

function initializeDemoClass() {
  const registered = getRegisteredAccounts();
  let added = false;
  for (let i = 1; i <= 30; i++) {
    const uname = `student${i}`;
    if (!registered[uname]) {
      registered[uname] = { role: "student", username: uname, password: "123", nickname: `同學 ${i}` };
      added = true;
    }
  }
  if (added) {
    saveRegisteredAccounts(registered);
  }
}
initializeDemoClass();

function findAccount(role, username) {
  const registered = getRegisteredAccounts();
  if (registered[username] && registered[username].role === role) {
    return registered[username];
  }
  const demo = demoAccounts[role];
  if (demo && demo.username === username) {
    return demo;
  }
  return null;
}

function loginTopbar() {
  return `
    <header class="topbar">
      <div class="logo" onclick="renderLogin()">
        <span>MoodStudy</span>
      </div>
    </header>
  `;
}

function loginWithDemoAccount() {
  const role = document.querySelector("input[name='role']:checked").value;
  const username = document.getElementById("loginUser").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  const account = findAccount(role, username);

  const error = document.getElementById("loginError");

  if (account && password === account.password) {
    localStorage.setItem("moodstudy_login", JSON.stringify({
      role,
      username,
      name: account.name || account.nickname || username,
      loginAt: new Date().toISOString()
    }));
    loadCurrentUserState();
    if (role === "teacher" && username === "1399") {
      renderTeacherStudents();
    } else {
      renderDashboard();
    }
  } else {
    error.textContent = "帳號或密碼錯誤，請確認後再試一次。";
    error.style.display = "block";
  }
}

function renderRegister() {
  app.innerHTML = `
    <div class="app-frame">
      ${loginTopbar()}
      <main class="register-body">
        <section class="register-intro">
          <h1>建立 MoodStudy 帳號</h1>
          <p>請填寫基本資料並設定帳號密碼，完成後即可使用新帳號登入系統。</p>
          <div class="register-illustration">📝✨</div>
        </section>

        <section class="register-card">
          <h2>立即註冊</h2>

          <div class="register-grid">
            <div class="field"><span>姓</span><input id="regLastName" placeholder="例如：王"></div>
            <div class="field"><span>名</span><input id="regFirstName" placeholder="例如：小明"></div>
          </div>

          <div class="field"><span>暱稱</span><input id="regNickname" placeholder="例如：小明"></div>
          <div class="field"><span>電話</span><input id="regPhone" placeholder="例如：0912345678"></div>

          <div class="role-row register-role">
            <label><input type="radio" name="regRole" value="student" checked> 學生</label>
            <label><input type="radio" name="regRole" value="teacher"> 教師</label>
          </div>

          <div class="field"><span>帳號</span><input id="regUsername" placeholder="請設定登入帳號"></div>
          <div class="field"><span>密碼</span><input id="regPassword" type="password" placeholder="請設定密碼"></div>
          <div class="field"><span>確認</span><input id="regConfirm" type="password" placeholder="再次輸入密碼"></div>

          <div id="registerError" class="login-error"></div>

          <button class="primary" onclick="createAccount()">建立帳號</button>
          <p class="register">已經有帳號？ <a href="#" onclick="renderLogin()">返回登入</a></p>
        </section>
      </main>
      <footer class="footer">
        <span>© 2024 MoodStudy. All rights reserved.</span>
      </footer>
    </div>
  `;
}

function createAccount() {
  const lastName = document.getElementById("regLastName").value.trim();
  const firstName = document.getElementById("regFirstName").value.trim();
  const nickname = document.getElementById("regNickname").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const role = document.querySelector("input[name='regRole']:checked").value;
  const username = document.getElementById("regUsername").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const confirm = document.getElementById("regConfirm").value.trim();
  const error = document.getElementById("registerError");

  if (!lastName || !firstName || !nickname || !phone || !username || !password || !confirm) {
    error.textContent = "請完整填寫所有欄位。";
    error.style.display = "block";
    return;
  }

  if (password.length < 4) {
    error.textContent = "密碼至少需要 4 個字元。";
    error.style.display = "block";
    return;
  }

  if (password !== confirm) {
    error.textContent = "兩次輸入的密碼不一致。";
    error.style.display = "block";
    return;
  }

  const registered = getRegisteredAccounts();

  if (registered[username] || username === "student" || username === "teacher" || username === "1399") {
    error.textContent = "這個帳號已經被使用，請換一個帳號。";
    error.style.display = "block";
    return;
  }

  registered[username] = {
    role,
    username,
    password,
    lastName,
    firstName,
    nickname,
    phone,
    name: nickname || (lastName + firstName),
    createdAt: new Date().toISOString()
  };

  saveRegisteredAccounts(registered);
  localStorage.setItem(`moodstudy_data_${username}`, JSON.stringify(defaultUserState()));

  alert("註冊成功！請使用剛剛設定的帳號密碼登入。");
  resetToGuestState();
  renderLogin();
}

function logout() {
  localStorage.removeItem("moodstudy_login");
  
  // 清除 Botpress 的暫存，確保換帳號時對話是全新的
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("bp-") || key.includes("botpress"))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k));

  resetToGuestState();
  // 強制重新載入頁面，確保 Botpress 的 iframe 徹底銷毀
  window.location.reload();
}

function normalizeTodos() {
  if (!Array.isArray(state.todos)) state.todos = [];

  state.todos = state.todos.map(todo => {
    const normalized = {
      text: todo?.text || "未命名任務",
      time: todo?.time || "30 分鐘",
      done: Boolean(todo?.done),
      subtasks: Array.isArray(todo?.subtasks)
        ? attachUrgencyToSubtasks(todo.subtasks, todo?.text || "未命名任務")
        : [],
      breakdownSource: todo?.breakdownSource || "",
      breakdownError: todo?.breakdownError || ""
    };

    syncTodoDoneFromSubtasks(normalized);
    return normalized;
  });
}

function getTodoIsDone(todo) {
  if (!todo) return false;
  if (Array.isArray(todo.subtasks) && todo.subtasks.length > 0) {
    return todo.subtasks.every(subtask => subtask.done);
  }
  return Boolean(todo.done);
}

function syncTodoDoneFromSubtasks(todo) {
  if (todo && Array.isArray(todo.subtasks) && todo.subtasks.length > 0) {
    todo.done = todo.subtasks.every(subtask => subtask.done);
  }
}

function getTodoProgress(todo) {
  if (!todo) return 0;
  if (Array.isArray(todo.subtasks) && todo.subtasks.length > 0) {
    const completed = todo.subtasks.filter(subtask => subtask.done).length;
    return Math.round((completed / todo.subtasks.length) * 100);
  }
  return todo.done ? 100 : 0;
}

function getTodoProgressText(todo) {
  if (!todo || !Array.isArray(todo.subtasks) || todo.subtasks.length === 0) {
    return todo?.done ? "已完成" : "尚未拆解";
  }
  const completed = todo.subtasks.filter(subtask => subtask.done).length;
  return `${completed} / ${todo.subtasks.length} 小任務`;
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanSubtaskText(text) {
  return String(text || "")
    .replace(/^[-*•\d.、)\s]+/, "")
    .replace(/[。.!！]+$/g, "")
    .trim()
    .slice(0, 28);
}

function normalizeSubtaskList(list) {
  const seen = new Set();
  const cleaned = (list || [])
    .map(cleanSubtaskText)
    .filter(item => item.length >= 2)
    .filter(item => {
      const key = item.replace(/\s+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return cleaned.slice(0, 6);
}

/* ===== AI 拆解來源顯示：Gemini / 內建備援 ===== */
function getBreakdownSourceLabel(todo) {
  const source = todo?.breakdownSource || "";
  if (source === "gemini") return "Gemini AI 拆解";
  if (source === "fallback") return "內建備援拆解";
  if (source === "manual") return "手動拆解";
  return "尚未拆解";
}

function getBreakdownSourceClass(todo) {
  const source = todo?.breakdownSource || "";
  if (source === "gemini") return "gemini";
  if (source === "fallback") return "fallback";
  if (source === "manual") return "manual";
  return "none";
}

function hasGeminiConfig() {
  return Boolean(GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE");
}

function getAIBreakdownModeText() {
  if (!hasGeminiConfig()) {
    return "目前未偵測到 Gemini API Key，拆解會使用內建備援規則。若要真正依照不同輸入即時拆解，請確認 static/js/config.js 已設定 window.GEMINI_API_KEY。";
  }
  return "目前已偵測到 Gemini API Key。AI 拆解會優先呼叫 Gemini；若 API 額度不足或連線失敗，才會改用內建備援。";
}

function normalizeUrgencyLevel(value) {
  const level = String(value || "").trim();
  if (["緊急", "還好", "不緊急"].includes(level)) return level;
  return "還好";
}

function getUrgencyClass(level) {
  const normalized = normalizeUrgencyLevel(level);
  if (normalized === "緊急") return "urgent";
  if (normalized === "不緊急") return "not-urgent";
  return "normal";
}

function classifySubtaskUrgency(subtaskText, index = 0, total = 1, mainTaskText = "") {
  const text = `${mainTaskText} ${subtaskText}`.toLowerCase();
  const stress = Number(state.stress) || 0;
  const urgentWords = ["截止", "明天", "今天", "馬上", "立即", "繳交", "上傳", "考試", "期末", "期中", "先完成", "確認要求", "確認範圍", "第一段"];
  const notUrgentWords = ["檢查", "練習口頭", "美化", "整理收納", "最後", "回家整理", "複習", "補上", "錯字"];

  if (urgentWords.some(word => text.includes(word))) return "緊急";
  if (stress >= 4 && index <= 1) return "緊急";
  if (index === 0) return "緊急";

  if (notUrgentWords.some(word => text.includes(word)) || index >= total - 1) return "不緊急";
  return "還好";
}

function attachUrgencyToSubtasks(subtasks, mainTaskText = "") {
  const list = Array.isArray(subtasks) ? subtasks : [];
  return list.map((item, index) => {
    const text = typeof item === "string" ? item : (item?.text || "未命名小任務");
    const existingUrgency = typeof item === "string" ? "" : item?.urgency;
    return {
      text: cleanSubtaskText(text),
      done: typeof item === "string" ? false : Boolean(item?.done),
      urgency: normalizeUrgencyLevel(existingUrgency || classifySubtaskUrgency(text, index, list.length, mainTaskText))
    };
  });
}

function getFirstRescueSubtask(todo) {
  const subtasks = Array.isArray(todo?.subtasks) ? todo.subtasks : [];
  return subtasks.find(s => !s.done && normalizeUrgencyLevel(s.urgency) === "緊急")
    || subtasks.find(s => !s.done && normalizeUrgencyLevel(s.urgency) === "還好")
    || subtasks.find(s => !s.done)
    || null;
}

function renderUrgencySummary(todo) {
  const subtasks = Array.isArray(todo?.subtasks) ? todo.subtasks : [];
  if (!subtasks.length) return "";
  const urgent = subtasks.filter(s => normalizeUrgencyLevel(s.urgency) === "緊急" && !s.done).length;
  const normal = subtasks.filter(s => normalizeUrgencyLevel(s.urgency) === "還好" && !s.done).length;
  const relaxed = subtasks.filter(s => normalizeUrgencyLevel(s.urgency) === "不緊急" && !s.done).length;
  const rescue = getFirstRescueSubtask(todo);
  return `
    <div class="urgency-summary">
      <span class="urgency-dot urgent">緊急 ${urgent}</span>
      <span class="urgency-dot normal">還好 ${normal}</span>
      <span class="urgency-dot not-urgent">不緊急 ${relaxed}</span>
      ${rescue ? `<strong>建議先做：${escapeHTML(rescue.text)}</strong>` : `<strong>小任務已完成 🎉</strong>`}
    </div>
  `;
}

function getLocalTaskBreakdown(taskText) {
  const text = String(taskText || "").trim();

  // 備援規則只在 Gemini 無法使用時啟動；盡量依照輸入內容給出相近拆解
  if (text.includes("行李") || text.includes("旅行") || text.includes("出門") || text.includes("旅遊") || text.includes("收拾包包")) {
    return ["確認出門天數", "挑選必要衣物", "準備盥洗用品", "收好充電器", "檢查證件錢包"];
  }

  if (
    text.includes("整理房間") || text.includes("打打掃") || text.includes("房間") ||
    text.includes("掃地") || text.includes("拖地") || text.includes("收拾") ||
    text.includes("衣服") || text.includes("洗衣") || text.includes("垃圾")
  ) {
    return ["先丟掉垃圾", "衣服分類收好", "整理桌面雜物", "擦拭桌面灰塵", "掃地或拖地"];
  }

  if (text.includes("報告") || text.includes("書面") || text.includes("心得") || text.includes("企劃")) {
    return ["確認報告要求", "蒐集相關資料", "整理內容架構", "先完成一段", "檢查格式錯字"];
  }

  if (text.includes("簡報") || text.includes("投影片") || text.toLowerCase().includes("ppt") || text.toLowerCase().includes("presentation")) {
    return ["確認簡報主題", "列出頁面大綱", "製作內容頁", "加入圖片圖表", "練習口頭說明"];
  }

  if (text.includes("考試") || text.includes("複習") || text.includes("讀書") || text.includes("期末") || text.includes("考古")) {
    return ["確認考試範圍", "整理重點筆記", "練習考古題", "訂正錯誤題目", "考前快速複習"];
  }

  if (text.includes("作業") || text.includes("功課") || text.includes("題目") || text.includes("練習題")) {
    return ["看懂題目要求", "列出完成步驟", "完成主要內容", "檢查答案格式", "準備上傳繳交"];
  }

  if (text.includes("閱讀") || text.includes("課文") || text.includes("英文") || text.includes("文章")) {
    return ["快速瀏覽內容", "標記不懂地方", "整理單字重點", "寫下段落摘要", "完成最後複習"];
  }

  if (
    text.includes("整理筆記") || text.includes("筆記重點") ||
    text.includes("課程筆記") || text.includes("上課筆記")
  ) {
    return ["翻閱課程內容", "圈出重要觀念", "整理條列重點", "補上不懂地方", "快速看一遍"];
  }

  if (text.includes("買") || text.includes("採買") || text.includes("購物")) {
    return ["列出需要物品", "確認預算數量", "安排購買路線", "購買主要物品", "回家整理收納"];
  }

  if (text.includes("回覆") || text.includes("寄信") || text.includes("email") || text.includes("訊息")) {
    return ["確認回覆對象", "整理要說重點", "撰寫回覆內容", "檢查語氣錯字", "送出並紀錄"];
  }

  return [
    `確認「${text.slice(0, 8) || "任務"}」目標`,
    "列出必要步驟",
    "先做最小一步",
    "完成主要內容",
    "檢查並收尾"
  ];
}

function parseTaskBreakdownResponse(rawText, mainTaskText = "") {
  const text = String(rawText || "").trim();
  if (!text) return [];

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        if (parsed.some(item => typeof item === "object" && item !== null)) {
          return attachUrgencyToSubtasks(parsed, mainTaskText).slice(0, 6);
        }
        return attachUrgencyToSubtasks(normalizeSubtaskList(parsed), mainTaskText);
      }
    } catch (error) {
      console.warn("AI breakdown JSON parse failed", error);
    }
  }

  return attachUrgencyToSubtasks(
    normalizeSubtaskList(
      text
        .split(/\n|；|;/)
        .map(line => line.replace(/^[\s\-•*\d.、)]+/, ""))
    ),
    mainTaskText
  );
}

async function getAITaskBreakdown(taskText) {
  const fallbackItems = attachUrgencyToSubtasks(getLocalTaskBreakdown(taskText), taskText);

  if (!hasGeminiConfig()) {
    return {
      items: fallbackItems,
      source: "fallback",
      error: "Gemini API Key 未設定"
    };
  }

  const prompt = `你是 MoodStudy 的「動態任務拆解大師」。

現在使用者輸入的任務內容是：「${taskText}」

【核心重要要求】：
1. 嚴禁套用固定模板或假裝在做其他事。請完全根據使用者這行輸入內容的真實情境與特質見招拆招。
2. 請客製化拆解出 4 到 6 個具體、合理、好執行的子任務步驟。
3. 如果是簡單雜事，步驟請精簡實用；如果是複雜的大任務，步驟請條理清晰、層層遞進。

每個拆解出來的小任務必須嚴格符合以下 JSON 物件欄位：
- text：小任務內容，請用口語、自然且貼近真實生活的繁體中文描述，長度不超過 14 個中文字。
- urgency：只能從「緊急」、「還好」、「不緊急」中三選一。
  * 判斷標準：先做、核心、卡流程的步驟為「緊急」；中間執行階段為「還好」；最後確認、美化、收尾為「不緊急」。

請直接回傳合法的 JSON 陣列，不要包含任何解釋文字，也不要包裹在 \`\`\`json 標籤中。
回傳格式如下：
[
  {"text": "第一個具體執行的小任務步驟", "urgency": "緊急"},
  {"text": "第二個具體執行的小任務步驟", "urgency": "還好"},
  {"text": "第三個具體執行的小任務步驟", "urgency": "不緊急"}
]`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.95,
            maxOutputTokens: 320
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini breakdown error:", errText);
      return {
        items: fallbackItems,
        source: "fallback",
        error: "Gemini API 回應失敗：" + response.status
      };
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const parsed = parseTaskBreakdownResponse(raw, taskText);

    return {
      items: parsed.length ? parsed : fallbackItems,
      source: parsed.length ? "gemini" : "fallback",
      error: parsed.length ? "" : "Gemini 回傳格式無法解析"
    };
  } catch (error) {
    console.error("Gemini breakdown fetch error:", error);
    return {
      items: fallbackItems,
      source: "fallback",
      error: "Gemini 連線失敗"
    };
  }
}

function ensureDataShape() {
  if (!state.moodRecords) state.moodRecords = [];
  if (!state.pressureRecords) state.pressureRecords = [];
  if (!state.chatMessages) state.chatMessages = [
    { role: "ai", text: "嗨嗨，我是 MoodStudy AI 學習助手！你可以跟我說今天讀書遇到什麼困難，我會給你一點建議。" }
  ];
  if (!state.checkinDates) state.checkinDates = [];
  if (!state.checkinTaskStatus || typeof state.checkinTaskStatus !== "object") state.checkinTaskStatus = {};
  if (!state.pressureReason) state.pressureReason = [];
  if (!Array.isArray(state.todos)) state.todos = [];
  normalizeTodos();
}

ensureDataShape();

function ensureSettings() {
  state.theme = "yellow";
  state.fontSize = "normal";
  if (!state.fontFamily) state.fontFamily = "default";
}

ensureSettings();

function applySettings() {
  document.body.classList.remove("theme-yellow", "theme-blue", "theme-purple", "font-small", "font-normal", "font-large", "font-default", "font-rounded", "font-formal", "font-handwrite");
  document.body.classList.add(`theme-${state.theme}`);
  document.body.classList.add("font-normal");
  document.body.classList.add(`font-${state.fontFamily}`);
}

function upsertRecord(list, date, data) {
  const index = list.findIndex(item => item.date === date);
  if (index >= 0) {
    list[index] = { ...list[index], ...data };
  } else {
    list.push({ date, ...data });
  }
}

function getRecordByDate(list, date) {
  return list.find(item => item.date === date);
}

function getWeekDates(baseDate = new Date()) {
  const date = new Date(baseDate);
  const day = date.getDay();
  const sunday = new Date(date);
  sunday.setDate(date.getDate() - day);

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(window.getLocalDateString(d));
  }
  return dates;
}

function getWeeklyPressureAverage() {
  const dates = getWeekDates();
  const records = state.pressureRecords.filter(r => dates.includes(r.date) && Number(r.stress));
  if (records.length === 0) {
    return { avg: "-", count: 0, records: [] };
  }
  const sum = records.reduce((total, r) => total + Number(r.stress), 0);
  return {
    avg: (sum / records.length).toFixed(1),
    count: records.length,
    records
  };
}

function weeklyMoodSummary() {
  const dates = getWeekDates();
  const moods = state.moodRecords.filter(r => dates.includes(r.date)).map(r => r.mood);
  if (moods.length === 0) return "本週尚未填寫學習狀態";
  const count = {};
  moods.forEach(m => count[m] = (count[m] || 0) + 1);
  return Object.entries(count).sort((a, b) => b[1] - a[1])[0][0];
}

function pressureLevelText(avg) {
  if (avg === "-") return "尚未有足夠資料";
  const n = Number(avg);
  if (n <= 2) return "本週壓力偏低，學習狀態較穩定。";
  if (n <= 3.5) return "本週壓力中等，建議持續觀察作業與考試壓力。";
  return "本週壓力偏高，建議減少任務堆疊並安排休息。";
}

function renderWeeklySummaryCard() {
  const weekly = getWeeklyPressureAverage();
  const dates = getWeekDates();
  const weekRange = `${dates[0].slice(5)} ～ ${dates[6].slice(5)}`;

  return `
    <section class="weekly-card">
      <div class="weekly-head">
        <div>
          <h3>本週狀態分析</h3>
          <p>${weekRange}</p>
        </div>
        <button class="small-outline" onclick="renderCalendar()">查看每日紀錄</button>
      </div>

      <div class="weekly-grid">
        <div class="weekly-item">
          <span>平均壓力值</span>
          <strong>${weekly.avg === "-" ? "-" : weekly.avg + " / 5"}</strong>
          <p>${pressureLevelText(weekly.avg)}</p>
        </div>

        <div class="weekly-item">
          <span>本週主要狀態</span>
          <strong>${weeklyMoodSummary()}</strong>
          <p>依本週每日學習狀態回饋統計。</p>
        </div>

        <div class="weekly-item">
          <span>壓力檢測天數</span>
          <strong>${weekly.count} 天</strong>
          <p>填寫越完整，AI 建議會越準確。</p>
        </div>
      </div>
    </section>
  `;
}

function save() {
  if (typeof syncStreakFromCheckins === 'function') syncStreakFromCheckins();
  localStorage.setItem(getCurrentDataKey(), JSON.stringify(state));
  applySettings();
}

function currentUser() {
  return JSON.parse(localStorage.getItem("moodstudy_login") || "null");
}

function currentName() {
  const user = currentUser();
  return user?.name || "使用者";
}

function getMoodEmoji(mood) {
  const moodMap = {
    "開心": "😊",
    "普通": "🙂",
    "焦慮": "😰",
    "疲累": "😵",
    "沒動力": "😞",
    "尚未填寫": "🙂"
  };
  return moodMap[mood] || "🙂";
}

function getAdvice() {
  if (state.mood === "焦慮") return "你今天感到有些焦慮，建議先從小任務開始，逐步建立學習節奏，記得適時休息喔！";
  if (state.mood === "疲累") return "你今天比較疲累，建議先休息 10 分鐘，再做一個低強度任務，例如整理筆記。";
  if (state.mood === "沒動力") return "你今天動力較低，建議先完成一個 5 分鐘小任務，降低開始學習的壓力。";
  if (state.mood === "開心") return "你今天狀態很好，可以安排需要專注力的任務，維持目前節奏。";
  if (state.mood === "普通") return "你目前狀態穩定，建議依照 To-Do List 完成今日任務。";
  return "完成學習狀態回饋後，AI 將為你產生個人化學習建議。";
}

function getPressureAdvice() {
  const s = Number(state.stress);
  if (!s) return "尚未完成壓力檢測。";
  if (s <= 2) return "目前壓力偏低，可以維持現在的學習節奏。";
  if (s === 3) return "目前壓力中等，建議安排明確待辦，避免任務累積。";
  if (s === 4) return "目前壓力偏高，建議優先處理最急迫的一件事，並安排短暫休息。";
  return "目前壓力很高，建議先停止追加任務，進行休息或呼吸練習後再開始。";
}

function topbar(simple = false) {
  const currentTokens = parseInt(localStorage.getItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 15;
  return `
    <header class="topbar">
      <div class="logo" onclick="renderLogin()">
        <span>MoodStudy</span>
      </div>
      ${simple ? `<button class="back-btn" onclick="renderDashboard()">⌂ 返回首頁</button>` : `
        <nav class="top-nav">
          <button onclick="renderDashboard()">首頁</button>
          <button onclick="renderMoodFeedback()">學習狀態回饋</button>
          <button onclick="renderAI()">AI 學習引導</button>
        </nav>
        <div class="top-actions">
          <div class="token-badge" title="目前代幣數量">
            🪙 <span id="topbar-token-count">${currentTokens}</span>
          </div>
          <button class="user-btn">${currentName()}⌄</button>
        </div>`}
    </header>
  `;
}

function renderLogin() {
  hideBotpress();
  const chatBtn = document.getElementById("chat-widget-btn");
  const chatWindow = document.getElementById("chat-widget-window");
  if (chatBtn) chatBtn.style.display = "none";
  if (chatWindow) chatWindow.classList.add("hidden-widget");

  app.innerHTML = `
    <div class="app-frame">
      ${loginTopbar()}
      <main class="login-body">
        <section class="login-hero">
          <h1>歡迎回到<span>MoodStudy</span></h1>
          <p>綜合情緒回饋與學習分析的<br>LMS 學習平台</p>
          <div class="illustration">
            <div class="plant">🪴</div>
            <div class="person">👩🏻‍💻</div>
            <div class="bubbles">
              <span>🙂</span><span>😐</span><span>☹️</span>
            </div>
          </div>
        </section>

        <section class="login-card">
          <h2>登入您的帳號</h2>
          <div class="role-row">
            <label><input type="radio" name="role" value="student" checked> 學生</label>
            <label><input type="radio" name="role" value="teacher"> 教師</label>
          </div>
          <div class="field"><span>👤</span><input id="loginUser" placeholder="帳號，例如 student"></div>
          <div class="field"><span>🔒</span><input id="loginPass" type="password" placeholder="密碼，例如 1234"></div>
          <div id="loginError" class="login-error"></div>
          <div class="login-options">
            <label><input type="checkbox"> 記住我</label>
            <a href="#">忘記密碼？</a>
          </div>
          <button class="primary" onclick="loginWithDemoAccount()">登入</button>
          <p class="register">還沒有帳號？ <a href="#" onclick="renderRegister()">立即註冊</a></p>
        </section>
      </main>
      <footer class="footer">
        <span>© 2024 MoodStudy. All rights reserved.</span>
        <span>隱私權政策 使用條款 聯絡我們</span>
      </footer>
    </div>
  `;
}

function getCurrentRoleLabel() {
  const user = currentUser();
  if (!user) return "未登入";
  return user.role === "teacher" ? "教師" : "學生";
}

function getCurrentMoodLabel() {
  if (!state || !state.mood || state.mood === "尚未填寫") return "尚未填寫";
  return `${getMoodEmoji(state.mood)} ${state.mood}`;
}

function toggleUserMenu() {
  const menu = document.getElementById("userDropdownMenu");
  if (!menu) return;
  menu.classList.toggle("show");
}

function renderUserMenu() {
  const user = currentUser();
  const isTeacher = user?.role === "teacher";
  const avatar = isTeacher ? "👩‍🏫" : getMoodEmoji(state?.mood || "尚未填寫");

  return `
    <div class="user-menu-wrap">
      <button class="user-btn" onclick="toggleUserMenu()">
        <span class="user-avatar">${avatar}</span>
        <span>${currentName()}</span>
        <span class="chevron">⌄</span>
      </button>

      <div id="userDropdownMenu" class="user-dropdown">
        <div class="user-dropdown-head">
          <div class="user-avatar big">${avatar}</div>
          <div>
            <strong>${currentName()}</strong>
            <p>${isTeacher ? "教師後台" : getCurrentRoleLabel() + "｜" + getCurrentMoodLabel()}</p>
          </div>
        </div>

        ${isTeacher ? `
          <button onclick="renderTeacherStudents()">學生狀況</button>
          <button onclick="renderTeacherAnalysis()">班級分析</button>
        ` : `
          <button onclick="renderProfile()">個人資料</button>
          <button onclick="renderAI()">我的學習統計</button>
          <button onclick="renderSettings()">字體設定</button>
        `}
        <button class="logout-option" onclick="logout()">登出</button>
      </div>
    </div>
  `;
}

document.addEventListener("click", function (event) {
  const wrap = event.target.closest(".user-menu-wrap");
  const menu = document.getElementById("userDropdownMenu");
  if (!wrap && menu) {
    menu.classList.remove("show");
  }
});

function renderProfile() {
  const login = currentUser();
  const registered = getRegisteredAccounts();
  const account = registered[login?.username] || null;

  const content = `
    <div class="page-title">
      <h1>個人資料</h1>
      <p>這裡顯示目前登入帳號的基本資料與學習狀態。</p>
    </div>

    <section class="profile-grid">
  `;
  // 補足你在結尾切斷的 profile 頁面渲染骨架
}