
const app = document.getElementById("app");

window.getLocalDateString = function (d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const todayKey = window.getLocalDateString();

// Botpress 載入邏輯已移至 static/js/botpress_loader.js

/* ===== Gemini AI 設定 =====
請在 static/js/config.js 中設定：
window.GEMINI_API_KEY = "你的 Gemini API Key";
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



/* ===== AI 拆解任務優先級：緊急 / 還好 / 不緊急 ===== */


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
    text.includes("整理房間") || text.includes("打掃") || text.includes("房間") ||
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

  const prompt = `
你是 MoodStudy 的「真實任務拆解助理」。

重要要求：
你必須完全根據使用者輸入的任務內容進行拆解，不能套用固定模板。
如果使用者輸入「收拾行李」，就要拆成和行李、衣物、盥洗用品、證件、充電器、出門檢查有關的小任務。
如果使用者輸入「整理房間」，就要拆成和房間整理有關的小任務。
如果使用者輸入「完成期末報告」，才可以拆成報告相關步驟。
不要把生活任務誤判成讀書任務，也不要把所有任務都拆成報告、考試或筆記。

使用者輸入的任務：
「${taskText}」

請回傳 4 到 6 個具體小任務，每個小任務都要符合原始任務。

每個小任務必須包含：
- text：小任務內容，繁體中文，最多 14 個中文字
- urgency：只能是「緊急」、「還好」、「不緊急」

urgency 判斷方式：
- 緊急：最需要先做、會影響後面流程、或接近截止
- 還好：中間執行步驟
- 不緊急：最後檢查、美化、收尾、確認類步驟

只回傳 JSON 陣列，不要加解釋文字，不要加 Markdown。
格式範例：
[
  {"text":"確認行李尺寸","urgency":"緊急"},
  {"text":"挑選必要衣物","urgency":"緊急"},
  {"text":"準備盥洗用品","urgency":"還好"},
  {"text":"收好充電器","urgency":"還好"},
  {"text":"檢查證件錢包","urgency":"不緊急"}
]
`;

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
        <span>隱私權政策　使用條款　聯絡我們</span>
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
      <div class="profile-card">
        <div class="profile-avatar">${getMoodEmoji(state.mood)}</div>
        <h2>${currentName()}</h2>
        <p>${getCurrentRoleLabel()}</p>
      </div>

      <div class="profile-card detail">
        <h3>帳號資訊</h3>
        <p><strong>帳號：</strong>${login?.username || "-"}</p>
        <p><strong>姓名／暱稱：</strong>${currentName()}</p>
        <p><strong>電話：</strong>${account?.phone || "-"}</p>
        <p><strong>登入身份：</strong>${getCurrentRoleLabel()}</p>
      </div>

      <div class="profile-card detail">
        <h3>目前學習狀態</h3>
        <p><strong>今日狀態：</strong>${state.mood}</p>
        <p><strong>壓力程度：</strong>${state.stress === "-" ? "尚未檢測" : state.stress + " / 5"}</p>
        <p><strong>連續學習：</strong>${getCurrentConsecutiveDays()} 天</p>
        <p><strong>本週平均壓力：</strong>${getWeeklyPressureAverage().avg === "-" ? "尚無資料" : getWeeklyPressureAverage().avg + " / 5"}</p>
      </div>
    </section>
  `;

  appLayout("profile", "個人資料", content);
}


function toggleMobileMenu() {
  const menu = document.getElementById("mobileSideMenu");
  const backdrop = document.getElementById("mobileMenuBackdrop");
  if (!menu || !backdrop) return;
  menu.classList.toggle("show");
  backdrop.classList.toggle("show");
}

function closeMobileMenu() {
  const menu = document.getElementById("mobileSideMenu");
  const backdrop = document.getElementById("mobileMenuBackdrop");
  if (!menu || !backdrop) return;
  menu.classList.remove("show");
  backdrop.classList.remove("show");
}

function renderMobileMenu(page) {
  const user = currentUser();
  const isTeacher = user?.role === "teacher";
  return `
    <button class="mobile-menu-trigger" onclick="toggleMobileMenu()" aria-label="開啟選單">☰</button>
    <div id="mobileMenuBackdrop" class="mobile-menu-backdrop" onclick="closeMobileMenu()"></div>
    <nav id="mobileSideMenu" class="mobile-side-menu">
      <div class="mobile-menu-head">
        <strong>MoodStudy</strong>
        <button onclick="closeMobileMenu()" aria-label="關閉選單">×</button>
      </div>
      ${isTeacher ? `
        <button class="${page === "teacher-students" || page === "teacher" ? "active" : ""}" onclick="closeMobileMenu(); renderTeacherStudents()">學生狀況</button>
        <button class="${page === "teacher-analysis" ? "active" : ""}" onclick="closeMobileMenu(); renderTeacherAnalysis()">班級分析</button>
      ` : `
        <button class="${page === "home" ? "active" : ""}" onclick="closeMobileMenu(); renderDashboard()">首頁</button>
        <button class="${page === "mood" ? "active" : ""}" onclick="closeMobileMenu(); renderMoodFeedback()">學習狀態回饋</button>
        <button class="${page === "ai" ? "active" : ""}" onclick="closeMobileMenu(); renderAI()">AI 學習分析</button>
        <button class="${page === "calendar" ? "active" : ""}" onclick="closeMobileMenu(); renderCalendar()">連續學習</button>
        <button class="${page === "gacha" ? "active" : ""}" onclick="closeMobileMenu(); renderMemeModule()">迷因獎勵</button>
        <button class="${page === "popcat" ? "active" : ""}" onclick="closeMobileMenu(); renderPopcatModule()">壓力釋放</button>
        <button class="${page === "profile" ? "active" : ""}" onclick="closeMobileMenu(); renderProfile()">個人資料</button>
        <button class="${page === "settings" ? "active" : ""}" onclick="closeMobileMenu(); renderSettings()">字體設定</button>
      `}
      <button class="mobile-logout" onclick="logout()">登出</button>
    </nav>
  `;
}

function appLayout(page, title, content) {
  loadBotpress();
  const chatBtn = document.getElementById("chat-widget-btn");
  if (chatBtn) chatBtn.style.display = "flex";

  app.innerHTML = `
    <div class="app-frame workspace">
      <aside class="sidebar">
<nav class="side-nav">
          <button class="${page === "home" ? "active" : ""}" onclick="renderDashboard()">首頁</button>
          <button class="${page === "mood" ? "active" : ""}" onclick="renderMoodFeedback()">學習狀態回饋</button>
          <button class="${page === "ai" ? "active" : ""}" onclick="renderAI()">AI 學習分析</button>
          <button class="${page === "calendar" ? "active" : ""}" onclick="renderCalendar()">連續學習</button>
          <button class="${page === "gacha" ? "active" : ""}" onclick="renderMemeModule()" style="margin-top: 15px; border-top: 1px solid rgba(0,0,0,0.1); padding-top: 10px;">迷因獎勵</button>
          <button class="${page === "popcat" ? "active" : ""}" onclick="renderPopcatModule()">壓力釋放</button>
        </nav>
        <div class="side-bottom">
          <button onclick="logout()">登出</button>
        </div>
      </aside>
      <section class="main-panel">
        <div class="panel-top">
          ${renderMobileMenu(page)}
          <h2>${title}</h2>
          <button class="center-brand" onclick="renderDashboard()"><span class="brand-full">MoodStudy</span><span class="brand-mobile">M</span></button>
          <div class="top-actions">
            ${renderUserMenu()}
          </div>
        </div>
        <div class="panel-content">${content}</div>
      </section>
    </div>
  `;
}

function renderMemeModule() {
  const content = `
      <section id="module-gacha" class="page-section active" style="padding: 0;">
          <h2 style="margin-bottom: 20px;">🎮 迷因修煉抽卡</h2>
          <div class="gacha-dashboard" style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
              <p style="font-size: 1.2em; font-weight: bold;">目前代幣：<span id="token-count" style="color: var(--color-stable); font-size: 1.3em;">15</span> 🪙 &nbsp;&nbsp;|&nbsp;&nbsp; 今日抽卡：<span id="daily-draw-count">0</span> / 3 次</p>
              <div style="margin: 15px 0;">
                  <input type="text" id="gacha-mood-input" placeholder="說說你現在的心情或關鍵字..." autocomplete="off" style="padding: 12px; width: 300px; border-radius: 8px; border: 1px solid #ccc; font-size: 1em;">
              </div>
              <button id="btn-start-draw-session" class="btn-squish" style="background-color: var(--color-stable); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1.1em; transition: transform 0.2s;">消耗 1 幣開始發牌</button>
          </div>

          <div id="cards-spread-area" style="display: none; justify-content: center; gap: 20px; margin-top: 30px; perspective: 1000px; flex-wrap: wrap; min-height: 380px; align-items: center;">
          </div>
          
          <div id="card-reveal-area" class="hidden" style="display: flex; flex-direction: column; align-items: center;">
          </div>

          <div id="gacha-actions" style="display: none; text-align: center; margin-top: 20px;">
               <button id="btn-draw-again" class="btn-squish" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">再抽一次</button>
          </div>

          <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">

          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <h2 style="margin: 0;">🖼️ 專屬明信片與圖鑑</h2>
              <button id="btn-generate-postcard" class="btn-squish" style="background: var(--color-stable); color: white; border: none; padding: 10px 20px; border-radius: 20px; font-weight: bold; cursor: pointer; transition: transform 0.2s;">✨ 產生日誌明信片</button>
          </div>

          <div id="loading-screen" style="display: none; text-align: center; margin: 20px 0;">
              <p style="color: var(--color-stable); font-weight: bold;">正在打包你的回憶，繪製明信片中...</p>
          </div>

          <div id="postcard-preview-area" style="display: none; flex-direction: column; align-items: center; margin-bottom: 30px;">
              <div id="postcard-canvas">
              </div>
              
              <div id="postcard-actions" style="display: flex; justify-content: center; gap: 10px; margin-top: 20px;">
                  <button id="btn-save-gallery" class="btn-squish" style="background-color: #ffc107; color: #333; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">⭐ 收藏至圖鑑</button>
                  <button id="btn-download" class="btn-squish" style="background-color: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">📥 下載圖片</button>
                  <button id="btn-share" class="btn-squish" style="background-color: #1da1f2; color: white; border: none; padding: 10px 20px; border-radius: 8px; font-weight: bold; cursor: pointer;">🌐 分享社群</button>
              </div>
          </div>

          <div style="background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); margin-top: 20px;">
              <h3 style="margin-top: 0;">📚 我的旅行圖鑑</h3>
              <p style="color: #666; font-size: 0.9em; margin-bottom: 15px;">這裡收藏了你過去結算的每一張明信片回憶。</p>
              <div id="gallery-container" class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px;">
              </div>
          </div>
      </section>
  `;
  appLayout("gacha", "迷因獎勵與回憶", content);

  // 當畫面渲染完成後，重新綁定 gacha 與 postcard 的事件
  setTimeout(() => {
    if (typeof window.initGachaEvents === 'function') window.initGachaEvents();
    if (typeof window.initPostcardEvents === 'function') window.initPostcardEvents();
  }, 100);
}

function renderPopcatModule() {
  const content = `
      <section id="module-popcat" class="page-section active" style="padding: 0;">
          <div style="background: white; padding: 40px 20px; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: center;">
              <h2 style="margin-top: 0;">🐱 壓力釋放區</h2>
              <p style="color: #666; font-size: 1.1em; margin-bottom: 30px;">讀書讀到快崩潰？瘋狂點擊貓貓釋放壓力吧！</p>
              <div id="popcat-container" style="text-align: center; user-select: none;">
                  <img id="popcat-img" src="./static/images/popcat1.png" alt="Pop Cat" width="250" style="cursor: pointer; transition: transform 0.05s;">
                  <p style="font-size: 1.5em; font-weight: bold; margin-top: 20px;">點擊次數：<span id="popcat-score" style="color: #d9534f; font-size: 1.5em;">0</span></p>
              </div>
              <audio id="popcat-sound" src="./static/sounds/pop.mp3"></audio>
          </div>
      </section>
  `;
  appLayout("popcat", "壓力釋放區", content);

  // 當畫面渲染完成後，重新綁定 popcat 的事件
  setTimeout(() => {
    if (typeof window.initPopcatEvents === 'function') window.initPopcatEvents();
  }, 100);
}

function getStudentTotalCheckinDays(student) {
  return Array.isArray(student.checkinDates) ? new Set(student.checkinDates).size : 0;
}

function getStudentCurrentConsecutiveDays(student) {
  if (!Array.isArray(student.checkinDates) || student.checkinDates.length === 0) return 0;
  const checkedSet = new Set(student.checkinDates);
  let cursor = parseDateKeyToDate(todayKey);

  if (!checkedSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let count = 0;
  while (true) {
    const key = window.getLocalDateString(cursor);
    if (!checkedSet.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}


function getAllStudentRows() {
  const registered = getRegisteredAccounts();
  const students = [];

  Object.values(registered).forEach(account => {
    if (account.role === "student") {
      const dataKey = `moodstudy_data_${account.username}`;
      const data = JSON.parse(localStorage.getItem(dataKey) || "null") || defaultUserState();

      students.push({
        username: account.username,
        name: account.name || account.nickname || account.username,
        nickname: account.nickname || account.name || account.username,
        phone: account.phone || "-",
        mood: data.mood || "尚未填寫",
        stress: data.stress || "-",
        streak: data.streak || 0,
        todos: data.todos || [],
        moodRecords: data.moodRecords || [],
        pressureRecords: data.pressureRecords || [],
        checkinDates: data.checkinDates || []
      });
    }
  });

  const demoData = JSON.parse(localStorage.getItem("moodstudy_data_student") || "null");
  students.unshift({
    username: "student",
    name: "王小明",
    nickname: "王小明",
    phone: "-",
    mood: demoData?.mood || "尚未填寫",
    stress: demoData?.stress || "-",
    streak: demoData?.streak || 0,
    todos: demoData?.todos || defaultUserState().todos,
    moodRecords: demoData?.moodRecords || [],
    pressureRecords: demoData?.pressureRecords || [],
    checkinDates: demoData?.checkinDates || []
  });

  const unique = [];
  const seen = new Set();
  students.forEach(s => {
    if (!seen.has(s.username)) {
      seen.add(s.username);
      unique.push(s);
    }
  });

  return unique;
}

function calcStudentAvgPressure(student) {
  const records = student.pressureRecords || [];
  if (!records.length) return "-";
  const valid = records.filter(r => Number(r.stress));
  if (!valid.length) return "-";
  const avg = valid.reduce((sum, r) => sum + Number(r.stress), 0) / valid.length;
  return avg.toFixed(1);
}

function getRiskLevel(student) {
  const stress = Number(student.stress);
  const unfinished = (student.todos || []).filter(t => !getTodoIsDone(t)).length;
  let score = 0;

  if (student.mood === "焦慮") score += 20;
  if (student.mood === "疲累") score += 15;
  if (student.mood === "沒動力") score += 25;
  if (stress >= 4) score += 25;
  if (unfinished >= 3) score += 15;
  if (getStudentCurrentConsecutiveDays(student) === 0) score += 10;

  if (score >= 45) return { text: "高關注", className: "risk-high" };
  if (score >= 20) return { text: "需觀察", className: "risk-mid" };
  return { text: "穩定", className: "risk-low" };
}

function teacherLayout(title, content) {
  app.innerHTML = `
    <div class="app-frame workspace">
      <aside class="sidebar teacher-sidebar">
<nav class="side-nav">
          <button class="${title === "學生狀況" ? "active" : ""}" onclick="renderTeacherStudents()">學生狀況</button>
          <button class="${title === "班級分析" ? "active" : ""}" onclick="renderTeacherAnalysis()">班級分析</button>
        </nav>
        <div class="side-bottom">
          <button onclick="logout()">登出</button>
        </div>
      </aside>

      <section class="main-panel">
        <div class="panel-top">
          ${renderMobileMenu(title === "班級分析" ? "teacher-analysis" : "teacher-students")}
          <h2>${title}</h2>
          <button class="center-brand" onclick="renderTeacherStudents()"><span class="brand-full">MoodStudy</span><span class="brand-mobile">M</span></button>
          <div class="top-actions">
            ${renderUserMenu()}
          </div>
        </div>
        <div class="panel-content">${content}</div>
      </section>
    </div>
  `;
}

function renderTeacherDashboard() {
  const students = getAllStudentRows();
  const total = students.length;
  const highRisk = students.filter(s => getRiskLevel(s).text === "高關注").length;
  const avgStressList = students.map(calcStudentAvgPressure).filter(v => v !== "-").map(Number);
  const classAvg = avgStressList.length ? (avgStressList.reduce((a, b) => a + b, 0) / avgStressList.length).toFixed(1) : "-";
  const avgStreak = total ? (students.reduce((sum, s) => sum + getStudentCurrentConsecutiveDays(s), 0) / total).toFixed(1) : "0";

  const rows = students.map(s => {
    const risk = getRiskLevel(s);
    return `
      <tr>
        <td>${s.name}</td>
        <td>${s.username}</td>
        <td>${s.mood}</td>
        <td>${s.stress === "-" ? "-" : s.stress + " / 5"}</td>
        <td>${calcStudentAvgPressure(s)}</td>
        <td>${getStudentCurrentConsecutiveDays(s)} 天</td>
        <td><span class="risk-pill ${risk.className}">${risk.text}</span></td>
        <td><button class="table-btn" onclick="renderTeacherStudentDetail('${s.username}')">查看</button></td>
      </tr>
    `;
  }).join("");

  const content = `
    <div class="teacher-title">
      <h1>教師後台 Dashboard</h1>
      <p>此頁面提供教師查看學生學習狀態、壓力指數與需要關注的學生。</p>
    </div>

    <section class="teacher-stats">
      <div class="teacher-stat-card">
        <span>學生總數</span>
        <strong>${total}</strong>
        <p>目前系統中可查看的學生帳號</p>
      </div>
      <div class="teacher-stat-card">
        <span>班級平均壓力</span>
        <strong>${classAvg === "-" ? "-" : classAvg + " / 5"}</strong>
        <p>依學生壓力紀錄平均計算</p>
      </div>
      <div class="teacher-stat-card">
        <span>高關注學生</span>
        <strong>${highRisk}</strong>
        <p>依情緒、壓力與任務狀態判斷</p>
      </div>
      <div class="teacher-stat-card">
        <span>平均連續學習</span>
        <strong>${avgStreak} 天</strong>
        <p>學生平均打卡累積天數</p>
      </div>
    </section>

    ${renderTeacherAIRiskPanel(students)}

    <section class="teacher-table-card">
      <div class="table-head">
        <h2>學生狀態總覽</h2>
        <button class="small-outline" onclick="renderTeacherAnalysis()">查看班級分析</button>
      </div>

      <div class="table-wrap">
        <table class="teacher-table">
          <thead>
            <tr>
              <th>姓名 / 暱稱</th>
              <th>帳號</th>
              <th>學習狀態</th>
              <th>目前壓力</th>
              <th>平均壓力</th>
              <th>連續學習</th>
              <th>狀態</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>${rows || `<tr><td colspan="8">目前尚無學生狀況</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;

  teacherLayout("學生狀況", content);
}

function renderTeacherStudents() {
  const students = getAllStudentRows();

  const cards = students.map(s => {
    const risk = getRiskLevel(s);
    const unfinished = (s.todos || []).filter(t => !t.done).length;

    return `
      <div class="student-card">
        <div>
          <h3>${s.name}</h3>
          <p>帳號：${s.username}</p>
          <p>電話：${s.phone}</p>
        </div>
        <div class="student-card-info">
          <span>狀態：${s.mood}</span>
          <span>壓力：${s.stress === "-" ? "-" : s.stress + " / 5"}</span>
          <span>未完成任務：${unfinished}</span>
          <span class="risk-pill ${risk.className}">${risk.text}</span>
        </div>
        <button class="small-outline" onclick="renderTeacherStudentDetail('${s.username}')">查看詳細</button>
      </div>
    `;
  }).join("");

  teacherLayout("學生狀況", `
    <div class="teacher-title">
      <h1>學生狀況</h1>
      <p>教師可查看每位學生的個別狀態，協助掌握學習情況。</p>
    </div>
    <div class="student-card-grid">${cards || "目前尚無學生狀況"}</div>
  `);
}

function renderTeacherStudentDetail(username) {
  const student = getAllStudentRows().find(s => s.username === username);
  if (!student) {
    alert("找不到學生狀況");
    return;
  }

  const todoRows = (student.todos || []).map(t => `
    <li class="${getTodoIsDone(t) ? "done" : ""}">
      ${getTodoIsDone(t) ? "已完成" : "未完成"}｜${t.text}（${t.time}）
    </li>
  `).join("");

  const moodRows = (student.moodRecords || []).slice(-7).reverse().map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.mood}</td>
      <td>${r.note || "-"}</td>
    </tr>
  `).join("");

  const pressureRows = (student.pressureRecords || []).slice(-7).reverse().map(r => `
    <tr>
      <td>${r.date}</td>
      <td>${r.stress} / 5</td>
      <td>${(r.reasons || []).join("、") || "-"}</td>
    </tr>
  `).join("");

  teacherLayout("學生詳細資料", `
    <div class="teacher-title">
      <h1>${student.name} 的學習狀態</h1>
      <p>帳號：${student.username}｜電話：${student.phone}</p>
    </div>

    <section class="teacher-stats">
      <div class="teacher-stat-card">
        <span>目前學習狀態</span>
        <strong>${student.mood}</strong>
      </div>
      <div class="teacher-stat-card">
        <span>目前壓力</span>
        <strong>${student.stress === "-" ? "-" : student.stress + " / 5"}</strong>
      </div>
      <div class="teacher-stat-card">
        <span>平均壓力</span>
        <strong>${calcStudentAvgPressure(student)}</strong>
      </div>
      <div class="teacher-stat-card">
        <span>連續學習</span>
        <strong>${getStudentCurrentConsecutiveDays(student)} 天</strong>
      </div>
      <div class="teacher-stat-card">
        <span>累積學習</span>
        <strong>${getStudentTotalCheckinDays(student)} 天</strong>
      </div>
    </section>

    <section class="teacher-detail-grid">
      <div class="teacher-table-card">
        <h2>To-Do List</h2>
        <ul class="teacher-task-list">${todoRows || "<li>目前沒有任務</li>"}</ul>
      </div>

      <div class="teacher-table-card">
        <h2>最近學習狀態紀錄</h2>
        <table class="teacher-table mini">
          <thead><tr><th>日期</th><th>狀態</th><th>備註</th></tr></thead>
          <tbody>${moodRows || `<tr><td colspan="3">尚無紀錄</td></tr>`}</tbody>
        </table>
      </div>

      <div class="teacher-table-card full">
        <h2>最近壓力紀錄</h2>
        <table class="teacher-table mini">
          <thead><tr><th>日期</th><th>壓力值</th><th>原因</th></tr></thead>
          <tbody>${pressureRows || `<tr><td colspan="3">尚無紀錄</td></tr>`}</tbody>
        </table>
      </div>
    </section>

    <button class="small-outline" onclick="renderTeacherDashboard()">返回總覽</button>
  `);
}

function renderTeacherAnalysis() {
  const students = getAllStudentRows();
  const moodCount = {};
  students.forEach(s => moodCount[s.mood] = (moodCount[s.mood] || 0) + 1);

  const moodText = Object.entries(moodCount).map(([m, c]) => `
    <div class="analysis-row">
      <span>${m}</span>
      <strong>${c} 人</strong>
    </div>
  `).join("");

  const pressureGroups = {
    "低壓力（1～2）": students.filter(s => Number(s.stress) >= 1 && Number(s.stress) <= 2).length,
    "中壓力（3）": students.filter(s => Number(s.stress) === 3).length,
    "高壓力（4～5）": students.filter(s => Number(s.stress) >= 4).length,
    "尚未檢測": students.filter(s => s.stress === "-").length
  };

  const pressureText = Object.entries(pressureGroups).map(([label, count]) => `
    <div class="analysis-row">
      <span>${label}</span>
      <strong>${count} 人</strong>
    </div>
  `).join("");

  teacherLayout("班級分析", `
    <div class="teacher-title">
      <h1>班級分析</h1>
      <p>整理全班學習狀態與壓力分布，協助教師快速掌握整體情況。</p>
    </div>

    <section class="analysis-grid">
      <div class="teacher-table-card">
        <h2>學習狀態分布</h2>
        ${moodText || "目前尚無資料"}
      </div>

      <div class="teacher-table-card">
        <h2>壓力程度分布</h2>
        ${pressureText}
      </div>

      <div class="teacher-table-card full">
        <h2>教師輔助建議</h2>
        <p>若高壓力或沒動力學生較多，可考慮調整作業期限、提供學習提醒，或安排較小的階段性任務，避免學生累積過多壓力。</p>
      </div>
    </section>
  `);
}



function getUnfinishedTodoCount() {
  return (state.todos || []).filter(todo => !getTodoIsDone(todo)).length;
}

function getAIAnalyticsLevel() {
  const weekly = getWeeklyPressureAverage();
  const avg = weekly.avg === "-" ? 0 : Number(weekly.avg);
  const unfinished = getUnfinishedTodoCount();
  const mood = weeklyMoodSummary();
  let score = 0;

  if (avg >= 4) score += 35;
  else if (avg >= 3) score += 20;

  if (mood === "焦慮") score += 25;
  if (mood === "疲累") score += 18;
  if (mood === "沒動力") score += 25;

  if (unfinished >= 5) score += 20;
  else if (unfinished >= 3) score += 12;

  if (getCurrentConsecutiveDays() === 0) score += 15;

  if (score >= 60) return { level: "🔴 高風險", className: "analytics-high" };
  if (score >= 30) return { level: "🟡 需觀察", className: "analytics-mid" };
  return { level: "🟢 穩定", className: "analytics-low" };
}

function getAIAnalyticsAdvice() {
  const weekly = getWeeklyPressureAverage();
  const avg = weekly.avg === "-" ? 0 : Number(weekly.avg);
  const mood = weeklyMoodSummary();
  const unfinished = getUnfinishedTodoCount();

  if (avg >= 4 || mood === "焦慮") {
    return "近期壓力偏高或焦慮狀態較明顯，建議先完成最接近截止日期的任務，並將大型作業拆分成 20～30 分鐘可以完成的小目標。";
  }

  if (mood === "疲累") {
    return "本週疲累感較明顯，建議先安排低強度任務，例如整理筆記或複習重點，避免一次安排過多高壓任務。";
  }

  if (mood === "沒動力") {
    return "目前學習動力較低，建議先設定 5 分鐘小任務，讓自己先開始，再逐步恢復學習節奏。";
  }

  if (unfinished >= 5) {
    return "目前未完成任務偏多，建議依照截止時間重新排序，先處理最急迫的 1～2 項任務。";
  }

  if (getCurrentConsecutiveDays() === 0) {
    return "近期尚未形成穩定打卡紀錄，建議先從每日一次短時間學習開始，重新建立學習習慣。";
  }

  return "本週整體狀態相對穩定，建議維持目前學習節奏，並逐步增加較需要專注力的任務。";
}

function renderAIAnalyticsReport() {
  const weekly = getWeeklyPressureAverage();
  const mood = weeklyMoodSummary();
  const unfinished = getUnfinishedTodoCount();
  const level = getAIAnalyticsLevel();

  return `
    <section class="analytics-card ${level.className}">
      <div class="analytics-head">
        <div>
          <h3>AI 學習分析報告</h3>
          <p>依據本週壓力、學習狀態、打卡與 To-Do List 進行分析。</p>
        </div>
        <span class="analytics-badge">${level.level}</span>
      </div>

      <div class="analytics-grid">
        <div class="analytics-item">
          <span>本週平均壓力</span>
          <strong>${weekly.avg === "-" ? "尚無資料" : weekly.avg + " / 5"}</strong>
        </div>
        <div class="analytics-item">
          <span>主要學習狀態</span>
          <strong>${mood}</strong>
        </div>
        <div class="analytics-item">
          <span>連續學習</span>
          <strong>${getCurrentConsecutiveDays()} 天</strong>
        </div>
        <div class="analytics-item">
          <span>累積學習</span>
          <strong>${getMonthCumulativeDays()} 天</strong>
        </div>
        <div class="analytics-item">
          <span>未完成任務</span>
          <strong>${unfinished} 項</strong>
        </div>
      </div>

      <div class="analytics-advice">
        <h4>AI 建議</h4>
        <p>${getAIAnalyticsAdvice()}</p>
      </div>
    </section>
  `;
}

function getTeacherAIAdvice(students) {
  if (!students || students.length === 0) {
    return "目前尚無學生狀況，建議先請學生完成學習狀態回饋與壓力檢測。";
  }

  const high = students.filter(s => getRiskLevel(s).text === "高關注").length;
  const mid = students.filter(s => getRiskLevel(s).text === "需觀察").length;
  const stressValues = students.map(s => Number(s.stress)).filter(v => v > 0);
  const avg = stressValues.length ? stressValues.reduce((a, b) => a + b, 0) / stressValues.length : 0;

  if (high > 0 || avg >= 4) {
    return "班級中已有高關注學生或整體壓力偏高，建議教師主動關心學生近況，並避免作業截止日過度集中。";
  }

  if (mid >= 3 || avg >= 3) {
    return "班級目前有部分學生需要觀察，建議提供階段性提醒，協助學生將大型任務拆成小目標。";
  }

  return "班級整體狀態相對穩定，建議維持目前教學節奏，並持續觀察學生壓力變化。";
}

function renderTeacherAIRiskPanel(students) {
  const high = students.filter(s => getRiskLevel(s).text === "高關注").length;
  const mid = students.filter(s => getRiskLevel(s).text === "需觀察").length;
  const low = students.filter(s => getRiskLevel(s).text === "穩定").length;

  return `
    <section class="teacher-ai-card">
      <div class="analytics-head">
        <div>
          <h3>AI 風險預警</h3>
          <p>依據學生壓力、學習狀態、任務完成與打卡情況進行班級分析。</p>
        </div>
        <span class="analytics-badge">教師端分析</span>
      </div>

      <div class="teacher-risk-grid">
        <div class="teacher-risk-item high">
          <span>高關注學生</span>
          <strong>${high} 人</strong>
        </div>
        <div class="teacher-risk-item mid">
          <span>需觀察學生</span>
          <strong>${mid} 人</strong>
        </div>
        <div class="teacher-risk-item low">
          <span>狀態穩定學生</span>
          <strong>${low} 人</strong>
        </div>
      </div>

      <div class="analytics-advice">
        <h4>AI 教師建議</h4>
        <p>${getTeacherAIAdvice(students)}</p>
      </div>
    </section>
  `;
}



function parseDateKeyToDate(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getTotalCheckinDays() {
  return Array.isArray(state.checkinDates) ? new Set(state.checkinDates).size : 0;
}

function getMonthStartKey() {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

function getMonthCumulativeDays() {
  if (!Array.isArray(state.checkinDates)) return 0;
  const start = getMonthStartKey();
  return new Set(state.checkinDates.filter(date => date >= start)).size;
}

function getMonthCheckinGoal() {
  return Number(state.monthGoalDays || 15);
}

function getMonthGoalPercent() {
  const goal = getMonthCheckinGoal();
  if (!goal) return 0;
  return Math.min(100, Math.round((getMonthCumulativeDays() / goal) * 100));
}


function getCurrentConsecutiveDays() {
  if (!Array.isArray(state.checkinDates) || state.checkinDates.length === 0) return 0;

  const checkedSet = new Set(state.checkinDates);
  let cursor = parseDateKeyToDate(todayKey);

  // 如果今天尚未打卡，但昨天有打卡，仍顯示截至昨天的連續天數
  if (!checkedSet.has(todayKey)) {
    cursor.setDate(cursor.getDate() - 1);
  }

  let count = 0;
  while (true) {
    const key = window.getLocalDateString(cursor);
    if (!checkedSet.has(key)) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return count;
}

function syncStreakFromCheckins() {
  state.streak = getCurrentConsecutiveDays();
}



function getStreakProgressPercent() {
  const days = typeof getCurrentConsecutiveDays === "function" ? getCurrentConsecutiveDays() : (state.streak || 0);
  // 以 7 天作為一個連續學習小目標，最多顯示 100%
  return Math.min(100, Math.round((days / 7) * 100));
}



/* ===== 期末爆炸指數：目的導向學習風險提醒 ===== */
function getFinalBlastIndex() {
  const stress = Number(state.stress) || 0;
  const unfinished = getUnfinishedTodoCount();
  const mood = state.mood || "尚未填寫";
  const streak = getCurrentConsecutiveDays();
  const totalTodos = Array.isArray(state.todos) ? state.todos.length : 0;
  const completedTodos = (state.todos || []).filter(todo => getTodoIsDone(todo)).length;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  let score = 0;
  const reasons = [];

  if (stress >= 5) {
    score += 35;
    reasons.push("壓力程度非常高");
  } else if (stress === 4) {
    score += 28;
    reasons.push("壓力程度偏高");
  } else if (stress === 3) {
    score += 15;
    reasons.push("壓力程度中等");
  } else if (!stress) {
    score += 8;
    reasons.push("尚未完成壓力檢測");
  }

  if (mood === "焦慮") {
    score += 22;
    reasons.push("今日狀態為焦慮");
  } else if (mood === "疲累") {
    score += 18;
    reasons.push("今日狀態為疲累");
  } else if (mood === "沒動力") {
    score += 24;
    reasons.push("今日狀態為沒動力");
  } else if (mood === "尚未填寫") {
    score += 10;
    reasons.push("尚未填寫今日學習狀態");
  }

  if (unfinished >= 6) {
    score += 25;
    reasons.push("未完成任務較多");
  } else if (unfinished >= 3) {
    score += 16;
    reasons.push("仍有多項任務未完成");
  } else if (unfinished >= 1) {
    score += 8;
    reasons.push("仍有任務待完成");
  }

  if (streak === 0) {
    score += 12;
    reasons.push("近期尚未形成連續學習");
  } else if (streak < 3) {
    score += 6;
    reasons.push("連續學習仍在建立中");
  }

  if (completionRate >= 80 && totalTodos > 0) {
    score -= 10;
    reasons.push("任務完成率良好");
  }

  score = Math.max(0, Math.min(100, score));

  let level = "低";
  let className = "blast-low";
  let emoji = "🟢";
  let title = "目前狀態穩定";
  let advice = "今天可以維持原本節奏，先完成一個小任務並保持打卡習慣。";

  if (score >= 70) {
    level = "高";
    className = "blast-high";
    emoji = "🔴";
    title = "期末爆炸風險偏高";
    advice = "建議先停止新增任務，從最急迫的一項開始，並使用 AI 任務拆解成 10～20 分鐘的小步驟。";
  } else if (score >= 40) {
    level = "中";
    className = "blast-mid";
    emoji = "🟡";
    title = "期末爆炸風險需觀察";
    advice = "建議先排序待辦事項，今天只挑一個最容易開始的任務完成，避免任務繼續堆疊。";
  }

  return {
    score,
    level,
    className,
    emoji,
    title,
    advice,
    reasons: reasons.slice(0, 3),
    completionRate,
    unfinished
  };
}

function renderFinalBlastCard() {
  const blast = getFinalBlastIndex();
  const reasonText = blast.reasons.length ? blast.reasons.join("、") : "目前資料不足，建議先完成狀態與壓力回饋。";

  return `
    <section class="final-blast-card ${blast.className}">
      <div class="final-blast-left">
        <div class="final-blast-icon">${blast.emoji}</div>
        <div>
          <h3>期末爆炸指數</h3>
          <p>依據壓力程度、學習狀態、未完成任務與連續學習紀錄進行判斷。</p>
        </div>
      </div>

      <div class="final-blast-score">
        <span>${blast.score}</span>
        <small>/ 100</small>
      </div>

      <div class="final-blast-info">
        <strong>${blast.title}</strong>
        <p>主要原因：${reasonText}</p>
        <p class="final-blast-advice">${blast.advice}</p>
        <div class="final-blast-actions">
          <button onclick="renderTodoList()">查看 To-Do</button>
          <button onclick="renderMoodFeedback()">更新狀態</button>
        </div>
      </div>
    </section>
  `;
}

function renderDashboard() {
  const checkedToday = state.lastCheckinDate === todayKey;
  const content = `
    <div class="greeting">
      <h1>嗨嗨，${currentName()}</h1>
      <p>讓我們一起努力學習唄ฅ՞•ﻌ•՞ฅ</p>
    </div>

    <div class="stats">
      <div class="stat-card">
        <h3>今日學習狀態</h3>
        <div class="face">${getMoodEmoji(state.mood)}</div>
        <strong>${state.mood}</strong>
        <p>${state.mood === "尚未填寫" ? "請完成今日學習狀態回饋" : "已完成今日回饋"}</p>
        <button class="small-outline" onclick="renderMoodFeedback()">立即填寫</button>
      </div>

      <div class="stat-card">
        <h3>近期壓力程度</h3>
        <div class="gauge"></div>
        <strong>${state.stress === "-" ? "-" : state.stress + " / 5"}</strong>
        <p>${state.stress === "-" ? "尚未檢測" : "已完成壓力檢測"}</p>
        <button class="small-outline" onclick="renderPressureTest()">前往填寫</button>
      </div>

      <div class="stat-card">
        <h3>連續學習天數</h3>
          <div class="discipline-main simple-streak">
            <div class="discipline-star">📅</div>
            <div>
              <strong>${getCurrentConsecutiveDays()} 天</strong>
            </div>
          </div>
          <div class="simple-streak-line">
            <div class="simple-streak-fill" style="width:${getStreakProgressPercent()}%"></div>
          </div>
      </div>
    </div>

    ${renderFinalBlastCard()}

    <div class="ai-strip">
      <div>
        <h3>AI 學習建議</h3>
        <p>${getAdvice()}</p>
      </div>
      <div class="bot">🤖</div>
    </div>
  `;
  appLayout("home", "首頁", content);
}

function renderMoodFeedback() {
  const checkedReasons = state.pressureReason || [];
  const options = ["作業或考試接近截止", "任務太多不知道從哪裡開始", "最近睡眠不足或精神疲累", "擔心成績或進度落後"];

  const content = `
    <div class="form-title">
      <h1>學習狀態回饋</h1>
      <p>這裡可以一起填寫今天的學習狀態與壓力檢測，不需要再切換到其他頁面。</p>
    </div>

    <div class="form-card">
      <h3>1. 你今天的學習狀態如何？</h3>
      <div class="moods">
        ${["開心", "普通", "焦慮", "疲累", "沒動力"].map((m, i) => `
          <label class="mood-card">
            <span>${["😊", "🙂", "😰", "😵", "😞"][i]}</span>
            <b>${m}</b>
            <input type="radio" name="mood" value="${m}" ${state.mood === m || (state.mood === "尚未填寫" && i === 0) ? "checked" : ""}>
          </label>
        `).join("")}
      </div>

      <h3>2. 今天學習上遇到什麼狀況？</h3>
      <textarea id="note" placeholder="例如：今天覺得作業有點多、上課比較累、但還是想完成一個小任務...">${state.note || ""}</textarea>

      <div class="submit-wrap">
        <button class="primary submit-btn" onclick="submitMood()">儲存學習狀態</button>
      </div>
    </div>

    <div class="page-title merged-section-title" id="pressureSection">
      <h1>壓力程度檢測</h1>
      <p>以下內容已整合到學習狀態回饋頁面中。</p>
    </div>

    <div class="pressure-grid">
      <div class="form-card">
        <h3>1. 你目前的壓力程度是多少？（1 最低～5 最高）</h3>
        <div class="range-row">
          <span>1</span>
          <input id="stress" type="range" min="1" max="5" value="${state.stress === "-" ? 3 : state.stress}" oninput="updatePressurePreview()">
          <span>5</span>
        </div>

        <h3>2. 造成壓力的可能原因</h3>
        <div class="pressure-options">
          ${options.map(o => `
            <label>
              <input type="checkbox" value="${o}" ${checkedReasons.includes(o) ? "checked" : ""}>
              ${o}
            </label>
          `).join("")}
        </div>

        <div class="submit-wrap">
          <button class="primary submit-btn" onclick="submitPressure()">儲存壓力檢測</button>
        </div>
      </div>

      <div class="info-card pressure-score">
        <h3>目前壓力指數</h3>
        <div class="score-circle ${getPressureColorClass(state.stress === "-" ? 3 : state.stress)}" id="pressurePreviewScore">${state.stress === "-" ? "3" : state.stress}</div>
        <p id="pressurePreviewText">${getPressurePreviewText(state.stress === "-" ? 3 : state.stress)}</p>
      </div>
    </div>
  `;
  appLayout("mood", "學習狀態回饋", content);
}

function submitMood() {
  const mood = document.querySelector("input[name='mood']:checked").value;
  const note = document.getElementById("note").value;
  state.mood = mood;
  state.note = note;
  upsertRecord(state.moodRecords, todayKey, {
    mood,
    note,
    updatedAt: new Date().toISOString()
  });
  save();
  renderDashboard();
}

function renderPressureTest() {
  renderMoodFeedback();
  setTimeout(() => {
    const section = document.getElementById("pressureSection");
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
}



function getPressureColorClass(value) {
  const s = Number(value);
  if (s === 1) return "level-1";
  if (s === 2) return "level-2";
  if (s === 3) return "level-3";
  if (s === 4) return "level-4";
  if (s === 5) return "level-5";
  return "level-3";
}

function getPressurePreviewText(value) {
  const s = Number(value);
  if (s <= 2) return "目前壓力偏低，可以維持現在的學習節奏。";
  if (s === 3) return "目前壓力中等，建議安排明確待辦，避免任務累積。";
  if (s === 4) return "目前壓力偏高，建議優先處理最急迫的一件事，並安排短暫休息。";
  return "目前壓力很高，建議先停止追加任務，進行休息或呼吸練習後再開始。";
}

function updatePressurePreview() {
  const slider = document.getElementById("stress");
  const score = document.getElementById("pressurePreviewScore");
  const text = document.getElementById("pressurePreviewText");

  if (!slider || !score || !text) return;

  score.textContent = slider.value;
  text.textContent = getPressurePreviewText(slider.value);

  score.classList.remove("low", "middle", "high", "level-1", "level-2", "level-3", "level-4", "level-5");
  score.classList.add(getPressureColorClass(slider.value));
}


function submitPressure() {
  state.stress = document.getElementById("stress").value;
  state.pressureReason = Array.from(document.querySelectorAll(".pressure-options input:checked")).map(i => i.value);
  upsertRecord(state.pressureRecords, todayKey, {
    stress: Number(state.stress),
    reasons: state.pressureReason,
    updatedAt: new Date().toISOString()
  });
  save();
  renderDashboard();
}


function setMonthGoalDays(days) {
  state.monthGoalDays = Number(days);
  save();
  renderCalendar();
}

function getTodayTaskCompletionStatus() {
  normalizeTodos();
  const total = Array.isArray(state.todos) ? state.todos.length : 0;
  const completed = (state.todos || []).filter(todo => getTodoIsDone(todo)).length;
  return total > 0 && completed === total ? "complete" : "incomplete";
}

function syncTodayCheckinTaskStatus() {
  if (!state.checkinTaskStatus || typeof state.checkinTaskStatus !== "object") {
    state.checkinTaskStatus = {};
  }
  if (state.checkinDates.includes(todayKey)) {
    state.checkinTaskStatus[todayKey] = getTodayTaskCompletionStatus();
  }
}

function renderCalendar() {
  const checkedToday = state.lastCheckinDate === todayKey;
  const content = `
    <div class="page-title">
      <h1>學習打卡月曆</h1>
      <p>每日最多只能打卡一次，系統會分別統計連續天數與累積天數。</p>
    </div>

    <div class="calendar-layout">
      <div class="calendar-card">
        <div class="calendar-head">
          <h2>${now.getFullYear()} 年 ${now.getMonth() + 1} 月</h2>
          <button class="small-outline" ${checkedToday ? "disabled" : ""} onclick="checkInToday()">
            ${checkedToday ? "今日已打卡" : "今日打卡"}
          </button>
        </div>
        ${buildCalendar()}
      </div>

      <div class="info-card">
        <h3>目前連續學習天數</h3>
        <div class="big-number theme-number">${getCurrentConsecutiveDays()} 天</div>
        <p>${checkedToday ? "今天已完成學習打卡，明天再繼續累積。" : "今天尚未打卡，完成今日學習後可以打卡一次。"}</p>
        <hr>
        <h3>累積學習天數（本月起）</h3>
        <div class="medium-number theme-number">${getMonthCumulativeDays()} 天</div>
        <p>從 ${now.getFullYear()} 年 ${now.getMonth() + 1} 月 1 日開始統計的累積天數，不會因中斷而歸零。</p>
        <hr>
        <h3>本月學習目標</h3>
        <div class="calendar-goal-box adjustable-goal-box">
          <div class="goal-control-row">
            <strong>${getMonthCumulativeDays()} / ${getMonthCheckinGoal()} 天</strong>
            <label>
              目標天數
              <select onchange="setMonthGoalDays(this.value)">
                <option value="10" ${getMonthCheckinGoal() === 10 ? "selected" : ""}>10 天</option>
                <option value="15" ${getMonthCheckinGoal() === 15 ? "selected" : ""}>15 天</option>
                <option value="20" ${getMonthCheckinGoal() === 20 ? "selected" : ""}>20 天</option>
                <option value="25" ${getMonthCheckinGoal() === 25 ? "selected" : ""}>25 天</option>
                <option value="30" ${getMonthCheckinGoal() === 30 ? "selected" : ""}>30 天</option>
              </select>
            </label>
          </div>
          <div class="progress-track">
            <div class="progress-bar" style="width:${getMonthGoalPercent()}%"></div>
          </div>
          <span>${getMonthGoalPercent()}%</span>
        </div>
        <hr>
        <h3>打卡規則</h3>
        <p>同一天只能打卡一次；連續天數會依照最近是否每天打卡計算，本月累積天數則從當月 1 日開始統計。</p>
      </div>
    </div>

  `;
  appLayout("calendar", "連續學習", content);
}

function buildCalendar() {
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = first.getDay();
  const totalDays = last.getDate();
  let cells = ["日", "一", "二", "三", "四", "五", "六"].map(d => `<div class="day-name">${d}</div>`).join("");

  for (let i = 0; i < startDay; i++) {
    cells += `<div></div>`;
  }

  for (let d = 1; d <= totalDays; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const checked = state.checkinDates.includes(key);
    const isToday = key === todayKey;
    const taskStatus = state.checkinTaskStatus?.[key] || "incomplete";
    const taskClass = checked ? (taskStatus === "complete" ? "task-complete" : "task-incomplete") : "";
    const mark = checked ? `<span class="day-check-mark">✓</span>` : "";

    cells += `
      <div class="day ${checked ? "checked" : ""} ${taskClass} ${isToday ? "today" : ""}" onclick="renderDailyDetail('${key}')">
        <span class="day-number">${d}</span>
        ${mark}
      </div>
    `;
  }

  return `<div class="calendar-grid">${cells}</div>`;
}

function checkInToday() {
  if (state.lastCheckinDate === todayKey) {
    alert("今天已經打卡過囉！每日最多只能打卡一次。");
    return;
  }
  state.lastCheckinDate = todayKey;
  if (!state.checkinDates.includes(todayKey)) {
    state.checkinDates.push(todayKey);
  }
  state.checkinTaskStatus[todayKey] = getTodayTaskCompletionStatus();
  syncStreakFromCheckins();
  save();
  renderCalendar();
}


function renderDailyDetail(dateKey) {
  const moodRecord = getRecordByDate(state.moodRecords, dateKey);
  const pressureRecord = getRecordByDate(state.pressureRecords, dateKey);
  const checked = state.checkinDates.includes(dateKey);

  const content = `
    <div class="page-title">
      <h1>${dateKey} 每日紀錄</h1>
      <p>查看指定日期的學習狀態回饋與壓力檢測結果。</p>
    </div>

    <div class="daily-detail-grid">
      <div class="info-card">
        <h3>今日學習狀態</h3>
        <div class="daily-big">${moodRecord ? moodRecord.mood : "尚未填寫"}</div>
        <p>${moodRecord && moodRecord.note ? moodRecord.note : "這一天沒有學習狀態備註。"}</p>
      </div>

      <div class="info-card">
        <h3>壓力檢測</h3>
        <div class="daily-big">${pressureRecord ? pressureRecord.stress + " / 5" : "尚未檢測"}</div>
        <p>${pressureRecord && pressureRecord.reasons && pressureRecord.reasons.length ? pressureRecord.reasons.join("、") : "這一天沒有壓力原因紀錄。"}</p>
      </div>

      <div class="info-card">
        <h3>學習打卡</h3>
        <div class="daily-big">${checked ? "已打卡" : "未打卡"}</div>
        <p>${checked ? "這一天有完成學習打卡。" : "這一天尚未完成學習打卡。"}</p>
      </div>

      <div class="info-card">
        <h3>任務完成狀態</h3>
        <div class="daily-big">${checked ? (state.checkinTaskStatus?.[dateKey] === "complete" ? "已完成" : "未完成") : "尚未打卡"}</div>
        <p>${checked ? (state.checkinTaskStatus?.[dateKey] === "complete" ? "打卡當下所有任務皆已完成，因此月曆顯示為綠框。" : "打卡當下仍有任務未完成，因此月曆顯示為紅框。") : "尚未打卡，因此不顯示任務完成框色。"}</p>
      </div>
    </div>

    <div class="submit-wrap">
      <button class="small-outline" onclick="renderCalendar()">返回月曆</button>
    </div>
  `;
  appLayout("calendar", "每日紀錄", content);
}



function renderFullSettings() {
  const content = `
    <div class="page-title">
      <h1>字體設定</h1>
      <p>系統固定使用黃色主題，這裡可依照喜好調整字體樣式。每個帳號都會保留自己的設定。</p>
    </div>

    <section class="settings-hero">
      <div>
        <span class="settings-kicker">Personal Style</span>
        <h2>打造你喜歡的 MoodStudy 介面</h2>
        <p>這些設定會跟著你的個人帳號保存，不會影響其他學生。</p>
      </div>
      <div class="settings-preview-card">
        <strong>預覽</strong>
        <p>嗨嗨，今天也一起慢慢完成學習目標吧！</p>
        <span class="preview-pill">黃色主題｜${state.fontFamily}</span>
      </div>
    </section>

    <div class="settings-grid pretty-settings">
      <div class="settings-card font-style-card wide">
        <div class="settings-card-head">
          <span class="setting-icon">✍️</span>
          <div>
            <h3>字體樣式</h3>
            <p>可以切換不同風格的字體，讓介面更符合你的喜好。</p>
          </div>
        </div>

        <div class="font-style-options pretty-font-style">
          <button class="${state.fontFamily === "default" ? "selected" : ""}" onclick="setFontFamily('default')">
            <strong>預設字體</strong>
            <span>乾淨、清楚、適合正式報告</span>
          </button>

          <button class="${state.fontFamily === "rounded" ? "selected" : ""}" onclick="setFontFamily('rounded')">
            <strong>圓體風格</strong>
            <span>柔和、可愛、比較有親和力</span>
          </button>

          <button class="${state.fontFamily === "formal" ? "selected" : ""}" onclick="setFontFamily('formal')">
            <strong>正式字體</strong>
            <span>穩重、清楚、適合系統平台</span>
          </button>

          <button class="${state.fontFamily === "handwrite" ? "selected" : ""}" onclick="setFontFamily('handwrite')">
            <strong>手寫感字體</strong>
            <span>溫柔、有學習筆記感</span>
          </button>
        </div>
      </div>
    </div>
  `;

  appLayout("settings", "字體設定", content);
}

function renderSettings() {
  const content = `
    <div class="page-title">
      <h1>字體設定</h1>
      <p>這裡可以快速調整整體字體樣式，需要更多預覽時，再進入完整設定頁。</p>
    </div>

    <section class="font-mini-shell">
      <div class="font-mini-card">
        <div class="font-mini-head">
          <span class="font-mini-icon">🔤</span>
          <div>
            <h2>字體設定</h2>
            <p>調整介面文字風格。</p>
          </div>
        </div>

        <div class="font-mini-group">
          <label>字體樣式</label>
          <select onchange="setFontFamily(this.value)">
            <option value="default" ${state.fontFamily === "default" ? "selected" : ""}>預設字體</option>
            <option value="rounded" ${state.fontFamily === "rounded" ? "selected" : ""}>圓體風格</option>
            <option value="formal" ${state.fontFamily === "formal" ? "selected" : ""}>正式字體</option>
            <option value="handwrite" ${state.fontFamily === "handwrite" ? "selected" : ""}>手寫感字體</option>
          </select>
        </div>

        <div class="font-mini-preview">
          <strong>預覽文字</strong>
          <p>今天也一起慢慢完成學習目標吧！</p>
        </div>

        <button class="open-full-settings-btn" onclick="renderFullSettings()">開啟完整設定頁</button>
      </div>
    </section>
  `;

  appLayout("settings", "字體設定", content);
}

function setTheme(theme) {
  state.theme = "yellow";
  save();
  renderSettings();
}

function setFontSize(size) {
  state.fontSize = "normal";
  save();
  renderSettings();
}

function setFontFamily(fontFamily) {
  state.fontFamily = fontFamily;
  save();
  renderSettings();
}




async function getGeminiReply(message) {
  const fallback = getLocalChatReply(message);

  if (!GEMINI_API_KEY || GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE") {
    return fallback;
  }

  const mood = state?.mood || "尚未填寫";
  const stress = state?.stress || "尚未檢測";
  const unfinishedTodos = (state?.todos || [])
    .filter(todo => !getTodoIsDone(todo))
    .map(todo => todo.text)
    .slice(0, 5)
    .join("、") || "目前沒有未完成任務";

  const prompt = `
你是 MoodStudy 的 AI 陪伴助手。
你的任務是像溫柔的朋友一樣陪使用者聊天，並在需要時針對學習、專案開發或習慣養成提供建議。

使用者目前資料：
- 今日學習/生活狀態：${mood}
- 壓力值：${stress}
- 未完成任務：${unfinishedTodos}

請遵守：
1. 使用繁體中文。
2. 語氣自然、溫柔、像朋友，不要像制式客服。
3. 先回應使用者情緒，再視情況給建議。
4. 不要每次都叫使用者去完成任務。
5. 可以反問 1 個問題讓對話延續。
6. 回覆 2～5 句即可，不要太長。
7. 如果使用者提到自殺、自殘、活不下去、傷害自己，請溫柔建議立刻找身邊可信任的人、學校輔導中心或當地緊急資源協助。

使用者說：「${message}」
`;

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
            temperature: 0.9,
            topP: 0.95,
            maxOutputTokens: 500
          }
        })
      }
    );

    if (!response.ok) {
      console.error("Gemini API error:", await response.text());
      return "我現在有點連不上 AI，不過我還在這裡陪你。你願意再跟我說一次現在最困擾你的事情嗎？";
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || fallback;
  } catch (error) {
    console.error("Gemini fetch error:", error);
    return "我現在連線有點不穩，但我還是在這裡。你可以先跟我說：你現在比較需要安慰、陪聊，還是讀書建議？";
  }
}

function getLocalChatReply(message) {
  const msg = message.trim();
  const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  if (msg.includes("不想努力") || msg.includes("放棄") || msg.includes("沒意義")) {
    return randomPick([
      "聽起來你真的有點累了🥺 可以先不用逼自己努力，想跟我說說是什麼讓你有這種感覺嗎？",
      "有時候不是你不夠努力，而是你已經撐太久了。你最近是不是壓力累積很多？"
    ]);
  }

  if (msg.includes("累") || msg.includes("疲憊")) {
    return randomPick([
      "辛苦你了🥺 你今天是不是消耗很多能量？",
      "感覺你真的撐了一段時間，今天要不要先給自己一點休息空間？"
    ]);
  }

  if (msg.includes("焦慮") || msg.includes("壓力") || msg.includes("緊張")) {
    return randomPick([
      "我有感受到你的壓力。是課業、考試，還是其他事情讓你最不安呢？",
      "焦慮的時候真的不好受，我們可以先把最困擾你的事情拆小一點。"
    ]);
  }

  if (msg.includes("作業") || msg.includes("報告") || msg.includes("考試")) {
    return randomPick([
      "課業壓力感覺有點重耶。你現在最急的是哪一項？我可以陪你一起拆順序。",
      "我們可以先看截止時間，先處理最靠近的那一件，不用一次全部做完。"
    ]);
  }

  return randomPick([
    "我有在聽喔，可以再多跟我說一點嗎？",
    "聽起來這件事對你有影響。你現在比較想被安慰，還是想一起想辦法？",
    "謝謝你願意跟我說。我陪你慢慢聊，不用急著整理好全部情緒。"
  ]);
}

function addTypingMessage() {
  state.chatMessages.push({ role: "ai", text: "正在想怎麼回你..." });
  save();
  renderAIChat();
}

function removeTypingMessage() {
  const index = state.chatMessages.findIndex(msg => msg.role === "ai" && msg.text === "正在想怎麼回你...");
  if (index >= 0) {
    state.chatMessages.splice(index, 1);
  }
}

function getChatReply(message) {
  return getLocalChatReply(message);
}

async function sendChatMessage() {
  const input = document.getElementById("chatInput");
  if (!input) return;

  const message = input.value.trim();
  if (!message) return;

  state.chatMessages.push({ role: "user", text: message });
  input.value = "";
  addTypingMessage();

  const reply = await getGeminiReply(message);
  removeTypingMessage();
  state.chatMessages.push({ role: "ai", text: reply });
  save();
  renderAIChat();
}

function clearChatMessages() {
  if (confirm("確定要清除目前的 AI 學習分析紀錄嗎？")) {
    state.chatMessages = [
      { role: "ai", text: "對話已清除！你可以重新跟我說今天的學習狀況。" }
    ];
    save();
    renderAIChat();
  }
}

function renderAIChat() {
  const messages = (state.chatMessages || []).map(msg => `
    <div class="chat-message ${msg.role}">
      <div class="chat-bubble">
        ${msg.text}
      </div>
    </div>
  `).join("");

  const content = `
    <div class="page-title">
      <h1>AI 學習分析</h1>
      <p>可以把今天的學習壓力、作業狀況或讀書困難告訴 AI，系統會給你簡單的學習建議。</p>
    </div>

    <section class="chat-card">
      <div class="chat-header">
        <div>
          <h2>AI 學習分析與學習夥伴</h2>
          <p>可以聊學習壓力、心情、作業安排；若 Gemini 額度受限，系統會自動切換本機備援。</p>
        </div>
        <button class="small-outline" onclick="clearChatMessages()">清除對話</button>
      </div>

      <div class="chat-box">
        ${messages}
      </div>

      <div class="chat-input-row">
        <input id="chatInput" placeholder="例如：我今天壓力好大，想找人聊聊..." onkeydown="if(event.key === 'Enter') sendChatMessage()">
        <button class="primary" onclick="sendChatMessage()">送出</button>
      </div>
    </section>
  `;

  appLayout("chat", "AI 學習分析", content);
}



function getCompletedTodoCount() {
  normalizeTodos();
  return (state.todos || []).filter(todo => getTodoIsDone(todo)).length;
}

function getTodoCompletionPercent() {
  normalizeTodos();
  const total = (state.todos || []).length;
  if (!total) return 0;
  return Math.round((getCompletedTodoCount() / total) * 100);
}

function getWeeklyGoalDays() {
  return Number(state.weeklyGoalDays || 5);
}

function getThisWeekCheckinCount() {
  const dates = getWeekDates();
  const checked = new Set(state.checkinDates || []);
  return dates.filter(date => checked.has(date)).length;
}

function getWeeklyGoalPercent() {
  const goal = getWeeklyGoalDays();
  if (!goal) return 0;
  return Math.min(100, Math.round((getThisWeekCheckinCount() / goal) * 100));
}

function getRiskReasons() {
  const reasons = [];
  const weekly = getWeeklyPressureAverage();
  const avg = weekly.avg === "-" ? 0 : Number(weekly.avg);
  const mood = weeklyMoodSummary();
  const unfinished = getUnfinishedTodoCount();

  if (avg >= 4) reasons.push(`本週平均壓力偏高（${weekly.avg} / 5）`);
  else if (avg >= 3) reasons.push(`本週平均壓力中等（${weekly.avg} / 5）`);

  if (mood === "焦慮") reasons.push("主要學習狀態出現焦慮");
  if (mood === "疲累") reasons.push("本週疲累感較明顯");
  if (mood === "沒動力") reasons.push("學習動力偏低");

  if (unfinished > 0) reasons.push(`目前尚有 ${unfinished} 項未完成任務`);
  if (getCurrentConsecutiveDays() === 0) reasons.push("近期尚未形成連續學習紀錄");

  if (!reasons.length) reasons.push("目前壓力與任務狀態相對穩定");
  return reasons;
}

function renderRiskReasonList() {
  return getRiskReasons().map(reason => `<li>${reason}</li>`).join("");
}


function renderTodoTaskBlock(todo, index) {
  const progress = getTodoProgress(todo);
  const completed = getTodoIsDone(todo);
  const subtasks = Array.isArray(todo.subtasks) ? todo.subtasks : [];

  const subtaskHtml = subtasks.length
    ? `
      <div class="subtask-list">
        ${subtasks.map((subtask, subIndex) => `
          <div class="subtask-row">
            <label>
              <input type="checkbox" ${subtask.done ? "checked" : ""} onchange="toggleSubtask(${index}, ${subIndex});">
              <span>${escapeHTML(subtask.text)}</span>
            </label>
            <span class="urgency-badge ${getUrgencyClass(subtask.urgency)}">${normalizeUrgencyLevel(subtask.urgency)}</span>
            <button class="subtask-delete-btn" onclick="deleteSubtask(${index}, ${subIndex})">刪除</button>
          </div>
        `).join("")}
      </div>
    `
    : `<div class="subtask-empty">尚未拆解小任務，可以按「AI拆解」自動產生，或按「手動拆解」自己新增。</div>`;

  return `
    <div class="todo-task-block">
      <div class="todo-row task-main-row">
        <label class="todo-name">
          <input type="checkbox" ${completed ? "checked" : ""} onchange="toggleTodo(${index}); renderAI();">
          <span>${escapeHTML(todo.text)}</span>
        </label>
        <span class="time-pill">${todo.time}</span>
        <span class="status-pill ${completed ? "done" : "todo"}">${completed ? "已完成" : "未完成"}</span>
        <div class="task-action-group">
          <button class="ai-breakdown-btn compact" onclick="aiBreakdownTask(${index})">AI拆解</button>
          <button class="breakdown-btn compact" onclick="addSubtask(${index})">手動拆解</button>
          <button class="delete-task-btn compact" onclick="deleteTodo(${index})">刪除</button>
        </div>
      </div>

      <div class="task-breakdown-panel">
        <div class="task-breakdown-head">
          <span>任務拆解進度：${getTodoProgressText(todo)}</span>
          <span class="source-badge ${getBreakdownSourceClass(todo)}">${getBreakdownSourceLabel(todo)}</span>
          <strong>${progress}%</strong>
        </div>
        <div class="task-progress-track">
          <div class="task-progress-fill" style="width:${progress}%"></div>
        </div>
        ${renderUrgencySummary(todo)}
        ${subtaskHtml}
      </div>
    </div>
  `;
}



function getAIBreakdownStatusText() {
  return getAIBreakdownModeText();
}

function renderAI() {
  const completed = getCompletedTodoCount();
  const total = (state.todos || []).length;
  const percent = getTodoCompletionPercent();
  const weekCount = getThisWeekCheckinCount();
  const weekGoal = getWeeklyGoalDays();
  const weekPercent = getWeeklyGoalPercent();

  const content = `
    <div class="ai-title final-title">
      <h1>AI 學習分析</h1>
      <p>整合學習狀態、壓力檢測、To-Do List 與打卡紀錄，協助學生掌握本週學習狀況。</p>
    </div>

    ${renderAIAnalyticsReport()}

    <section class="final-overview-grid">
      <div class="final-mini-card">
        <div>
          <span>連續學習天數</span>
          <strong>${getCurrentConsecutiveDays()} 天</strong>
          </div>
        <div class="final-icon">📅</div>
      </div>

      <div class="final-mini-card">
        <div>
          <span>本月打卡目標</span>
          <strong>${weekCount} / ${weekGoal} 天</strong>
          <p>目前達成率 ${weekPercent}%</p>
        </div>
        <div class="final-icon">🎯</div>
      </div>

      <div class="final-mini-card">
        <div>
          <span>任務完成率</span>
          <strong>${percent}%</strong>
          <p>已完成 ${completed} / ${total} 項</p>
        </div>
        <div class="final-icon">✅</div>
      </div>

      <div class="final-mini-card">
        <div>
          <span>學習風險</span>
          <strong>${getAIAnalyticsLevel().level}</strong>
          <p>依壓力與紀錄自動判斷</p>
        </div>
        <div class="final-icon">⚠️</div>
      </div>
    </section>

    <div class="final-dashboard-grid">
      <section class="todo-card final-todo-card">
        <div class="todo-final-head">
          <div>
            <h2>To-Do List</h2>
            <p>以任務完成率協助檢視今日學習進度。</p>
          </div>
          <button class="final-add-btn" onclick="addTodo()">＋ 新增任務</button>
        </div>

        <div class="todo-table">
          <div class="todo-row todo-header">
            <span>任務</span>
            <span>預估時間</span>
            <span>狀態</span>
            <span>操作</span>
          </div>

          ${state.todos.map((todo, index) => renderTodoTaskBlock(todo, index)).join("")}
        </div>

        <div class="progress-area">
          <span>完成率 ${completed} / ${total} 項任務</span>
          <div class="progress-track">
            <div class="progress-bar" style="width:${percent}%"></div>
          </div>
          <strong>${percent}%</strong>
        </div>
      </section>

      <aside class="final-side-stack">
        <section class="small-card final-discipline">
          <h3>本月學習目標</h3>
          <div class="discipline-main">
            <div class="discipline-star">🎯</div>
            <div>
              <p>目標達成進度</p>
              <strong>${weekCount} / ${weekGoal} 天</strong>
            </div>
          </div>
          <p>連續學習：${getCurrentConsecutiveDays()} 天</p>
          <div class="progress-area small">
            <span>完成率 ${weekPercent}%</span>
            <div class="progress-track">
              <div class="progress-bar" style="width:${weekPercent}%"></div>
            </div>
          </div>
          
        </section>

        <section class="small-card ai-status-card">
          <h3>AI 拆解狀態</h3>
          <p>${getAIBreakdownStatusText()}</p>
          <p class="ai-status-note">分類方式：緊急 → 還好 → 不緊急，並自動推薦最先開始的小任務。</p>
        </section>

        <section class="small-card final-risk">
          <div class="risk-head">
            <h3>學習風險提醒</h3>
            <span class="status-pill danger">${getAIAnalyticsLevel().level}</span>
          </div>
          <ul class="risk-reasons">
            ${renderRiskReasonList()}
          </ul>
          <div class="risk-advice">
            <strong>AI 建議</strong>
            <p>${getAIAnalyticsAdvice()}</p>
          </div>
        </section>
      </aside>
    </div>

      `;
  appLayout("ai", "AI 學習分析", content);
}

function toggleTodo(index) {
  const todo = state.todos[index];
  if (!todo) return;

  const nextDone = !getTodoIsDone(todo);
  todo.done = nextDone;

  let tokenDelta = 0;
  if (Array.isArray(todo.subtasks) && todo.subtasks.length > 0) {
    if (nextDone) {
      const uncompletedSubtasks = todo.subtasks.filter(s => !s.done).length;
      tokenDelta += (uncompletedSubtasks * TOKEN_REWARD_SUB);
    } else {
      const completedSubtasks = todo.subtasks.filter(s => s.done).length;
      tokenDelta -= (completedSubtasks * TOKEN_REWARD_SUB);
    }
    todo.subtasks = todo.subtasks.map(subtask => ({ ...subtask, done: nextDone }));
  }

  if (nextDone) tokenDelta += TOKEN_REWARD_MAIN;
  else tokenDelta -= TOKEN_REWARD_MAIN;

  if (tokenDelta !== 0) updateTokens(tokenDelta);

  syncTodayCheckinTaskStatus();
  save();
}

function addTodo() {
  const text = prompt("請輸入新的任務：");
  if (text) {
    const time = prompt("請輸入預估時間，例如：30 分鐘", "30 分鐘") || "30 分鐘";
    state.todos.push({ text, time, done: false, subtasks: [] });
    syncTodayCheckinTaskStatus();
    save();
    renderAI();
  }
}

function deleteTodo(index) {
  const todo = state.todos[index];
  if (!todo) return;
  const taskName = todo.text || "這個任務";
  if (confirm(`確定要刪除「${taskName}」嗎？`)) {
    let deductTokens = 0;
    if (getTodoIsDone(todo)) deductTokens -= TOKEN_REWARD_MAIN;
    if (Array.isArray(todo.subtasks)) {
      const doneSub = todo.subtasks.filter(s => s.done).length;
      deductTokens -= (doneSub * TOKEN_REWARD_SUB);
    }
    if (deductTokens !== 0) updateTokens(deductTokens);

    state.todos.splice(index, 1);
    syncTodayCheckinTaskStatus();
    save();
    renderAI();
  }
}


async function aiBreakdownTask(index) {
  const todo = state.todos[index];
  if (!todo) return;

  const hasSubtasks = Array.isArray(todo.subtasks) && todo.subtasks.length > 0;
  if (hasSubtasks) {
    const replace = confirm(`「${todo.text}」已經有小任務了。要用 AI 重新拆解並取代原本的小任務嗎？`);
    if (!replace) return;
  }

  const button = event?.target;
  const originalText = button?.textContent || "AI拆解";
  if (button) {
    button.disabled = true;
    button.textContent = "拆解中...";
  }

  try {
    const result = await getAITaskBreakdown(todo.text);
    todo.subtasks = attachUrgencyToSubtasks(result.items || [], todo.text);
    todo.breakdownSource = result.source || "fallback";
    todo.breakdownError = result.error || "";
    syncTodoDoneFromSubtasks(todo);
    syncTodayCheckinTaskStatus();
    save();

    if (todo.breakdownSource === "fallback") {
      alert("提醒：目前使用的是「內建備援拆解」，不是 Gemini 即時 AI 拆解。\n原因：" + (todo.breakdownError || "AI 未連線"));
    }

    renderAI();
  } catch (error) {
    console.error("AI 拆解失敗", error);
    alert("AI 拆解暫時失敗，系統會改用手動拆解。你可以再試一次或自己新增小任務。");
    if (button) {
      button.disabled = false;
      button.textContent = originalText;
    }
  }
}

function addSubtask(index) {
  const todo = state.todos[index];
  if (!todo) return;

  const text = prompt(`請輸入「${todo.text}」的小任務：`);
  if (!text) return;

  if (!Array.isArray(todo.subtasks)) todo.subtasks = [];
  const cleaned = cleanSubtaskText(text);
  todo.subtasks.push({
    text: cleaned,
    done: false,
    urgency: classifySubtaskUrgency(cleaned, todo.subtasks.length, todo.subtasks.length + 1, todo.text)
  });
  todo.breakdownSource = "manual";
  todo.breakdownError = "";
  syncTodoDoneFromSubtasks(todo);
  syncTodayCheckinTaskStatus();
  save();
  renderAI();
}

function toggleSubtask(index, subIndex) {
  const todo = state.todos[index];
  if (!todo || !Array.isArray(todo.subtasks) || !todo.subtasks[subIndex]) return;

  const wasMainDone = getTodoIsDone(todo);
  const nextDone = !todo.subtasks[subIndex].done;
  todo.subtasks[subIndex].done = nextDone;

  if (nextDone) updateTokens(TOKEN_REWARD_SUB);
  else updateTokens(-TOKEN_REWARD_SUB);

  syncTodoDoneFromSubtasks(todo);

  const isMainDone = getTodoIsDone(todo);
  if (!wasMainDone && isMainDone) updateTokens(TOKEN_REWARD_MAIN);
  else if (wasMainDone && !isMainDone) updateTokens(-TOKEN_REWARD_MAIN);

  syncTodayCheckinTaskStatus();
  save();
  renderAI();
}

function deleteSubtask(index, subIndex) {
  const todo = state.todos[index];
  if (!todo || !Array.isArray(todo.subtasks) || !todo.subtasks[subIndex]) return;

  const subtask = todo.subtasks[subIndex];
  const subtaskName = subtask.text || "這個小任務";
  if (confirm(`確定要刪除「${subtaskName}」嗎？`)) {
    if (subtask.done) updateTokens(-TOKEN_REWARD_SUB);
    todo.subtasks.splice(subIndex, 1);

    const wasMainDone = getTodoIsDone(todo);
    syncTodoDoneFromSubtasks(todo);
    const isMainDone = getTodoIsDone(todo);
    if (!wasMainDone && isMainDone) updateTokens(TOKEN_REWARD_MAIN);
    else if (wasMainDone && !isMainDone) updateTokens(-TOKEN_REWARD_MAIN);

    syncTodayCheckinTaskStatus();
    save();
    renderAI();
  }
}

function clearDoneTodos() {
  const doneCount = state.todos.filter(todo => getTodoIsDone(todo)).length;
  if (doneCount === 0) {
    alert("目前沒有已完成的任務可以刪除。");
    return;
  }

  if (confirm(`確定要刪除 ${doneCount} 個已完成任務嗎？`)) {
    let deductTokens = 0;
    state.todos.forEach(todo => {
      if (getTodoIsDone(todo)) {
        deductTokens -= TOKEN_REWARD_MAIN;
        if (Array.isArray(todo.subtasks)) {
          const doneSub = todo.subtasks.filter(s => s.done).length;
          deductTokens -= (doneSub * TOKEN_REWARD_SUB);
        }
      }
    });
    if (deductTokens !== 0) updateTokens(deductTokens);

    state.todos = state.todos.filter(todo => !getTodoIsDone(todo));
    syncTodayCheckinTaskStatus();
    save();
    renderAI();
  }
}

renderLogin();


function updateMonthGoal(days) {
  state.monthGoalDays = Number(days);
  if (typeof saveState === 'function') saveState();
  if (typeof renderCalendar === 'function') renderCalendar();
}


/* v49 壓力滑桿填色同步 */
function updateRangeProgressStyle(input) {
  if (!input || input.type !== "range") return;
  const min = Number(input.min || 0);
  const max = Number(input.max || 100);
  const value = Number(input.value || 0);
  const percent = ((value - min) / (max - min)) * 100;
  input.style.setProperty("--range-progress", `${percent}%`);
}

function syncAllRangeProgressStyles() {
  document.querySelectorAll('input[type="range"]').forEach(updateRangeProgressStyle);
}

document.addEventListener("input", function (event) {
  if (event.target && event.target.matches('input[type="range"]')) {
    updateRangeProgressStyle(event.target);
  }
});

setInterval(syncAllRangeProgressStyles, 500);
