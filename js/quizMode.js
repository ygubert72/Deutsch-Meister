// quizMode.js — ИСПРАВЛЕННАЯ ВЕРСИЯ С КАРУСЕЛЬЮ

let quizList = [];
let quizIndex = 0;
let quizCurrentWord = null;

// ========== ОПРЕДЕЛЕНИЕ МОБИЛЬНОГО УСТРОЙСТВА ==========
function isMobileDevice() {
    return window.utils ? window.utils.isMobileDevice() : window.innerWidth <= 768;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ==========
function renderQuiz() {
    quizList = getUnstudiedWords();
    quizIndex = 0;
    
    if (isMobileDevice()) {
        renderQuizMobile();
    } else {
        renderQuizDesktop();
    }
}

// ========== ДЕСКТОПНАЯ ВЕРСИЯ ==========
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
    
    window.showCurrentQuiz = function() {
        if (!quizList.length) {
            const studiedCount = getStudiedWordsList().length;
            document.getElementById('quizQuestion').textContent = studiedCount > 0 
                ? "🎉 Все слова в контейнере!"
                : "🎉 Все слова изучены!";
            document.getElementById('quizGrid').innerHTML = studiedCount > 0 
                ? '<div style="text-align:center; padding:20px;">Нажмите "В КОНТЕЙНЕР" чтобы просмотреть или вернуть слова</div>'
                : '';
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
        const options = [quizCurrentWord, ...shuffled.slice(0, 5)];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        
        const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
        document.getElementById('quizQuestion').textContent = isDeToRu ? quizCurrentWord.de : quizCurrentWord.ru;
        const correctAnswer = isDeToRu ? quizCurrentWord.ru : quizCurrentWord.de;
        
        const grid = document.getElementById('quizGrid');
        grid.innerHTML = '';
        options.forEach((opt) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.textContent = isDeToRu ? opt.ru : opt.de;
            btn.onclick = () => {
                const isCorrect = isDeToRu ? (opt.ru === correctAnswer) : (opt.de === correctAnswer);
                if (isCorrect) {
                    btn.classList.add('correct');
                    setTimeout(() => {
                        quizIndex = (quizIndex + 1) % quizList.length;
                        window.showCurrentQuiz();
                        updateCounter();
                    }, 400);
                } else {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 500);
                }
            };
            grid.appendChild(btn);
        });
        
        document.getElementById('quizProgress').textContent = `Текущее слово: ${quizIndex+1} из ${quizList.length}`;
    };

    document.getElementById('quizDirBtn').onclick = () => {
        AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        window.showCurrentQuiz();
        document.getElementById('quizDirBtn').textContent = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };

    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizCurrentWord) {
            markWordAsStudied(quizCurrentWord);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            window.showCurrentQuiz();
            updateCounter();
        }
    };

    document.getElementById('quizContainerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showQuizContainer(studied);
    };

    document.getElementById('quizPrevBtn').onclick = () => {
        if (quizList.length && quizIndex > 0) {
            quizIndex--;
            window.showCurrentQuiz();
        }
    };

    document.getElementById('quizNextBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = (quizIndex + 1) % quizList.length;
            window.showCurrentQuiz();
        }
    };

    document.getElementById('quizResetStartBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = 0;
            window.showCurrentQuiz();
            updateCounter();
        }
    };

    window.showCurrentQuiz();
    updateCounter();
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (КАРУСЕЛЬ) ==========
function renderQuizMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn">${AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; transition: transform 250ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
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

    // --- ВСЕ ПЕРЕМЕННЫЕ КАРУСЕЛИ — ЛОКАЛЬНЫЕ! ---
    let touchStartX = 0;
    let isDragging = false;
    let containerWidth = 0;
    let currentTranslate = 0;
    const minSwipeDistance = 50;
    const snapDuration = 250;

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
        cards.forEach((card) => {
            const btns = card.querySelectorAll('.quiz-opt');
            btns.forEach(btn => {
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const userAnswer = btn.getAttribute('data-value').toLowerCase();
                    const wordIdx = parseInt(card.getAttribute('data-idx'));
                    const currentWord = quizList[wordIdx];
                    if (!currentWord) return;
                    
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
        showQuizContainer(studied);
    };

    window.addEventListener('resize', () => {
        containerWidth = wrapper?.offsetWidth || 0;
        updateCarouselPosition(false);
    });
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ QUIZ ==========
function showQuizContainer(studiedWords) {
    if (window.ContainerManager) {
        window.ContainerManager.show({
            title: `📦 КОНТЕЙНЕР (${studiedWords.length} слов)`,
            items: studiedWords,
            getItems: getStudiedWordsList,
            emptyMessage: '📭 Контейнер пуст',
            itemTemplate: (word) => `${word.de} — ${word.ru}`,
            onItemClick: (word, idx, update) => {
                unstudyWord(word);
                quizList = getUnstudiedWords();
                if (isMobileDevice()) {
                    if (typeof refreshCarousel === 'function') refreshCarousel();
                } else {
                    if (typeof window.showCurrentQuiz === 'function') window.showCurrentQuiz();
                }
                updateCounter();
                update();
            },
            onReturnAll: (update) => {
                resetAllStudied();
                quizList = getUnstudiedWords();
                if (isMobileDevice()) {
                    if (typeof refreshCarousel === 'function') refreshCarousel();
                } else {
                    if (typeof window.showCurrentQuiz === 'function') window.showCurrentQuiz();
                }
                updateCounter();
                update();
            }
        });
    } else {
        const oldModal = document.getElementById('studiedWordsModal');
        if (oldModal) oldModal.remove();
        alert('ContainerManager не загружен, но слова возвращены.');
    }
}
