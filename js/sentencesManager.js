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
                <button class="ctrl-btn check-btn" id="sentCheckBtn">ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="sentSpeakBtn">🔊</button>
            </div>
            
            <div class="hint-area">
                <button class="ctrl-btn" id="sentHintBtn">ПОДСКАЗКА</button>
                <div class="hint-label" id="sentHintLabel"></div>
            </div>
            
            <div class="btn-group">
                <button class="ctrl-btn" id="sentStudyBtn">В ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="sentUnstudyBtn">ВЕРНУТЬ</button>
                <button class="ctrl-btn" id="sentResetAllBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="ctrl-btn" id="sentPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="sentNextBtn">ВПЕРЕД ▶</button>
            </div>
        </div>
    `;
    
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
    
    function showHint() {
        if (!sentencesHintWords.length) return;
        if (sentencesHintIndex >= sentencesHintWords.length) return;
        const currentHint = sentencesHintWords.slice(0, sentencesHintIndex + 1).join(' ');
        const hintLabel = document.getElementById('sentHintLabel');
        if (hintLabel) hintLabel.textContent = '💡 ' + currentHint;
        sentencesHintIndex++;
    }
    
    function resetHint() {
        sentencesHintIndex = 0;
        const hintLabel = document.getElementById('sentHintLabel');
        if (hintLabel) hintLabel.textContent = '';
    }
    
    function showCurrentSentence() {
        resetHint();
        
        if (!sentencesList.length) {
            document.getElementById('sentQuestion').innerHTML = "🎉 Все фразы изучены!<br><br>Верните фразы из 'Изучено' или<br>выберите другой уровень";
            const container = document.getElementById('sentWordsContainer');
            if (container) container.innerHTML = '';
            const result = document.getElementById('sentResult');
            if (result) result.textContent = '';
            return;
        }
        if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
        sentencesCurrent = sentencesList[sentencesIndex];
        
        let question, correctTokens;
        let targetLangForDistractors;
        
        if (AppConfig.sentence_lang_from === 'ru') {
            question = sentencesCurrent.ru;
            correctTokens = sentencesCurrent.de.split(/\s+/);
            sentencesHintWords = sentencesCurrent.de.split(/\s+/);
            targetLangForDistractors = 'de';
        } else {
            question = sentencesCurrent.de;
            correctTokens = sentencesCurrent.ru.split(/\s+/);
            sentencesHintWords = sentencesCurrent.ru.split(/\s+/);
            targetLangForDistractors = 'ru';
        }
        
        sentencesHintWords = sentencesHintWords.map(w => w.replace(/[.,!?;:]/g, ''));
        
        document.getElementById('sentQuestion').innerHTML = `Составьте предложение:<br><br><strong>${question}</strong>`;
        
        correctTokens = correctTokens.map(t => t.replace(/[.,!?;:]/g, ''));
        
        let available = [...correctTokens];
        const needed = 12 - available.length;
        if (needed > 0) {
            const distractors = getDistractorsForSentences(needed, correctTokens, targetLangForDistractors);
            available.push(...distractors);
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
    
    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        showCurrentSentence();
        document.getElementById('sentDirBtn').textContent = AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru';
        saveProgress();
    };
    
    document.getElementById('sentUndoBtn').onclick = () => {
        if (sentencesSelected.length) {
            const last = sentencesSelected.pop();
            sentencesActive[last] = true;
            updateSentenceDisplay();
        }
    };
    
    document.getElementById('sentResetBtn').onclick = () => {
        sentencesSelected = [];
        sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
        updateSentenceDisplay();
        resetHint();
    };
    
    document.getElementById('sentCheckBtn').onclick = () => {
        if (!sentencesSelected.length) {
            const result = document.getElementById('sentResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }
        
        let correctAnswer;
        if (AppConfig.sentence_lang_from === 'ru') {
            correctAnswer = sentencesCurrent.de.toLowerCase().replace(/[.,!?;:]/g, '');
        } else {
            correctAnswer = sentencesCurrent.ru.toLowerCase().replace(/[.,!?;:]/g, '');
        }
        const userAnswer = sentencesSelected.join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
        const result = document.getElementById('sentResult');
        
        if (userAnswer === correctAnswer) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
                showCurrentSentence();
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesSelected = [];
                sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
                updateSentenceDisplay();
                resetHint();
            }, 500);
        }
    };
    
    document.getElementById('sentHintBtn').onclick = () => {
        showHint();
    };
    
    document.getElementById('sentSpeakBtn').onclick = () => {
        if (sentencesCurrent) speak(sentencesCurrent.de);
    };
    
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesCurrent) {
            markSentenceAsStudied(sentencesCurrent);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            showCurrentSentence();
            updateCounter();
        }
    };
    
    document.getElementById('sentUnstudyBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) { alert("Нет изученных фраз"); return; }
        let msg = "Выберите фразу для возврата:\n";
        completed.forEach((s, i) => msg += `${i+1}. ${s.de} -> ${s.ru}\n`);
        const n = prompt(msg);
        if (n) {
            const idx = parseInt(n) - 1;
            if (idx >= 0 && idx < completed.length) {
                const sIdx = sentencesDB[AppConfig.currentLevel].findIndex(s => s.de === completed[idx].de);
                if (sIdx !== -1) {
                    if (!sentencesProgress[AppConfig.currentLevel]) sentencesProgress[AppConfig.currentLevel] = [];
                    sentencesProgress[AppConfig.currentLevel][sIdx] = { studied: false };
                    saveProgress();
                    sentencesList = getUnstudiedSentences();
                    sentencesIndex = 0;
                    showCurrentSentence();
                    updateCounter();
                }
            }
        }
    };
    
    document.getElementById('sentResetAllBtn').onclick = () => {
        resetAllSentences();
        sentencesList = getUnstudiedSentences();
        sentencesIndex = 0;
        showCurrentSentence();
        updateCounter();
    };
    
    document.getElementById('sentPrevBtn').onclick = () => {
        if (sentencesList.length && sentencesIndex > 0) {
            sentencesIndex--;
            showCurrentSentence();
        }
    };
    
    document.getElementById('sentNextBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
            showCurrentSentence();
        }
    };
    
    showCurrentSentence();
    updateCounter();
}
