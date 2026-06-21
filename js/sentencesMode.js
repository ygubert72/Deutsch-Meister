// sentencesMode.js — с сохранением оригинального дизайна

let sentencesModeInstance = null;
let sentSelected = [];
let sentActive = {};
let sentAvailable = [];
let sentHintIndex = 0;
let sentHintWords = [];
let sentCurrentItem = null;
let sentAnswerChecked = false;

function renderSentences() {
    if (sentencesModeInstance) {
        sentencesModeInstance.destroy();
        sentencesModeInstance = null;
    }
    
    sentSelected = [];
    sentActive = {};
    sentAvailable = [];
    sentHintIndex = 0;
    sentHintWords = [];
    sentCurrentItem = null;
    sentAnswerChecked = false;
    
    function updateSentenceWords(item, instance) {
        if (!item) return;
        
        sentCurrentItem = item;
        const isRuToDe = AppConfig.sentence_lang_from === 'ru';
        
        let question, correctTokens, targetLangForDistractors;
        if (isRuToDe) {
            question = item.ru;
            correctTokens = item.de.split(/\s+/);
            sentHintWords = item.de.split(/\s+/);
            targetLangForDistractors = 'de';
        } else {
            question = item.de;
            correctTokens = item.ru.split(/\s+/);
            sentHintWords = item.ru.split(/\s+/);
            targetLangForDistractors = 'ru';
        }
        
        sentHintWords = sentHintWords.map(w => w.replace(/[.,!?;:]/g, ''));
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
        sentAvailable = available.slice(0, 12);
        sentSelected = [];
        sentActive = {};
        sentAvailable.forEach(w => { sentActive[w] = true; });
        
        updateWordsDisplay(instance);
        updateResultDisplay();
    }
    
    function updateWordsDisplay(instance) {
        const container = document.getElementById('sentWordsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        sentAvailable.forEach(word => {
            if (sentActive[word]) {
                const btn = document.createElement('button');
                btn.className = instance && instance.isMobile ? 'word-btn-mobile' : 'word-btn';
                btn.textContent = word;
                btn.onclick = () => {
                    if (sentActive[word]) {
                        sentActive[word] = false;
                        sentSelected.push(word);
                        updateWordsDisplay(instance);
                        updateResultDisplay();
                    }
                };
                container.appendChild(btn);
            }
        });
    }
    
    function updateResultDisplay() {
        const resultEl = document.getElementById('sentResult');
        if (resultEl) {
            resultEl.textContent = sentSelected.join(' ');
        }
    }
    
    function checkSentenceAnswer(instance) {
        if (sentAnswerChecked) return;
        if (!sentSelected.length) {
            const result = document.getElementById('sentResult');
            if (result) {
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => {
                    if (result) result.style.backgroundColor = '#FFFFFF';
                }, 500);
            }
            return;
        }
        
        let correctAnswer;
        if (AppConfig.sentence_lang_from === 'ru') {
            correctAnswer = sentCurrentItem.de.toLowerCase().replace(/[.,!?;:]/g, '');
        } else {
            correctAnswer = sentCurrentItem.ru.toLowerCase().replace(/[.,!?;:]/g, '');
        }
        const userAnswer = sentSelected.join(' ').toLowerCase().replace(/[.,!?;:]/g, '');
        const result = document.getElementById('sentResult');
        
        if (userAnswer === correctAnswer) {
            sentAnswerChecked = true;
            if (result) {
                result.style.backgroundColor = '#C8E6C9';
            }
            setTimeout(() => {
                markSentenceAsStudied(sentCurrentItem);
                const newItems = getUnstudiedSentences();
                instance.items = newItems;
                if (newItems.length > 0) {
                    instance.currentIndex = instance.currentIndex % newItems.length;
                } else {
                    instance.currentIndex = 0;
                }
                sentAnswerChecked = false;
                sentSelected = [];
                sentActive = {};
                sentAvailable = [];
                if (instance.isMobile) {
                    instance.refreshCarousel();
                } else {
                    instance.updateDisplay();
                }
                instance.updateCounter();
            }, 500);
        } else {
            if (result) {
                result.style.backgroundColor = '#FFCDD2';
                setTimeout(() => {
                    if (result) result.style.backgroundColor = '#FFFFFF';
                    sentSelected = [];
                    sentAvailable.forEach(w => { sentActive[w] = true; });
                    updateWordsDisplay(instance);
                    updateResultDisplay();
                    if (instance) {
                        instance.resetHint();
                    }
                }, 500);
            }
        }
    }
    
    const config = {
        prefix: 'sent',
        getItems: getUnstudiedSentences,
        emptyMessage: '🎉 Все фразы изучены!',
        progressLabel: 'Фраза',
        directionLabel: AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru',
        enableSpeak: true,
        showResult: true,
        showWordsContainer: true,
        showHint: true,
        showNavigation: true,
        
        desktopButtons: [
            { id: 'UndoBtn', label: 'ВЕРНУТЬ СЛОВО' },
            { id: 'ResetBtn', label: 'СБРОСИТЬ ВСЁ' },
            { id: 'CheckBtn', label: 'ПРОВЕРИТЬ', class: 'check-btn' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        mobileButtons: [
            { id: 'UndoBtn', label: 'ВЕРНУТЬ СЛОВО' },
            { id: 'ResetBtn', label: 'СБРОСИТЬ ВСЁ' },
            { id: 'CheckBtn', label: 'ПРОВЕРИТЬ', class: 'check-btn' },
            { id: 'SpeakBtn', label: '🔊' }
        ],
        
        extraButtons: [
            { id: 'StudyBtn', label: 'ИЗУЧЕНО' },
            { id: 'ContainerBtn', label: 'В КОНТЕЙНЕР' }
        ],
        
        getQuestion: function(item) {
            if (!item) return '';
            const isRuToDe = AppConfig.sentence_lang_from === 'ru';
            const question = isRuToDe ? item.ru : item.de;
            return `<div class="sent-question">Составьте предложение:<br><br><strong>${question}</strong></div>`;
        },
        
        getSpeakText: function(item) {
            return item ? item.de : '';
        },
        
        onDirectionChange: function() {
            AppConfig.sentence_lang_from = AppConfig.sentence_lang_from === 'ru' ? 'de' : 'ru';
            this.directionLabel = AppConfig.sentence_lang_from === 'ru' ? 'Ru → De' : 'De → Ru';
            sentSelected = [];
            sentActive = {};
            sentAvailable = [];
            sentHintIndex = 0;
            sentHintWords = [];
            sentAnswerChecked = false;
        },
        
        updateWords: function(item) {
            if (item) {
                updateSentenceWords(item, sentencesModeInstance);
            }
        },
        
        updateResult: function() {
            updateResultDisplay();
        },
        
        renderCard: function(item, idx) {
            const isRuToDe = AppConfig.sentence_lang_from === 'ru';
            const question = isRuToDe ? item.ru : item.de;
            
            return `
                <div style="background:#FFFFFF; border-radius:20px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1);">
                    <div class="sent-question">Составьте предложение:<br><br><strong>${question}</strong></div>
                    <div class="sent-result" id="sentResult"></div>
                    <div class="words-container-mobile" id="sentWordsContainer"></div>
                </div>
            `;
        },
        
        renderItem: function(item) {
            const isRuToDe = AppConfig.sentence_lang_from === 'ru';
            const question = isRuToDe ? item.ru : item.de;
            
            return `
                <div style="background:#FFFFFF; border-radius:20px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.1); max-width:700px; margin:0 auto;">
                    <div class="sent-question">Составьте предложение:<br><br><strong>${question}</strong></div>
                    <div class="sent-result" id="sentResult"></div>
                    <div class="words-container" id="sentWordsContainer"></div>
                </div>
            `;
        },
        
        customButtons: [
            {
                id: 'UndoBtn',
                onClick: function(instance) {
                    if (sentSelected.length) {
                        const last = sentSelected.pop();
                        sentActive[last] = true;
                        updateWordsDisplay(instance);
                        updateResultDisplay();
                    }
                }
            },
            {
                id: 'ResetBtn',
                onClick: function(instance) {
                    sentSelected = [];
                    sentAvailable.forEach(w => { sentActive[w] = true; });
                    updateWordsDisplay(instance);
                    updateResultDisplay();
                    if (instance) {
                        instance.resetHint();
                    }
                }
            },
            {
                id: 'CheckBtn',
                onClick: function(instance) {
                    checkSentenceAnswer(instance);
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
            },
            {
                id: 'StudyBtn',
                onClick: function(instance) {
                    const item = instance.getCurrentItem();
                    if (item) {
                        markSentenceAsStudied(item);
                        const newItems = getUnstudiedSentences();
                        instance.items = newItems;
                        instance.currentIndex = 0;
                        sentSelected = [];
                        sentActive = {};
                        sentAvailable = [];
                        sentAnswerChecked = false;
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
                    const completed = sentencesDB[AppConfig.currentLevel].filter((_, idx) => 
                        sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied
                    );
                    
                    if (!completed.length) {
                        alert("📦 Контейнер пуст\n\nВыучите фразы, чтобы они появились здесь.");
                        return;
                    }
                    
                    if (window.ContainerManager) {
                        window.ContainerManager.show({
                            title: `📦 КОНТЕЙНЕР (${completed.length} фраз)`,
                            items: completed,
                            getItems: () => sentencesDB[AppConfig.currentLevel].filter((_, idx) => 
                                sentencesProgress[AppConfig.currentLevel]?.[idx]?.studied
                            ),
                            emptyMessage: '📭 Контейнер пуст',
                            itemTemplate: (sentence) => `${sentence.de} → ${sentence.ru}`,
                            onItemClick: (sentence, idx, update) => {
                                const sIdx = sentencesDB[AppConfig.currentLevel].findIndex(
                                    s => s.de === sentence.de && s.ru === sentence.ru
                                );
                                if (sIdx !== -1) {
                                    if (!sentencesProgress[AppConfig.currentLevel]) {
                                        sentencesProgress[AppConfig.currentLevel] = [];
                                    }
                                    sentencesProgress[AppConfig.currentLevel][sIdx] = { studied: false };
                                    saveProgress();
                                    const newItems = getUnstudiedSentences();
                                    instance.items = newItems;
                                    instance.currentIndex = 0;
                                    sentSelected = [];
                                    sentActive = {};
                                    sentAvailable = [];
                                    sentAnswerChecked = false;
                                    if (instance.isMobile) {
                                        instance.refreshCarousel();
                                    } else {
                                        instance.updateDisplay();
                                    }
                                    instance.updateCounter();
                                    update();
                                }
                            },
                            onReturnAll: (update) => {
                                resetAllSentences();
                                const newItems = getUnstudiedSentences();
                                instance.items = newItems;
                                instance.currentIndex = 0;
                                sentSelected = [];
                                sentActive = {};
                                sentAvailable = [];
                                sentAnswerChecked = false;
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
    
    sentencesModeInstance = new StudyMode(config);
    sentencesModeInstance.render();
}

window.renderSentences = renderSentences;
