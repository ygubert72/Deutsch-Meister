// quizMode.js — обновленная версия с использованием StudyMode

let quizModeInstance = null;
let quizAnswered = false;

function renderQuiz() {
    // Удаляем старый экземпляр
    if (quizModeInstance) {
        quizModeInstance.destroy();
        quizModeInstance = null;
    }
    
    quizAnswered = false;
    const unstudied = getUnstudiedWords();
    
    // Функция генерации вариантов ответов
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
    
    // Функция проверки ответа
    function checkAnswer(selectedText, currentWord, instance) {
        if (quizAnswered) return;
        
        const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
        const correctAnswer = isDeToRu ? currentWord.ru.toLowerCase() : currentWord.de.toLowerCase();
        const userAnswer = selectedText.toLowerCase();
        
        if (userAnswer === correctAnswer) {
            quizAnswered = true;
            // Отмечаем правильный ответ
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
                instance.refreshCarousel();
                instance.updateCounter();
            }, 500);
        } else {
            // Отмечаем неправильный ответ
            const allBtns = document.querySelectorAll('.quiz-opt');
            allBtns.forEach(btn => {
                if (btn.getAttribute('data-value').toLowerCase() === userAnswer) {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 500);
                }
            });
        }
    }
    
    // Настройки для режима теста
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
        showNavigation: true,  // На десктопе показываем кнопки ◀ ▶
        
        // Десктопные кнопки
        desktopButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' }
        ],
        
        // Мобильные кнопки (без ◀ ▶)
        mobileButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' }
        ],
        
        // Получить вопрос для отображения
        getQuestion: function(item) {
            if (!item) return '';
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            return isDeToRu ? item.de : item.ru;
        },
        
        // Смена направления
        onDirectionChange: function() {
            AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
            this.directionLabel = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
            quizAnswered = false;
        },
        
        // Рендер карточки для карусели (мобильная версия)
        renderCard: function(item, idx) {
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const question = isDeToRu ? item.de : item.ru;
            const options = generateOptions(item);
            
            let optionsHtml = '<div class="quiz-grid" style="margin-top: 20px;">';
            options.forEach(opt => {
                const optText = isDeToRu ? opt.ru : opt.de;
                const safeText = optText.replace(/'/g, "\\'");
                optionsHtml += `
                    <button class="quiz-opt" data-value="${safeText}" 
                            style="padding: 16px; background: #FFFFFF; border: 2px solid #D0D0D0; border-radius: 16px; cursor: pointer; font-size: 16px; transition: all 0.05s linear; text-align: center; box-shadow: 0 3px 4px rgba(0,0,0,0.1);">
                        ${optText}
                    </button>
                `;
            });
            optionsHtml += '</div>';
            
            return `
                <div style="background: #FFFFFF; border-radius: 20px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); min-height: 300px;">
                    <div style="text-align: center; font-size: 28px; font-weight: bold; color: #1A1A1A; margin: 20px 0;">
                        ${question}
                    </div>
                    ${optionsHtml}
                </div>
            `;
        },
        
        // Рендер для десктопа (одна карточка)
        renderItem: function(item) {
            const isDeToRu = AppConfig.quiz_direction === 'de_to_ru';
            const question = isDeToRu ? item.de : item.ru;
            const options = generateOptions(item);
            
            let optionsHtml = '<div class="quiz-grid" style="margin-top: 20px;">';
            options.forEach(opt => {
                const optText = isDeToRu ? opt.ru : opt.de;
                const safeText = optText.replace(/'/g, "\\'");
                optionsHtml += `
                    <button class="quiz-opt" data-value="${safeText}" 
                            style="padding: 16px; background: #FFFFFF; border: 2px solid #D0D0D0; border-radius: 16px; cursor: pointer; font-size: 16px; transition: all 0.05s linear; text-align: center; box-shadow: 0 3px 4px rgba(0,0,0,0.1);">
                        ${optText}
                    </button>
                `;
            });
            optionsHtml += '</div>';
            
            return `
                <div style="background: #FFFFFF; border-radius: 20px; padding: 30px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); max-width: 700px; margin: 0 auto; min-height: 300px;">
                    <div style="text-align: center; font-size: 28px; font-weight: bold; color: #1A1A1A; margin: 20px 0;">
                        ${question}
                    </div>
                    ${optionsHtml}
                </div>
            `;
        },
        
        // Обновление отображения (привязываем события к кнопкам)
        updateWords: function(item) {
            if (!item) return;
            
            // Привязываем события к кнопкам вариантов
            setTimeout(() => {
                const btns = document.querySelectorAll('.quiz-opt');
                btns.forEach(btn => {
                    // Удаляем старые обработчики
                    btn.onclick = null;
                    // Добавляем новый
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const value = btn.getAttribute('data-value');
                        checkAnswer(value, item, quizModeInstance);
                    };
                });
            }, 50);
        },
        
        // Кастомные кнопки
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
                        instance.refreshCarousel();
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
                                instance.refreshCarousel();
                                instance.updateCounter();
                                update();
                            },
                            onReturnAll: (update) => {
                                resetAllStudied();
                                const newItems = getUnstudiedWords();
                                instance.items = newItems;
                                instance.currentIndex = 0;
                                quizAnswered = false;
                                instance.refreshCarousel();
                                instance.updateCounter();
                                update();
                            }
                        });
                    } else {
                        alert('ContainerManager не загружен');
                    }
                }
            }
        ]
    };
    
    // Создаем экземпляр StudyMode
    quizModeInstance = new StudyMode(config);
    quizModeInstance.render();
}

// Функция для обновления теста извне
function refreshQuiz() {
    if (quizModeInstance) {
        quizModeInstance.destroy();
        quizModeInstance = null;
    }
    renderQuiz();
}

// Экспортируем для совместимости
window.renderQuiz = renderQuiz;
window.refreshQuiz = refreshQuiz;
