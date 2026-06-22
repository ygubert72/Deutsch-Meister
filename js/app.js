// app.js — ПРОСТАЯ И НАДЕЖНАЯ ВЕРСИЯ

let documentHidden = false;
let appInitialized = false;
let stateApplied = false; // Флаг, что состояние уже применено

// ========== ПРОВЕРКА ВИДИМОСТИ СТРАНИЦЫ ==========
document.addEventListener('visibilitychange', function() {
    documentHidden = document.hidden;
});

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
}

function initMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const menuOverlay = document.getElementById('menuOverlay');
    
    if (!hamburgerBtn) {
        console.warn('Кнопка гамбургера не найдена');
        return;
    }
    
    hamburgerBtn.onclick = openMobileMenu;
    
    if (closeMenuBtn) {
        closeMenuBtn.onclick = closeMobileMenu;
    }
    
    if (menuOverlay) {
        menuOverlay.onclick = closeMobileMenu;
    }
}

// ========== ЛОГИРОВАНИЕ ==========
async function logUserAction(action, details = {}) {
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
            url: window.location.href
        });
    } catch(e) {
        console.error('Ошибка логирования:', e);
    }
}

// ========== ОБНОВЛЕНИЕ СЧЁТЧИКА ==========
let cachedCounter = null;
let cachedCounterMode = null;
let cachedCounterLevel = null;

function updateCounter(force = false) {
    const el = document.getElementById('counter');
    if (!el) return;
    
    const level = AppConfig.currentLevel;
    
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

// ========== УСТАНОВКА РЕЖИМА ==========
function setMode(mode) {
    currentMode = mode;
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    logUserAction('change_mode', { mode: mode, level: AppConfig.currentLevel });
    
    if (mode === 'cards') renderCards();
    else if (mode === 'quiz') renderQuiz();
    else if (mode === 'sentences') renderSentences();
    else if (mode === 'grammar') renderGrammar();
    
    saveProgress();
    updateCounter(true);
    updateModeIndicator();
    closeMobileMenu();
}

// ========== УСТАНОВКА УРОВНЯ ==========
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
        if (btn.dataset.level === level) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    logUserAction('change_level', { level: level, mode: currentMode });
    
    if (currentMode === 'cards') renderCards();
    else if (currentMode === 'quiz') renderQuiz();
    else if (currentMode === 'sentences') renderSentences();
    else if (currentMode === 'grammar') renderGrammar();
    
    updateCounter(true);
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
        console.error('Ошибка загрузки прогресса грамматики:', e);
    }
}

window.forceUpdateCounter = function() {
    setTimeout(() => {
        updateCounter(true);
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

// ========== ОБНОВЛЕНИЕ КНОПКИ "ПОДЕЛИТЬСЯ" ==========
let lastShareState = null;

function updateShareButtons() {
    const shareDesktop = document.getElementById('shareBtnDesktop');
    const shareMobile = document.getElementById('shareBtnMobile');
    const isAdmin = window.isAdmin && window.isAdmin();
    
    const shouldShow = !isAdmin;
    const currentState = shouldShow ? 'show' : 'hide';
    
    if (currentState === lastShareState) return;
    lastShareState = currentState;
    
    if (shareDesktop) shareDesktop.style.display = shouldShow ? 'block' : 'none';
    if (shareMobile) shareMobile.style.display = shouldShow ? 'block' : 'none';
}

// ========== ЗАГРУЗКА СОСТОЯНИЯ ИЗ LOCALSTORAGE ==========
function loadStateFromLocalStorage() {
    try {
        const cfg = localStorage.getItem('dm_config');
        console.log('🔍 Проверяем localStorage dm_config:', cfg);
        
        if (cfg) {
            const parsed = JSON.parse(cfg);
            console.log('🔍 Распарсенный config:', parsed);
            
            if (parsed.last_level) {
                AppConfig.currentLevel = parsed.last_level;
            }
            if (parsed.last_mode) {
                currentMode = parsed.last_mode;
            }
            AppConfig.show_language = parsed.show_language || 'de';
            AppConfig.quiz_direction = parsed.quiz_direction || 'de_to_ru';
            AppConfig.sentence_lang_from = parsed.sentence_lang_from || 'ru';
            
            console.log('📦 ЗАГРУЖЕНО ИЗ LOCALSTORAGE:', { mode: currentMode, level: AppConfig.currentLevel });
            return true;
        } else {
            console.log('📦 LOCALSTORAGE ПУСТ, используем значения по умолчанию');
            currentMode = 'grammar';
            AppConfig.currentLevel = 'A1';
            return false;
        }
    } catch(e) {
        console.error('Ошибка загрузки из localStorage:', e);
        currentMode = 'grammar';
        AppConfig.currentLevel = 'A1';
        return false;
    }
}

// ========== ПРИМЕНЕНИЕ СОСТОЯНИЯ ==========
function applyState() {
    if (stateApplied) {
        console.log('⚠️ Состояние уже применено, пропускаем');
        return;
    }
    stateApplied = true;
    
    console.log('🔄 ПРИМЕНЯЕМ СОСТОЯНИЕ:', { mode: currentMode, level: AppConfig.currentLevel });
    
    // Обновляем кнопки уровня
    document.querySelectorAll('[data-level]').forEach(btn => {
        if (btn.dataset.level === AppConfig.currentLevel) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Обновляем кнопки режима
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === currentMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // ЗАПУСКАЕМ РЕЖИМ
    console.log('🚀 ЗАПУСКАЕМ РЕЖИМ:', currentMode);
    
    if (currentMode === 'cards') {
        if (typeof renderCards === 'function') renderCards();
    } else if (currentMode === 'quiz') {
        if (typeof renderQuiz === 'function') renderQuiz();
    } else if (currentMode === 'sentences') {
        if (typeof renderSentences === 'function') renderSentences();
    } else if (currentMode === 'grammar') {
        if (typeof renderGrammar === 'function') renderGrammar();
    }
    
    if (typeof updateCounter === 'function') updateCounter(true);
    if (typeof updateModeIndicator === 'function') updateModeIndicator();
}

// ========== ИНИЦИАЛИЗАЦИЯ ==========
async function init() {
    console.log('🔥 INIT: НАЧАЛО ЗАГРУЗКИ');
    
    // ===== ШАГ 1: ЗАГРУЖАЕМ СОСТОЯНИЕ ИЗ LOCALSTORAGE =====
    loadStateFromLocalStorage();
    console.log('📌 ПОСЛЕ ЗАГРУЗКИ LOCALSTORAGE: mode=' + currentMode + ', level=' + AppConfig.currentLevel);
    
    // ===== ШАГ 2: ЗАГРУЖАЕМ ПРОГРЕСС =====
    loadProgress();
    loadGrammarProgress();
    
    // ===== ШАГ 3: ЗАГРУЖАЕМ ДАННЫЕ =====
    await loadWords();
    await loadSentences();
    await loadGrammarData();
    
    // ===== ШАГ 4: ПРИВЯЗЫВАЕМ СОБЫТИЯ К КНОПКАМ =====
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => setMode(btn.dataset.mode);
    });
    document.querySelectorAll('[data-level]').forEach(btn => {
        btn.onclick = () => setLevel(btn.dataset.level);
    });
    
    // ===== ШАГ 5: ИНИЦИАЛИЗИРУЕМ МОБИЛЬНОЕ МЕНЮ =====
    initMobileMenu();
    
    // ===== ШАГ 6: НАСТРОЙКА КНОПКИ "ПОДЕЛИТЬСЯ" =====
    setTimeout(() => {
        const shareDesktop = document.getElementById('shareBtnDesktop');
        const shareMobile = document.getElementById('shareBtnMobile');
        if (shareDesktop) shareDesktop.onclick = shareApp;
        if (shareMobile) shareMobile.onclick = shareApp;
    }, 500);
    
    // ===== ШАГ 7: ПЕРИОДИЧЕСКИЕ ЗАДАЧИ =====
    setInterval(() => {
        if (!documentHidden) {
            updateShareButtons();
        }
    }, 5000);
    
    setInterval(() => {
        if (!documentHidden && window.isAuthenticated && window.isAuthenticated()) {
            logUserAction('heartbeat', {
                level: AppConfig.currentLevel,
                mode: currentMode,
                wordsUnstudied: getUnstudiedWords().length,
                sentencesUnstudied: getUnstudiedSentences().length
            });
        }
    }, 5 * 60 * 1000);
    
    appInitialized = true;
    console.log('✅ INIT: ЗАВЕРШЕНО, режим:', currentMode, 'уровень:', AppConfig.currentLevel);
    
    // Если через 5 секунд состояние всё ещё не применено — применяем принудительно
    setTimeout(() => {
        if (!stateApplied) {
            console.log('⏰ Таймаут: применяем состояние принудительно');
            applyState();
        }
    }, 5000);
}

// ========== ЗАПУСК ==========
init();

// Экспортируем applyState для вызова из auth.js
window.applyAppState = applyState;
window.stateApplied = stateApplied;
