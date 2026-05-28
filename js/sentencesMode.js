let sentencesList = [];
let sentencesIndex = 0;
let sentencesCurrent = null;
let sentencesSelected = [];
let sentencesAvailable = [];
let sentencesActive = {};
let sentencesHintIndex = 0;
let sentencesHintWords = [];

function renderSentences() {
    sentencesList = getUnstudiedSentences();
    sentencesIndex = 0;
    
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="sentDirBtn">${AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
            <div class="sent-question" id="sentQuestion"></div>
            <div class="sent-result" id="sentResult"></div>
            <div class="words-container" id="sentWordsContainer"></div>
            <div class="btn-group">
                <button class="ctrl-btn" id="sentUndoBtn">ВЕРНУТЬ СЛОВО</button>
                <button class="ctrl-btn" id="sentResetBtn">СБРОСИТЬ ВСЁ</button>
                <button class="ctrl-btn" id="sentCheckBtn">ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="sentHintBtn">ПОДСКАЗКА</button>
                <button class="ctrl-btn" id="sentSpeakBtn">🔊</button>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="sentStudyBtn">В ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="sentUnstudyBtn">ВЕРНУТЬ</button>
                <button class="ctrl-btn" id="sentResetAllBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="ctrl-btn" id="sentPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="sentNextBtn">ВПЕРЕД ▶</button>
            </div>
            <div id="sentHintLabel" class="hint" style="margin-top:10px; color:#3B6FE0; font-weight:bold;"></div>
        </div>
    `;
    
    // === ФУНКЦИЯ ОБНОВЛЕНИЯ ЭКРАНА ===
    function updateSentenceDisplay() {
        const container = document.getElementById('sentWordsContainer');
        const resultEl = document.getElementById('sentResult');
        if (!container) return;
        
        container.innerHTML = '';
        sentencesAvailable.forEach(word => {
            if (sentencesActive[word]) {
                const btn = document.createElement('button');
                btn.className = 'word-btn';
                btn.textContent = word;
                btn.onclick = () => {
                    if (sentencesActive[word]) {
                        sentencesActive[word] = false;
                        sentencesSelected.push(word);
                        updateSentenceDisplay();
                    }
                };
                container.appendChild(btn);
            }
        });
        resultEl.textContent = sentencesSelected.join(' ');
    }

    // === ПОДСКАЗКА ===
    function showSentencesHint() {
        if (!sentencesHintWords.length) return;
        if (sentencesHintIndex >= sentencesHintWords.length) return;
        const currentHint = sentencesHintWords.slice(0, sentencesHintIndex + 1).join(' ');
        const hintLabel = document.getElementById('sentHintLabel');
        if (hintLabel) hintLabel.textContent = '💡 ' + currentHint;
        sentencesHintIndex++;
    }
    
    function resetSentencesHint() {
        sentencesHintIndex = 0;
        const hintLabel = document.getElementById('sentHintLabel');
        if (hintLabel) hintLabel.textContent = '';
    }
    
    // === ЗАГРУЗКА ТЕКУЩЕЙ ФРАЗЫ ===
    function showCurrentSentence() {
        resetSentencesHint(); // Сбрасываем подсказку при загрузке новой фразы
        
        if (!sentencesList.length) {
            document.getElementById('sentQuestion').innerHTML = "Все фразы изучены!<br><br>Верните фразы из 'Изучено' или<br>выберите другой уровень";
            return;
        }
        if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
        sentencesCurrent = sentencesList[sentencesIndex];
        
        let question, correctTokens;
        if (AppConfig.sentence_lang_from === 'ru') {
            question = sentencesCurrent.ru;
            correctTokens = sentencesCurrent.de.toLowerCase().split(/\s+/);
            sentencesHintWords = sentencesCurrent.de.toLowerCase().split(/\s+/);
        } else {
            question = sentencesCurrent.de;
            correctTokens = sentencesCurrent.ru.toLowerCase().split(/\s+/);
            sentencesHintWords = sentencesCurrent.ru.toLowerCase().split(/\s+/);
        }
        sentencesHintWords = sentencesHintWords.map(w => w.replace(/[.,!?;:]/g, ''));
        
        document.getElementById('sentQuestion').innerHTML = `Составьте предложение:<br><br><strong style="font-size:22px;">${question}</strong>`;
        
        // ... (логика генерации слов-дистракторов, она не менялась) ...
        const allWords = wordsDB[AppConfig.currentLevel] || [];
        let distractorPool = [];
        if (AppConfig.sentence_lang_from === 'ru') distractorPool = allWords.map(w => w.de.toLowerCase());
        else distractorPool = allWords.map(w => w.ru.toLowerCase());
        
        correctTokens = correctTokens.map(t => t.replace(/[.,!?;:]/g, ''));
        distractorPool = distractorPool.map(d => d.replace(/[.,!?;:]/g, ''));
        let available = [...correctTokens];
        const needed = 12 - available.length;
        if (needed > 0) {
            const candidates = distractorPool.filter(d => !available.includes(d) && d.length > 1);
            for (let i = 0; i < needed && i < candidates.length; i++) available.push(candidates[i]);
        }
        for (let i = available.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [available[i], available[j]] = [available[j], available[i]];
        }
        sentencesAvailable = available.slice(0, 12);
        sentencesSelected = [];
        sentencesActive = {};
        sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
        updateSentenceDisplay();
    }
    
    // === ПРИВЯЗКА КНОПОК ===
    document.getElementById('sentDirBtn').onclick = () => { /* ... */ };
    document.getElementById('sentUndoBtn').onclick = () => { /* ... */ };
    document.getElementById('sentResetBtn').onclick = () => { /* ... */ };
    document.getElementById('sentCheckBtn').onclick = () => { /* ... */ };
    
    // ГЛАВНОЕ: ПРИВЯЗКА КНОПКИ ПОДСКАЗКИ
    const hintButton = document.getElementById('sentHintBtn');
    if (hintButton) {
        hintButton.onclick = () => { showSentencesHint(); };
    } else {
        console.error("Кнопка 'sentHintBtn' не найдена в DOM!");
    }
    
    document.getElementById('sentSpeakBtn').onclick = () => { /* ... */ };
    document.getElementById('sentStudyBtn').onclick = () => { /* ... */ };
    document.getElementById('sentUnstudyBtn').onclick = () => { /* ... */ };
    document.getElementById('sentResetAllBtn').onclick = () => { /* ... */ };
    document.getElementById('sentPrevBtn').onclick = () => { /* ... */ };
    document.getElementById('sentNextBtn').onclick = () => { /* ... */ };
    
    showCurrentSentence();
    updateCounter();
}
