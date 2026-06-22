// cardsMode.js — с каруселью для мобильных устройств

let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;
let isAnimating = false;

// Переменные для карусели
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let isDragging = false;
let isSwiping = false;
let containerWidth = 0;
let currentTranslate = 0;
const minSwipeDistance = 30;
const snapDuration = 250;
let cardsCarousel = null;

function renderCards() {
    cardsList = getUnstudiedWords();
    cardsIndex = 0;
    cardsFlipped = false;
    
    if (window.utils && window.utils.isMobileDevice()) {
        renderCardsMobile();
    } else {
        renderCardsDesktop();
    }
}

function animateFade(callback) {
    if (isAnimating) return;
    isAnimating = true;
    const cardWord = document.getElementById('cardWord');
    if (!cardWord) {
        if (callback) callback();
        isAnimating = false;
        return;
    }
    cardWord.style.transition = 'opacity 0.15s ease';
    cardWord.style.opacity = '0';
    setTimeout(function() {
        if (callback) callback();
        cardWord.style.opacity = '1';
        setTimeout(function() {
            cardWord.style.transition = '';
            isAnimating = false;
        }, 150);
    }, 150);
}

// ========== ДЕСКТОПНАЯ ВЕРСИЯ ==========
function renderCardsDesktop() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div class="card" id="card">
                <div class="card-word" id="cardWord"></div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="studyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="containerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="speakBtn">🔊</button>
                <button class="ctrl-btn" id="prevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="nextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="resetStartBtn">⏮ В НАЧАЛО</button>
            </div>
            <div class="hint">Нажмите на карточку для перевода</div>
        </div>
    `;
    
    function getCurrentWordText() {
        if (!cardsList.length) return null;
        const word = cardsList[cardsIndex];
        if (!cardsFlipped) {
            return AppConfig.show_language === 'de' ? word.de : word.ru;
        } else {
            if (AppConfig.show_language === 'de') {
                return word.de + '\n\n➡️\n\n' + word.ru;
            } else {
                return word.ru + '\n\n➡️\n\n' + word.de;
            }
        }
    }
    
    function updateCardDisplayContent() {
        const wordEl = document.getElementById('cardWord');
        if (!wordEl) return;
        if (!cardsList.length) {
            const studiedCount = getStudiedWordsList().length;
            if (studiedCount > 0) {
                wordEl.textContent = "🎉 Все слова в контейнере!\n\nНажмите 'В КОНТЕЙНЕР' чтобы просмотреть\nили вернуть слова";
            } else {
                wordEl.textContent = "🎉 Все слова изучены!\n\nВыберите другой уровень";
            }
            return;
        }
        wordEl.textContent = getCurrentWordText();
    }
    
    function goToPrevCard() {
        if (cardsList.length) {
            cardsIndex = cardsIndex === 0 ? cardsList.length - 1 : cardsIndex - 1;
            cardsFlipped = false;
            animateFade(function() {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    }
    
    function goToNextCard() {
        if (cardsList.length) {
            cardsIndex = (cardsIndex + 1) % cardsList.length;
            cardsFlipped = false;
            animateFade(function() {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    }
    
    function goToStart() {
        if (cardsList.length) {
            cardsIndex = 0;
            cardsFlipped = false;
            animateFade(function() {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    }
    
    updateCardDisplayContent();
    
    document.getElementById('prevBtn').onclick = goToPrevCard;
    document.getElementById('nextBtn').onclick = goToNextCard;
    document.getElementById('resetStartBtn').onclick = goToStart;
    
    document.getElementById('dirBtn').onclick = function() {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        animateFade(function() { updateCardDisplayContent(); });
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('card').onclick = function() {
        if (isAnimating) return;
        if (cardsList.length) {
            cardsFlipped = !cardsFlipped;
            animateFade(function() { updateCardDisplayContent(); });
        }
    };
    
    document.getElementById('studyBtn').onclick = function() {
        if (isAnimating) return;
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            cardsIndex = cardsList.length ? 0 : 0;
            cardsFlipped = false;
            animateFade(function() {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    };
    
    document.getElementById('containerBtn').onclick = function() {
        var studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showWordsContainer(studied);
    };
    
    document.getElementById('speakBtn').onclick = function() {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (КАРУСЕЛЬ) ==========
function renderCardsMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y;">
                <div id="carouselTrack" style="display: flex; transition: transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
                    ${generateCarouselCards()}
                </div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="studyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="containerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="resetStartBtn">⏮ В НАЧАЛО</button>
                <button class="ctrl-btn" id="speakBtn">🔊</button>
            </div>
            <div class="hint">👆 Свайп влево/вправо для листания | Нажмите на карточку для перевода</div>
        </div>
    `;
    
    function generateCarouselCards() {
        if (!cardsList.length) {
            return `<div class="card" style="flex: 0 0 100%; min-width: 100%;"><div class="card-word">🎉 Все слова изучены!</div></div>`;
        }
        var total = cardsList.length;
        var html = '';
        for (var i = -2; i <= 2; i++) {
            var idx = cardsIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            var word = cardsList[idx];
            var displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
            html += '<div class="card" data-idx="' + idx + '" style="flex: 0 0 100%; min-width: 100%;"><div class="card-word">' + displayText + '</div></div>';
        }
        return html;
    }
    
    function updateCarouselPosition(animate) {
        animate = (animate !== undefined) ? animate : true;
        var track = document.getElementById('carouselTrack');
        if (!track) return;
        if (!animate) track.style.transition = 'none';
        else track.style.transition = 'transform ' + snapDuration + 'ms cubic-bezier(0.2, 0.9, 0.4, 1.1)';
        var offset = -2 * containerWidth;
        track.style.transform = 'translateX(' + offset + 'px)';
        currentTranslate = offset;
        if (!animate) {
            setTimeout(function() { 
                if (track) track.style.transition = ''; 
            }, 50);
        }
    }
    
    function refreshCarousel() {
        var track = document.getElementById('carouselTrack');
        if (!track) return;
        track.innerHTML = generateCarouselCards();
        updateCarouselPosition(false);
        attachCardEvents();
    }
    
    // ===== ОСНОВНОЕ ИСПРАВЛЕНИЕ: ОБЪЕДИНЕННЫЙ ОБРАБОТЧИК ДЛЯ КЛИКА И СВАЙПА =====
    function attachCardEvents() {
        var cards = document.querySelectorAll('#carouselTrack .card');
        cards.forEach(function(card, domIdx) {
            // Убираем старые обработчики
            card.onclick = null;
            card.ontouchstart = null;
            card.ontouchend = null;
            
            var wordIdx = parseInt(card.getAttribute('data-idx'));
            var startX = 0;
            var startY = 0;
            var isTap = true;
            
            // Центральная карточка (индекс 2)
            if (domIdx === 2) {
                // Обработчик касания
                card.addEventListener('touchstart', function(e) {
                    var touch = e.changedTouches[0];
                    startX = touch.screenX;
                    startY = touch.screenY;
                    isTap = true;
                }, { passive: true });
                
                card.addEventListener('touchmove', function(e) {
                    var touch = e.changedTouches[0];
                    var deltaX = Math.abs(touch.screenX - startX);
                    var deltaY = Math.abs(touch.screenY - startY);
                    if (deltaX > 10 || deltaY > 10) {
                        isTap = false;
                    }
                }, { passive: true });
                
                card.addEventListener('touchend', function(e) {
                    if (isTap) {
                        e.preventDefault();
                        e.stopPropagation();
                        flipCard(card);
                    }
                    isTap = true;
                }, { passive: false });
                
                // Для мыши (отладка на десктопе)
                card.addEventListener('click', function(e) {
                    if (window.innerWidth <= 768) {
                        // На мобильных клик обрабатывается через touch
                        return;
                    }
                    flipCard(card);
                });
            } else {
                // Боковые карточки — переход по клику
                card.addEventListener('click', function(e) {
                    e.stopPropagation();
                    e.preventDefault();
                    
                    var newIndex = wordIdx;
                    if (newIndex < 0) newIndex = cardsList.length + newIndex;
                    if (newIndex >= cardsList.length) newIndex = newIndex - cardsList.length;
                    cardsIndex = newIndex;
                    cardsFlipped = false;
                    refreshCarousel();
                    updateCounter();
                });
            }
        });
    }
    
    // ===== ФУНКЦИЯ ПЕРЕВОРОТА КАРТОЧКИ =====
    function flipCard(card) {
        var word = cardsList[cardsIndex];
        var wordDiv = card.querySelector('.card-word');
        if (!wordDiv || !word) return;
        
        if (!cardsFlipped) {
            var displayText = AppConfig.show_language === 'de' 
                ? word.de + '\n\n➡️\n\n' + word.ru
                : word.ru + '\n\n➡️\n\n' + word.de;
            wordDiv.textContent = displayText;
        } else {
            var displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
            wordDiv.textContent = displayText;
        }
        cardsFlipped = !cardsFlipped;
    }
    
    var wrapper = document.getElementById('carouselWrapper');
    var track = document.getElementById('carouselTrack');
    
    if (track && wrapper) {
        containerWidth = wrapper.offsetWidth;
        refreshCarousel();
        
        // ===== ОБРАБОТКА СВАЙПА ДЛЯ ВСЕГО ТРЕКА =====
        track.addEventListener('touchstart', function(e) {
            isDragging = true;
            isSwiping = false;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
            track.style.transition = 'none';
        }, { passive: true });
        
        track.addEventListener('touchmove', function(e) {
            if (!isDragging) return;
            var touchCurrentX = e.changedTouches[0].screenX;
            var touchCurrentY = e.changedTouches[0].screenY;
            var deltaX = touchCurrentX - touchStartX;
            var deltaY = touchCurrentY - touchStartY;
            
            if (Math.abs(deltaX) > 10) {
                isSwiping = true;
            }
            
            track.style.transform = 'translateX(' + (currentTranslate + deltaX) + 'px)';
        }, { passive: true });
        
        track.addEventListener('touchend', function(e) {
            if (!isDragging) return;
            isDragging = false;
            
            var endX = e.changedTouches[0].screenX;
            var delta = endX - touchStartX;
            
            // Если был свайп — листаем
            if (isSwiping && Math.abs(delta) > minSwipeDistance) {
                if (delta > 0) {
                    cardsIndex = cardsIndex === 0 ? cardsList.length - 1 : cardsIndex - 1;
                } else {
                    cardsIndex = (cardsIndex + 1) % cardsList.length;
                }
                cardsFlipped = false;
                refreshCarousel();
                updateCounter();
            } else if (!isSwiping) {
                // Если не было свайпа — ничего не делаем, клик отработает сам
                // Но на всякий случай возвращаем позицию
                updateCarouselPosition(true);
            } else {
                updateCarouselPosition(true);
            }
            
            isSwiping = false;
        }, { passive: true });
    }
    
    document.getElementById('dirBtn').onclick = function() {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        refreshCarousel();
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('studyBtn').onclick = function() {
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('resetStartBtn').onclick = function() {
        if (cardsList.length) {
            cardsIndex = 0;
            cardsFlipped = false;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('containerBtn').onclick = function() {
        var studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showWordsContainer(studied);
    };
    
    document.getElementById('speakBtn').onclick = function() {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
    
    window.addEventListener('resize', function() {
        containerWidth = wrapper ? wrapper.offsetWidth : 0;
        updateCarouselPosition(false);
    });
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ СЛОВ ==========
function showWordsContainer(studiedWords) {
    window.ContainerManager.show({
        title: '📦 КОНТЕЙНЕР (' + studiedWords.length + ' слов)',
        items: studiedWords,
        getItems: getStudiedWordsList,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: function(word) { return word.de + ' — ' + word.ru; },
        onItemClick: function(word, idx, update) {
            unstudyWord(word);
            cardsList = getUnstudiedWords();
            if (window.utils && window.utils.isMobileDevice()) {
                refreshCarousel();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            update();
        },
        onReturnAll: function(update) {
            resetAllStudied();
            cardsList = getUnstudiedWords();
            if (window.utils && window.utils.isMobileDevice()) {
                refreshCarousel();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            update();
        }
    });
}
