// app.js - полная версия с проверкой доступа к уровням и мобильным меню

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
        
        if (grammarData && grammarData.length > 0) {
            const totalLessons = grammarData.length;
            const completed = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
            el.textContent = `ГРАММАТИКА ${level} | Пройдено: ${completed} из ${totalLessons} уроков`;
        } 
        else if (grammarData && grammarData.length === 0) {
            el.textContent = `ГРАММАТИКА ${level} | Загрузка материалов...`;
        }
        else {
            el.textContent = `ГРАММАТИКА ${level} | Выберите урок`;
        }
    }
    else {
        el.textContent = `Deutsch-Meister`;
    }
    
    // Обновляем индикатор в шапке
    updateModeIndicator();
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (!indicator) return;
    
    let modeText = '';
    switch(currentMode) {
        case 'grammar': modeText = 'Грамматика'; break;
        case 'cards': modeText = 'Карточки'; break;
        case 'quiz': modeText = 'Тест'; break;
        case 'sentences': modeText = 'Тренажёр'; break;
        default: modeText = '';
    }
    
    indicator.textContent = `${modeText} ${AppConfig.currentLevel}`;
}

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    if (mode === 'cards') renderCards();
    else if (mode === 'quiz') renderQuiz();
    else if (mode === 'sentences') renderSentences();
    else if (mode === 'grammar') renderGrammar();
    
    saveProgress();
    updateCounter();
    updateModeIndicator();
    
    // Закрываем мобильное меню после выбора режима
    closeMobileMenu();
}

function setLevel(level) {
    // Проверка доступа к платным уровням B1, B2, C1
    if (typeof window.hasAccessToLevel !== 'undefined' && !window.hasAccessToLevel(level)) {
        if (level === 'B1' || level === 'B2' || level === 'C1') {
            // Проверяем, авторизован ли пользователь
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
    
    // Закрываем мобильное меню после выбора уровня
    closeMobileMenu();
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
    
    // Добавляем состояние для кнопки "Назад"
    history.pushState(null, null, location.href);
}

function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn) return;
    
    // Открытие по кнопке гамбургер
    hamburgerBtn.onclick = openMobileMenu;
    
    // Закрытие по крестику
    if (closeMenuBtn) {
        closeMenuBtn.onclick = closeMobileMenu;
    }
    
    // Закрытие по оверлею (затемнению)
    if (menuOverlay) {
        menuOverlay.onclick = closeMobileMenu;
    }
    
    // Закрытие при выборе уровня в мобильном меню
    const levelButtonsMobile = document.querySelectorAll('#levelsContainerMobile [data-level]');
    levelButtonsMobile.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(closeMobileMenu, 200);
        });
    });
    
    // Закрытие при выборе режима в мобильном меню
    const modeButtonsMobile = document.querySelectorAll('#mobileMenu .mode-btn');
    modeButtonsMobile.forEach(btn => {
        btn.addEventListener('click', () => {
            setTimeout(closeMobileMenu, 200);
        });
    });
    
    // Закрытие по кнопке "Назад" на телефоне
    window.addEventListener('popstate', function() {
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileMenu && mobileMenu.classList.contains('show')) {
            closeMobileMenu();
        }
    });
    
    // Дублируем авторизацию для мобильного меню
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    const userInfoMobile = document.getElementById('userInfoMobile');
    
    if (loginBtnMobile) {
        // Функция синхронизации userInfo в мобильное меню
        function syncUserInfoToMobile() {
            const userInfo = document.getElementById('userInfo');
            if (userInfoMobile && userInfo) {
                userInfoMobile.innerHTML = userInfo.innerHTML;
                userInfoMobile.style.display = userInfo.style.display;
            }
        }
        
        // Наблюдаем за изменениями userInfo
        const observer = new MutationObserver(syncUserInfoToMobile);
        const userInfo = document.getElementById('userInfo');
        if (userInfo) {
            observer.observe(userInfo, { attributes: true, childList: true, subtree: true });
        }
        syncUserInfoToMobile();
        
        // Копируем обработчик кнопки входа
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn && loginBtn.onclick) {
            loginBtnMobile.onclick = loginBtn.onclick;
        }
    }
}

async function init() {
    console.log('init: начало загрузки');
    
    loadProgress();
    loadGrammarProgress();
    
    await loadWords();
    await loadSentences();
    await loadGrammarData();
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => setMode(btn.dataset.mode);
    });
    document.querySelectorAll('[data-level]').forEach(btn => {
        btn.onclick = () => setLevel(btn.dataset.level);
    });
    
    document.querySelectorAll('[data-level]').forEach(btn => {
        if (btn.dataset.level === AppConfig.currentLevel) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    setMode(currentMode);
    
    // Инициализация мобильного меню
    initMobileMenu();
    updateModeIndicator();
    
    setTimeout(() => {
        updateCounter();
    }, 1000);
    
    console.log('init: завершено');
}

init();
