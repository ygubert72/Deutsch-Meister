// Глобальные настройки
const AppConfig = {
    currentLevel: 'A1',
    show_language: 'de',
    quiz_direction: 'de_to_ru',
    sentence_lang_from: 'ru'
};

// Глобальные состояния
let currentMode = 'grammar';

// БД
let wordsDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let sentencesDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };

// Прогресс
let wordsProgress = {};
let sentencesProgress = {};
let grammarProgress = { A1: [], A2: [], B1: [], B2: [], C1: [] };

// ========== ПРОВЕРКА, АВТОРИЗОВАН ЛИ ПОЛЬЗОВАТЕЛЬ ==========
function isUserAuthenticated() {
    if (typeof window.isAuthenticated === 'function') {
        return window.isAuthenticated();
    }
    return false;
}

function saveProgress() {
    // ВСЕГДА сохраняем в памяти сессии (для гостей это единственное место)
    sessionStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
    sessionStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
    sessionStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
    sessionStorage.setItem('dm_config', JSON.stringify({
        last_level: AppConfig.currentLevel,
        show_language: AppConfig.show_language,
        quiz_direction: AppConfig.quiz_direction,
        sentence_lang_from: AppConfig.sentence_lang_from,
        last_mode: currentMode
    }));
    
    // Если пользователь авторизован — сохраняем В ОБЛАКО (Firestore)
    if (window.saveUserProgressToFirebase) {
        window.saveUserProgressToFirebase();
    }
}

function loadProgress() {
    // Пытаемся загрузить из сессии (только если есть)
    try {
        const wp = sessionStorage.getItem('dm_words_progress');
        if (wp) wordsProgress = JSON.parse(wp);
        
        const sp = sessionStorage.getItem('dm_sentences_progress');
        if (sp) sentencesProgress = JSON.parse(sp);
        
        const gp = sessionStorage.getItem('dm_grammar_progress');
        if (gp) grammarProgress = JSON.parse(gp);
        
        const cfg = sessionStorage.getItem('dm_config');
        if (cfg) {
            const parsed = JSON.parse(cfg);
            AppConfig.currentLevel = parsed.last_level || 'A1';
            AppConfig.show_language = parsed.show_language || 'de';
            AppConfig.quiz_direction = parsed.quiz_direction || 'de_to_ru';
            AppConfig.sentence_lang_from = parsed.sentence_lang_from || 'ru';
            currentMode = parsed.last_mode || 'grammar';
        }
    } catch(e) {
        // Если ошибка — просто игнорируем
    }
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!wordsProgress[lvl]) wordsProgress[lvl] = [];
        if (!sentencesProgress[lvl]) sentencesProgress[lvl] = [];
        if (!grammarProgress[lvl]) grammarProgress[lvl] = [];
    });
}

// ========== СБРОС ПРОГРЕССА ГОСТЯ (при загрузке страницы) ==========
function resetGuestProgress() {
    // Проверяем, авторизован ли пользователь
    if (isUserAuthenticated()) {
        return; // Если авторизован — ничего не сбрасываем
    }
    
    // Сбрасываем прогресс гостя
    wordsProgress = {};
    sentencesProgress = {};
    grammarProgress = {};
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        wordsProgress[lvl] = [];
        sentencesProgress[lvl] = [];
        grammarProgress[lvl] = [];
    });
    
    // Очищаем сессию
    sessionStorage.removeItem('dm_words_progress');
    sessionStorage.removeItem('dm_sentences_progress');
    sessionStorage.removeItem('dm_grammar_progress');
    sessionStorage.removeItem('dm_config');
    
    // Но сохраняем текущий уровень и режим (чтобы интерфейс не сбрасывался)
    sessionStorage.setItem('dm_guest_config', JSON.stringify({
        last_level: 'A1',
        last_mode: 'grammar'
    }));
    
    // Загружаем только конфиг из гостевых настроек
    try {
        const cfg = sessionStorage.getItem('dm_guest_config');
        if (cfg) {
            const parsed = JSON.parse(cfg);
            AppConfig.currentLevel = parsed.last_level || 'A1';
            currentMode = parsed.last_mode || 'grammar';
        }
    } catch(e) {}
}

function speak(text) {
    if (!text || !window.speechSynthesis) return;
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ]/g, '');
    if (!clean.trim()) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// Экспортируем функции для использования в других файлах
window.isUserAuthenticated = isUserAuthenticated;
window.resetGuestProgress = resetGuestProgress;
