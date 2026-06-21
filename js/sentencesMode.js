// sentencesMode.js — ИСПРАВЛЕННАЯ ВЕРСИЯ С КАРУСЕЛЬЮ

let sentencesList = [];
let sentencesIndex = 0;
let sentencesCurrent = null;
let sentencesSelected = [];
let sentencesAvailable = [];
let sentencesActive = {};
let sentencesHintIndex = 0;
let sentencesHintWords = [];

// ========== ОПРЕДЕЛЕНИЕ МОБИЛЬНОГО УСТРОЙСТВА ==========
function isMobileDevice() {
    return window.utils ? window.utils.isMobileDevice() : window.innerWidth <= 768;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
function renderSentences() {
    sentencesList = getUnstudiedSentences();
    sentencesIndex = 0;
    
    if (isMobileDevice()) {
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
    
    window.showCurrentSentenceDesktop = function() {
        resetHint();
        if (!sentencesList.length) {
            const studiedCount = getStudiedSentencesCount();
            if (studiedCount > 0) {
                document.getElementById('sentQuestion').innerHTML = "🎉 Все фразы в контейнере!<br><br>Нажмите 'В КОНТЕЙНЕР' чтобы просмотреть<br>или вернуть фразы";
            } else {
                document.getElementById('sentQuestion').innerHTML = "🎉 Все фразы изучены!<br><br>Выберите другой уровень";
            }
            const container = document.getElementById('sentWordsContainer');
            if (container) container.innerHTML = '';
            const result = document.getElementById('sentResult');
            if (result) result.textContent = '';
            return;
        }
        if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
        sentencesCurrent = sentencesList[sentencesIndex];
        
        let question, correctTokens, targetLangForDistractors;
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
    };
    
    function goToStart() {
        if (sentencesList.length) {
            sentencesIndex = 0;
            window.showCurrentSentenceDesktop();
            updateCounter();
        }
    }
    
    function getStudiedSentencesCount() {
        const progress = sentencesProgress[AppConfig.currentLevel] || [];
        return progress.filter(p => p?.studied === true).length;
    }
    
    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        window.showCurrentSentenceDesktop();
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
                window.showCurrentSentenceDesktop();
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
    document.getElementById('sentHintBtn').onclick = showHint;
    document.getElementById('sentSpeakBtn').onclick = () => { if (sentencesCurrent) speak(sentencesCurrent.de); };
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesCurrent) {
            markSentenceAsStudied(sentencesCurrent);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            window.showCurrentSentenceDesktop();
            updateCounter();
        }
    };
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) { alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь."); return; }
        showSentencesContainer(completed);
    };
    document.getElementById('sentPrevBtn').onclick = () => {
        if (sentencesList.length && sentencesIndex > 0) {
            sentencesIndex--;
            window.showCurrentSentenceDesktop();
        }
    };
    document.getElementById('sentNextBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
            window.showCurrentSentenceDesktop();
        }
    };
    document.getElementById('sentResetStartBtn').onclick = goToStart;
    window.showCurrentSentenceDesktop();
    updateCounter();
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (КАРУСЕЛЬ) ==========
function renderSentencesMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="sentDirBtn">${AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; transition: transform 250ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
                    ${generateSentencesCards()}
                </div>
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

    // --- ВСЕ ПЕРЕМЕННЫЕ КАРУСЕЛИ — ЛОКАЛЬНЫЕ! ---
    let touchStartX = 0;
    let isDragging = false;
    let containerWidth = 0;
    let currentTranslate = 0;
    const minSwipeDistance = 50;
    const snapDuration = 250;

    function generateSentencesCards() {
        if (!sentencesList.length) {
            return `<div class="sent-carousel-card" style="flex: 0 0 100%; min-width: 100%; padding: 20px;"><div style="background: #E8F0FE; border-radius: 20px; padding: 40px; text-align: center;">🎉 Все фразы изучены!</div></div>`;
        }
        const total = sentencesList.length;
        let html = '';
        for (let i = -2; i <= 2; i++) {
            let idx = sentencesIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            const sentence = sentencesList[idx];
            const question = AppConfig.sentence_lang_from === 'ru' ? sentence.ru : sentence.de;
            html += `
                <div class="sent-carousel-card" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    <div class="sent-question" style="background: #E8F0FE; border-radius: 20px; padding: 25px;">
                        <div style="font-size: 16px; margin-bottom: 10px; color: #666;">Составьте предложение:</div>
                        <div style="font-size: 20px; font-weight: bold;">${question}</div>
                    </div>
                </div>
            `;
        }
        return html;
    }

    function updateCarouselPosition(animate = true) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        if (!animate) track.style.transition = 'none';
        else track.style.transition = `transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        const offset = -2 * containerWidth;
        track.style.transform = `translateX(${offset}px)`;
        currentTranslate = offset;
        if (!animate) setTimeout(() => { if (track) track.style.transition = ''; }, 50);
    }

    function updateSentenceDisplay() {
        const container = document.getElementById('sentWordsContainer');
        const resultEl = document.getElementById('sentResult');
        if (!container) return;
        container.innerHTML = '';
        sentencesAvailable.forEach(word => {
            if (sentencesActive[word]) {
                const btn = document.createElement('button');
                btn.className = 'word-btn-mobile';
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

    window.refreshSentencesCarousel = function() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        track.innerHTML = generateSentencesCards();
        updateCarouselPosition(false);

        resetHint();
        if (!sentencesList.length) {
            document.getElementById('sentWordsContainer').innerHTML = '';
            document.getElementById('sentResult').textContent = '';
            document.getElementById('sentProgress').textContent = 'Фраз нет';
            return;
        }
        sentencesCurrent = sentencesList[sentencesIndex];

        let question, correctTokens, targetLangForDistractors;
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
        document.getElementById('sentProgress').textContent = `Фраза: ${sentencesIndex+1} из ${sentencesList.length}`;
    };

    const wrapper = document.getElementById('carouselWrapper');
    const track = document.getElementById('carouselTrack');
    if (track && wrapper) {
        containerWidth = wrapper.offsetWidth;
        window.refreshSentencesCarousel();

        track.addEventListener('touchstart', (e) => {
            isDragging = true;
            touchStartX = e.changedTouches[0].screenX;
            track.style.transition = 'none';
        });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touchCurrentX = e.changedTouches[0].screenX;
            const delta = touchCurrentX - touchStartX;
            track.style.transform = `translateX(${currentTranslate + delta}px)`;
        });

        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.changedTouches[0].screenX;
            const delta = endX - touchStartX;
            if (Math.abs(delta) > minSwipeDistance) {
                if (delta > 0) {
                    sentencesIndex = sentencesIndex === 0 ? sentencesList.length - 1 : sentencesIndex - 1;
                } else {
                    sentencesIndex = (sentencesIndex + 1) % sentencesList.length;
                }
                window.refreshSentencesCarousel();
                updateCounter();
            } else {
                updateCarouselPosition(true);
            }
        });
    }

    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        window.refreshSentencesCarousel();
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
                window.refreshSentencesCarousel();
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
    document.getElementById('sentHintBtn').onclick = showHint;
    document.getElementById('sentSpeakBtn').onclick = () => { if (sentencesCurrent) speak(sentencesCurrent.de); };
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesCurrent) {
            markSentenceAsStudied(sentencesCurrent);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            window.refreshSentencesCarousel();
            updateCounter();
        }
    };
    document.getElementById('sentResetStartBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = 0;
            window.refreshSentencesCarousel();
            updateCounter();
        }
    };
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) { alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь."); return; }
        showSentencesContainer(completed);
    };
    window.addEventListener('resize', () => {
        containerWidth = wrapper?.offsetWidth || 0;
        updateCarouselPosition(false);
    });
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ ПРЕДЛОЖЕНИЙ ==========
function showSentencesContainer(completedSentences) {
    if (window.ContainerManager) {
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
                    if (isMobileDevice()) {
                        if (typeof window.refreshSentencesCarousel === 'function') window.refreshSentencesCarousel();
                    } else {
                        if (typeof window.showCurrentSentenceDesktop === 'function') window.showCurrentSentenceDesktop();
                    }
                    updateCounter();
                    update();
                }
            },
            onReturnAll: (update) => {
                resetAllSentences();
                sentencesList = getUnstudiedSentences();
                sentencesIndex = 0;
                if (isMobileDevice()) {
                    if (typeof window.refreshSentencesCarousel === 'function') window.refreshSentencesCarousel();
                } else {
                    if (typeof window.showCurrentSentenceDesktop === 'function') window.showCurrentSentenceDesktop();
                }
                updateCounter();
                update();
            }
        });
    } else {
        const oldModal = document.getElementById('studiedSentencesModal');
        if (oldModal) oldModal.remove();
        alert('ContainerManager не загружен, но фразы возвращены.');
    }
}

function getStudiedSentencesCount() {
    const progress = sentencesProgress[AppConfig.currentLevel] || [];
    return progress.filter(p => p?.studied === true).length;
}
