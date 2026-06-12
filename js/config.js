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

function saveProgress() {
    localStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
    localStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
    localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
    localStorage.setItem('dm_config', JSON.stringify({
        last_level: AppConfig.currentLevel,
        show_language: AppConfig.show_language,
        quiz_direction: AppConfig.quiz_direction,
        sentence_lang_from: AppConfig.sentence_lang_from,
        last_mode: currentMode
    }));
    
    // Сохраняем прогресс в облако, если пользователь авторизован
    if (window.saveUserProgressToFirebase) {
        window.saveUserProgressToFirebase();
    }
}

function loadProgress() {
    try {
        const wp = localStorage.getItem('dm_words_progress');
        if (wp) wordsProgress = JSON.parse(wp);
        const sp = localStorage.getItem('dm_sentences_progress');
        if (sp) sentencesProgress = JSON.parse(sp);
        const gp = localStorage.getItem('dm_grammar_progress');
        if (gp) grammarProgress = JSON.parse(gp);
        const cfg = localStorage.getItem('dm_config');
        if (cfg) {
            const parsed = JSON.parse(cfg);
            AppConfig.currentLevel = parsed.last_level || 'A1';
            AppConfig.show_language = parsed.show_language || 'de';
            AppConfig.quiz_direction = parsed.quiz_direction || 'de_to_ru';
            AppConfig.sentence_lang_from = parsed.sentence_lang_from || 'ru';
            currentMode = parsed.last_mode || 'grammar';
        }
    } catch(e) {}
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!wordsProgress[lvl]) wordsProgress[lvl] = [];
        if (!sentencesProgress[lvl]) sentencesProgress[lvl] = [];
        if (!grammarProgress[lvl]) grammarProgress[lvl] = [];
    });
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
