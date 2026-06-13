let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;
let isAnimating = false;

// Переменные для карусели
let touchStartX = 0;
let touchCurrentX = 0;
let dragOffset = 0;
let isDragging = false;
let containerWidth = 0;
let currentTranslate = 0;
let animationFrameId = null;
const minSwipeDistance = 50;
const snapDuration = 300;

// Проверка, мобильное ли устройство
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Анимация затухания для компьютера
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
    
    setTimeout(() => {
        if (callback) callback();
        cardWord.style.opacity = '1';
        setTimeout(() => {
            cardWord.style.transition = '';
            isAnimating = false;
        }, 150);
    }, 150);
}

function renderCards() {
    cardsList = getUnstudiedWords();
    cardsIndex = 0;
    cardsFlipped = false;
    
    const isMobile = isMobileDevice();
    
    if (isMobile) {
        renderCardsMobile();
    } else {
        renderCardsDesktop();
    }
}

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
                return `${word.de}\n\n➡️\n\n${word.ru}`;
            } else {
                return `${word.ru}\n\n➡️\n\n${word.de}`;
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
            if (cardsIndex > 0) {
                cardsIndex--;
            } else {
                cardsIndex = cardsList.length - 1;
            }
            cardsFlipped = false;
            animateFade(() => {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    }
    
    function goToNextCard() {
        if (cardsList.length) {
            cardsIndex = (cardsIndex + 1) % cardsList.length;
            cardsFlipped = false;
            animateFade(() => {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    }
    
    updateCardDisplayContent();
    
    document.getElementById('prevBtn').onclick = goToPrevCard;
    document.getElementById('nextBtn').onclick = goToNextCard;
    
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        animateFade(() => {
            updateCardDisplayContent();
        });
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('card').onclick = () => {
        if (isAnimating) return;
        if (cardsList.length) {
            cardsFlipped = !cardsFlipped;
            animateFade(() => {
                updateCardDisplayContent();
            });
        }
    };
    
    document.getElementById('studyBtn').onclick = () => {
        if (isAnimating) return;
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            if (cardsIndex >= cardsList.length && cardsList.length) cardsIndex = 0;
            cardsFlipped = false;
            animateFade(() => {
                updateCardDisplayContent();
                updateCounter();
            });
        }
    };
    
    document.getElementById('containerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showStudiedWordsModal(studied);
    };
    
    document.getElementById('speakBtn').onclick = () => {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
}

function renderCardsMobile() {
    // Создаём HTML для карусели
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; transition: transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform; cursor: grab;">
                    ${generateCarouselCards()}
                </div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="studyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="containerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="speakBtn">🔊</button>
            </div>
            <div class="hint">👆 Свайп влево/вправо для листания карточек</div>
        </div>
    `;
    
    function generateCarouselCards() {
        if (!cardsList.length) {
            return `<div class="card" style="flex: 0 0 100%; min-width: 100%; margin: 0 5px;"><div class="card-word">🎉 Все слова изучены!</div></div>`;
        }
        
        // Создаём 5 карточек для плавной прокрутки (текущая + по 2 в каждую сторону)
        const totalCards = cardsList.length;
        let cardsHtml = '';
        
        // Карточки слева (предыдущие)
        for (let i = -2; i <= 2; i++) {
            let cardIdx = cardsIndex + i;
            if (cardIdx < 0) cardIdx = totalCards + cardIdx;
            if (cardIdx >= totalCards) cardIdx = cardIdx - totalCards;
            
            const word = cardsList[cardIdx];
            const displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
            cardsHtml += `
                <div class="card" data-index="${cardIdx}" style="flex: 0 0 100%; min-width: 100%; margin: 0 5px; cursor: grab;">
                    <div class="card-word">${displayText}</div>
                </div>
            `;
        }
        
        return cardsHtml;
    }
    
    function updateCarouselPosition(animate = true) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        
        if (!animate) {
            track.style.transition = 'none';
        } else {
            track.style.transition = `transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        }
        
        // Центрируем на второй карточке (индекс 2 из 5)
        const offset = -2 * containerWidth;
        track.style.transform = `translateX(${offset}px)`;
        currentTranslate = offset;
        
        if (!animate) {
            setTimeout(() => {
                if (track) track.style.transition = '';
            }, 50);
        }
    }
    
    function refreshCarousel() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        
        // Сохраняем текущую позицию прокрутки
        const wasAnimating = track.style.transition !== 'none';
        
        // Генерируем новые карточки
        track.innerHTML = generateCarouselCards();
        
        // Обновляем позицию без анимации
        updateCarouselPosition(false);
        
        // Перепривязываем обработчики кликов для переворота
        attachCardFlipEvents();
    }
    
    function attachCardFlipEvents() {
        const cards = document.querySelectorAll('#carouselTrack .card');
        cards.forEach(card => {
            card.onclick = (e) => {
                e.stopPropagation();
                const cardIdx = parseInt(card.getAttribute('data-index'));
                if (!isNaN(cardIdx) && cardIdx === cardsIndex) {
                    // Переворачиваем только центральную карточку
                    const word = cardsList[cardsIndex];
                    const wordEl = card.querySelector('.card-word');
                    if (!cardsFlipped) {
                        wordEl.textContent = AppConfig.show_language === 'de' 
                            ? `${word.de}\n\n➡️\n\n${word.ru}`
                            : `${word.ru}\n\n➡️\n\n${word.de}`;
                    } else {
                        wordEl.textContent = AppConfig.show_language === 'de' ? word.de : word.ru;
                    }
                    cardsFlipped = !cardsFlipped;
                }
            };
        });
    }
    
    function snapToNearestCard() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        
        // Определяем, на сколько карточек сдвинулись
        const cardWidth = containerWidth;
        const shiftCards = Math.round(-currentTranslate / cardWidth) - 2;
        
        if (Math.abs(shiftCards) > 0) {
            // Меняем индекс
            let newIndex = cardsIndex + shiftCards;
            if (newIndex < 0) newIndex = cardsList.length + newIndex;
            if (newIndex >= cardsList.length) newIndex = newIndex - cardsList.length;
            cardsIndex = newIndex;
            cardsFlipped = false;
            
            // Обновляем карусель
            refreshCarousel();
            updateCounter();
        } else {
            // Возвращаем на место
            updateCarouselPosition(true);
        }
    }
    
    // Инициализация карусели
    const wrapper = document.getElementById('carouselWrapper');
    const track = document.getElementById('carouselTrack');
    
    if (track && wrapper) {
        containerWidth = wrapper.offsetWidth;
        updateCarouselPosition(false);
        attachCardFlipEvents();
        
        // Обработчики свайпов
        track.addEventListener('touchstart', (e) => {
            if (isAnimating) return;
            isDragging = true;
            touchStartX = e.changedTouches[0].screenX;
            track.style.transition = 'none';
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        });
        
        track.addEventListener('touchmove', (e) => {
            if (!isDragging || isAnimating) return;
            touchCurrentX = e.changedTouches[0].screenX;
            dragOffset = touchCurrentX - touchStartX;
            
            // Плавное движение за пальцем
            const newTranslate = currentTranslate + dragOffset;
            track.style.transform = `translateX(${newTranslate}px)`;
        });
        
        track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            // Определяем направление и расстояние
            if (Math.abs(dragOffset) > minSwipeDistance) {
                // Меняем карточку
                if (dragOffset > 0) {
                    // Свайп вправо - предыдущая
                    let newIndex = cardsIndex - 1;
                    if (newIndex < 0) newIndex = cardsList.length - 1;
                    cardsIndex = newIndex;
                } else {
                    // Свайп влево - следующая
                    cardsIndex = (cardsIndex + 1) % cardsList.length;
                }
                cardsFlipped = false;
                refreshCarousel();
                updateCounter();
            } else {
                // Возвращаем на место
                updateCarouselPosition(true);
            }
            
            dragOffset = 0;
        });
    }
    
    // Обработчики кнопок
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        refreshCarousel();
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('studyBtn').onclick = () => {
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            cardsFlipped = false;
            refreshCarousel();
            updateCounter();
        }
    };
    
    document.getElementById('containerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showStudiedWordsModal(studied);
    };
    
    document.getElementById('speakBtn').onclick = () => {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
    
    window.addEventListener('resize', () => {
        containerWidth = wrapper?.offsetWidth || 0;
        updateCarouselPosition(false);
    });
}

// ... (модальное окно showStudiedWordsModal остаётся без изменений)
