// ============================================================
// НЕМЕЦКИЙ ТРЕНАЖЕР - 100% РАБОЧАЯ ВЕРСИЯ
// ============================================================

let currentMode = 'cards';
let currentLevel = 'A2';
let showLanguage = 'de';
let quizDirection = 'de_to_ru';
let sentenceLangFrom = 'ru';

let wordsData = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let sentencesData = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let wordsProgress = {};
let sentencesProgress = {};

let cardsList = [], cardsIndex = 0, cardsFlipped = false;
let quizList = [], quizIndex = 0, quizCurrentWord = null, quizOptionsList = [], quizCorrectAnswer = '';
let sentencesList = [], sentencesIndex = 0, sentencesCurrent = null, sentencesSelected = [], sentencesAvailable = [], sentencesActive = {};

let lessonsExpanded = false, currentLesson = 1, lessonMode = 'theory', lessonsCache = {}, practiceCache = {};

// ----- ЗАГРУЗКА -----
async function loadData() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    const base = '/Deutsch-Meister/docs/';
    for (const lvl of levels) {
        try { const r = await fetch(`${base}words/${lvl}.json`); wordsData[lvl] = r.ok ? await r.json() : []; } catch(e) { wordsData[lvl] = []; }
        try { const r = await fetch(`${base}sentences/${lvl}.json`); sentencesData[lvl] = r.ok ? await r.json() : []; } catch(e) { sentencesData[lvl] = []; }
    }
    for (let i = 1; i <= 50; i++) {
        try { const r = await fetch(`${base}lessons/lesson_${i}.txt`); lessonsCache[i] = r.ok ? await r.text() : `=== Урок ${i} ===\n\nСодержание урока пока не добавлено.`; } catch(e) { lessonsCache[i] = `=== Урок ${i} ===\n\nОшибка загрузки.`; }
        try { const r = await fetch(`${base}practice/lesson_${i}.txt`); practiceCache[i] = r.ok ? await r.text() : ''; } catch(e) { practiceCache[i] = ''; }
    }
    loadProgress();
    buildLessonsList();
    updateCounter();
}
function loadProgress() {
    const p = localStorage.getItem('dm_words'); if (p) try { wordsProgress = JSON.parse(p); } catch(e) {}
    const s = localStorage.getItem('dm_sentences'); if (s) try { sentencesProgress = JSON.parse(s); } catch(e) {}
}
function saveProgress() {
    localStorage.setItem('dm_words', JSON.stringify(wordsProgress));
    localStorage.setItem('dm_sentences', JSON.stringify(sentencesProgress));
}
function getUnstudiedWords(lvl) {
    const words = wordsData[lvl] || [], res = [];
    for (let i = 0; i < words.length; i++) if (!wordsProgress[lvl]?.[i]?.studied) res.push(words[i]);
    return res;
}
function getStudiedWordsList(lvl) {
    const words = wordsData[lvl] || [], res = [];
    for (let i = 0; i < words.length; i++) if (wordsProgress[lvl]?.[i]?.studied) res.push(words[i]);
    return res;
}
function getUnstudiedSentences(lvl) {
    const sents = sentencesData[lvl] || [], res = [];
    for (let i = 0; i < sents.length; i++) if (!sentencesProgress[lvl]?.[i]?.studied) res.push(sents[i]);
    return res;
}
function findWordIndex(lvl, word) {
    const words = wordsData[lvl];
    for (let i = 0; i < words.length; i++) if (words[i].de === word.de && words[i].ru === word.ru) return i;
    return -1;
}
function findSentenceIndex(lvl, sent) {
    const sents = sentencesData[lvl];
    for (let i = 0; i < sents.length; i++) if (sents[i].de === sent.de && sents[i].ru === sent.ru) return i;
    return -1;
}
function updateCounter() {
    const el = document.getElementById('counter');
    if (!el) return;
    if (currentMode === 'cards' || currentMode === 'quiz') {
        const total = wordsData[currentLevel]?.length || 0;
        const unstudied = getUnstudiedWords(currentLevel).length;
        el.textContent = `Всего: ${total} | Учим: ${unstudied} | Выучено: ${total - unstudied}`;
    } else if (currentMode === 'sentences') {
        const total = sentencesData[currentLevel]?.length || 0;
        let completed = 0;
        if (sentencesProgress[currentLevel]) completed = Object.values(sentencesProgress[currentLevel]).filter(v => v?.studied).length;
        el.textContent = `Всего фраз: ${total} | Выучено: ${completed}`;
    } else {
        el.textContent = `КУРС ГРАММАТИКИ`;
    }
}
function speak(text) {
    if (!text || !window.speechSynthesis) return;
    const clean = text.replace(/[^\w\s\-äöüßÄÖÜ]/g, '');
    if (!clean.trim()) return;
    const u = new SpeechSynthesisUtterance(clean);
    u.lang = 'de-DE'; u.rate = 0.9;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
}

// ----- КАРТОЧКИ -----
function renderCards() {
    cardsList = getUnstudiedWords(currentLevel);
    cardsIndex = 0; cardsFlipped = false;
    document.getElementById('content').innerHTML = `
        <div><button class="dir-btn" id="dirBtn">${showLanguage === 'de' ? 'De → Ru' : 'Ru → De'}</button>
        <div class="card" id="card"><div class="card-word" id="cardWord"></div></div>
        <div class="btns">
            <button class="ctrl-btn" id="studyBtn">В ИЗУЧЕНО</button><button class="ctrl-btn" id="unstudyBtn">ВЕРНУТЬ</button>
            <button class="ctrl-btn" id="resetBtn">ВЕРНУТЬ ВСЕ</button><button class="ctrl-btn" id="speakBtn">🔊</button>
            <button class="ctrl-btn" id="prevBtn">◀ НАЗАД</button><button class="ctrl-btn" id="nextBtn">ВПЕРЕД ▶</button>
        </div><div class="hint">Нажмите на карточку для перевода</div></div>
    `;
    updateCard();
    document.getElementById('dirBtn').onclick = () => { showLanguage = showLanguage === 'de' ? 'ru' : 'de'; cardsFlipped = false; updateCard(); document.getElementById('dirBtn').textContent = showLanguage === 'de' ? 'De → Ru' : 'Ru → De'; };
    document.getElementById('card').onclick = () => { if(cardsList.length) { cardsFlipped = !cardsFlipped; updateCard(); } };
    document.getElementById('studyBtn').onclick = () => markWordStudied();
    document.getElementById('unstudyBtn').onclick = () => showUnstudyDialog();
    document.getElementById('resetBtn').onclick = () => resetAllWords();
    document.getElementById('speakBtn').onclick = () => { if(cardsList[cardsIndex]) speak(cardsList[cardsIndex].de); };
    document.getElementById('prevBtn').onclick = () => { if(cardsIndex > 0) { cardsIndex--; cardsFlipped = false; updateCard(); } };
    document.getElementById('nextBtn').onclick = () => { if(cardsList.length) { cardsIndex = (cardsIndex + 1) % cardsList.length; cardsFlipped = false; updateCard(); } };
    updateCounter();
}
function updateCard() {
    const el = document.getElementById('cardWord');
    if (!el) return;
    if (!cardsList.length) { el.textContent = "🎉 Все слова изучены!"; return; }
    if (cardsIndex >= cardsList.length) cardsIndex = 0;
    const w = cardsList[cardsIndex];
    if (!cardsFlipped) el.textContent = showLanguage === 'de' ? w.de : w.ru;
    else el.textContent = showLanguage === 'de' ? `${w.de}\n\n➡️\n\n${w.ru}` : `${w.ru}\n\n➡️\n\n${w.de}`;
}
function markWordStudied() {
    if (!cardsList.length) return;
    const w = cardsList[cardsIndex], idx = findWordIndex(currentLevel, w);
    if (idx !== -1) {
        if (!wordsProgress[currentLevel]) wordsProgress[currentLevel] = [];
        wordsProgress[currentLevel][idx] = { studied: true };
        saveProgress();
        cardsList = getUnstudiedWords(currentLevel);
        if (cardsIndex >= cardsList.length && cardsList.length) cardsIndex = 0;
        cardsFlipped = false; updateCard(); updateCounter();
    }
}
function showUnstudyDialog() {
    const studied = getStudiedWordsList(currentLevel);
    if (!studied.length) { alert("Нет изученных слов"); return; }
    let msg = "Выберите слово для возврата:\n";
    studied.forEach((w, i) => msg += `${i+1}. ${w.de} - ${w.ru}\n`);
    const n = prompt(msg);
    if (n) {
        const idx = parseInt(n)-1;
        if (idx >=0 && idx < studied.length) {
            const w = studied[idx], widx = findWordIndex(currentLevel, w);
            if (widx !== -1) {
                if (!wordsProgress[currentLevel]) wordsProgress[currentLevel] = [];
                wordsProgress[currentLevel][widx] = { studied: false };
                saveProgress();
                cardsList = getUnstudiedWords(currentLevel);
                updateCard(); updateCounter();
            }
        }
    }
}
function resetAllWords() {
    if (!wordsProgress[currentLevel]) wordsProgress[currentLevel] = [];
    for (let i = 0; i < wordsData[currentLevel].length; i++) wordsProgress[currentLevel][i] = { studied: false };
    saveProgress();
    cardsList = getUnstudiedWords(currentLevel);
    cardsIndex = 0; cardsFlipped = false;
    updateCard(); updateCounter();
}

// ----- ТЕСТ -----
function renderQuiz() {
    quizList = getUnstudiedWords(currentLevel);
    quizIndex = 0;
    document.getElementById('content').innerHTML = `
        <div><button class="dir-btn" id="quizDirBtn">${quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
        <div class="quiz-question" id="quizQuestion"></div><div class="quiz-grid" id="quizGrid"></div>
        <div class="btns">
            <button class="ctrl-btn" id="quizStudyBtn">В ИЗУЧЕНО</button><button class="ctrl-btn" id="quizUnstudyBtn">ВЕРНУТЬ</button>
            <button class="ctrl-btn" id="quizResetBtn">ВЕРНУТЬ ВСЕ</button>
            <button class="ctrl-btn" id="quizPrevBtn">◀ НАЗАД</button><button class="ctrl-btn" id="quizNextBtn">ВПЕРЕД ▶</button>
        </div><div class="hint" id="quizProgress"></div></div>
    `;
    document.getElementById('quizDirBtn').onclick = () => { quizDirection = quizDirection === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru'; showQuiz(); document.getElementById('quizDirBtn').textContent = quizDirection === 'de_to_ru' ? 'De → Ru' : 'Ru → De'; };
    document.getElementById('quizStudyBtn').onclick = () => markQuizStudied();
    document.getElementById('quizUnstudyBtn').onclick = () => showUnstudyDialog();
    document.getElementById('quizResetBtn').onclick = () => resetAllWords();
    document.getElementById('quizPrevBtn').onclick = () => { if(quizIndex > 0) { quizIndex--; showQuiz(); } };
    document.getElementById('quizNextBtn').onclick = () => { if(quizList.length) { quizIndex = (quizIndex + 1) % quizList.length; showQuiz(); } };
    showQuiz();
}
function showQuiz() {
    if (!quizList.length) { document.getElementById('quizQuestion').textContent = "🎉 Все слова изучены!"; return; }
    if (quizIndex >= quizList.length) quizIndex = 0;
    quizCurrentWord = quizList[quizIndex];
    const all = wordsData[currentLevel];
    const others = all.filter(w => w.de !== quizCurrentWord.de);
    const shuffled = [...others];
    for (let i = shuffled.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    quizOptionsList = [quizCurrentWord, ...shuffled.slice(0,5)];
    for (let i = quizOptionsList.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [quizOptionsList[i], quizOptionsList[j]] = [quizOptionsList[j], quizOptionsList[i]]; }
    if (quizDirection === 'de_to_ru') { document.getElementById('quizQuestion').textContent = quizCurrentWord.de; quizCorrectAnswer = quizCurrentWord.ru; }
    else { document.getElementById('quizQuestion').textContent = quizCurrentWord.ru; quizCorrectAnswer = quizCurrentWord.de; }
    const grid = document.getElementById('quizGrid'); grid.innerHTML = '';
    quizOptionsList.forEach((opt, i) => {
        const btn = document.createElement('button'); btn.className = 'quiz-opt';
        btn.textContent = quizDirection === 'de_to_ru' ? opt.ru : opt.de;
        btn.onclick = () => {
            const isCorrect = quizDirection === 'de_to_ru' ? (opt.ru === quizCorrectAnswer) : (opt.de === quizCorrectAnswer);
            if (isCorrect) { btn.classList.add('correct'); setTimeout(() => { quizIndex = (quizIndex + 1) % quizList.length; showQuiz(); }, 400); }
            else { btn.classList.add('wrong'); setTimeout(() => btn.classList.remove('wrong'), 500); }
        };
        grid.appendChild(btn);
    });
    document.getElementById('quizProgress').textContent = `Текущее слово: ${quizIndex + 1} из ${quizList.length}`;
}
function markQuizStudied() {
    if (!quizCurrentWord) return;
    const idx = findWordIndex(currentLevel, quizCurrentWord);
    if (idx !== -1) {
        if (!wordsProgress[currentLevel]) wordsProgress[currentLevel] = [];
        wordsProgress[currentLevel][idx] = { studied: true };
        saveProgress();
        quizList = getUnstudiedWords(currentLevel);
        quizIndex = 0;
        showQuiz(); updateCounter();
    }
}

// ----- ФРАЗЫ -----
function renderSentences() {
    sentencesList = getUnstudiedSentences(currentLevel);
    sentencesIndex = 0;
    document.getElementById('content').innerHTML = `
        <div><button class="dir-btn" id="sentDirBtn">${sentenceLangFrom === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
        <div class="sent-question" id="sentQuestion"></div><div class="sent-result" id="sentResult"></div>
        <div class="words" id="sentWords"></div>
        <div class="btns">
            <button class="ctrl-btn" id="sentUndoBtn">ВЕРНУТЬ СЛОВО</button><button class="ctrl-btn" id="sentResetBtn">СБРОСИТЬ ВСЁ</button>
            <button class="ctrl-btn" id="sentCheckBtn">ПРОВЕРИТЬ</button><button class="ctrl-btn" id="sentSpeakBtn">🔊</button>
            <button class="ctrl-btn" id="sentStudyBtn">В ИЗУЧЕНО</button><button class="ctrl-btn" id="sentUnstudyBtn">ВЕРНУТЬ</button>
            <button class="ctrl-btn" id="sentResetAllBtn">ВЕРНУТЬ ВСЕ</button>
            <button class="ctrl-btn" id="sentPrevBtn">◀ НАЗАД</button><button class="ctrl-btn" id="sentNextBtn">ВПЕРЕД ▶</button>
        </div></div>
    `;
    document.getElementById('sentDirBtn').onclick = () => { sentenceLangFrom = sentenceLangFrom === 'ru' ? 'de' : 'ru'; showSentence(); document.getElementById('sentDirBtn').textContent = sentenceLangFrom === 'ru' ? 'Ru → De' : 'De → Ru'; };
    document.getElementById('sentUndoBtn').onclick = sentenceUndo;
    document.getElementById('sentResetBtn').onclick = sentenceReset;
    document.getElementById('sentCheckBtn').onclick = sentenceCheck;
    document.getElementById('sentSpeakBtn').onclick = () => { if(sentencesCurrent) speak(sentencesCurrent.de); };
    document.getElementById('sentStudyBtn').onclick = markSentenceStudied;
    document.getElementById('sentUnstudyBtn').onclick = showSentenceUnstudy;
    document.getElementById('sentResetAllBtn').onclick = resetAllSentences;
    document.getElementById('sentPrevBtn').onclick = () => { if(sentencesIndex > 0) { sentencesIndex--; showSentence(); } };
    document.getElementById('sentNextBtn').onclick = () => { if(sentencesList.length) { sentencesIndex = (sentencesIndex + 1) % sentencesList.length; showSentence(); } };
    showSentence();
}
function showSentence() {
    if (!sentencesList.length) { document.getElementById('sentQuestion').textContent = "🎉 Все фразы изучены!"; return; }
    if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
    sentencesCurrent = sentencesList[sentencesIndex];
    let q, correct;
    if (sentenceLangFrom === 'ru') { q = sentencesCurrent.ru; correct = sentencesCurrent.de.split(' '); }
    else { q = sentencesCurrent.de; correct = sentencesCurrent.ru.split(' '); }
    document.getElementById('sentQuestion').textContent = `Составьте предложение:\n\n${q}`;
    const extras = ['der','die','das','und','oder','aber','sehr','gut','nicht','auch','ich','du','er','sie','es','wir','ihr','Sie'];
    let words = [...correct];
    while (words.length < 6) { const e = extras[Math.floor(Math.random()*extras.length)]; if (!words.includes(e)) words.push(e); }
    for (let i=words.length-1; i>0; i--) { const j=Math.floor(Math.random()*(i+1)); [words[i],words[j]]=[words[j],words[i]]; }
    sentencesAvailable = words.slice(0,8);
    sentencesSelected = []; sentencesActive = {};
    sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
    updateSentenceDisplay();
}
function updateSentenceDisplay() {
    const container = document.getElementById('sentWords'), result = document.getElementById('sentResult');
    if (!container) return;
    container.innerHTML = '';
    sentencesAvailable.forEach(word => {
        if (sentencesActive[word]) {
            const btn = document.createElement('button'); btn.className = 'word-btn';
            btn.textContent = word;
            btn.onclick = () => { if(sentencesActive[word]) { sentencesActive[word] = false; sentencesSelected.push(word); updateSentenceDisplay(); } };
            container.appendChild(btn);
        }
    });
    result.textContent = sentencesSelected.join(' ');
}
function sentenceUndo() { if(sentencesSelected.length) { const last = sentencesSelected.pop(); sentencesActive[last] = true; updateSentenceDisplay(); } }
function sentenceReset() { sentencesSelected = []; sentencesAvailable.forEach(w => { sentencesActive[w] = true; }); updateSentenceDisplay(); }
function sentenceCheck() {
    if (!sentencesSelected.length) { blinkRed(); return; }
    let correct = sentenceLangFrom === 'ru' ? sentencesCurrent.de.toLowerCase().replace(/[.,!?]/g, '') : sentencesCurrent.ru.toLowerCase().replace(/[.,!?]/g, '');
    const user = sentencesSelected.join(' ').toLowerCase().replace(/[.,!?]/g, '');
    if (user === correct) blinkGreenAndNext();
    else blinkRed();
}
function blinkGreenAndNext() {
    const r = document.getElementById('sentResult');
    r.style.backgroundColor = '#C8E6C9';
    setTimeout(() => { r.style.backgroundColor = '#FFFFFF'; sentencesIndex = (sentencesIndex + 1) % sentencesList.length; showSentence(); }, 500);
}
function blinkRed() {
    const r = document.getElementById('sentResult');
    r.style.backgroundColor = '#FFCDD2';
    setTimeout(() => { r.style.backgroundColor = '#FFFFFF'; sentenceReset(); }, 500);
}
function markSentenceStudied() {
    if (!sentencesCurrent) return;
    const idx = findSentenceIndex(currentLevel, sentencesCurrent);
    if (idx !== -1) {
        if (!sentencesProgress[currentLevel]) sentencesProgress[currentLevel] = [];
        sentencesProgress[currentLevel][idx] = { studied: true };
        saveProgress();
        sentencesList = getUnstudiedSentences(currentLevel);
        sentencesIndex = 0;
        showSentence(); updateCounter();
    }
}
function showSentenceUnstudy() {
    const completed = [];
    if (sentencesProgress[currentLevel]) {
        for (let i = 0; i < sentencesData[currentLevel].length; i++)
            if (sentencesProgress[currentLevel][i]?.studied) completed.push(sentencesData[currentLevel][i]);
    }
    if (!completed.length) { alert("Нет изученных фраз"); return; }
    let msg = "Выберите фразу:\n";
    completed.forEach((s,i) => msg += `${i+1}. ${s.de} -> ${s.ru}\n`);
    const n = prompt(msg);
    if (n) {
        const idx = parseInt(n)-1;
        if (idx >=0 && idx < completed.length) {
            const sidx = findSentenceIndex(currentLevel, completed[idx]);
            if (sidx !== -1) {
                if (!sentencesProgress[currentLevel]) sentencesProgress[currentLevel] = [];
                sentencesProgress[currentLevel][sidx] = { studied: false };
                saveProgress();
                sentencesList = getUnstudiedSentences(currentLevel);
                sentencesIndex = 0;
                showSentence(); updateCounter();
            }
        }
    }
}
function resetAllSentences() {
    if (!sentencesProgress[currentLevel]) sentencesProgress[currentLevel] = [];
    for (let i = 0; i < sentencesData[currentLevel].length; i++) sentencesProgress[currentLevel][i] = { studied: false };
    saveProgress();
    sentencesList = getUnstudiedSentences(currentLevel);
    sentencesIndex = 0;
    showSentence(); updateCounter();
}

// ----- УРОКИ -----
function renderLessons() {
    document.getElementById('content').innerHTML = `
        <div class="lesson-header"><div class="lesson-title">📖 УРОК ${currentLesson}</div><div>Урок ${currentLesson} из 50</div></div>
        <div class="lesson-mode"><button id="theoryBtn" class="active">ТЕОРИЯ</button><button id="practiceBtn" class="inactive">ПРАКТИКА</button></div>
        <div id="lessonContent" class="lesson-text"></div>
    `;
    document.getElementById('theoryBtn').onclick = () => { lessonMode = 'theory'; showLesson(); updateLessonBtns(); };
    document.getElementById('practiceBtn').onclick = () => { lessonMode = 'practice'; showLesson(); updateLessonBtns(); };
    showLesson();
}
function updateLessonBtns() {
    const theory = document.getElementById('theoryBtn'), practice = document.getElementById('practiceBtn');
    if (lessonMode === 'theory') { theory.classList.add('active'); theory.classList.remove('inactive'); practice.classList.add('inactive'); practice.classList.remove('active'); }
    else { practice.classList.add('active'); practice.classList.remove('inactive'); theory.classList.add('inactive'); theory.classList.remove('active'); }
}
function showLesson() {
    if (lessonMode === 'theory') {
        let content = lessonsCache[currentLesson] || `=== Урок ${currentLesson} ===\n\nСодержание урока пока не добавлено.`;
        content = content.replace(/\[озвучка:([^\]]+)\]/g, (m,w) => `<button class="speak-btn-inline" onclick="speak('${w.replace(/'/g,"\\'")}')">🔊 ${w}</button>`);
        content = content.replace(/\n/g, '<br>');
        document.getElementById('lessonContent').innerHTML = `<div>${content}</div>`;
    } else {
        const practice = practiceCache[currentLesson] || '';
        if (!practice.trim()) { document.getElementById('lessonContent').innerHTML = '<div>✨ В этом уроке нет упражнений ✨</div>'; return; }
        const lines = practice.split('\n'), exercises = [];
        for (const line of lines) if (line.includes('|')) { const parts = line.split('|'); if (parts.length >= 2) exercises.push({ q: parts[0].trim(), a: parts[1].trim() }); }
        if (!exercises.length) { document.getElementById('lessonContent').innerHTML = '<div>✨ В этом уроке нет упражнений ✨</div>'; return; }
        let html = '<div>';
        for (let i = 0; i < exercises.length; i++) {
            const ex = exercises[i];
            const answerWords = ex.a.split(' ');
            const extras = ['der','die','das','und','oder','aber','sehr','gut','nicht','auch'];
            let words = [...answerWords];
            while (words.length < 5) { const e = extras[Math.floor(Math.random()*extras.length)]; if (!words.includes(e)) words.push(e); }
            for (let k=words.length-1; k>0; k--) { const j=Math.floor(Math.random()*(k+1)); [words[k],words[j]]=[words[j],words[k]]; }
            const uid = `pract_${currentLesson}_${i}`;
            html += `<div style="background:white;border-radius:12px;padding:16px;margin-bottom:20px;">
                <div style="font-weight:bold;margin-bottom:12px;">📝 ${ex.q}</div>
                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;padding:12px;background:#F8F8F8;border-radius:8px;" id="${uid}_words"></div>
                <div style="padding:12px;background:white;border:2px dashed #3B6FE0;border-radius:8px;margin-bottom:12px;" id="${uid}_selected"></div>
                <div style="display:flex;gap:8px;">
                    <button class="ctrl-btn" data-uid="${uid}" data-action="undo">↩ ВЕРНУТЬ</button>
                    <button class="ctrl-btn" data-uid="${uid}" data-action="reset">🔄 СБРОСИТЬ</button>
                    <button class="ctrl-btn" style="background:#3B6FE0;color:white;" data-uid="${uid}" data-action="check">✅ ПРОВЕРИТЬ</button>
                </div>
                <div id="${uid}_msg" style="margin-top:12px;"></div>
            </div><hr>`;
            if (!window.practiceState) window.practiceState = {};
            window.practiceState[uid] = { words: [...words], selected: [], active: {}, answer: ex.a.toLowerCase().replace(/[.,!?]/g,'') };
            words.forEach(w => { window.practiceState[uid].active[w] = true; });
        }
        html += '</div>';
        document.getElementById('lessonContent').innerHTML = html;
        for (let i = 0; i < exercises.length; i++) initPractice(`pract_${currentLesson}_${i}`);
    }
}
function initPractice(uid) {
    const state = window.practiceState[uid];
    if (!state) return;
    const wordsDiv = document.getElementById(`${uid}_words`), selectedDiv = document.getElementById(`${uid}_selected`), msgDiv = document.getElementById(`${uid}_msg`);
    function refresh() {
        wordsDiv.innerHTML = '';
        state.words.forEach(w => {
            if (state.active[w]) {
                const btn = document.createElement('button'); btn.className = 'word-btn';
                btn.textContent = w;
                btn.onclick = () => { state.active[w] = false; state.selected.push(w); refresh(); };
                wordsDiv.appendChild(btn);
            }
        });
        selectedDiv.innerHTML = `<span style="font-weight:bold;">${state.selected.join(' ')}</span>`;
        if (msgDiv) { msgDiv.innerHTML = ''; msgDiv.className = ''; }
    }
    document.querySelectorAll(`[data-uid="${uid}"]`).forEach(btn => {
        btn.onclick = () => {
            if (btn.dataset.action === 'undo') { if (state.selected.length) { const last = state.selected.pop(); state.active[last] = true; refresh(); } }
            else if (btn.dataset.action === 'reset') { state.selected.forEach(w => { state.active[w] = true; }); state.selected = []; refresh(); }
            else if (btn.dataset.action === 'check') {
                if (!state.selected.length) { msgDiv.innerHTML = '❌ Составьте предложение!'; msgDiv.style.color = '#B71C1C'; return; }
                const user = state.selected.join(' ').toLowerCase().replace(/[.,!?]/g,'');
                if (user === state.answer) { msgDiv.innerHTML = '✅ Правильно!'; msgDiv.style.color = '#1B5E20'; }
                else { msgDiv.innerHTML = `❌ Неправильно! Правильный ответ: ${state.answer}`; msgDiv.style.color = '#B71C1C'; }
            }
        };
    });
    refresh();
}
function buildLessonsList() {
    const container = document.getElementById('lessonsList');
    if (!container) return;
    let html = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:5px;">';
    for (let i = 1; i <= 50; i++) html += `<button class="lesson-btn" data-lesson="${i}">${i}</button>`;
    html += '</div>';
    container.innerHTML = html;
    document.querySelectorAll('.lesson-btn').forEach(btn => {
        btn.onclick = () => { currentLesson = parseInt(btn.dataset.lesson); if (currentMode === 'lessons') renderLessons(); else { setMode('lessons'); renderLessons(); } };
    });
}
function toggleLessons() {
    const container = document.getElementById('lessonsList'), btn = document.getElementById('toggleLessonsBtn');
    if (lessonsExpanded) { container.style.display = 'none'; btn.textContent = 'КУРС ГРАММАТИКИ ▶'; lessonsExpanded = false; }
    else { container.style.display = 'block'; btn.textContent = 'КУРС ГРАММАТИКИ ▼'; lessonsExpanded = true; }
}

// ----- ПЕРЕКЛЮЧЕНИЕ -----
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
    updateCounter();
}
function setLevel(level) {
    currentLevel = level;
    document.querySelectorAll('.level-btn').forEach(btn => {
        if (btn.dataset.level === level) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    if (currentMode === 'cards') renderCards();
    else if (currentMode === 'quiz') renderQuiz();
    else if (currentMode === 'sentences') renderSentences();
    updateCounter();
}

// ----- ЗАПУСК -----
async function init() {
    await loadData();
    document.querySelectorAll('.mode-btn').forEach(btn => btn.onclick = () => setMode(btn.dataset.mode));
    document.querySelectorAll('.level-btn').forEach(btn => btn.onclick = () => setLevel(btn.dataset.level));
    document.getElementById('toggleLessonsBtn').onclick = toggleLessons;
    setMode('cards');
}
init();
