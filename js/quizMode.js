let quizList = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizOptionsList = [];
let quizCorrectAnswer = '';

// ========== КАРУСЕЛЬ (полная копия логики из cardsMode) ==========
let touchStartX = 0;
let isDragging = false;
let containerWidth = 0;
let currentTranslate = 0;
const minSwipeDistance = 50;
const snapDuration = 250;

function isMobileDevice() {
    return window.innerWidth <= 768;
}

function renderQuiz() {
    quizList = getUnstudiedWords();
    quizIndex = 0;
    
    if (isMobileDevice()) {
        renderQuizMobile();
    } else {
        renderQuizDesktop();
    }
}

// ========== ДЕСКТОП ==========
function renderQuizDesktop() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn">${AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            <div class="quiz-question" id="quizQuestion"></div>
            <div class="quiz-grid" id="quizGrid"></div>
            <div class="btn-group">
                <button class="ctrl-btn" id="quizStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="quizContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="quizPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="quizNextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="quizResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div class="hint" id="quizProgress"></div>
        </div>
    `;
    
    function showCurrentQuiz() {
        if (!quizList.length) {
            const studiedCount = getStudiedWordsList().length;
            if (studiedCount > 0) {
                document.getElementById('quizQuestion').textContent = "🎉 Все слова в контейнере!";
                document.getElementById('quizGrid').innerHTML = '<div style="text-align:center; padding:20px;">Нажмите "В КОНТЕЙНЕР" чтобы просмотреть или вернуть слова</div>';
            } else {
                document.getElementById('quizQuestion').textContent = "🎉 Все слова изучены!";
                document.getElementById('quizGrid').innerHTML = '';
            }
            return;
        }
        if (quizIndex >= quizList.length) quizIndex = 0;
        quizCurrentWord = quizList[quizIndex];
        
        const allWords = wordsDB[AppConfig.currentLevel] || [];
        const otherWords = allWords.filter(w => w.de !== quizCurrentWord.de);
        const shuffled = [...otherWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        quizOptionsList = [quizCurrentWord, ...shuffled.slice(0, 5)];
        for (let i = quizOptionsList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizOptionsList[i], quizOptionsList[j]] = [quizOptionsList[j], quizOptionsList[i]];
        }
        
        if (AppConfig.quiz_direction === 'de_to_ru') {
            document.getElementById('quizQuestion').textContent = quizCurrentWord.de;
            quizCorrectAnswer = quizCurrentWord.ru;
        } else {
            document.getElementById('quizQuestion').textContent = quizCurrentWord.ru;
            quizCorrectAnswer = quizCurrentWord.de;
        }
        
        const grid = document.getElementById('quizGrid');
        grid.innerHTML = '';
        quizOptionsList.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.textContent = AppConfig.quiz_direction === 'de_to_ru' ? opt.ru : opt.de;
            btn.onclick = () => {
                const isCorrect = AppConfig.quiz_direction === 'de_to_ru' 
                    ? (opt.ru === quizCorrectAnswer) 
                    : (opt.de === quizCorrectAnswer);
                if (isCorrect) {
                    btn.classList.add('correct');
                    setTimeout(() => {
                        quizIndex = (quizIndex + 1) % quizList.length;
                        showCurrentQuiz();
                    }, 400);
                } else {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 500);
                }
            };
            grid.appendChild(btn);
        });
        
        document.getElementById('quizProgress').textContent = `Текущее слово: ${quizIndex+1} из ${quizList.length}`;
    }
    
    function goToStart() {
        if (quizList.length) {
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    }
    
    document.getElementById('quizDirBtn').onclick = () => {
        AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        showCurrentQuiz();
        document.getElementById('quizDirBtn').textContent = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizCurrentWord) {
            markWordAsStudied(quizCurrentWord);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    };
    
    document.getElementById('quizContainerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showStudiedWordsModalQuiz(studied);
    };
    
    document.getElementById('quizPrevBtn').onclick = () => {
        if (quizList.length && quizIndex > 0) {
            quizIndex--;
            showCurrentQuiz();
        }
    };
    
    document.getElementById('quizNextBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = (quizIndex + 1) % quizList.length;
            showCurrentQuiz();
        }
    };
    
    document.getElementById('quizResetStartBtn').onclick = goToStart;
    
    showCurrentQuiz();
    updateCounter();
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (КАРУСЕЛЬ) ==========
function renderQuizMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn">${AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; transition: transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
                    ${generateQuizCards()}
                </div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="quizStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="quizContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="quizResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div class="hint" id="quizProgress"></div>
            <div class="hint">👆 Свайп влево/вправо для листания</div>
        </div>
    `;
    
    function generateQuizCards() {
        if (!quizList.length) {
            return `<div class="quiz-carousel-card" style="flex: 0 0 100%; min-width: 100%; padding: 20px;"><div class="quiz-question">🎉 Все слова изучены!</div></div>`;
        }
        const total = quizList.length;
        let html = '';
        for (let i = -2; i <= 2; i++) {
            let idx = quizIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            const word = quizList[idx];
            const questionText = AppConfig.quiz_direction === 'de_to_ru' ? word.de : word.ru;
            
            const allWords = wordsDB[AppConfig.currentLevel] || [];
            const otherWords = allWords.filter(w => w.de !== word.de);
            const shuffled = [...otherWords];
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            const options = [word, ...shuffled.slice(0, 5)];
            for (let i = options.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [options[i], options[j]] = [options[j], options[i]];
            }
            
            let optionsHtml = '<div class="quiz-grid" style="margin-top: 20px;">';
            options.forEach(opt => {
                const optText = AppConfig.quiz_direction === 'de_to_ru' ? opt.ru : opt.de;
                optionsHtml += `<button class="quiz-opt" data-value="${optText.replace(/'/g, "\\'")}">${optText}</button>`;
            });
            optionsHtml += '</div>';
            
            html += `
                <div class="quiz-carousel-card" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    <div class="quiz-question" style="font-size: 24px; margin: 20px 0;">${questionText}</div>
                    ${optionsHtml}
                </div>
            `;
        }
        return html;
    }
    
    function attachQuizEvents() {
        const cards = document.querySelectorAll('#carouselTrack .quiz-carousel-card');
        cards.forEach((card, domIdx) => {
            const wordIdx = parseInt(card.getAttribute('data-idx'));
            const btns = card.querySelectorAll('.quiz-opt');
            btns.forEach(btn => {
                btn.onclick = () => {
                    const userAnswer = btn.getAttribute('data-value').toLowerCase();
                    const currentWord = quizList[wordIdx];
                    const correctAnswer = AppConfig.quiz_direction === 'de_to_ru' ? currentWord.ru.toLowerCase() : currentWord.de.toLowerCase();
                    if (userAnswer === correctAnswer) {
                        btn.classList.add('correct');
                        setTimeout(() => {
                            markWordAsStudied(currentWord);
                            quizList = getUnstudiedWords();
                            if (quizList.length === 0) {
                                quizIndex = 0;
                                refreshCarousel();
                                updateCounter();
                            } else {
                                if (quizIndex >= quizList.length) quizIndex = 0;
                                refreshCarousel();
                                updateCounter();
                            }
                        }, 400);
                    } else {
                        btn.classList.add('wrong');
                        setTimeout(() => btn.classList.remove('wrong'), 500);
                    }
                };
            });
        });
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
    
    function refreshCarousel() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        track.innerHTML = generateQuizCards();
        updateCarouselPosition(false);
        attachQuizEvents();
        document.getElementById('quizProgress').textContent = `Слово: ${quizIndex+1} из ${quizList.length}`;
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
                    quizIndex = quizIndex === 0 ? quizList.length - 1 : quizIndex - 1;
                } else {
                    quizIndex = (quizIndex + 1) % quizList.length;
                }
                refreshCarousel();
                updateCounter();
            } else {
                updateCarouselPosition(true);
            }
        });
    }
    
    document.getElementById('quizDirBtn').onclick = () => {
        AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        refreshCarousel();
        document.getElementById('quizDirBtn').textContent = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizList.length && quizList[quizIndex]) {
            markWordAsStudied(quizList[quizIndex]);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('quizResetStartBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = 0;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('quizContainerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showStudiedWordsModalQuiz(studied);
    };
    
    window.addEventListener('resize', () => {
        containerWidth = wrapper?.offsetWidth || 0;
        updateCarouselPosition(false);
    });
}

// ========== МОДАЛЬНОЕ ОКНО КОНТЕЙНЕРА ==========
function showStudiedWordsModalQuiz(initialWords) {
    const oldModal = document.getElementById('studiedWordsModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'studiedWordsModal';
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;`;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background:white; border-radius:20px; max-width:500px; width:90%; max-height:80vh; display:flex; flex-direction:column; margin:20px;`;
    
    function updateModalContent() {
        const currentStudied = getStudiedWordsList();
        const header = modalContent.querySelector('h3');
        const itemsContainer = modalContent.querySelector('.items-container');
        if (header) header.textContent = `📦 КОНТЕЙНЕР (${currentStudied.length} слов)`;
        if (itemsContainer) {
            if (currentStudied.length === 0) {
                itemsContainer.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">📭 Контейнер пуст</div>';
            } else {
                let itemsHtml = '';
                currentStudied.forEach((word, idx) => {
                    const safeDe = word.de.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    const safeRu = word.ru.replace(/'/g, "\\'").replace(/"/g, '&quot;');
                    itemsHtml += `<button class="studied-word-item" data-index="${idx}" style="width:100%; text-align:left; padding:12px 15px; background:#E8F0FE; border:none; border-bottom:1px solid #ddd; cursor:pointer; font-size:14px;"><strong>${safeDe}</strong> — ${safeRu}</button>`;
                });
                itemsContainer.innerHTML = itemsHtml;
                document.querySelectorAll('.studied-word-item').forEach(btn => {
                    btn.onclick = () => {
                        const idx = parseInt(btn.getAttribute('data-index'));
                        const word = currentStudied[idx];
                        unstudyWord(word);
                        quizList = getUnstudiedWords();
                        if (isMobileDevice()) {
                            if (typeof refreshCarousel === 'function') refreshCarousel();
                        } else {
                            if (typeof showCurrentQuiz === 'function') showCurrentQuiz();
                        }
                        updateCounter();
                        updateModalContent();
                    };
                });
            }
        }
    }
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">
            <h3 style="margin: 0;">📦 КОНТЕЙНЕР (${initialWords.length} слов)</h3>
        </div>
        <div class="items-container" style="overflow-y: auto; flex: 1; padding: 10px 0;">
            ${initialWords.map((word, idx) => `<button class="studied-word-item" data-index="${idx}" style="width:100%; text-align:left; padding:12px 15px; background:#E8F0FE; border:none; border-bottom:1px solid #ddd; cursor:pointer; font-size:14px;"><strong>${word.de.replace(/'/g, "\\'").replace(/"/g, '&quot;')}</strong> — ${word.ru.replace(/'/g, "\\'").replace(/"/g, '&quot;')}</button>`).join('')}
        </div>
        <div style="padding: 15px; border-top: 1px solid #ddd; display: flex; gap: 10px;">
            <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 ВЕРНУТЬ ВСЁ</button>
            <button id="cancelModalBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('cancelModalBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm("Вы уверены? Все слова из контейнера будут возвращены в изучение.")) {
            resetAllStudied();
            quizList = getUnstudiedWords();
            if (isMobileDevice()) {
                if (typeof refreshCarousel === 'function') refreshCarousel();
            } else {
                if (typeof showCurrentQuiz === 'function') showCurrentQuiz();
            }
            updateCounter();
            updateModalContent();
        }
    };
    
    document.querySelectorAll('.studied-word-item').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const word = initialWords[idx];
            unstudyWord(word);
            quizList = getUnstudiedWords();
            if (isMobileDevice()) {
                if (typeof refreshCarousel === 'function') refreshCarousel();
            } else {
                if (typeof showCurrentQuiz === 'function') showCurrentQuiz();
            }
            updateCounter();
            updateModalContent();
        };
    });
}
