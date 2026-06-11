document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 🌟 全螢幕預覽頁兼訪客命名邏輯
    // ==========================================
    const splashScreen = document.getElementById('splash-screen');
    const nameInput = document.getElementById('guest-name-input');
    const startBtn = document.getElementById('btn-start-journey');
    const displayUsername = document.getElementById('display-username');

    // 1. 初始化：檢查 localStorage 是否有存過名字，有心的話先幫忙預填
    let savedName = localStorage.getItem('lms_guest_name');
    if (savedName) {
        if (nameInput) nameInput.value = savedName;
        if (displayUsername) displayUsername.innerText = savedName;
    }

    // 2. 定義進入花園的共用過場函式
    if (startBtn && nameInput && splashScreen) {
        const startJourney = () => {
            let inputName = nameInput.value.trim();
            
            // 如果沒填寫，給予預設暱稱
            if (!inputName) {
                inputName = '無名旅人';
            }

            // 儲存名字至本地並更新畫面顯示
            localStorage.setItem('lms_guest_name', inputName);
            if (displayUsername) displayUsername.innerText = inputName;

            // 觸發 CSS 淡出與放大轉場動畫
            splashScreen.classList.add('splash-fade-out');
            
            // 等待動畫結束後徹底隱藏預覽頁
            setTimeout(() => {
                splashScreen.style.display = 'none';
            }, 800);
        };

        // 綁定按鈕點擊事件
        startBtn.addEventListener('click', startJourney);

        // 讓使用者在輸入框按下 Enter 鍵也能直接進入
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startJourney();
            }
        });
    }

    // ==========================================
    // 2. SPA 多頁面路由切換邏輯
    // ==========================================
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.page-section');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            btn.classList.add('active');

            const targetId = btn.getAttribute('data-target');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
            }
        });
    });

    // ==========================================
    // 3. Pop cat 壓力釋放區邏輯
    // ==========================================
    const popcatImg = document.getElementById('popcat-img');
    const popcatSound = document.getElementById('popcat-sound');
    const popcatScore = document.getElementById('popcat-score');
    let score = 0;

    const catCloseUrl = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTerRVtsqtqpRscjFIa4yKtVl5XheMoJSvCQA&s';
    const catOpenUrl = 'https://i1.sndcdn.com/artworks-ld16iH1pftf382OC-N4nA9g-t500x500.jpg';
    
    if (popcatImg && popcatSound && popcatScore) {
        popcatImg.src = catCloseUrl;
        popcatSound.src = 'https://www.myinstants.com/media/sounds/pop-cat-original-meme_3.mp3'; 

        const popAction = () => {
            popcatImg.src = catOpenUrl;
            popcatImg.style.transform = 'scale(1.1)';
            popcatSound.currentTime = 0; 
            popcatSound.play();
            score++;
            popcatScore.innerText = score;
        };

        const unpopAction = () => {
            popcatImg.src = catCloseUrl;
            popcatImg.style.transform = 'scale(1)';
        };

        popcatImg.addEventListener('mousedown', popAction);
        popcatImg.addEventListener('mouseup', unpopAction);
        popcatImg.addEventListener('mouseleave', unpopAction); 
        popcatImg.addEventListener('touchstart', (e) => { e.preventDefault(); popAction(); });
        popcatImg.addEventListener('touchend', unpopAction);
    }
});