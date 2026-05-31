let grammarDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let grammarProgress = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let currentGrammarLesson = null;
let currentGrammarMode = 'theory';

function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    
    if (currentMode === 'cards' || currentMode === 'quiz') {
        const total = wordsDB[AppConfig.currentLevel]?.length || 0;
        const unstudied = getUnstudiedWords().length;
        const studied = total - unstudied;
        el.textContent = `Всего: ${total} | Учим: ${unstudied} | Выучено: ${studied}`;
    } else if (currentMode === 'sentences') {
        const total = sentencesDB[AppConfig.currentLevel]?.length || 0;
        let completed = sentencesProgress[AppConfig.currentLevel]?.filter(p => p?.studied === true).length || 0;
        el.textContent = `Всего фраз: ${total} | Выучено: ${completed}`;
    } else if (currentMode === 'lessons') {
        el.textContent = `УРОКИ | Урок ${currentLesson}`;
    } else if (currentMode === 'grammar') {
        const level = AppConfig.currentLevel;
        const grammarData = grammarDB[level];
        if (grammarData && grammarData.length) {
            const totalLessons = grammarData.length;
            const completed = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
            el.textContent = `ГРАММАТИКА ${level} | Пройдено: ${completed} из ${totalLessons} уроков`;
        } else {
            el.textContent = `ГРАММАТИКА ${level} | Загрузка...`;
        }
    }
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
    else if (mode === 'lessons') renderLessons();
    else if (mode === 'grammar') renderGrammar();
    
    saveProgress();
}

function setLevel(level) {
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
    } else if (currentMode === 'lessons') {
        renderLessons();
    } else if (currentMode === 'grammar') {
        renderGrammar();
    }
    
    updateCounter();
    saveProgress();
}

function toggleLessons() {
    const panel = document.getElementById('lessonsPanel');
    const btn = document.getElementById('toggleLessonsBtn');
    if (lessonsExpanded) {
        panel.style.display = 'none';
        btn.textContent = 'УРОКИ ▶';
        lessonsExpanded = false;
    } else {
        panel.style.display = 'block';
        btn.textContent = 'УРОКИ ▼';
        lessonsExpanded = true;
    }
}

async function init() {
    console.log('init: начало загрузки');
    
    loadProgress();
    loadGrammarProgress();
    
    await loadWords();
    await loadSentences();
    await loadLessonsAndPractice();
    await loadGrammarData();
    
    buildLessonsList();
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.onclick = () => setMode(btn.dataset.mode);
    });
    document.querySelectorAll('[data-level]').forEach(btn => {
        btn.onclick = () => setLevel(btn.dataset.level);
    });
    document.getElementById('toggleLessonsBtn').onclick = toggleLessons;
    
    document.querySelectorAll('[data-level]').forEach(btn => {
        if (btn.dataset.level === AppConfig.currentLevel) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // Открываем сохранённый режим
    setMode(currentMode);
    
    console.log('init: завершено');
}

init();
