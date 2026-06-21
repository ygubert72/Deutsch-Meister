// cardsMode.js — с сохранением оригинального дизайна

let cardsModeInstance = null;

function renderCards() {
    if (cardsModeInstance) {
        cardsModeInstance.destroy();
        cardsModeInstance = null;
    }
    
    let flipped = false;
    
    function updateCardDisplay(instance) {
        const questionEl = document.getElementById('cardsQuestion');
        if (!questionEl) return;
        
        const items = instance.getItems();
        if (!items.length) {
            const studiedCount = getStudiedWordsList().length;
            if (studiedCount > 0) {
                questionEl.innerHTML = "🎉 Все слова в контейнере!<br><br>Нажмите 'В КОНТЕЙНЕР' чтобы просмотреть<br>или вернуть слова";
            } else {
                questionEl.innerHTML = "🎉 Все слова изучены!<br><br>Выберите другой уровень";
            }
            return;
        }
        
        const item = instance.getCurrentItem();
        if (!item) return;
        
        if (!flipped) {
            questionEl.innerHTML = `<div class="card" style="cursor:pointer; min-height:280px; display:flex; align-items:center; justify-content:center; text-align:center; background:#FFFFFF; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:550px; margin:15px auto;">
                <div class="card-word" style="font-size:32px; font-weight:bold; color:#1A1A1A; padding:30px; word-break:break-word; white-space:pre-wrap;">
                    ${AppConfig.show_language === 'de' ? item.de : item.ru}
                </div>
            </div>`;
        } else {
            if (AppConfig.show_language === 'de') {
                questionEl.innerHTML = `<div class="card" style="cursor:pointer; min-height:280px; display:flex; align-items:center; justify-content:center; text-align:center; background:#FFFFFF; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:550px; margin:15px auto;">
                    <div class="card-word" style="font-size:32px; font-weight:bold; color:#1A1A1A; padding:30px; word-break:break-word; white-space:pre-wrap;">
                        ${item.de}\n\n➡️\n\n${item.ru}
                    </div>
                </div>`;
            } else {
                questionEl.innerHTML = `<div class="card" style="cursor:pointer; min-height:280px; display:flex; align-items:center; justify-content:center; text-align:center; background:#FFFFFF; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:550px; margin:15px auto;">
                    <div class="card-word" style="font-size:32px; font-weight:bold; color:#1A1A1A; padding:30px; word-break:break-word; white-space:pre-wrap;">
                        ${item.ru}\n\n➡️\n\n${item.de}
                    </div>
                </div>`;
            }
        }
    }
    
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
        
        desktopButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        mobileButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        getQuestion: function(item) {
            return '';
        },
        
        getSpeakText: function(item) {
            return item ? item.de : '';
        },
        
        updateWords: function(item) {},
        
        onCenterClick: function(item, instance) {
            flipped = !flipped;
            instance.updateDisplay();
            instance.updateCounter();
        },
        
        onDirectionChange: function() {
            AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
            flipped = false;
            this.directionLabel = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        },
        
        renderCard: function(item, idx) {
            const displayText = AppConfig.show_language === 'de' ? item.de : item.ru;
            return `
                <div class="card" style="cursor:pointer; min-height:280px; display:flex; align-items:center; justify-content:center; text-align:center; background:#FFFFFF; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); margin:0 auto;">
                    <div class="card-word" style="font-size:22px; font-weight:bold; color:#1A1A1A; padding:30px; word-break:break-word; white-space:pre-wrap;">
                        ${displayText}
                    </div>
                </div>
            `;
        },
        
        renderItem: function(item) {
            const displayText = AppConfig.show_language === 'de' ? item.de : item.ru;
            return `
                <div class="card" style="cursor:pointer; min-height:280px; display:flex; align-items:center; justify-content:center; text-align:center; background:#FFFFFF; border-radius:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:550px; margin:15px auto;">
                    <div class="card-word" style="font-size:32px; font-weight:bold; color:#1A1A1A; padding:30px; word-break:break-word; white-space:pre-wrap;">
                        ${displayText}
                    </div>
                </div>
            `;
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
                        flipped = false;
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
                                flipped = false;
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
                                flipped = false;
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
        ]
    };
    
    cardsModeInstance = new StudyMode(config);
    cardsModeInstance.updateDisplay = function() {
        updateCardDisplay(this);
        this.updateProgress();
    };
    cardsModeInstance.render();
}

window.renderCards = renderCards;
