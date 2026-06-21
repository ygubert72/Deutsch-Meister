// quizMode.js — с сохранением оригинального дизайна

let quizModeInstance = null;
let quizAnswered = false;

function renderQuiz() {
    if (quizModeInstance) {
        quizModeInstance.destroy();
        quizModeInstance = null;
    }
    
    quizAnswered = false;
    
    function generateOptions(currentWord) {
        const allWords = wordsDB[AppConfig.currentLevel] || [];
        const otherWords = allWords.filter(w => w.de !== currentWord.de && w.ru !== currentWord.ru);
        const shuffled = [...otherWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const options = [currentWord, ...shuffled.slice(0, 5)];
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        return options;
    }
    
    function checkAnswer(selectedText, currentWord, instance) {
        if (quizAnswered) return;
        
        const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
        const correctAnswer = isDeToRu ? currentWord.ru.toLowerCase() : currentWord.de.toLowerCase();
        const userAnswer = selectedText.toLowerCase();
        
        if (userAnswer === correctAnswer) {
            quizAnswered = true;
            const allBtns = document.querySelectorAll('.quiz-opt');
            allBtns.forEach(btn => {
                if (btn.getAttribute('data-value').toLowerCase() === correctAnswer) {
                    btn.classList.add('correct');
                }
            });
            
            setTimeout(() => {
                markWordAsStudied(currentWord);
                const newItems = getUnstudiedWords();
                instance.items = newItems;
                if (newItems.length > 0) {
                    instance.currentIndex = instance.currentIndex % newItems.length;
                } else {
                    instance.currentIndex = 0;
                }
                quizAnswered = false;
                if (instance.isMobile) {
                    instance.refreshCarousel();
                } else {
                    instance.updateDisplay();
                }
                instance.updateCounter();
            }, 500);
        } else {
            const allBtns = document.querySelectorAll('.quiz-opt');
            allBtns.forEach(btn => {
                if (btn.getAttribute('data-value').toLowerCase() === userAnswer) {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 500);
                }
            });
        }
    }
    
    const config = {
        prefix: 'quiz',
        getItems: getUnstudiedWords,
        emptyMessage: '🎉 Все слова изучены!',
        progressLabel: 'Слово',
        directionLabel: AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De',
        enableSpeak: false,
        showResult: false,
        showWordsContainer: false,
        showHint: false,
        showNavigation: true,
        
        desktopButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' }
        ],
        
        mobileButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' }
        ],
        
        getQuestion: function(item) {
            if (!item) return '';
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const question = isDeToRu ? item.de : item.ru;
            return `<div class="quiz-question">${question}</div>`;
        },
        
        onDirectionChange: function() {
            AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.directionLabel = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            quizAnswered = false;
        },
        
        renderCard: function(item, idx) {
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const question = isDeToRu ? item.de : item.ru;
            const options = generateOptions(item);
            
            let optionsHtml = '<div class="quiz-grid">';
            options.forEach(opt => {
                const optText = isDeToRu ? opt.ru : opt.de;
                const safeText = optText.replace(/'/g, "\\'");
                optionsHtml += `
                    <button class="quiz-opt" data-value="${safeText}">
                        ${optText}
                    </button>
                `;
            });
            optionsHtml += '</div>';
            
            return `
                <div style="background:#FFFFFF; border-radius:20px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1);">
                    <div class="quiz-question" style="font-size:24px;">${question}</div>
                    ${optionsHtml}
                </div>
            `;
        },
        
        renderItem: function(item) {
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const question = isDeToRu ? item.de : item.ru;
            const options = generateOptions(item);
            
            let optionsHtml = '<div class="quiz-grid">';
            options.forEach(opt => {
                const optText = isDeToRu ? opt.ru : opt.de;
                const safeText = optText.replace(/'/g, "\\'");
                optionsHtml += `
                    <button class="quiz-opt" data-value="${safeText}">
                        ${optText}
                    </button>
                `;
            });
            optionsHtml += '</div>';
            
            return `
                <div style="background:#FFFFFF; border-radius:20px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:700px; margin:0 auto;">
                    <div class="quiz-question" style="font-size:28px;">${question}</div>
                    ${optionsHtml}
                </div>
            `;
        },
        
        updateWords: function(item) {
            if (!item) return;
            
            setTimeout(() => {
                const btns = document.querySelectorAll('.quiz-opt');
                btns.forEach(btn => {
                    btn.onclick = null;
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const value = btn.getAttribute('data-value');
                        checkAnswer(value, item, quizModeInstance);
                    };
                });
            }, 50);
        },
        
        customButtons: [
            {
                id: 'StudyBtn',
                onClick: function(instance) {
                    const item = instance.getCurrentItem();
                    if (item) {
                        markWordAsStudied(item);
                        const newItems = getUnstudiedWords();
                        instance.items = newItems;
                        instance.currentIndex = 0;
                        quizAnswered = false;
                        if (instance.isMobile) {
                            instance.refreshCarousel();
                        } else {
                            instance.updateDisplay();
                        }
                        instance.updateCounter();
                    }
                }
            },
            {
                id: 'ContainerBtn',
                onClick: function(instance) {
                    const studied = getStudiedWordsList();
                    if (!studied.length) {
                        alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.");
                        return;
                    }
                    
                    if (window.ContainerManager) {
                        window.ContainerManager.show({
                            title: `📦 КОНТЕЙНЕР (${studied.length} слов)`,
                            items: studied,
                            getItems: getStudiedWordsList,
                            emptyMessage: '📭 Контейнер пуст',
                            itemTemplate: (word) => `${word.de} — ${word.ru}`,
                            onItemClick: (word, idx, update) => {
                                unstudyWord(word);
                                const newItems = getUnstudiedWords();
                                instance.items = newItems;
                                instance.currentIndex = 0;
                                quizAnswered = false;
                                if (instance.isMobile) {
                                    instance.refreshCarousel();
                                } else {
                                    instance.updateDisplay();
                                }
                                instance.updateCounter();
                                update();
                            },
                            onReturnAll: (update) => {
                                resetAllStudied();
                                const newItems = getUnstudiedWords();
                                instance.items = newItems;
                                instance.currentIndex = 0;
                                quizAnswered = false;
                                if (instance.isMobile) {
                                    instance.refreshCarousel();
                                } else {
                                    instance.updateDisplay();
                                }
                                instance.updateCounter();
                                update();
                            }
                        });
                    }
                }
            }
        ]
    };
    
    quizModeInstance = new StudyMode(config);
    quizModeInstance.render();
}

window.renderQuiz = renderQuiz;
