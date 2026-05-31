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
    // Меняем уровень
    AppConfig.currentLevel = level;
    
    // Обновляем активные кнопки уровней
    document.querySelectorAll('[data-level]').forEach(btn => {
        if (btn.dataset.level === level) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    
    // ========== НОВОЕ: Если мы в режиме Уроки, переключаемся на Грамматику ==========
    if (currentMode === 'lessons') {
        // Переключаем режим на грамматику
        currentMode = 'grammar';
        // Обновляем активные кнопки режимов
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.dataset.mode === 'grammar') btn.classList.add('active');
            else btn.classList.remove('active');
        });
        // Открываем грамматику выбранного уровня
        renderGrammar();
        saveProgress();
        return;
    }
    // ============================================================================
    
    // Для остальных режимов просто перерисовываем текущий режим с новым уровнем
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
    saveProgress();
}

function restoreLessonsPanel() {
    const panel = document.getElementById('lessonsPanel');
    const btn = document.getElementById('toggleLessonsBtn');
    if (!panel || !btn) return;
    
    if (lessonsExpanded) {
        panel.style.display = 'block';
        btn.textContent = 'УРОКИ ▼';
    } else {
        panel.style.display = 'none';
        btn.textContent = 'УРОКИ ▶';
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
    
    restoreLessonsPanel();
    setMode(currentMode);
    
    console.log('init: завершено, currentLesson =', currentLesson);
}

init();
