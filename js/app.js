// app.js — с оптимизацией таймеров через Page Visibility API

let documentHidden = false;

// ========== ПРОВЕРКА ВИДИМОСТИ СТРАНИЦЫ ==========
document.addEventListener('visibilitychange', function() {
    documentHidden = document.hidden;
    Logger.debug('Видимость страницы изменилась:', documentHidden ? 'скрыта' : 'видна');
});

// ========== ЛОГИРОВАНИЕ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ (через ActivityTracker) ==========
async function logUserAction(action, details = {}) {
    if (window.ActivityTracker) {
        await window.ActivityTracker.logUserAction(action, details);
    } else {
        // Fallback для совместимости
        try {
            if (typeof window.isAuthenticated === 'undefined' || !window.isAuthenticated()) return;
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
                deviceId: window.utils?.getDeviceId ? window.utils.getDeviceId() : 'unknown'
            });
        } catch(e) {
            console.error('Ошибка логирования:', e);
        }
    }
}

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА (С КЕШИРОВАНИЕМ) ==========
let cachedCounter = null;
let cachedCounterMode = null;
let cachedCounterLevel = null;

function updateCounter(force = false) {
    const el = document.getElementById('counter');
    if (!el) return;
    
    const level = AppConfig.currentLevel;
    
    // Кешируем результат, если ничего не изменилось
    if (!force && cachedCounter && cachedCounterMode === currentMode && cachedCounterLevel === level) {
        el.textContent = cachedCounter;
        return;
    }
    
    let result = '';
    
    if (currentMode === 'cards' || currentMode === 'quiz') {
        const total = wordsDB[AppConfig.currentLevel]?.length || 0;
        const unstudied = getUnstudiedWords().length;
        const studied = total - unstudied;
        result = `Всего: ${total} | Учим: ${unstudied} | Выучено: ${studied}`;
    } 
    else if (currentMode === 'sentences') {
        const total = sentencesDB[AppConfig.currentLevel]?.length || 0;
        let completed = sentencesProgress[AppConfig.currentLevel]?.filter(p => p?.studied === true).length || 0;
        result = `Всего фраз: ${total} | Выучено: ${completed}`;
    } 
    else if (currentMode === 'grammar') {
        const grammarData = grammarDB[level];
        const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
        const savedLevel = localStorage.getItem('dm_last_grammar_level');
        const isLessonOpen = (savedLesson !== null && savedLevel === level);
        
        if (isLessonOpen && grammarData && grammarData.length > 0) {
            const totalLessons = grammarData.length;
            const completed = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
            result = `Пройдено: ${completed} из ${totalLessons} уроков`;
        }
        else if (grammarData && grammarData.length > 0) {
            result = `Всего уроков: ${grammarData.length}`;
        }
        else if (grammarData && grammarData.length === 0) {
            result = 'Загрузка материалов...';
        }
        else {
            result = 'Выберите уровень';
        }
    }
    else {
        result = 'Deutsch-Meister';
    }
    
    el.textContent = result;
    
    // Кешируем
    cachedCounter = result;
    cachedCounterMode = currentMode;
    cachedCounterLevel = level;
    
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
        case 'grammar': modeText = 'Грамматика'; break;
        case 'cards': modeText = 'Карточки'; break;
        case 'quiz': modeText = 'Тест'; break;
        case 'sentences': modeText = 'Тренажёр'; break;
        default: modeText = '';
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
    updateCounter(true); // Принудительное обновление
    updateModeIndicator();
    closeMobileMenu();
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
    
    if (currentMode === 'cards') renderCards();
    else if (currentMode === 'quiz') renderQuiz();
    else if (currentMode === 'sentences') renderSentences();
    else if (currentMode === 'grammar') renderGrammar();
    
    updateCounter(true); // Принудительное обновление
    updateModeIndicator();
    saveProgress();
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
        Logger.error('Ошибка загрузки прогресса грамматики:', e);
    }
}

window.forceUpdateCounter = function() {
    setTimeout(() => {
        updateCounter(true);
    }, 100);
};

// ========== УПРАВЛЕНИЕ КНОПКОЙ "ПОДЕЛИТЬСЯ" (обновляется только при изменении) ==========
let lastShareState = null;

function updateShareButtons() {
    const shareDesktop = document.getElementById('shareBtnDesktop');
    const shareMobile = document.getElementById('shareBtnMobile');
    const isAdmin = window.isAdmin && window.isAdmin();
    
    const shouldShow = !isAdmin;
    const currentState = shouldShow ? 'show' : 'hide';
    
    // Обновляем только если состояние изменилось
    if (currentState === lastShareState) return;
    lastShareState = currentState;
    
    if (shareDesktop) shareDesktop.style.display = shouldShow ? 'block' : 'none';
    if (shareMobile) shareMobile.style.display = shouldShow ? 'block' : 'none';
}

// ========== ХРАНЕНИЕ ИНТЕРВАЛОВ ДЛЯ ОЧИСТКИ ==========
let heartbeatInterval = null;
let shareUpdateInterval = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    Logger.info('init: начало загрузки');
    
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
    
    initMobileMenu();
    updateModeIndicator();
    
    setTimeout(() => {
        updateCounter(true);
    }, 1000);
    
    setTimeout(() => {
        const shareDesktop = document.getElementById('shareBtnDesktop');
        const shareMobile = document.getElementById('shareBtnMobile');
        if (shareDesktop) shareDesktop.onclick = shareApp;
        if (shareMobile) shareMobile.onclick = shareApp;
    }, 500);
    
    // Запускаем обновление кнопки "Поделиться" (с проверкой видимости)
    shareUpdateInterval = setInterval(() => {
        if (!documentHidden) {
            updateShareButtons();
        }
    }, 5000);
    
    // Heartbeat (только если страница видна)
    heartbeatInterval = setInterval(() => {
        if (!documentHidden && window.isAuthenticated && window.isAuthenticated()) {
            logUserAction('heartbeat', {
                level: AppConfig.currentLevel,
                mode: currentMode,
                wordsUnstudied: getUnstudiedWords().length,
                sentencesUnstudied: getUnstudiedSentences().length
            });
        }
    }, 5 * 60 * 1000);
    
    Logger.info('init: завершено');
}

// ========== ОЧИСТКА ИНТЕРВАЛОВ ПРИ ВЫХОДЕ ==========
window.addEventListener('beforeunload', function() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    if (shareUpdateInterval) clearInterval(shareUpdateInterval);
});

init();
