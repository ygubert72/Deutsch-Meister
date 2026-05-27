// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentMode = 'cards';
let currentLevel = 'A2';
let showLanguage = 'de';
let quizDirection = 'de_to_ru';
let sentenceLangFrom = 'ru';

let wordsData = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let sentencesData = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let progressData = {};
let sentencesProgressData = {};

let cardsCurrentIndex = 0;
let cardsFlipped = false;
let cardsCurrentWords = [];

let quizCurrentIndex = 0;
let quizWordList = [];
let quizOptions = [];
let quizCorrectAnswer = '';
let quizCurrentWord = null;

let sentencesCurrentIndex = 0;
let sentencesList = [];
let sentencesCurrentData = null;
let sentencesSelectedWords = [];
let sentencesAvailableWords = [];
let sentencesWordActive = {};

let lessonsExpanded = false;
let currentLesson = 1;
let currentLessonMode = 'theory';
let lessonsCache = {};
let practiceCache = {};
let savedPositions = {};

// ========== ЗАГРУЗКА ДАННЫХ ==========
async function loadAllData() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const basePath = '/Deutsch-Meister/docs/';

    for (const level of levels) {
        try {
            const resp = await fetch(`${basePath}words/${level}.json`);
            if (resp.ok) wordsData[level] = await resp.json();
            else wordsData[level] = [];
        } catch(e) { wordsData[level] = []; }
        
        try {
            const resp = await fetch(`${basePath}sentences/${level}.json`);
            if (resp.ok) sentencesData[level] = await resp.json();
            else sentencesData[level] = [];
        } catch(e) { sentencesData[level] = []; }
    }

    for (let i = 1; i <= 50; i++) {
        try {
            const resp = await fetch(`${basePath}lessons/lesson_${i}.txt`);
            lessonsCache[i] = resp.ok ? await resp.text() : `=== Урок ${i} ===\n\nСодержание урока пока не добавлено.`;
        } catch(e) { lessonsCache[i] = `=== Урок ${i} ===\n\nОшибка загрузки.`; }
        
        try {
            const resp = await fetch(`${basePath}practice/lesson_${i}.txt`);
            practiceCache[i] = resp.ok ? await resp.text() : '';
        } catch(e) { practiceCache[i] = ''; }
    }

    loadProgress();
    createLessonButtons();
    updateCounter();
}

function loadProgress() {
    const saved = localStorage.getItem('deutsch_meister_progress');
    if (saved) { try { progressData = JSON.parse(saved); } catch(e) {} }
    const savedSent = localStorage.getItem('deutsch_meister_sentences_progress');
    if (savedSent) { try { sentencesProgressData = JSON.parse(savedSent); } catch(e) {} }
}

function saveProgress() {
    localStorage.setItem('deutsch_meister_progress', JSON.stringify(progressData));
    localStorage.setItem('deutsch_meister_sentences_progress', JSON.stringify(sentencesProgressData));
}

function getCurrentWords(level) {
    if (!wordsData[level]) return [];
    const current = [];
    for (let i = 0; i < wordsData[level].length; i++) {
        if (!progressData[level]?.[i]?.studied) current.push(wordsData[level][i]);
    }
    return current;
}

function getStudiedWords(level) {
    if (!wordsData[level]) return [];
    const studied = [];
    for (let i = 0; i < wordsData[level].length; i++) {
        if (progressData[level]?.[i]?.studied) studied.push(wordsData[level][i]);
    }
    return studied;
}

function getUncompletedSentences(level) {
    if (!sentencesData[level]) return [];
    const uncompleted = [];
    for (let i = 0; i < sentencesData[level].length; i++) {
        if (!sentencesProgressData[level]?.[i]?.studied) uncompleted.push(sentencesData[level][i]);
    }
    return uncompleted;
}

function findWordIndex(level, word) {
    const words = wordsData[level];
    for (let i = 0; i < words.length; i++) {
        if (words[i].de === word.de && words[i].ru === word.ru) return i;
    }
    return -1;
}

function findSentenceIndex(level, sentence) {
    const sents = sentencesData[level];
    for (let i = 0; i < sents.length; i++) {
        if (sents[i].de === sentence.de && sents[i].ru === sentence.ru) return i;
    }
    return -1;
}

function updateCounter() {
    const label = document.getElementById('counterLabel');
    if (!label) return;
    if (currentMode === 'cards' || currentMode === 'quiz') {
        const total = wordsData[currentLevel]?.length || 0;
        const unstudied = getCurrentWords(currentLevel).length;
        label.textContent = `Всего: ${total} | Учим: ${unstudied} | Выучено: ${total - unstudied}`;
    } else if (currentMode === 'sentences') {
        const total = sentencesData[currentLevel]?.length || 0;
        let completed = 0;
        if (sentencesProgressData[currentLevel]) {
            completed = Object.values(sentencesProgressData[currentLevel]).filter(v => v?.studied).length;
        }
        label.textContent = `Всего фраз: ${total} | Выучено: ${completed}`;
    } else {
        label.textContent = `КУРС ГРАММАТИКИ`;
    }
}

function speakText(text) {
    if (!text || !window.speechSynthesis) return;
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ]/g, '');
    if (!clean.trim()) return;
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.lang = 'de-DE';
    utterance.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
}

// ========== КАРТОЧКИ ==========
function renderCardsMode() {
    cardsCurrentWords = getCurrentWords(currentLevel);
    document.getElementById('contentArea').innerHTML = `
        <div class="cards-mode">
            <div class="cards-direction-bar">
                <button class="direction-btn" id="cardsDirectionBtn">${showLanguage === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            </div>
            <div class="card-container"><div class="card" id="card"><div class="card-word" id="cardWord"></div></div></div>
            <div class="cards-controls">
                <button class="control-btn" id="studyBtn">В ИЗУЧЕНО</button>
                <button class="control-btn" id="unstudyBtn">ВЕРНУТЬ</button>
                <button class="control-btn" id="resetStudiedBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="control-btn" id="speakBtn">🔊</button>
                <button class="control-btn" id="prevCardBtn">◀ НАЗАД</button>
                <button class="control-btn" id="nextCardBtn">ВПЕРЕД ▶</button>
            </div>
            <div class="hint-text">Нажмите на карточку для перевода</div>
        </div>
    `;
    document.getElementById('cardsDirectionBtn').onclick = () => {
        showLanguage = showLanguage === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        updateCardDisplay();
        document.getElementById('cardsDirectionBtn').textContent = showLanguage === 'de' ? 'De → Ru' : 'Ru → De';
    };
    document.getElementById('card').onclick = () => { if(cardsCurrentWords.length) { cardsFlipped = !cardsFlipped; updateCardDisplay(); } };
    document.getElementById('studyBtn').onclick = () => markWordAsStudied();
    document.getElementById('unstudyBtn').onclick = () => showUnstudyDialog();
    document.getElementById('resetStudiedBtn').onclick = () => resetAllStudied();
    document.getElementById('speakBtn').onclick = () => { if(cardsCurrentWords[cardsCurrentIndex]) speakText(cardsCurrentWords[cardsCurrentIndex].de); };
    document.getElementById('prevCardBtn').onclick = () => { if(cardsCurrentIndex > 0) { cardsCurrentIndex--; cardsFlipped = false; updateCardDisplay(); } };
    document.getElementById('nextCardBtn').onclick = () => { if(cardsCurrentWords.length) { cardsCurrentIndex = (cardsCurrentIndex + 1) % cardsCurrentWords.length; cardsFlipped = false; updateCardDisplay(); } };
    updateCardDisplay();
    updateCounter();
}

function updateCardDisplay() {
    const cardWord = document.getElementById('cardWord');
    if (!cardWord) return;
    if (cardsCurrentWords.length === 0) { cardWord.textContent = "🎉 Все слова изучены!"; return; }
    if (cardsCurrentIndex >= cardsCurrentWords.length) cardsCurrentIndex = 0;
    const word = cardsCurrentWords[cardsCurrentIndex];
    if (!cardsFlipped) cardWord.textContent = showLanguage === 'de' ? word.de : word.ru;
    else cardWord.textContent = showLanguage === 'de' ? `${word.de}\n\n➡️\n\n${word.ru}` : `${word.ru}\n\n➡️\n\n${word.de}`;
}

function markWordAsStudied() {
    if (!cardsCurrentWords.length) return;
    const word = cardsCurrentWords[cardsCurrentIndex];
    const idx = findWordIndex(currentLevel, word);
    if (idx !== -1) {
        if (!progressData[currentLevel]) progressData[currentLevel] = [];
        progressData[currentLevel][idx] = { studied: true };
        saveProgress();
        cardsCurrentWords = getCurrentWords(currentLevel);
        if (cardsCurrentIndex >= cardsCurrentWords.length && cardsCurrentWords.length) cardsCurrentIndex = 0;
        cardsFlipped = false;
        updateCardDisplay();
        updateCounter();
    }
}

function showUnstudyDialog() {
    const studied = getStudiedWords(currentLevel);
    if (!studied.length) { alert("Нет изученных слов"); return; }
    let msg = "Выберите слово:\n";
    studied.forEach((w, i) => msg += `${i+1}. ${w.de} - ${w.ru}\n`);
    const num = prompt(msg);
    if (num) {
        const idx = parseInt(num) - 1;
        if (idx >= 0 && idx < studied.length) {
            const word = studied[idx];
            const wordIdx = findWordIndex(currentLevel, word);
            if (wordIdx !== -1) {
                if (!progressData[currentLevel]) progressData[currentLevel] = [];
                progressData[currentLevel][wordIdx] = { studied: false };
                saveProgress();
                cardsCurrentWords = getCurrentWords(currentLevel);
                updateCardDisplay();
                updateCounter();
            }
        }
    }
}

function resetAllStudied() {
    if (!progressData[currentLevel]) progressData[currentLevel] = [];
    for (let i = 0; i < wordsData[currentLevel].length; i++) progressData[currentLevel][i] = { studied: false };
    saveProgress();
    cardsCurrentWords = getCurrentWords(currentLevel);
    cardsCurrentIndex = 0;
    cardsFlipped = false;
    updateCardDisplay();
    updateCounter();
}

// ========== ТЕСТ ==========
function renderQuizMode() {
    quizWordList = getCurrentWords(currentLevel);
    quizCurrentIndex = 0;
    document.getElementById('contentArea').innerHTML = `
        <div class="quiz-mode">
            <div class="cards-direction-bar">
                <button class="direction-btn" id="quizDirectionBtn">${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            </div>
            <div class="quiz-question" id="quizQuestion"></div>
            <div class="quiz-buttons-grid" id="quizButtonsGrid"></div>
            <div class="cards-controls">
                <button class="control-btn" id="quizStudyBtn">В ИЗУЧЕНО</button>
                <button class="control-btn" id="quizUnstudyBtn">ВЕРНУТЬ</button>
                <button class="control-btn" id="quizResetStudiedBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="control-btn" id="prevQuizBtn">◀ НАЗАД</button>
                <button class="control-btn" id="nextQuizBtn">ВПЕРЕД ▶</button>
            </div>
            <div class="hint-text" id="quizProgress"></div>
        </div>
    `;
    document.getElementById('quizDirectionBtn').onclick = () => {
        quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        showQuizWord();
        document.getElementById('quizDirectionBtn').textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
    };
    document.getElementById('quizStudyBtn').onclick = () => markQuizWordAsStudied();
    document.getElementById('quizUnstudyBtn').onclick = () => showUnstudyDialog();
    document.getElementById('quizResetStudiedBtn').onclick = () => resetAllStudied();
    document.getElementById('prevQuizBtn').onclick = () => { if(quizCurrentIndex > 0) { quizCurrentIndex--; showQuizWord(); } };
    document.getElementById('nextQuizBtn').onclick = () => { if(quizWordList.length) { quizCurrentIndex = (quizCurrentIndex + 1) % quizWordList.length; showQuizWord(); } };
    showQuizWord();
}

function showQuizWord() {
    if (!quizWordList.length) { document.getElementById('quizQuestion').textContent = "🎉 Все слова изучены!"; return; }
    if (quizCurrentIndex >= quizWordList.length) quizCurrentIndex = 0;
    quizCurrentWord = quizWordList[quizCurrentIndex];
    const others = wordsData[currentLevel].filter(w => w.de !== quizCurrentWord.de);
    const shuffled = [...others];
    for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    quizOptions = [quizCurrentWord, ...shuffled.slice(0,5)];
    for (let i = quizOptions.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [quizOptions[i], quizOptions[j]] = [quizOptions[j], quizOptions[i]]; }
    if (quizDirection === 'de_to_ru') { document.getElementById('quizQuestion').textContent = quizCurrentWord.de; quizCorrectAnswer = quizCurrentWord.ru; }
    else { document.getElementById('quizQuestion').textContent = quizCurrentWord.ru; quizCorrectAnswer = quizCurrentWord.de; }
    const grid = document.getElementById('quizButtonsGrid');
    grid.innerHTML = '';
    quizOptions.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.className = 'quiz-option-btn';
        btn.textContent = quizDirection === 'de_to_ru' ? opt.ru : opt.de;
        btn.onclick = () => {
            const isCorrect = quizDirection === 'de_to_ru' ? (opt.ru === quizCorrectAnswer) : (opt.de === quizCorrectAnswer);
            if (isCorrect) {
                btn.classList.add('correct-flash');
                setTimeout(() => { quizCurrentIndex = (quizCurrentIndex + 1) % quizWordList.length; showQuizWord(); }, 400);
            } else { btn.classList.add('wrong-flash'); setTimeout(() => btn.classList.remove('wrong-flash'), 500); }
        };
        grid.appendChild(btn);
    });
    document.getElementById('quizProgress').textContent = `Текущее слово: ${quizCurrentIndex + 1} из ${quizWordList.length}`;
}

function markQuizWordAsStudied() {
    if (!quizCurrentWord) return;
    const idx = findWordIndex(currentLevel, quizCurrentWord);
    if (idx !== -1) {
        if (!progressData[currentLevel]) progressData[currentLevel] = [];
        progressData[currentLevel][idx] = { studied: true };
        saveProgress();
        quizWordList = getCurrentWords(currentLevel);
        quizCurrentIndex = 0;
        showQuizWord();
        updateCounter();
    }
}

// ========== ФРАЗЫ ==========
function renderSentencesMode() {
    sentencesList = getUncompletedSentences(currentLevel);
    sentencesCurrentIndex = 0;
    document.getElementById('contentArea').innerHTML = `
        <div class="sentences-mode">
            <div class="cards-direction-bar">
                <button class="direction-btn" id="sentencesDirectionBtn">${sentenceLangFrom === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
            </div>
            <div class="sentence-question" id="sentenceQuestion"></div>
            <div class="sentence-result" id="sentenceResult"></div>
            <div class="words-container" id="sentenceWordsContainer"></div>
            <div class="sentence-controls">
                <button class="control-btn" id="sentenceUndoBtn">ВЕРНУТЬ СЛОВО</button>
                <button class="control-btn" id="sentenceResetBtn">СБРОСИТЬ ВСЁ</button>
                <button class="control-btn primary" id="sentenceCheckBtn">ПРОВЕРИТЬ</button>
                <button class="control-btn" id="sentenceSpeakBtn">🔊</button>
            </div>
            <div class="cards-controls">
                <button class="control-btn" id="sentenceStudyBtn">В ИЗУЧЕНО</button>
                <button class="control-btn" id="sentenceUnstudyBtn">ВЕРНУТЬ</button>
                <button class="control-btn" id="sentenceResetStudiedBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="control-btn" id="prevSentenceBtn">◀ НАЗАД</button>
                <button class="control-btn" id="nextSentenceBtn">ВПЕРЕД ▶</button>
            </div>
        </div>
    `;
    document.getElementById('sentencesDirectionBtn').onclick = () => {
        sentenceLangFrom = sentenceLangFrom === 'ru' ? 'de' : 'ru';
        showCurrentSentence();
        document.getElementById('sentencesDirectionBtn').textContent = sentenceLangFrom === 'ru' ? 'Ru → De' : 'De → Ru';
    };
    document.getElementById('sentenceUndoBtn').onclick = sentenceUndoWord;
    document.getElementById('sentenceResetBtn').onclick = sentenceReset;
    document.getElementById('sentenceCheckBtn').onclick = sentenceCheck;
    document.getElementById('sentenceSpeakBtn').onclick = () => { if(sentencesCurrentData) speakText(sentencesCurrentData.de); };
    document.getElementById('sentenceStudyBtn').onclick = markSentenceAsStudied;
    document.getElementById('sentenceUnstudyBtn').onclick = showSentenceUnstudyDialog;
    document.getElementById('sentenceResetStudiedBtn').onclick = resetAllSentencesStudied;
    document.getElementById('prevSentenceBtn').onclick = () => { if(sentencesCurrentIndex > 0) { sentencesCurrentIndex--; showCurrentSentence(); } };
    document.getElementById('nextSentenceBtn').onclick = () => { if(sentencesList.length) { sentencesCurrentIndex = (sentencesCurrentIndex + 1) % sentencesList.length; showCurrentSentence(); } };
    showCurrentSentence();
}

function showCurrentSentence() {
    if (!sentencesList.length) { document.getElementById('sentenceQuestion').textContent = "🎉 Все фразы изучены!"; return; }
    if (sentencesCurrentIndex >= sentencesList.length) sentencesCurrentIndex = 0;
    sentencesCurrentData = sentencesList[sentencesCurrentIndex];
    let question, correctWords;
    if (sentenceLangFrom === 'ru') { question = sentencesCurrentData.ru; correctWords = sentencesCurrentData.de.split(' '); }
    else { question = sentencesCurrentData.de; correctWords = sentencesCurrentData.ru.split(' '); }
    document.getElementById('sentenceQuestion').textContent = `Составьте предложение:\n\n${question}`;
    const extras = ['der', 'die', 'das', 'und', 'oder', 'aber', 'sehr', 'gut', 'nicht', 'auch', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'Sie'];
    let words = [...correctWords];
    while (words.length < 6) { const e = extras[Math.floor(Math.random() * extras.length)]; if (!words.includes(e)) words.push(e); }
    for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
    sentencesAvailableWords = words.slice(0, 8);
    sentencesSelectedWords = [];
    sentencesWordActive = {};
    sentencesAvailableWords.forEach(w => { sentencesWordActive[w] = true; });
    updateSentenceDisplay();
}

function updateSentenceDisplay() {
    const container = document.getElementById('sentenceWordsContainer');
    const result = document.getElementById('sentenceResult');
    if (!container) return;
    container.innerHTML = '';
    sentencesAvailableWords.forEach(word => {
        if (sentencesWordActive[word]) {
            const btn = document.createElement('button');
            btn.className = 'word-btn';
            btn.textContent = word;
            btn.onclick = () => { if(sentencesWordActive[word]) { sentencesWordActive[word] = false; sentencesSelectedWords.push(word); updateSentenceDisplay(); } };
            container.appendChild(btn);
        }
    });
    result.textContent = sentencesSelectedWords.join(' ');
}

function sentenceUndoWord() { if(sentencesSelectedWords.length) { const last = sentencesSelectedWords.pop(); sentencesWordActive[last] = true; updateSentenceDisplay(); } }
function sentenceReset() { sentencesSelectedWords = []; sentencesAvailableWords.forEach(w => { sentencesWordActive[w] = true; }); updateSentenceDisplay(); }
function sentenceCheck() {
    if (!sentencesSelectedWords.length) { sentenceBlinkRed(); return; }
    let correct = sentenceLangFrom === 'ru' ? sentencesCurrentData.de.toLowerCase().replace(/[.,!?]/g, '') : sentencesCurrentData.ru.toLowerCase().replace(/[.,!?]/g, '');
    const user = sentencesSelectedWords.join(' ').toLowerCase().replace(/[.,!?]/g, '');
    if (user === correct) sentenceBlinkGreenAndNext();
    else sentenceBlinkRed();
}
function sentenceBlinkGreenAndNext() {
    const result = document.getElementById('sentenceResult');
    result.style.backgroundColor = '#C8E6C9';
    setTimeout(() => {
        result.style.backgroundColor = '#FFFFFF';
        sentencesCurrentIndex = (sentencesCurrentIndex + 1) % sentencesList.length;
        showCurrentSentence();
    }, 500);
}
function sentenceBlinkRed() {
    const result = document.getElementById('sentenceResult');
    result.style.backgroundColor = '#FFCDD2';
    setTimeout(() => { result.style.backgroundColor = '#FFFFFF'; sentenceReset(); }, 500);
}
function markSentenceAsStudied() {
    if (!sentencesCurrentData) return;
    const idx = findSentenceIndex(currentLevel, sentencesCurrentData);
    if (idx !== -1) {
        if (!sentencesProgressData[currentLevel]) sentencesProgressData[currentLevel] = [];
        sentencesProgressData[currentLevel][idx] = { studied: true };
        saveProgress();
        sentencesList = getUncompletedSentences(currentLevel);
        sentencesCurrentIndex = 0;
        showCurrentSentence();
        updateCounter();
    }
}
function showSentenceUnstudyDialog() {
    const completed = [];
    if (sentencesProgressData[currentLevel]) {
        for (let i = 0; i < sentencesData[currentLevel].length; i++) {
            if (sentencesProgressData[currentLevel][i]?.studied) completed.push(sentencesData[currentLevel][i]);
        }
    }
    if (!completed.length) { alert("Нет изученных фраз"); return; }
    let msg = "Выберите фразу:\n";
    completed.forEach((s, i) => msg += `${i+1}. ${s.de} -> ${s.ru}\n`);
    const num = prompt(msg);
    if (num) {
        const idx = parseInt(num) - 1;
        if (idx >= 0 && idx < completed.length) {
            const sentIdx = findSentenceIndex(currentLevel, completed[idx]);
            if (sentIdx !== -1) {
                if (!sentencesProgressData[currentLevel]) sentencesProgressData[currentLevel] = [];
                sentencesProgressData[currentLevel][sentIdx] = { studied: false };
                saveProgress();
                sentencesList = getUncompletedSentences(currentLevel);
                sentencesCurrentIndex = 0;
                showCurrentSentence();
                updateCounter();
            }
        }
    }
}
function resetAllSentencesStudied() {
    if (!sentencesProgressData[currentLevel]) sentencesProgressData[currentLevel] = [];
    for (let i = 0; i < sentencesData[currentLevel].length; i++) sentencesProgressData[currentLevel][i] = { studied: false };
    saveProgress();
    sentencesList = getUncompletedSentences(currentLevel);
    sentencesCurrentIndex = 0;
    showCurrentSentence();
    updateCounter();
}

// ========== УРОКИ ==========
function renderLessonsMode() {
    document.getElementById('contentArea').innerHTML = `
        <div class="lessons-mode">
            <div class="lesson-header">
                <div class="lesson-title">📖 УРОК ${currentLesson}</div>
                <div class="lesson-counter">Урок ${currentLesson} из 50</div>
            </div>
            <div class="lesson-mode-buttons">
                <button class="lesson-mode-btn active" id="lessonTheoryBtn">ТЕОРИЯ</button>
                <button class="lesson-mode-btn inactive" id="lessonPracticeBtn">ПРАКТИКА</button>
            </div>
            <div id="lessonContent" class="lesson-content"></div>
        </div>
    `;
    document.getElementById('lessonTheoryBtn').onclick = () => { currentLessonMode = 'theory'; loadLesson(currentLesson); updateLessonModeButtons(); };
    document.getElementById('lessonPracticeBtn').onclick = () => { currentLessonMode = 'practice'; loadLesson(currentLesson); updateLessonModeButtons(); };
    loadLesson(currentLesson);
}

function updateLessonModeButtons() {
    const theory = document.getElementById('lessonTheoryBtn');
    const practice = document.getElementById('lessonPracticeBtn');
    if (currentLessonMode === 'theory') {
        theory.classList.add('active'); theory.classList.remove('inactive');
        practice.classList.add('inactive'); practice.classList.remove('active');
    } else {
        practice.classList.add('active'); practice.classList.remove('inactive');
        theory.classList.add('inactive'); theory.classList.remove('active');
    }
}

function loadLesson(num) {
    currentLesson = num;
    document.querySelector('.lesson-title').textContent = `📖 УРОК ${num}`;
    document.querySelector('.lesson-counter').textContent = `Урок ${num} из 50`;
    if (currentLessonMode === 'theory') showLessonTheory();
    else showLessonPractice();
}

function showLessonTheory() {
    const container = document.getElementById('lessonContent');
    let content = lessonsCache[currentLesson] || `=== Урок ${currentLesson} ===\n\nСодержание урока пока не добавлено.`;
    content = content.replace(/\[озвучка:([^\]]+)\]/g, (m, w) => `<button class="speak-inline-btn" onclick="speakText('${w.replace(/'/g, "\\'")}')">🔊 ${w}</button>`);
    content = content.replace(/\n/g, '<br>');
    container.innerHTML = `<div class="lesson-text">${content}</div>`;
}

function showLessonPractice() {
    const container = document.getElementById('lessonContent');
    const practice = practiceCache[currentLesson] || '';
    if (!practice.trim()) {
        container.innerHTML = `<div class="lesson-text">✨ В этом уроке нет упражнений ✨</div>`;
        return;
    }
    const lines = practice.split('\n');
    const exercises = [];
    for (const line of lines) {
        if (line.includes('|')) {
            const parts = line.split('|');
            if (parts.length >= 2) exercises.push({ question: parts[0].trim(), answer: parts[1].trim() });
        }
    }
    if (exercises.length === 0) {
        container.innerHTML = `<div class="lesson-text">✨ В этом уроке нет упражнений ✨</div>`;
        return;
    }
    let html = '<div>';
    for (let exIdx = 0; exIdx < exercises.length; exIdx++) {
        const ex = exercises[exIdx];
        const answerWords = ex.answer.split(' ');
        const extras = ['der', 'die', 'das', 'und', 'oder', 'aber', 'sehr', 'gut', 'nicht', 'auch', 'ich', 'du', 'er', 'sie', 'es', 'wir', 'ihr', 'Sie'];
        let words = [...answerWords];
        while (words.length < 6) { const e = extras[Math.floor(Math.random() * extras.length)]; if (!words.includes(e)) words.push(e); }
        for (let i = words.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [words[i], words[j]] = [words[j], words[i]]; }
        const uniqueId = `practice_ex_${currentLesson}_${exIdx}`;
        html += `
            <div class="practice-exercise-card">
                <div class="practice-question">📝 ${ex.question}</div>
                <div class="practice-words-container" id="${uniqueId}_words"></div>
                <div class="practice-selected-container" id="${uniqueId}_selected"></div>
                <div class="practice-controls">
                    <button class="practice-undo-btn" data-ex="${uniqueId}">↩ ВЕРНУТЬ СЛОВО</button>
                    <button class="practice-reset-btn" data-ex="${uniqueId}">🔄 СБРОСИТЬ ВСЁ</button>
                    <button class="practice-check-btn" data-ex="${uniqueId}">✅ ПРОВЕРИТЬ</button>
                </div>
                <div class="practice-message" id="${uniqueId}_msg"></div>
            </div>
            <hr style="margin: 20px 0;">
        `;
        if (!window.practiceExercises) window.practiceExercises = {};
        window.practiceExercises[uniqueId] = { availableWords: [...words], selectedWords: [], wordActive: {}, answer: ex.answer.toLowerCase().replace(/[.,!?]/g, '') };
        words.forEach(w => { window.practiceExercises[uniqueId].wordActive[w] = true; });
    }
    html += '</div>';
    container.innerHTML = html;
    for (let i = 0; i < exercises.length; i++) initPracticeExercise(`practice_ex_${currentLesson}_${i}`);
}

function initPracticeExercise(uniqueId) {
    const exercise = window.practiceExercises[uniqueId];
    if (!exercise) return;
    const wordsContainer = document.getElementById(`${uniqueId}_words`);
    const selectedContainer = document.getElementById(`${uniqueId}_selected`);
    const msgContainer = document.getElementById(`${uniqueId}_msg`);
    function updateDisplay() {
        wordsContainer.innerHTML = '';
        exercise.availableWords.forEach(word => {
            if (exercise.wordActive[word]) {
                const btn = document.createElement('button');
                btn.className = 'practice-word-btn';
                btn.textContent = word;
                btn.onclick = () => { if (exercise.wordActive[word]) { exercise.wordActive[word] = false; exercise.selectedWords.push(word); updateDisplay(); } };
                wordsContainer.appendChild(btn);
            }
        });
        selectedContainer.innerHTML = `<span class="practice-selected-text">${exercise.selectedWords.join(' ')}</span>`;
        if (msgContainer) { msgContainer.innerHTML = ''; msgContainer.className = 'practice-message'; }
    }
    const undoBtn = document.querySelector(`.practice-undo-btn[data-ex="${uniqueId}"]`);
    if (undoBtn) undoBtn.onclick = () => { if (exercise.selectedWords.length > 0) { const last = exercise.selectedWords.pop(); exercise.wordActive[last] = true; updateDisplay(); } };
    const resetBtn = document.querySelector(`.practice-reset-btn[data-ex="${uniqueId}"]`);
    if (resetBtn) resetBtn.onclick = () => { exercise.selectedWords.forEach(w => { exercise.wordActive[w] = true; }); exercise.selectedWords = []; updateDisplay(); if (msgContainer) { msgContainer.innerHTML = ''; } } };
    const checkBtn = document.querySelector(`.practice-check-btn[data-ex="${uniqueId}"]`);
    if (checkBtn) checkBtn.onclick = () => {
        if (exercise.selectedWords.length === 0) { msgContainer.innerHTML = '❌ Составьте предложение!'; msgContainer.className = 'practice-message error'; setTimeout(() => { if(msgContainer) msgContainer.innerHTML = ''; }, 1500); return; }
        const user = exercise.selectedWords.join(' ').toLowerCase().replace(/[.,!?]/g, '');
        if (user === exercise.answer) {
            msgContainer.innerHTML = '✅ Правильно!';
            msgContainer.className = 'practice-message success';
        } else {
            msgContainer.innerHTML = `❌ Неправильно! Правильный ответ: ${exercise.answer}`;
            msgContainer.className = 'practice-message error';
        }
    };
    updateDisplay();
}

function createLessonButtons() {
    const grid = document.getElementById('lessonsGrid');
    if (!grid) return;
    grid.innerHTML = '';
    for (let i = 1; i <= 50; i++) {
        const btn = document.createElement('button');
        btn.className = 'lesson-btn';
        btn.textContent = i;
        btn.onclick = () => {
            currentLesson = i;
            if (currentMode === 'lessons') loadLesson(i);
            else { setLessonsMode(); loadLesson(i); }
        };
        grid.appendChild(btn);
    }
}

function toggleLessons() {
    const container = document.getElementById('lessonsContainer');
    const btn = document.getElementById('lessonsToggleBtn');
    if (lessonsExpanded) {
        container.style.display = 'none';
        btn.textContent = 'КУРС ГРАММАТИКИ ▶';
        lessonsExpanded = false;
    } else {
        container.style.display = 'block';
        btn.textContent = 'КУРС ГРАММАТИКИ ▼';
        lessonsExpanded = true;
    }
}

// ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ==========
function setCardsMode() { currentMode = 'cards'; renderCardsMode(); updateModeButtons('cardsModeBtn'); updateCounter(); }
function setQuizMode() { currentMode = 'quiz'; renderQuizMode(); updateModeButtons('quizModeBtn'); updateCounter(); }
function setSentencesMode() { currentMode = 'sentences'; renderSentencesMode(); updateModeButtons('sentencesModeBtn'); updateCounter(); }
function setLessonsMode() { currentMode = 'lessons'; renderLessonsMode(); updateModeButtons('lessonsModeBtn'); updateCounter(); }

function updateModeButtons(activeId) {
    const ids = ['cardsModeBtn', 'quizModeBtn', 'sentencesModeBtn'];
    ids.forEach(id => { const btn = document.getElementById(id); if (btn) { if (id === activeId) btn.classList.add('active'); else btn.classList.remove('active'); } });
}

function updateLevelButtons() {
    document.querySelectorAll('.level-btn').forEach(btn => {
        if (btn.dataset.level === currentLevel) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function changeLevel(level) {
    if (currentMode === 'cards') savedPositions[`cards_${currentLevel}`] = cardsCurrentIndex;
    if (currentMode === 'sentences') savedPositions[`sentences_${currentLevel}`] = sentencesCurrentIndex;
    currentLevel = level;
    updateLevelButtons();
    if (currentMode === 'cards') {
        cardsCurrentWords = getCurrentWords(level);
        cardsCurrentIndex = savedPositions[`cards_${level}`] || 0;
        if (cardsCurrentIndex >= cardsCurrentWords.length && cardsCurrentWords.length) cardsCurrentIndex = 0;
        cardsFlipped = false;
        updateCardDisplay();
    } else if (currentMode === 'quiz') {
        quizCurrentIndex = 0;
        renderQuizMode();
    } else if (currentMode === 'sentences') {
        sentencesCurrentIndex = savedPositions[`sentences_${level}`] || 0;
        renderSentencesMode();
    }
    updateCounter();
}

function setupEventListeners() {
    document.getElementById('cardsModeBtn').onclick = setCardsMode;
    document.getElementById('quizModeBtn').onclick = setQuizMode;
    document.getElementById('sentencesModeBtn').onclick = setSentencesMode;
    document.getElementById('lessonsToggleBtn').onclick = toggleLessons;
    document.querySelectorAll('.level-btn').forEach(btn => btn.onclick = () => changeLevel(btn.dataset.level));
}

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', async () => {
    await loadAllData();
    setupEventListeners();
    updateLevelButtons();
    setCardsMode();
});
