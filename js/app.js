function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // 🔥 ЛОГИРУЕМ ДЕЙСТВИЕ ПОЛЬЗОВАТЕЛЯ
    if (window.isAuthenticated && window.isAuthenticated()) {
        logUserAction('change_mode', { mode: mode });
    }
    
    if (mode === 'cards') renderCards();
    else if (mode === 'quiz') renderQuiz();
    else if (mode === 'sentences') renderSentences();
    else if (mode === 'grammar') renderGrammar();
    
    saveProgress();
    updateCounter();
    updateModeIndicator();
    
    closeMobileMenu();
}

function setLevel(level) {
    // Проверка доступа к платным уровням B1, B2, C1
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
    
    // 🔥 ЛОГИРУЕМ ДЕЙСТВИЕ ПОЛЬЗОВАТЕЛЯ
    if (window.isAuthenticated && window.isAuthenticated()) {
        logUserAction('change_level', { level: level });
    }
    
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
    
    closeMobileMenu();
}

// ========== НОВАЯ ФУНКЦИЯ ДЛЯ ЛОГИРОВАНИЯ ДЕЙСТВИЙ ==========
async function logUserAction(action, details = {}) {
    try {
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
        
        console.log('📊 Действие залогировано:', action);
    } catch(e) {
        console.error('Ошибка логирования действия:', e);
    }
}
