// sentencesMode.js — упрощённая версия с использованием containerManager и carousel

let sentencesList = [];
let sentencesIndex = 0;
let sentencesCurrent = null;
let sentencesSelected = [];
let sentencesAvailable = [];
let sentencesActive = {};
let sentencesHintIndex = 0;
let sentencesHintWords = [];
let sentencesCarousel = null;

function renderSentences() {
    sentencesList = getUnstudiedSentences();
    sentencesIndex = 0;
    
    if (window.utils.isMobileDevice()) {
        renderSentencesMobile();
    } else {
        renderSentencesDesktop();
    }
}

// ========== ДЕСКТОПНАЯ ВЕРСИЯ ==========
function renderSentencesDesktop() {
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
                <button class="ctrl-btn" id="sentStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="sentContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="sentPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="sentNextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="sentResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
        </div>
    `;
    
    window.showCurrentSentenceDesktop = showCurrentSentenceDesktop;
    showCurrentSentenceDesktop();
    attachSentencesDesktopEvents();
}

function showCurrentSentenceDesktop() {
    resetHintDesktop();
    
    if (!sentencesList.length) {
        const studiedCount = getStudiedSentencesCount();
        document.getElementById('sentQuestion').innerHTML = studiedCount > 0
            ? "🎉 Все фразы в контейнере!<br><br>Нажмите 'В КОНТЕЙНЕР' чтобы просмотреть<br>или вернуть фразы"
            : "🎉 Все фразы изучены!<br><br>Выберите другой уровень";
        document.getElementById('sentWordsContainer').innerHTML = '';
        document.getElementById('sentResult').textContent = '';
        return;
    }
    
    if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
    sentencesCurrent = sentencesList[sentencesIndex];
    
    const isRuToDe = AppConfig.sentence_lang_from === 'ru';
    const question = isRuToDe ? sentencesCurrent.ru : sentencesCurrent.de;
    const correctTokens = isRuToDe ? sentencesCurrent.de.split(/\s+/) : sentencesCurrent.ru.split(/\s+/);
    sentencesHintWords = correctTokens.map(w => w.replace(/[.,!?;:]/g, ''));
    
    document.getElementById('sentQuestion').innerHTML = `Составьте предложение:<br><br><strong>${question}</strong>`;
    
    let available = correctTokens.map(t => t.replace(/[.,!?;:]/g, ''));
    const needed = 12 - available.length;
    if (needed > 0) {
        const distractors = getDistractorsForSentences(needed, available, isRuToDe ? 'de' : 'ru');
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
    updateSentenceDisplayDesktop();
}

function updateSentenceDisplayDesktop() {
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
                    updateSentenceDisplayDesktop();
                }
            };
            container.appendChild(btn);
        }
    });
    resultEl.textContent = sentencesSelected.join(' ');
}

function resetHintDesktop() {
    sentencesHintIndex = 0;
    const hintLabel = document.getElementById('sentHintLabel');
    if (hintLabel) hintLabel.textContent = '';
}

function showHintDesktop() {
    if (!sentencesHintWords.length || sentencesHintIndex >= sentencesHintWords.length) return;
    const currentHint = sentencesHintWords.slice(0, sentencesHintIndex + 1).join(' ');
    const hintLabel = document.getElementById('sentHintLabel');
    if (hintLabel) hintLabel.textContent = '💡 ' + currentHint;
    sentencesHintIndex++;
}

function attachSentencesDesktopEvents() {
    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        showCurrentSentenceDesktop();
        document.getElementById('sentDirBtn').textContent = AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru';
        saveProgress();
    };
    
    document.getElementById('sentUndoBtn').onclick = () => {
        if (sentencesSelected.length) {
            const last = sentencesSelected.pop();
            sentencesActive[last] = true;
            updateSentenceDisplayDesktop();
        }
    };
    
    document.getElementById('sentResetBtn').onclick = () => {
        sentencesSelected = [];
        sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
        updateSentenceDisplayDesktop();
        resetHintDesktop();
    };
    
    document.getElementById('sentCheckBtn').onclick = () => {
        if (!sentencesSelected.length) {
            const result = document.getElementById('sentResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }
        
        const isRuToDe = AppConfig.sentence_lang_from === 'ru';
        const correctAnswer = (isRuToDe ? sentencesCurrent.de : sentencesCurrent.ru).toLowerCase().replace(/[.,!?;:]/g, '');
        const userAnswer = sentencesSelected.join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
        const result = document.getElementById('sentResult');
        
        if (userAnswer === correctAnswer) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
                showCurrentSentenceDesktop();
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesSelected = [];
                sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
                updateSentenceDisplayDesktop();
                resetHintDesktop();
            }, 500);
        }
    };
    
    document.getElementById('sentHintBtn').onclick = showHintDesktop;
    document.getElementById('sentSpeakBtn').onclick = () => { if (sentencesCurrent) speak(sentencesCurrent.de); };
    
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesCurrent) {
            markSentenceAsStudied(sentencesCurrent);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            showCurrentSentenceDesktop();
            updateCounter();
        }
    };
    
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) {
            alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.");
            return;
        }
        showSentencesContainer(completed);
    };
    
    document.getElementById('sentPrevBtn').onclick = () => {
        if (sentencesList.length && sentencesIndex > 0) {
            sentencesIndex--;
            showCurrentSentenceDesktop();
        }
    };
    
    document.getElementById('sentNextBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
            showCurrentSentenceDesktop();
        }
    };
    
    document.getElementById('sentResetStartBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = 0;
            showCurrentSentenceDesktop();
            updateCounter();
        }
    };
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (с использованием Carousel) ==========
function renderSentencesMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="sentDirBtn">${AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; will-change: transform;"></div>
            </div>
            <div class="sent-result" id="sentResult"></div>
            <div class="words-container-mobile" id="sentWordsContainer" style="display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 10px 0;"></div>
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
                <button class="ctrl-btn" id="sentStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="sentContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="sentResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div class="hint" id="sentProgress"></div>
            <div class="hint">👆 Свайп влево/вправо для листания фраз</div>
        </div>
    `;
    
    if (sentencesCarousel) sentencesCarousel.destroy();
    
    sentencesCarousel = new window.Carousel({
        containerId: 'carouselWrapper',
        trackId: 'carouselTrack',
        initialIndex: 0,
        getItems: () => sentencesList,
        emptyMessage: '🎉 Все фразы изучены!',
        renderItem: (sentence, idx) => {
            const question = AppConfig.sentence_lang_from === 'ru' ? sentence.ru : sentence.de;
            return `
                <div style="background: #E8F0FE; border-radius: 20px; padding: 25px; text-align: center;">
                    <div style="font-size: 16px; margin-bottom: 10px; color: #666;">Составьте предложение:</div>
                    <div style="font-size: 20px; font-weight: bold;">${question}</div>
                </div>
            `;
        },
        onSlideChange: (sentence, idx) => {
            sentencesIndex = idx;
            sentencesCurrent = sentence;
            updateSentenceDisplayMobile();
            document.getElementById('sentProgress').textContent = `Фраза: ${idx+1} из ${sentencesList.length}`;
        }
    });
    
    // Инициализируем первое предложение
    if (sentencesList.length > 0) {
        sentencesCurrent = sentencesList[0];
        setTimeout(() => {
            updateSentenceDisplayMobile();
        }, 100);
    }
    
    attachSentencesMobileEvents();
}

function updateSentenceDisplayMobile() {
    if (!sentencesCurrent) {
        document.getElementById('sentWordsContainer').innerHTML = '';
        document.getElementById('sentResult').textContent = '';
        return;
    }
    
    const isRuToDe = AppConfig.sentence_lang_from === 'ru';
    const correctTokens = isRuToDe ? sentencesCurrent.de.split(/\s+/) : sentencesCurrent.ru.split(/\s+/);
    sentencesHintWords = correctTokens.map(w => w.replace(/[.,!?;:]/g, ''));
    
    let available = correctTokens.map(t => t.replace(/[.,!?;:]/g, ''));
    const needed = 12 - available.length;
    if (needed > 0) {
        const distractors = getDistractorsForSentences(needed, available, isRuToDe ? 'de' : 'ru');
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
                    updateSentenceDisplayMobile();
                }
            };
            container.appendChild(btn);
        }
    });
    resultEl.textContent = sentencesSelected.join(' ');
    resetHintMobile();
}

function resetHintMobile() {
    sentencesHintIndex = 0;
    const hintLabel = document.getElementById('sentHintLabel');
    if (hintLabel) hintLabel.textContent = '';
}

function showHintMobile() {
    if (!sentencesHintWords.length || sentencesHintIndex >= sentencesHintWords.length) return;
    const currentHint = sentencesHintWords.slice(0, sentencesHintIndex + 1).join(' ');
    const hintLabel = document.getElementById('sentHintLabel');
    if (hintLabel) hintLabel.textContent = '💡 ' + currentHint;
    sentencesHintIndex++;
}

function attachSentencesMobileEvents() {
    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        if (sentencesCarousel) sentencesCarousel.refresh();
        document.getElementById('sentDirBtn').textContent = AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru';
        saveProgress();
    };
    
    document.getElementById('sentUndoBtn').onclick = () => {
        if (sentencesSelected.length) {
            const last = sentencesSelected.pop();
            sentencesActive[last] = true;
            updateSentenceDisplayMobile();
        }
    };
    
    document.getElementById('sentResetBtn').onclick = () => {
        sentencesSelected = [];
        sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
        updateSentenceDisplayMobile();
        resetHintMobile();
    };
    
    document.getElementById('sentCheckBtn').onclick = () => {
        if (!sentencesSelected.length || !sentencesCurrent) {
            const result = document.getElementById('sentResult');
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => result.style.backgroundColor = '#FFFFFF', 500);
            return;
        }
        
        const isRuToDe = AppConfig.sentence_lang_from === 'ru';
        const correctAnswer = (isRuToDe ? sentencesCurrent.de : sentencesCurrent.ru).toLowerCase().replace(/[.,!?;:]/g, '');
        const userAnswer = sentencesSelected.join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
        const result = document.getElementById('sentResult');
        
        if (userAnswer === correctAnswer) {
            result.style.backgroundColor = '#C8E6C9';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
                if (sentencesCarousel) sentencesCarousel.goTo(sentencesIndex);
                updateSentenceDisplayMobile();
            }, 500);
        } else {
            result.style.backgroundColor = '#FFCDD2';
            setTimeout(() => {
                result.style.backgroundColor = '#FFFFFF';
                sentencesSelected = [];
                sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
                updateSentenceDisplayMobile();
                resetHintMobile();
            }, 500);
        }
    };
    
    document.getElementById('sentHintBtn').onclick = showHintMobile;
    document.getElementById('sentSpeakBtn').onclick = () => { if (sentencesCurrent) speak(sentencesCurrent.de); };
    
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesCurrent) {
            markSentenceAsStudied(sentencesCurrent);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            if (sentencesCarousel) sentencesCarousel.refresh();
            updateCounter();
        }
    };
    
    document.getElementById('sentResetStartBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = 0;
            if (sentencesCarousel) sentencesCarousel.goTo(0);
            updateCounter();
        }
    };
    
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) {
            alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.");
            return;
        }
        showSentencesContainer(completed);
    };
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ ПРЕДЛОЖЕНИЙ ==========
function showSentencesContainer(completedSentences) {
    window.ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${completedSentences.length} фраз)`,
        items: completedSentences,
        getItems: () => sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied),
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: (sentence) => `${sentence.de} → ${sentence.ru}`,
        onItemClick: (sentence, idx, update) => {
            const sIdx = sentencesDB[AppConfig.currentLevel].findIndex(s => s.de === sentence.de && s.ru === sentence.ru);
            if (sIdx !== -1) {
                if (!sentencesProgress[AppConfig.currentLevel]) sentencesProgress[AppConfig.currentLevel] = [];
                sentencesProgress[AppConfig.currentLevel][sIdx] = { studied: false };
                saveProgress();
                sentencesList = getUnstudiedSentences();
                sentencesIndex = 0;
                if (window.utils.isMobileDevice()) {
                    if (sentencesCarousel) sentencesCarousel.refresh();
                } else {
                    showCurrentSentenceDesktop();
                }
                updateCounter();
                update();
            }
        },
        onReturnAll: (update) => {
            resetAllSentences();
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            if (window.utils.isMobileDevice()) {
                if (sentencesCarousel) sentencesCarousel.refresh();
            } else {
                showCurrentSentenceDesktop();
            }
            updateCounter();
            update();
        }
    });
}

function getStudiedSentencesCount() {
    const progress = sentencesProgress[AppConfig.currentLevel] || [];
    return progress.filter(p => p?.studied === true).length;
}
