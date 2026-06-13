let sentencesList = [];
let sentencesIndex = 0;
let sentencesCurrent = null;
let sentencesSelected = [];
let sentencesAvailable = [];
let sentencesActive = {};
let sentencesHintIndex = 0;
let sentencesHintWords = [];

function isMobileDevice() {
    return window.innerWidth <= 768;
}

function renderSentences() {
    sentencesList = getUnstudiedSentences();
    sentencesIndex = 0;
    
    if (isMobileDevice()) {
        renderSentencesMobile();
    } else {
        renderSentencesDesktop();
    }
}

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
    
    function showCurrentSentence() {
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
    
    function goToStart() {
        if (sentencesList.length) {
            sentencesIndex = 0;
            showCurrentSentence();
            updateCounter();
        }
    }
    
    function getStudiedSentencesCount() {
        const progress = sentencesProgress[AppConfig.currentLevel] || [];
        return progress.filter(p => p?.studied === true).length;
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
    
    document.getElementById('sentHintBtn').onclick = showHint;
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
    
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) { 
            alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь."); 
            return; 
        }
        showStudiedSentencesModal(completed);
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
    
    document.getElementById('sentResetStartBtn').onclick = goToStart;
    
    showCurrentSentence();
    updateCounter();
}

function renderSentencesMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="sentDirBtn">${AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; transition: transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
                    ${generateSentencesCards()}
                </div>
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
    
    let touchStartX = 0;
    let isDragging = false;
    let containerWidth = 0;
    let currentTranslate = 0;
    const minSwipeDistance = 50;
    
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
            const answerHint = AppConfig.sentence_lang_from === 'ru' ? sentence.de : sentence.ru;
            html += `
                <div class="sent-carousel-card" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    <div style="background: #E8F0FE; border-radius: 20px; padding: 25px; min-height: 250px;">
                        <div style="font-size: 18px; margin-bottom: 15px; color: #666;">Составьте предложение:</div>
                        <div style="font-size: 20px; font-weight: bold; margin-bottom: 20px;">${question}</div>
                        <div style="font-size: 14px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; margin-top: 15px;">
                            💡 Подсказка: ${answerHint.substring(0, 50)}...
                        </div>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    function refreshCarousel() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        track.innerHTML = generateSentencesCards();
        updateCarouselPosition(false);
        document.getElementById('sentProgress').textContent = `Фраза: ${sentencesIndex+1} из ${sentencesList.length}`;
    }
    
    function updateCarouselPosition(animate = true) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        if (!animate) track.style.transition = 'none';
        else track.style.transition = `transform 0.25s cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        
        const offset = -2 * containerWidth;
        track.style.transform = `translateX(${offset}px)`;
        currentTranslate = offset;
        
        if (!animate) setTimeout(() => { if (track) track.style.transition = ''; }, 50);
    }
    
    const wrapper = document.getElementById('carouselWrapper');
    const track = document.getElementById('carouselTrack');
    
    if (track && wrapper) {
        containerWidth = wrapper.offsetWidth;
        refreshCarousel();
        
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
                refreshCarousel();
                updateCounter();
            } else {
                updateCarouselPosition(true);
            }
        });
    }
    
    document.getElementById('sentDirBtn').onclick = () => {
        AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
        refreshCarousel();
        document.getElementById('sentDirBtn').textContent = AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru';
        saveProgress();
    };
    
    document.getElementById('sentStudyBtn').onclick = () => {
        if (sentencesList.length && sentencesList[sentencesIndex]) {
            markSentenceAsStudied(sentencesList[sentencesIndex]);
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('sentResetStartBtn').onclick = () => {
        if (sentencesList.length) {
            sentencesIndex = 0;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('sentContainerBtn').onclick = () => {
        const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied);
        if (!completed.length) { 
            alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь."); 
            return; 
        }
        showStudiedSentencesModal(completed);
    };
    
    window.addEventListener('resize', () => {
        containerWidth = wrapper?.offsetWidth || 0;
        updateCarouselPosition(false);
    });
}

function getStudiedSentencesCount() {
    const progress = sentencesProgress[AppConfig.currentLevel] || [];
    return progress.filter(p => p?.studied === true).length;
}

// Модальное окно контейнера для Sentences (без крестика)
function showStudiedSentencesModal(studiedSentences) {
    const oldModal = document.getElementById('studiedSentencesModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'studiedSentencesModal';
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;`;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background:white; border-radius:20px; max-width:500px; width:90%; max-height:80vh; display:flex; flex-direction:column; margin:20px;`;
    
    let itemsHtml = '';
    studiedSentences.forEach((sentence, idx) => {
        const safeDe = sentence.de.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRu = sentence.ru.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        itemsHtml += `<button class="studied-sentence-item" data-index="${idx}" style="width:100%; text-align:left; padding:12px 15px; background:#E8F0FE; border:none; border-bottom:1px solid #ddd; cursor:pointer; font-size:14px;"><strong>${safeDe}</strong> → ${safeRu}</button>`;
    });
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">
            <h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studiedSentences.length} фраз)</h3>
        </div>
        <div style="overflow-y: auto; flex: 1; padding: 10px 0;">
            ${itemsHtml}
        </div>
        <div style="padding: 15px; border-top: 1px solid #ddd; display: flex; gap: 10px;">
            <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 ВЕРНУТЬ ВСЁ</button>
            <button id="cancelModalBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    document.getElementById('cancelModalBtn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm("Вы уверены? Все фразы из контейнера будут возвращены в изучение.")) {
            resetAllSentences();
            sentencesList = getUnstudiedSentences();
            sentencesIndex = 0;
            if (isMobileDevice()) {
                refreshCarousel();
            } else {
                showCurrentSentence();
            }
            updateCounter();
            closeModal();
        }
    };
    
    document.querySelectorAll('.studied-sentence-item').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const sentence = studiedSentences[idx];
            const sIdx = sentencesDB[AppConfig.currentLevel].findIndex(s => s.de === sentence.de && s.ru === sentence.ru);
            if (sIdx !== -1) {
                if (!sentencesProgress[AppConfig.currentLevel]) sentencesProgress[AppConfig.currentLevel] = [];
                sentencesProgress[AppConfig.currentLevel][sIdx] = { studied: false };
                saveProgress();
                sentencesList = getUnstudiedSentences();
                if (isMobileDevice()) {
                    refreshCarousel();
                } else {
                    showCurrentSentence();
                }
                updateCounter();
                btn.remove();
                const header = modalContent.querySelector('h3');
                const remaining = sentencesDB[AppConfig.currentLevel].filter((_, i) => sentencesProgress[AppConfig.currentLevel]?.[i]?.studied);
                if (header) header.textContent = `📦 КОНТЕЙНЕР (${remaining.length} фраз)`;
                if (remaining.length === 0) closeModal();
            }
        };
    });
}
