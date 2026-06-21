// cardsMode.js — обновленная версия с использованием StudyMode

let cardsModeInstance = null;

function renderCards() {
    // Удаляем старый экземпляр
    if (cardsModeInstance) {
        cardsModeInstance.destroy();
        cardsModeInstance = null;
    }
    
    // Получаем слова для текущего уровня
    const unstudied = getUnstudiedWords();
    
    // Состояние для карточек
    let flipped = false;
    let currentWord = null;
    
    // Функция обновления отображения карточки
    function updateCardDisplay(instance) {
        const questionEl = document.getElementById('cardsQuestion');
        if (!questionEl) return;
        
        const items = instance.getItems();
        if (!items.length) {
            const studiedCount = getStudiedWordsList().length;
            if (studiedCount > 0) {
                questionEl.textContent = "🎉 Все слова в контейнере!\n\nНажмите 'В КОНТЕЙНЕР' чтобы просмотреть\nили вернуть слова";
            } else {
                questionEl.textContent = "🎉 Все слова изучены!\n\nВыберите другой уровень";
            }
            return;
        }
        
        currentWord = instance.getCurrentItem();
        if (!currentWord) return;
        
        if (!flipped) {
            questionEl.textContent = AppConfig.show_language === 'de' ? currentWord.de : currentWord.ru;
        } else {
            if (AppConfig.show_language === 'de') {
                questionEl.textContent = `${currentWord.de}\n\n➡️\n\n${currentWord.ru}`;
            } else {
                questionEl.textContent = `${currentWord.ru}\n\n➡️\n\n${currentWord.de}`;
            }
        }
    }
    
    // Настройки для режима карточек
    const config = {
        prefix: 'cards',
        getItems: getUnstudiedWords,
        emptyMessage: '🎉 Все слова изучены!',
        progressLabel: 'Слово',
        directionLabel: AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De',
        enableSpeak: true,
        showResult: false,
        showWordsContainer: false,
        showHint: false,
        showNavigation: true,
        
        // Десктопные кнопки
        desktopButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        // Мобильные кнопки
        mobileButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        // Получить вопрос для отображения
        getQuestion: function(item) {
            if (!item) return '';
            if (!flipped) {
                return AppConfig.show_language === 'de' ? item.de : item.ru;
            } else {
                if (AppConfig.show_language === 'de') {
                    return `${item.de}\n\n➡️\n\n${item.ru}`;
                } else {
                    return `${item.ru}\n\n➡️\n\n${item.de}`;
                }
            }
        },
        
        // Получить текст для озвучки
        getSpeakText: function(item) {
            return item ? item.de : '';
        },
        
        // Обновление отображения
        updateWords: function(item) {
            // Используем updateDisplay через getQuestion
        },
        
        // Клик по центральной карточке (переворот)
        onCenterClick: function(item, instance) {
            flipped = !flipped;
            instance.updateDisplay();
            instance.updateCounter();
        },
        
        // Смена направления
        onDirectionChange: function() {
            AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
            flipped = false;
            this.directionLabel = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
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
                        flipped = false;
                        instance.refreshCarousel();
                        instance.updateCounter();
                        // Обновляем контейнер, если он открыт
                        if (typeof window._containerUpdate === 'function') {
                            window._containerUpdate();
                        }
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
                    
                    // Сохраняем функцию обновления для контейнера
                    window._containerUpdate = function() {
                        const updatedItems = getStudiedWordsList();
                        // Обновляем отображение если контейнер открыт
                    };
                    
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
                                flipped = false;
                                instance.refreshCarousel();
                                instance.updateCounter();
                                update();
                            },
                            onReturnAll: (update) => {
                                resetAllStudied();
                                const newItems = getUnstudiedWords();
                                instance.items = newItems;
                                instance.currentIndex = 0;
                                flipped = false;
                                instance.refreshCarousel();
                                instance.updateCounter();
                                update();
                            }
                        });
                    } else {
                        alert('ContainerManager не загружен');
                    }
                }
            },
            {
                id: 'SpeakBtn',
                onClick: function(instance) {
                    const item = instance.getCurrentItem();
                    if (item && typeof speak === 'function') {
                        speak(item.de);
                    }
                }
            }
        ],
        
        // Рендер карточки для карусели (мобильная версия)
        renderCard: function(item, idx) {
            const displayText = AppConfig.show_language === 'de' ? item.de : item.ru;
            return `
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); min-height: 280px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 30px;">
                    <div style="font-size: 22px; font-weight: bold; color: #1A1A1A; word-break: break-word; white-space: pre-wrap;">
                        ${displayText}
                    </div>
                </div>
            `;
        }
    };
    
    // Создаем экземпляр StudyMode
    cardsModeInstance = new StudyMode(config);
    cardsModeInstance.render();
}

// Функция для обновления карточек извне (например, после изменения уровня)
function refreshCards() {
    if (cardsModeInstance) {
        cardsModeInstance.destroy();
        cardsModeInstance = null;
    }
    renderCards();
}

// Экспортируем для совместимости
window.renderCards = renderCards;
window.refreshCards = refreshCards;
