window.initGachaEvents = function() {
    const btnStartDraw = document.getElementById('btn-start-draw-session');
    const tokenDisplay = document.getElementById('token-count');
    const spreadArea = document.getElementById('cards-spread-area');
    const revealArea = document.getElementById('card-reveal-area');
    const actionsArea = document.getElementById('gacha-actions');
    const btnDrawAgain = document.getElementById('btn-draw-again');
    const moodInput = document.getElementById('gacha-mood-input');
    const dailyDrawDisplay = document.getElementById('daily-draw-count');

    let tokens = parseInt(localStorage.getItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 15;
    if (tokenDisplay) tokenDisplay.innerText = tokens;

    // 每日抽卡次數限制邏輯 (測試中，暫時改為 999)
    const MAX_DAILY_DRAWS = 3;
    const todayStr = window.getLocalDateString();
    let lastDrawDate = localStorage.getItem(`lms_last_draw_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`) || '';
    let dailyDraws = parseInt(localStorage.getItem(`lms_daily_draws_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || 0;

    if (lastDrawDate !== todayStr) {
        dailyDraws = 0;
        localStorage.setItem(`lms_last_draw_date_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, todayStr);
        localStorage.setItem(`lms_daily_draws_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyDraws);
    }
    if (dailyDrawDisplay) dailyDrawDisplay.innerText = dailyDraws;

    // 一次性決定 3 張卡的資料
    async function generateCardsData(userMood) {
        const cards = [];
        for (let i = 0; i < 3; i++) {
            let finalImgUrl = '';
            
            try {
                // 直接呼叫 Giphy API (因為 GitHub Pages 只能託管靜態檔案，無法跑 Python 後端)
                const apiKey = "B1s9rIFtU6TCsKLMT6R4y9dsY6Yi0v29";
                const statusQuery = userMood ? encodeURIComponent(userMood) : 'funny meme';
                const giphyUrl = `https://api.giphy.com/v1/gifs/random?api_key=${apiKey}&tag=${statusQuery}&rating=g`;
                
                const res = await fetch(giphyUrl);
                if (!res.ok) throw new Error("Giphy API error or rate limit");
                const data = await res.json();
                if (!data.data || !data.data.images) throw new Error("GIPHY API returned no image");
                finalImgUrl = data.data.images.original.url;
            } catch (err) {
                // 若後端掛掉、API 額度用盡，啟用本地備案圖庫
                const fallbackMemes = [
                    'https://i.imgflip.com/2cp3na.jpg',
                    'https://i.imgflip.com/9vct.jpg',
                    'https://i.imgflip.com/1iruch.jpg',
                    'https://i.imgflip.com/261o3j.jpg'
                ];
                finalImgUrl = fallbackMemes[Math.floor(Math.random() * fallbackMemes.length)];
            }
            
            cards.push({ finalImgUrl, userText: userMood || "這是一張神秘的迷因卡" });
        }
        return cards;
    }

    btnStartDraw.addEventListener('click', async () => {
        if (dailyDraws >= MAX_DAILY_DRAWS) {
            alert('⚠️ 今日已達抽取上限 (3/3)！\n請去首頁完成學習任務，累積更多代幣為明天做準備吧！');
            return;
        }

        if (tokens <= 0) {
            alert('代幣不足啦！請先去完成今日任務！');
            return;
        }

        const userMood = moodInput ? moodInput.value.trim() : "";

        tokens -= 1;
        dailyDraws += 1;
        localStorage.setItem(`lms_tokens_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, tokens);
        localStorage.setItem(`lms_daily_draws_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, dailyDraws);
        
        tokenDisplay.innerText = tokens;
        if (dailyDrawDisplay) dailyDrawDisplay.innerText = dailyDraws;
        
        btnStartDraw.style.display = 'none';
        if (moodInput) moodInput.style.display = 'none';

        spreadArea.style.display = 'flex';
        spreadArea.innerHTML = '<p style="color:#666; font-weight:bold; font-size:1.2em;">命運洗牌中...</p>';
        revealArea.classList.add('hidden');
        revealArea.innerHTML = '';
        actionsArea.style.display = 'none';

        // 生成卡牌資料
        const cardsData = await generateCardsData(userMood);

        spreadArea.innerHTML = '';
        
        // 渲染 3 張覆蓋的牌
        cardsData.forEach((cardData, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'spread-card';
            cardEl.innerHTML = '❓';
            cardEl.style.transform = 'translateY(-100px)'; // 準備滑入動畫
            cardEl.style.opacity = 0;

            cardEl.onclick = () => selectCard(index, cardsData, cardEl);

            spreadArea.appendChild(cardEl);
        });

        // 動畫發牌
        if (typeof anime !== 'undefined') {
            anime({
                targets: '.spread-card',
                translateY: 0,
                opacity: 1,
                delay: anime.stagger(150),
                easing: 'easeOutElastic(1, .8)'
            });
        } else {
            document.querySelectorAll('.spread-card').forEach(el => {
                el.style.transform = 'translateY(0)';
                el.style.opacity = 1;
            });
        }
    });

    function selectCard(selectedIndex, allCardsData, selectedCardEl) {
        // 禁用所有卡片點擊
        document.querySelectorAll('.spread-card').forEach(el => el.onclick = null);

        const chosenData = allCardsData[selectedIndex];

        // 1. 未選中的卡片淡出
        const unselectedCards = Array.from(document.querySelectorAll('.spread-card')).filter(el => el !== selectedCardEl);
        
        if (typeof anime !== 'undefined') {
            anime({
                targets: unselectedCards,
                opacity: 0,
                scale: 0.8,
                duration: 500,
                easing: 'easeOutQuad',
                complete: () => {
                    unselectedCards.forEach(el => el.remove());
                }
            });
        } else {
            unselectedCards.forEach(el => el.remove());
        }

        // 2. 揭曉卡牌 (延遲一下等其他卡牌消失)
        setTimeout(() => {
            spreadArea.style.display = 'none';
            revealArea.classList.remove('hidden');

            const cardColor = '#8e44ad'; // 統一的專屬心情卡顏色 (紫色)

            revealArea.innerHTML = `
                <div id="gacha-card" style="
                    width: 250px; 
                    height: 380px; 
                    perspective: 1000px;
                ">
                    <div id="gacha-card-inner" style="
                        width: 100%; 
                        height: 100%; 
                        position: relative; 
                        transition: transform 0.8s; 
                        transform-style: preserve-3d;
                    ">
                        <!-- 卡背 -->
                        <div style="
                            position: absolute; 
                            width: 100%; 
                            height: 100%; 
                            backface-visibility: hidden; 
                            background: linear-gradient(135deg, #2c3e50, #3498db);
                            border: 4px solid #fff;
                            border-radius: 12px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            color: white;
                            font-size: 3em;
                            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
                        ">❓</div>
                        <!-- 卡面 -->
                        <div style="
                            position: absolute; 
                            width: 100%; 
                            height: 100%; 
                            backface-visibility: hidden; 
                            background: white;
                            border: 4px solid ${cardColor};
                            border-radius: 12px;
                            transform: rotateY(180deg);
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            padding: 15px;
                            box-sizing: border-box;
                            box-shadow: 0 0 20px ${cardColor}88;
                        ">
                            <span style="font-size: 1.1em; font-weight: bold; color: ${cardColor};">【專屬心情卡】</span>
                            <div style="flex-grow: 1; width: 100%; display: flex; align-items: center; justify-content: center; margin: 15px 0;">
                                <img src="${chosenData.finalImgUrl}" style="max-width: 100%; max-height: 180px; object-fit: contain; border-radius: 8px;">
                            </div>
                            <p style="color: #333; margin-top: 5px; font-size: 1em; text-align: center; font-weight: bold; line-height: 1.4;"><i>"${chosenData.userText}"</i></p>
                        </div>
                    </div>
                </div>
            `;

            // 記錄到 Gallery
            let gallery = JSON.parse(localStorage.getItem(`lms_meme_gallery_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];
            gallery.push({
                id: 'meme_' + Date.now(),
                url: chosenData.finalImgUrl,
                rarity: '心情卡',
                title: chosenData.userText,
                date: window.getLocalDateString()
            });
            localStorage.setItem(`lms_meme_gallery_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, JSON.stringify(gallery));

            // Anime.js 3D 翻牌動畫
            if (typeof anime !== 'undefined') {
                anime({
                    targets: '#gacha-card-inner',
                    rotateY: 180,
                    duration: 1000,
                    easing: 'easeInOutSine',
                    complete: () => {
                        actionsArea.style.display = 'block';
                    }
                });
            } else {
                document.getElementById('gacha-card-inner').style.transform = 'rotateY(180deg)';
                actionsArea.style.display = 'block';
            }
        }, 600);
    }

    btnDrawAgain.addEventListener('click', () => {
        actionsArea.style.display = 'none';
        revealArea.classList.add('hidden');
        revealArea.innerHTML = '';
        btnStartDraw.style.display = 'inline-block';
        if (moodInput) {
            moodInput.style.display = 'inline-block';
            moodInput.value = '';
        }
    });
};