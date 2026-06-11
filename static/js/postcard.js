window.initPostcardEvents = function() {
    const btnGenerate = document.getElementById('btn-generate-postcard');
    const loadingScreen = document.getElementById('loading-screen');
    const previewArea = document.getElementById('postcard-preview-area');
    const canvas = document.getElementById('postcard-canvas');
    const btnSave = document.getElementById('btn-save-gallery');
    const btnDownload = document.getElementById('btn-download');
    const btnShare = document.getElementById('btn-share');
    const galleryContainer = document.getElementById('gallery-container');

    // 日誌 Modal 元素
    const journalModal = document.getElementById('journal-modal');
    const journalInput = document.getElementById('journal-input');
    const btnConfirmJournal = document.getElementById('btn-confirm-journal');
    const btnCancelJournal = document.getElementById('btn-cancel-journal');

    // Lightbox 元素
    const galleryLightbox = document.getElementById('gallery-lightbox');
    const btnCloseLightbox = document.getElementById('btn-close-lightbox');
    const lightboxContent = document.getElementById('lightbox-content');

    // 使用 onclick 避免重複綁定，每次呼叫 initPostcardEvents 時都會覆蓋舊的事件
    if (btnGenerate && journalModal) {
        btnGenerate.onclick = function() {
            journalInput.value = '';
            journalModal.style.display = 'flex';
        };
    }

    if (btnCancelJournal && journalModal) {
        btnCancelJournal.onclick = function() {
            journalModal.style.display = 'none';
        };
    }

    if (btnConfirmJournal && journalModal) {
        btnConfirmJournal.onclick = function() {
            const userJournal = journalInput.value.trim() || "今天是很棒的一天，繼續保持！";
            journalModal.style.display = 'none';
            generatePostcard(userJournal);
        };
    }

    if (btnCloseLightbox && galleryLightbox) {
        btnCloseLightbox.onclick = function() {
            galleryLightbox.style.display = 'none';
            if (lightboxContent) lightboxContent.innerHTML = '';
        };
    }

    // 點擊外部區域也能關閉 Lightbox
    window.onclick = function(event) {
        if (galleryLightbox && event.target === galleryLightbox) {
            galleryLightbox.style.display = 'none';
            if (lightboxContent) lightboxContent.innerHTML = '';
        }
    };

    let currentPostcardData = null;

    function generatePostcard(userJournal) {
        if (!btnGenerate || !loadingScreen || !previewArea || !canvas) return;

        btnGenerate.style.display = 'none';
        loadingScreen.style.display = 'block';
        previewArea.style.display = 'none';

        // 模擬打包時間
        setTimeout(() => {
            loadingScreen.style.display = 'none';
            previewArea.style.display = 'flex';

            // 抓取真實數據
            const totalTasks = (JSON.parse(localStorage.getItem(`lms_todos_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || []).filter(t => t.completed).length;
            
            // 從心情紀錄計算天數
            const records = JSON.parse(localStorage.getItem(`lms_user_records_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];
            const focusDays = records.filter(r => r.mood === 'focus').length;
            const anxiousDays = records.filter(r => r.mood === 'anxious').length;

            // 取得最新迷因
            let memeGallery = JSON.parse(localStorage.getItem(`lms_meme_gallery_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];
            let pikmin1 = 'https://i.imgflip.com/2cp3na.jpg'; // 預設圖
            if (memeGallery.length >= 1) {
                pikmin1 = memeGallery[memeGallery.length - 1].url;
            }

            const now = new Date();
            const todayDate = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

            currentPostcardData = {
                id: 'pc_' + Date.now(),
                date: todayDate,
                tasks: totalTasks,
                focus: focusDays,
                anxious: anxiousDays,
                pikminUrl: pikmin1,
                journal: userJournal
            };

            canvas.innerHTML = `
                <div id="postcard-element" class="postcard-container" style="background: url('https://www.transparenttextures.com/patterns/cream-paper.png'), #fffdfa; border: 15px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 2px; padding: 20px; position: relative; min-height: 400px; width: 320px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-sizing: border-box;">
                    <!-- 模擬旅行郵戳 -->
                    <div class="postcard-stamp" style="position: absolute; top: 20px; right: 20px; width: 90px; height: 90px; border: 3px solid #d9534f; border-radius: 50%; color: #d9534f; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(15deg); font-weight: bold; font-family: 'Courier New', Courier, monospace; opacity: 0.8; z-index: 5; background: rgba(255,255,255,0.4);">
                        <span class="postcard-stamp-date" style="font-size: 0.9em; margin-bottom: 2px;">${todayDate}</span>
                        <span class="postcard-stamp-text" style="font-size: 1.1em; letter-spacing: 1px;">✓ ${totalTasks}</span>
                    </div>
                    
                    <!-- 迷因圖片佔據明信片上方區域 -->
                    <img src="${pikmin1}" crossorigin="anonymous" class="postcard-meme postcard-meme-1" style="position: relative; width: 100%; flex-grow: 1; max-height: 260px; object-fit: contain; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.2)); margin-top: 10px; margin-bottom: 15px; z-index: 2;">

                    <!-- 統計資料與日誌結語 -->
                    <div class="postcard-content" style="z-index: 10; margin-top: auto; background: rgba(255, 255, 255, 0.85); padding: 15px; border-radius: 8px;">
                        <div style="display: flex; justify-content: space-around; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; font-weight: bold; color: #444;">
                            <span>🔥 專注: ${focusDays}天</span>
                            <span>💦 焦慮: ${anxiousDays}天</span>
                        </div>
                        <h4 style="margin: 0 0 5px 0; color: #2c3e50; display: flex; align-items: center; gap: 5px;">✍️ 今日日誌：</h4>
                        <p style="color: #555; font-size: 0.95em; line-height: 1.5; margin: 0;">${userJournal}</p>
                    </div>
                </div>
            `;
        }, 1000);
    }

    // 收藏至圖鑑 (存原始資料，保持 GIF 動態)
    if (btnSave) {
        btnSave.onclick = function() {
            if (!currentPostcardData) return;
            let gallery = JSON.parse(localStorage.getItem(`lms_postcard_gallery_data_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];
            gallery.push(currentPostcardData);
            localStorage.setItem(`lms_postcard_gallery_data_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`, JSON.stringify(gallery));
            
            alert('⭐ 成功收藏至您的旅行圖鑑！');
            loadGallery();
        };
    }

    // 下載依然使用 html2canvas 截圖
    if (btnDownload) {
        btnDownload.onclick = function() {
            const el = document.getElementById('postcard-element');
            if(!el) return;
            if (typeof html2canvas === 'undefined') {
                alert('截圖套件尚未載入，請稍後再試！');
                return;
            }
            html2canvas(el, { useCORS: true, allowTaint: false }).then(canvasElement => {
                const link = document.createElement('a');
                link.download = `MemeLogic_Postcard_${Date.now()}.png`;
                link.href = canvasElement.toDataURL('image/png');
                link.click();
            });
        };
    }

    if (btnShare) {
        btnShare.onclick = function() {
            alert('🌐 分享功能即將推出！你可以先下載圖片發到 IG 喔！');
        };
    }

    // 動態載入圖鑑
    function loadGallery() {
        if (!galleryContainer) return;
        
        let galleryData = JSON.parse(localStorage.getItem(`lms_postcard_gallery_data_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];
        
        // 為了相容以前存的 Base64 舊資料，合併顯示
        let oldGallery = JSON.parse(localStorage.getItem(`lms_postcard_gallery_${JSON.parse(localStorage.getItem('moodstudy_login')||'{}').username || ''}`)) || [];

        galleryContainer.innerHTML = '';

        if (galleryData.length === 0 && oldGallery.length === 0) {
            galleryContainer.innerHTML = '<p style="color: #999; grid-column: 1 / -1; text-align: center;">尚未收藏任何明信片，趕快去產生一張吧！</p>';
            return;
        }

        // 渲染新版動態 JSON 資料
        galleryData.forEach(item => {
            const cardItem = document.createElement('div');
            cardItem.className = 'gallery-item';
            cardItem.style.cursor = 'pointer';
            
            // 點擊放大檢視
            cardItem.onclick = function() {
                openLightbox(item);
            };

            // 將明信片縮小顯示
            cardItem.innerHTML = `
                <div style="background: url('https://www.transparenttextures.com/patterns/cream-paper.png'), #fffdfa; border: 5px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 2px; padding: 10px; display: flex; flex-direction: column; height: 100%; box-sizing: border-box; position: relative; overflow: hidden; pointer-events: none;">
                    <div style="position: absolute; top: 5px; right: 5px; border: 2px solid #d9534f; border-radius: 50%; color: #d9534f; transform: rotate(15deg); font-size: 0.7em; padding: 2px; text-align: center; font-weight: bold; opacity: 0.8; background: rgba(255,255,255,0.4); z-index: 5;">
                        <div>${item.date.slice(5)}</div>
                        <div>✓${item.tasks}</div>
                    </div>
                    <img src="${item.pikminUrl}" crossorigin="anonymous" style="width: 100%; height: 150px; object-fit: contain; margin-bottom: 10px; z-index: 2; position: relative;">
                    <div style="background: rgba(255,255,255,0.9); padding: 5px; border-radius: 4px; font-size: 0.8em; flex-grow: 1; z-index: 10;">
                        <div style="display:flex; justify-content: space-around; border-bottom: 1px dashed #ccc; padding-bottom: 5px; margin-bottom: 5px; font-weight: bold;">
                            <span>🔥 ${item.focus}</span>
                            <span>💦 ${item.anxious}</span>
                        </div>
                        <p style="margin: 0; color: #555; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;">${item.journal}</p>
                    </div>
                </div>
            `;
            galleryContainer.appendChild(cardItem);
        });

        // 渲染舊版 Base64 靜態資料
        oldGallery.forEach(src => {
            const img = document.createElement('img');
            img.src = src;
            img.className = 'gallery-item';
            galleryContainer.appendChild(img);
        });
    }

    function openLightbox(item) {
        if (!galleryLightbox || !lightboxContent) return;
        
        lightboxContent.innerHTML = `
            <div class="postcard-container" style="background: url('https://www.transparenttextures.com/patterns/cream-paper.png'), #fffdfa; border: 15px solid white; box-shadow: 0 10px 25px rgba(0,0,0,0.15); border-radius: 2px; padding: 20px; position: relative; min-height: 400px; width: 320px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden; box-sizing: border-box;">
                <!-- 模擬旅行郵戳 -->
                <div class="postcard-stamp" style="position: absolute; top: 20px; right: 20px; width: 90px; height: 90px; border: 3px solid #d9534f; border-radius: 50%; color: #d9534f; display: flex; flex-direction: column; align-items: center; justify-content: center; transform: rotate(15deg); font-weight: bold; font-family: 'Courier New', Courier, monospace; opacity: 0.8; z-index: 5; background: rgba(255,255,255,0.4);">
                    <span class="postcard-stamp-date" style="font-size: 0.9em; margin-bottom: 2px;">${item.date}</span>
                    <span class="postcard-stamp-text" style="font-size: 1.1em; letter-spacing: 1px;">✓ ${item.tasks}</span>
                </div>
                
                <!-- 迷因圖片佔據明信片上方區域 -->
                <img src="${item.pikminUrl}" crossorigin="anonymous" class="postcard-meme postcard-meme-1" style="position: relative; width: 100%; flex-grow: 1; max-height: 260px; object-fit: contain; filter: drop-shadow(2px 4px 6px rgba(0,0,0,0.2)); margin-top: 10px; margin-bottom: 15px; z-index: 2;">

                <!-- 統計資料與日誌結語 -->
                <div class="postcard-content" style="z-index: 10; margin-top: auto; background: rgba(255, 255, 255, 0.85); padding: 15px; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-around; border-bottom: 1px dashed #ccc; padding-bottom: 10px; margin-bottom: 10px; font-weight: bold; color: #444;">
                        <span>🔥 專注: ${item.focus}天</span>
                        <span>💦 焦慮: ${item.anxious}天</span>
                    </div>
                    <h4 style="margin: 0 0 5px 0; color: #2c3e50; display: flex; align-items: center; gap: 5px;">✍️ 今日日誌：</h4>
                    <p style="color: #555; font-size: 0.95em; line-height: 1.5; margin: 0;">${item.journal}</p>
                </div>
            </div>
        `;
        galleryLightbox.style.display = 'flex';
    }

    loadGallery();
};