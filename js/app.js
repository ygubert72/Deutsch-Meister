// app.js - полная версия с плавным мобильным меню

// ========== ЛОГИРОВАНИЕ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ ==========
async function logUserAction(action, details = {}) {
    try {
        if (typeof window.isAuthenticated === 'undefined' || !window.isAuthenticated()) {
            return;
        }
        
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) return;
        
        const db = window.db || firebase.firestore();
        
        await db.collection('user_actions').add({
            userId: user.uid,
            email: user.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            deviceId: getDeviceId ? getDeviceId() : 'unknown'
        });
        
        console.log('📊 Действие залогировано:', action, details);
    } catch(e) {
        console.error('Ошибка логирования действия:', e);
    }
}

function getDeviceId() {
    let id = navigator.userAgent + navigator.platform + window.screen.width + window.screen.height;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА ==========
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    if (currentMode === 'cards' || currentMode === 'quiz') {
        const total = wordsDB[AppConfig.currentLevel]?.length || 0;
        const unstudied = getUnstudiedWords().length;
        const studied = total - unstudied;
        el.textContent = `Всего: ${total} | Учим: ${unstudied} | Выучено: ${studied}`;
    } 
    else if (currentMode === 'sentences') {
        const total = sentencesDB[AppConfig.currentLevel]?.length || 0;
        let completed = sentencesProgress[AppConfig.currentLevel]?.filter(p => p?.studied === true).length || 0;
        el.textContent = `Всего фраз: ${total} | Выучено: ${completed}`;
    } 
    else if (currentMode === 'grammar') {
        const level = AppConfig.currentLevel;
        const grammarData = grammarDB[level];
        
        const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
        const savedLevel = localStorage.getItem('dm_last_grammar_level');
        const isLessonOpen = (savedLesson !== null && savedLevel === level);
        
        if (isLessonOpen && grammarData && grammarData.length > 0) {
            const totalLessons = grammarData.length;
            const completed = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
            el.textContent = `Пройдено: ${completed} из ${totalLessons} уроков`;
        }
        else if (grammarData && grammarData.length > 0) {
            el.textContent = `Всего уроков: ${grammarData.length}`;
        }
        else if (grammarData && grammarData.length === 0) {
            el.textContent = `Загрузка материалов...`;
        }
        else {
            el.textContent = `Выберите уровень`;
        }
    }
    else {
        el.textContent = `Deutsch-Meister`;
    }
    
    updateModeIndicator();
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (!indicator) return;
    
    const level = AppConfig.currentLevel;
    const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
    const savedLevel = localStorage.getItem('dm_last_grammar_level');
    const isLessonOpen = (savedLesson !== null && savedLevel === level);
    
    let modeText = '';
    switch(currentMode) {
        case 'grammar': 
            modeText = 'Грамматика';
            break;
        case 'cards': 
            modeText = 'Карточки';
            break;
        case 'quiz': 
            modeText = 'Тест';
            break;
        case 'sentences': 
            modeText = 'Тренажёр';
            break;
        default: 
            modeText = '';
    }
    
    if (currentMode === 'grammar' && isLessonOpen) {
        const lessonIdx = parseInt(savedLesson);
        const lessons = grammarDB[level];
        if (lessons && lessons[lessonIdx]) {
            const lessonNum = lessons[lessonIdx].lesson;
            indicator.textContent = `${modeText} ${level} | Урок ${lessonNum}`;
        } else {
            indicator.textContent = `${modeText} ${level}`;
        }
    } else {
        indicator.textContent = `${modeText} ${level}`;
    }
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    logUserAction('change_mode', { mode: mode, level: AppConfig.currentLevel });
    
    if (mode === 'cards') renderCards();
    else if (mode === 'quiz') renderQuiz();
    else if (mode === 'sentences') renderSentences();
    else if (mode === 'grammar') renderGrammar();
    
    saveProgress();
    updateCounter();
    updateModeIndicator();
}

function setLevel(level) {
    if (typeof window.hasAccessToLevel !== 'undefined' && !window.hasAccessToLevel(level)) {
        if (level === 'B1' || level === 'B2' || level === 'C1') {
            const isAuthenticated = window.isAuthenticated && window.isAuthenticated();
            const currentUser = window.getCurrentUser && window.getCurrentUser();
            
            if (!isAuthenticated || !currentUser) {
                alert(`🔒 Уровень ${level} требует премиум-доступа.\n\n📝 Зарегистрируйтесь и оформите премиум в личном кабинете.`);
            } else {
                alert(`🔒 Уровень ${level} требует премиум-доступа.\n\n💎 Оформите премиум в личном кабинете (кнопка под email).`);
            }
            return;
        }
    }
    
    AppConfig.currentLevel = level;
    
    document.querySelectorAll('[data-level]').forEach(btn => {
        if (btn.dataset.level === level) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    logUserAction('change_level', { level: level, mode: currentMode });
    
    if (currentMode === 'cards') {
        renderCards();
    } else if (currentMode === 'quiz') {
        renderQuiz();
    } else if (currentMode === 'sentences') {
        renderSentences();
    } else if (currentMode === 'grammar') {
        renderGrammar();
    }
    
    updateCounter();
    updateModeIndicator();
    saveProgress();
}

function loadGrammarProgress() {
    try {
        const gp = localStorage.getItem('dm_grammar_progress');
        if (gp) {
            const parsed = JSON.parse(gp);
            for (const level in parsed) {
                if (grammarProgress[level]) {
                    grammarProgress[level] = parsed[level];
                }
            }
        }
    } catch(e) {
        console.error('Ошибка загрузки прогресса грамматики:', e);
    }
}

window.forceUpdateCounter = function() {
    setTimeout(() => {
        updateCounter();
    }, 100);
};

// ========== КНОПКА "ПОДЕЛИТЬСЯ" ==========
function shareApp() {
    const url = window.location.href;
    const title = 'Deutsch-Meister — учите немецкий язык!';
    const text = '🇩🇪 Бесплатное приложение для изучения немецкого языка: карточки, тесты, тренажёр и грамматика. Попробуйте!';
    const fullText = `${text}\n\n🔗 ${url}`;
    
    logUserAction('share_app', { method: 'modal_opened' });
    
    const modal = document.createElement('div');
    modal.id = 'shareModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000000;
        overflow: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 420px;
        width: 90%;
        padding: 25px;
        text-align: center;
        margin: 20px;
        max-height: 90vh;
        overflow-y: auto;
    `;
    
    const shareOptions = [
        { name: 'Telegram', icon: '✈️', url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
        { name: 'WhatsApp', icon: '💬', url: `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}` },
        { name: 'VK', icon: '📱', url: `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&description=${encodeURIComponent(text)}` },
        { name: 'Instagram', icon: '📸', url: null, copy: true },
        { name: 'Facebook', icon: '👍', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}` },
        { name: 'Email', icon: '📧', url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(fullText)}` }
    ];
    
    let buttonsHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">';
    shareOptions.forEach(opt => {
        if (opt.name === 'Instagram' && opt.copy) {
            buttonsHtml += `
                <button class="share-option-btn" data-copy="true" style="
                    padding: 14px 10px;
                    background: #f0f0f0;
                    border: 2px solid #ddd;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.1s;
                ">
                    <div style="font-size: 28px;">${opt.icon}</div>
                    <div>${opt.name}</div>
                    <div style="font-size: 10px; color: #888; margin-top: 4px;">(скопировать ссылку)</div>
                </button>
            `;
        } else if (opt.url) {
            buttonsHtml += `
                <button class="share-option-btn" data-url="${opt.url}" style="
                    padding: 14px 10px;
                    background: #f0f0f0;
                    border: 2px solid #ddd;
                    border-radius: 12px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.1s;
                ">
                    <div style="font-size: 28px;">${opt.icon}</div>
                    <div>${opt.name}</div>
                </button>
            `;
        }
    });
    buttonsHtml += '</div>';
    
    modalContent.innerHTML = `
        <h3 style="margin-top: 0; margin-bottom: 15px; font-size: 20px;">🔗 Поделиться приложением</h3>
        <p style="color: #666; margin-bottom: 20px; font-size: 14px;">Выберите способ, чтобы поделиться с друзьями:</p>
        ${buttonsHtml}
        <button id="shareCloseBtn" style="
            margin-top: 20px;
            padding: 10px 30px;
            background: #e0e0e0;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
        ">Закрыть</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    modalContent.querySelectorAll('.share-option-btn').forEach(btn => {
        btn.onclick = () => {
            const url = btn.getAttribute('data-url');
            if (btn.getAttribute('data-copy') === 'true') {
                navigator.clipboard.writeText(fullText).then(() => {
                    alert('✅ Ссылка скопирована!');
                    logUserAction('share_app', { method: 'copy_link' });
                }).catch(() => {
                    prompt('Скопируйте ссылку:', fullText);
                });
                return;
            }
            if (url) {
                window.open(url, '_blank', 'width=600,height=500');
                logUserAction('share_app', { method: opt.name });
            }
        };
    });
    
    document.getElementById('shareCloseBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== МОБИЛЬНОЕ МЕНЮ (ГАМБУРГЕР) ==========

function closeMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    if (mobileMenu) {
        mobileMenu.classList.remove('show');
        mobileMenu.classList.remove('open');
    }
    if (menuOverlay) {
        menuOverlay.classList.remove('show');
    }
    document.body.style.overflow = '';
}

function openMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuOverlay = document.getElementById('menuOverlay');
    if (mobileMenu) {
        mobileMenu.classList.add('show');
        mobileMenu.classList.add('open');
    }
    if (menuOverlay) {
        menuOverlay.classList.add('show');
    }
    document.body.style.overflow = 'hidden';
    
    logUserAction('open_mobile_menu', {});
    
    history.pushState(null, null, location.href);
}

// ========== ПЛАВНЫЙ СВАЙП ДЛЯ ЗАКРЫТИЯ МЕНЮ ==========
function initSwipeToClose() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (!mobileMenu) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;
    
    mobileMenu.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
        isSwiping = true;
    }, { passive: true });
    
    mobileMenu.addEventListener('touchmove', function(e) {
        if (!isSwiping) return;
        const touchCurrentX = e.changedTouches[0].screenX;
        const touchCurrentY = e.changedTouches[0].screenY;
        const deltaX = touchCurrentX - touchStartX;
        const deltaY = touchCurrentY - touchStartY;
        
        if (deltaX < -20 && Math.abs(deltaX) > Math.abs(deltaY)) {
            isSwiping = false;
            closeMobileMenu();
        }
    }, { passive: true });
    
    mobileMenu.addEventListener('touchend', function() {
        isSwiping = false;
    }, { passive: true });
}

function syncMobileUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userInfoMobile = document.getElementById('userInfoMobile');
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    
    if (userInfoMobile && userInfo) {
        userInfoMobile.innerHTML = userInfo.innerHTML;
        userInfoMobile.style.display = userInfo.style.display;
    }
    
    if (loginBtnMobile) {
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtnMobile.style.display = loginBtn.style.display;
            if (loginBtn.onclick) {
                loginBtnMobile.onclick = loginBtn.onclick;
            }
        }
    }
}

function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn) return;
    
    hamburgerBtn.onclick = openMobileMenu;
    
    if (closeMenuBtn) {
        closeMenuBtn.onclick = closeMobileMenu;
    }
    
    if (menuOverlay) {
        menuOverlay.onclick = closeMobileMenu;
    }
    
    initSwipeToClose();
    
    const levelButtonsMobile = document.querySelectorAll('#levelsContainerMobile [data-level]');
    levelButtonsMobile.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    const modeButtonsMobile = document.querySelectorAll('#mobileMenu .mode-btn');
    modeButtonsMobile.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });
    
    window.addEventListener('popstate', function() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('show')) {
            closeMobileMenu();
        }
    });
    
    syncMobileUserInfo();
    
    const observer = new MutationObserver(syncMobileUserInfo);
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        observer.observe(userInfo, { attributes: true, childList: true, subtree: true });
    }
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('init: начало загрузки');
    
    var startTime = Date.now();
    var maxWaitTime = 10000;
    var timeoutId = null;
    
    function checkTimeout() {
        if (Date.now() - startTime > maxWaitTime) {
            console.log('⏰ Превышено время ожидания, перезагружаем...');
            if (timeoutId) {
                clearTimeout(timeoutId);
                timeoutId = null;
            }
            location.reload();
        }
    }
    
    timeoutId = setInterval(checkTimeout, 2000);
    
    try {
        if (window.isAuthenticated && window.isAuthenticated()) {
            logUserAction('app_start', { 
                level: AppConfig.currentLevel,
                mode: currentMode,
                timestamp: new Date().toISOString()
            });
        }
        
        loadProgress();
        loadGrammarProgress();
        
        await loadWords();
        await loadSentences();
        await loadGrammarData();
        
        document.querySelectorAll('.mode-btn').forEach(function(btn) {
            btn.onclick = function() { setMode(btn.dataset.mode); };
        });
        document.querySelectorAll('[data-level]').forEach(function(btn) {
            btn.onclick = function() { setLevel(btn.dataset.level); };
        });
        
        document.querySelectorAll('[data-level]').forEach(function(btn) {
            if (btn.dataset.level === AppConfig.currentLevel) btn.classList.add('active');
            else btn.classList.remove('active');
        });
        
        setMode(currentMode);
        
        initMobileMenu();
        updateModeIndicator();
        
        setTimeout(function() {
            updateCounter();
        }, 1000);
        
        // ===== КНОПКА "ПОДЕЛИТЬСЯ" — ПРОСТО НАЗНАЧАЕМ ОБРАБОТЧИК =====
        var shareDesktop = document.getElementById('shareBtnDesktop');
        var shareMobile = document.getElementById('shareBtnMobile');
        if (shareDesktop) shareDesktop.onclick = shareApp;
        if (shareMobile) shareMobile.onclick = shareApp;
        
        setInterval(function() {
            if (window.isAuthenticated && window.isAuthenticated()) {
                logUserAction('heartbeat', {
                    level: AppConfig.currentLevel,
                    mode: currentMode,
                    wordsUnstudied: getUnstudiedWords().length,
                    sentencesUnstudied: getUnstudiedSentences().length
                });
            }
        }, 5 * 60 * 1000);
        
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        
        console.log('init: завершено');
        
    } catch(e) {
        console.error('Ошибка загрузки:', e);
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        setTimeout(function() {
            location.reload();
        }, 1000);
    }
}

init();
