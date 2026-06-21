// quizMode.js — упрощённая версия с использованием containerManager и carousel

let quizList = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizCarousel = null;

function renderQuiz() {
    quizList = getUnstudiedWords();
    quizIndex = 0;
    
    if (window.utils.isMobileDevice()) {
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
    
    showCurrentQuiz();
    attachQuizDesktopEvents();
}

function showCurrentQuiz() {
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

function attachQuizDesktopEvents() {
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
        showQuizContainer(studied);
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
    
    document.getElementById('quizResetStartBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    };
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (с использованием Carousel) ==========
function renderQuizMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn">${AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; will-change: transform;"></div>
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
    
    if (quizCarousel) quizCarousel.destroy();
    
    quizCarousel = new window.Carousel({
        containerId: 'carouselWrapper',
        trackId: 'carouselTrack',
        initialIndex: 0,
        getItems: () => quizList,
        emptyMessage: '🎉 Все слова изучены!',
        renderItem: (word, idx) => {
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const questionText = isDeToRu ? word.de : word.ru;
            
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
                const optText = isDeToRu ? opt.ru : opt.de;
                optionsHtml += `<button class="quiz-opt" data-value="${optText.replace(/'/g, "\\'")}">${optText}</button>`;
            });
            optionsHtml += '</div>';
            
            return `
                <div style="padding: 10px;">
                    <div class="quiz-question" style="font-size: 24px; margin: 10px 0;">${questionText}</div>
                    ${optionsHtml}
                </div>
            `;
        },
        onSlideChange: (word, idx) => {
            quizIndex = idx;
            quizCurrentWord = word;
            updateCounter();
            document.getElementById('quizProgress').textContent = `Слово: ${idx+1} из ${quizList.length}`;
        }
    });
    
    // Добавляем обработчики для кнопок внутри слайдов
    setTimeout(() => {
        attachQuizMobileEvents();
    }, 100);
}

function attachQuizMobileEvents() {
    // Направление
    document.getElementById('quizDirBtn').onclick = () => {
        AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        if (quizCarousel) quizCarousel.refresh();
        document.getElementById('quizDirBtn').textContent = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    // Изучено
    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizList.length && quizList[quizIndex]) {
            markWordAsStudied(quizList[quizIndex]);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            if (quizCarousel) quizCarousel.refresh();
            updateCounter();
        }
    };
    
    // В начало
    document.getElementById('quizResetStartBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = 0;
            if (quizCarousel) quizCarousel.goTo(0);
            updateCounter();
        }
    };
    
    // Контейнер
    document.getElementById('quizContainerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) {
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.");
            return;
        }
        showQuizContainer(studied);
    };
    
    // Обработчики для кнопок вариантов
    document.querySelectorAll('.quiz-opt').forEach(btn => {
        btn.onclick = function(e) {
            e.stopPropagation();
            const userAnswer = this.getAttribute('data-value').toLowerCase();
            const currentWord = quizList[quizIndex];
            if (!currentWord) return;
            
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const correctAnswer = isDeToRu ? currentWord.ru.toLowerCase() : currentWord.de.toLowerCase();
            
            if (userAnswer === correctAnswer) {
                this.classList.add('correct');
                setTimeout(() => {
                    markWordAsStudied(currentWord);
                    quizList = getUnstudiedWords();
                    if (quizList.length === 0) {
                        quizIndex = 0;
                        if (quizCarousel) quizCarousel.refresh();
                        updateCounter();
                    } else {
                        if (quizIndex >= quizList.length) quizIndex = 0;
                        if (quizCarousel) quizCarousel.refresh();
                        updateCounter();
                    }
                }, 400);
            } else {
                this.classList.add('wrong');
                setTimeout(() => this.classList.remove('wrong'), 500);
            }
        };
    });
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ QUIZ ==========
function showQuizContainer(studiedWords) {
    window.ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${studiedWords.length} слов)`,
        items: studiedWords,
        getItems: getStudiedWordsList,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: (word) => `${word.de} — ${word.ru}`,
        onItemClick: (word, idx, update) => {
            unstudyWord(word);
            quizList = getUnstudiedWords();
            if (window.utils.isMobileDevice()) {
                if (quizCarousel) quizCarousel.refresh();
            } else {
                showCurrentQuiz();
            }
            updateCounter();
            update();
        },
        onReturnAll: (update) => {
            resetAllStudied();
            quizList = getUnstudiedWords();
            if (window.utils.isMobileDevice()) {
                if (quizCarousel) quizCarousel.refresh();
            } else {
                showCurrentQuiz();
            }
            updateCounter();
            update();
        }
    });
}

// Сохраняем старую функцию
function showStudiedWordsModalQuiz(words) {
    showQuizContainer(words);
}
