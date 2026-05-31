// Глобальные настройки (аналог config.json)
const AppConfig = {
    currentLevel: 'A1',
    show_language: 'de',
    quiz_direction: 'de_to_ru',
    sentence_lang_from: 'ru'
};

// Глобальные состояния
let currentMode = 'cards';
let lessonsExpanded = false;
let currentLesson = 1;
let lessonMode = 'theory';

// БД
let wordsDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let sentencesDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let lessonsCache = {};
let practiceCache = {};

// Прогресс
let wordsProgress = {};
let sentencesProgress = {};

// Функция сохранения (локально + Firebase)
function saveProgress() {
    localStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
    localStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
    localStorage.setItem('dm_config', JSON.stringify({
        last_level: AppConfig.currentLevel,
        show_language: AppConfig.show_language,
        quiz_direction: AppConfig.quiz_direction,
        sentence_lang_from: AppConfig.sentence_lang_from
    }));
    
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
        const cfg = localStorage.getItem('dm_config');
        if (cfg) {
            const parsed = JSON.parse(cfg);
            AppConfig.currentLevel = parsed.last_level || 'A1';
            AppConfig.show_language = parsed.show_language || 'de';
            AppConfig.quiz_direction = parsed.quiz_direction || 'de_to_ru';
            AppConfig.sentence_lang_from = parsed.sentence_lang_from || 'ru';
        }
    } catch(e) {}
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!wordsProgress[lvl]) wordsProgress[lvl] = [];
        if (!sentencesProgress[lvl]) sentencesProgress[lvl] = [];
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
