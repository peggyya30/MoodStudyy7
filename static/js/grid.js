document.addEventListener('DOMContentLoaded', () => {
    // 渲染進度網格
    renderContributionGrid();

    // ==========================================
    // 🌟 待辦清單 (To-Do List) 邏輯
    // ==========================================
    const todoInput = document.getElementById('new-todo-input');
    const addTodoBtn = document.getElementById('btn-add-todo');
    const todoList = document.getElementById('todo-list');
    const checkinTasksInput = document.getElementById('checkin-tasks');
    
    let todos = JSON.parse(localStorage.getItem('lms_todos')) || [];

    function saveTodos() {
        localStorage.setItem('lms_todos', JSON.stringify(todos));
        updateCompletedCount();
    }

    function updateCompletedCount() {
        const completedCount = todos.filter(t => t.completed).length;
        if (checkinTasksInput) checkinTasksInput.value = completedCount;
    }

    function renderTodos() {
        if (!todoList) return;
        todoList.innerHTML = '';
        todos.forEach((todo, index) => {
            const li = document.createElement('li');
            li.className = 'todo-item' + (todo.completed ? ' completed' : '');
            
            li.innerHTML = `
                <div style="display: flex; align-items: center;">
                    <input type="checkbox" class="todo-checkbox" ${todo.completed ? 'checked' : ''} data-index="${index}">
                    <span>${todo.text}</span>
                </div>
                <button class="btn-delete-todo" data-index="${index}">&times;</button>
            `;
            todoList.appendChild(li);
        });

        document.querySelectorAll('.todo-checkbox').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const idx = e.target.getAttribute('data-index');
                todos[idx].completed = e.target.checked;
                saveTodos();
                renderTodos();
            });
        });

        document.querySelectorAll('.btn-delete-todo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-index');
                todos.splice(idx, 1);
                saveTodos();
                renderTodos();
            });
        });
    }

    if (addTodoBtn && todoInput) {
        addTodoBtn.addEventListener('click', () => {
            const text = todoInput.value.trim();
            if (text) {
                todos.push({ text, completed: false });
                todoInput.value = '';
                saveTodos();
                renderTodos();
            }
        });
        todoInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTodoBtn.click();
        });
    }
    
    renderTodos();
    updateCompletedCount();

    // ==========================================
    // 迷因輪播廣告看板邏輯 (包含左右切換與自動輪播)
    // ==========================================
    const bannerImg = document.getElementById('meme-banner-img');
    const bannerText = document.getElementById('meme-banner-text');
    const prevBtn = document.getElementById('banner-prev-btn');
    const nextBtn = document.getElementById('banner-next-btn');

    // 確保 HTML 中有對應的元素才執行，避免報錯
    if (bannerImg && bannerText) {
        // 準備好你要輪播的迷因圖庫
        const bannerMemes = [
            { url: 'https://i.imgflip.com/1iruch.jpg', text: '期末考週的你：這很正常 🔥' },
            { url: 'https://i.imgflip.com/9vct.jpg', text: '穩健如柴：慢慢來比較快 🐕' },
            { url: 'https://i.imgflip.com/345v97.jpg', text: '當系統提醒你今天還沒推進度 🙀' },
            { url: 'https://i.imgflip.com/2cp3na.jpg', text: '禮貌等放假：我準備好了 🐱' }
        ];

        let currentBannerIndex = 0;
        let autoPlayTimer;
        let isAnimating = false; 

        function changeBanner(step = 1) {
            if (isAnimating) return; 
            isAnimating = true;

            bannerImg.style.opacity = 0;
            bannerText.style.opacity = 0;

            setTimeout(() => {
                currentBannerIndex = (currentBannerIndex + step + bannerMemes.length) % bannerMemes.length;

                bannerImg.src = bannerMemes[currentBannerIndex].url;
                bannerText.innerText = bannerMemes[currentBannerIndex].text;
                
                bannerImg.style.opacity = 1;
                bannerText.style.opacity = 1;

                setTimeout(() => {
                    isAnimating = false;
                }, 400); 
            }, 400);
        }

        function startAutoPlay() {
            autoPlayTimer = setInterval(() => changeBanner(1), 5000);
        }

        function resetAutoPlay() {
            clearInterval(autoPlayTimer);
            startAutoPlay();
        }

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => {
                changeBanner(-1);
                resetAutoPlay();
            });

            nextBtn.addEventListener('click', () => {
                changeBanner(1);
                resetAutoPlay();
            });
        }

        bannerImg.src = bannerMemes[0].url;
        bannerText.innerText = bannerMemes[0].text;
        bannerImg.style.opacity = 1;
        bannerText.style.opacity = 1;
        
        startAutoPlay();
    }

    // ==========================================
    // 🌟 今日情緒打卡邏輯
    // ==========================================
    const openCheckinBtn = document.getElementById('btn-open-checkin');
    const closeCheckinBtn = document.getElementById('btn-close-checkin');
    const checkinModal = document.getElementById('checkin-modal');
    const moodBtns = document.querySelectorAll('.mood-btn');
    const submitCheckinBtn = document.getElementById('btn-submit-checkin');
    const feedbackArea = document.getElementById('checkin-feedback');
    const feedbackImg = document.getElementById('checkin-feedback-img');
    const feedbackText = document.getElementById('checkin-feedback-text');
    
    let selectedMood = null;

    if (openCheckinBtn && checkinModal) {
        // 1. 打開打卡視窗
        openCheckinBtn.addEventListener('click', () => {
            checkinModal.style.display = 'flex';
            feedbackArea.style.display = 'none'; // 隱藏先前的回饋
            submitCheckinBtn.style.display = 'block'; // 確保送出按鈕可見
            moodBtns.forEach(b => b.classList.remove('selected')); // 清除先前的選擇
            selectedMood = null;
        });

        // 2. 關閉打卡視窗
        closeCheckinBtn.addEventListener('click', () => {
            checkinModal.style.display = 'none';
        });

        // 3. 點擊選擇情緒
        moodBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                moodBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedMood = btn.getAttribute('data-mood');
            });
        });

        // 4. 送出打卡邏輯
        submitCheckinBtn.addEventListener('click', async () => {
            if (!selectedMood) {
                alert('請先選擇一個情緒狀態喔！');
                return;
            }

            // 隱藏按鈕，顯示 Loading
            submitCheckinBtn.style.display = 'none';
            feedbackImg.src = '';
            feedbackText.innerText = '正在結算你的努力...';
            feedbackArea.style.display = 'block';

            const tasksCompleted = parseInt(document.getElementById('checkin-tasks').value) || 0;
            const todayStr = window.getLocalDateString();

            // A. 將資料存入 localStorage
            let userRecords = JSON.parse(localStorage.getItem('lms_user_records')) || [];
            userRecords = userRecords.filter(r => r.date !== todayStr); 
            userRecords.push({
                date: todayStr,
                primaryMood: selectedMood,
                tasksCompleted: tasksCompleted
            });
            localStorage.setItem('lms_user_records', JSON.stringify(userRecords));

            // B. 給予代幣獎勵
            let currentTokens = parseInt(localStorage.getItem('lms_tokens')) || 15;
            currentTokens += 5; // 每次打卡送 5 枚代幣
            localStorage.setItem('lms_tokens', currentTokens);
            
            const tokenDisplay = document.getElementById('token-count');
            if (tokenDisplay) tokenDisplay.innerText = currentTokens;

            // C. 呼叫後端 API 獲取真實迷因 (保護金鑰)
            let finalImgUrl = '';
            try {
                const res = await fetch(`http://127.0.0.1:5000/api/meme?status=${selectedMood}`);
                if (!res.ok) throw new Error("Backend API error or rate limit");
                const data = await res.json();
                if (!data.success) throw new Error("GIPHY API failed");
                finalImgUrl = data.imgUrl;
            } catch (err) {
                // 額度用完或網路錯誤時，退回靜態假圖庫
                const fallbackMemes = {
                    'focus': 'https://i.imgflip.com/261o3j.jpg',
                    'stable': 'https://i.imgflip.com/9vct.jpg',
                    'anxious': 'https://i.imgflip.com/1ur9b0.jpg',
                    'unmotivated': 'https://i.imgflip.com/345v97.jpg'
                };
                finalImgUrl = fallbackMemes[selectedMood];
            }

            feedbackImg.src = finalImgUrl;
            feedbackText.innerText = `🎉 打卡成功！獲得 5 枚代幣！你的網格已點亮！`;

            // ✨ 觸發 Confetti 多巴胺特效
            if (typeof confetti === 'function') {
                confetti({
                    particleCount: 120,
                    spread: 80,
                    origin: { y: 0.6 },
                    colors: ['#28a745', '#17a2b8', '#fd7e14', '#ffc107']
                });
            }

            // D. 重新渲染網格
            renderContributionGrid();

            // 等待 3 秒後自動關閉視窗
            setTimeout(() => {
                checkinModal.style.display = 'none';
            }, 3000);
        });
    }
});

// 重新修改 render 函式，讓它能讀取 localStorage 的真實資料
function renderContributionGrid() {
    const gridContainer = document.getElementById('contribution-grid');
    if (!gridContainer) return;

    gridContainer.innerHTML = '';

    const daysToRender = 180;
    const today = new Date();
    const fullGridData = [];

    // 1. 建立空日曆
    for (let i = daysToRender - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateString = window.getLocalDateString(d); 
        
        fullGridData.push({
            date: dateString,
            tasksCompleted: 0,
            primaryMood: 'none'
        });
    }

    // 2. 疊加預設假資料 (mockData)
    if (typeof mockData !== 'undefined') {
        mockData.forEach(mockItem => {
            const targetDay = fullGridData.find(item => item.date === mockItem.date);
            if (targetDay) {
                targetDay.tasksCompleted = mockItem.tasksCompleted;
                targetDay.primaryMood = mockItem.primaryMood;
            }
        });
    }

    // 3. 疊加真實使用者資料 (會覆蓋 mockData 的紀錄)
    const userRecords = JSON.parse(localStorage.getItem('lms_user_records')) || [];
    userRecords.forEach(userItem => {
        const targetDay = fullGridData.find(item => item.date === userItem.date);
        if (targetDay) {
            targetDay.tasksCompleted = userItem.tasksCompleted;
            targetDay.primaryMood = userItem.primaryMood;
        }
    });

    // 4. 開始在畫面上繪製每一天的格子
    fullGridData.forEach(dayRecord => {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        
        // 設定原生的 Tooltip 提示文字
        if (dayRecord.tasksCompleted > 0) {
            cell.title = `${dayRecord.date}\n完成任務: ${dayRecord.tasksCompleted}\n主要情緒: ${dayRecord.primaryMood}`;
            cell.setAttribute('data-has-data', 'true');
        } else {
            cell.title = `${dayRecord.date}\n無進度紀錄`;
        }

        // 根據情緒決定基礎色調
        let baseColor = '#ebedf0'; 
        if (dayRecord.primaryMood === 'focus') baseColor = '#40c463';       
        if (dayRecord.primaryMood === 'anxious') baseColor = '#fb8532';     
        if (dayRecord.primaryMood === 'stable') baseColor = '#0366d6';      
        if (dayRecord.primaryMood === 'unmotivated') baseColor = '#d73a49'; 
        
        // ✨ 根據完成任務數決定透明度，並注入 CSS 變數供發光特效使用
        if (dayRecord.tasksCompleted > 0) {
            const opacityLevel = Math.max(0.4, dayRecord.tasksCompleted / 5);
            cell.style.backgroundColor = baseColor;
            cell.style.opacity = opacityLevel;
            
            // 將顏色存入 --cell-color 供 style.css 的 :hover 發光特效讀取
            cell.style.setProperty('--cell-color', baseColor);
        }

        gridContainer.appendChild(cell);
    });

    // 確保網格載入後，自動捲動到最右邊（也就是最新的一天）
    gridContainer.scrollLeft = gridContainer.scrollWidth;
}