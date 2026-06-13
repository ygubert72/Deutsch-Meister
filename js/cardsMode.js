let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;
let isAnimating = false;

// Переменные для карусели
let touchStartX = 0;
let dragOffset = 0;
let isDragging = false;
let containerWidth = 0;
let currentIndex = 2; // индекс центральной карточки в массиве DOM (0-4)
const minSwipeDistance = 50;
const snapDuration = 250;

function isMobileDevice() {
    return window.innerWidth <= 768;
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
    
    if (isMobileDevice()) {
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
            cardsIndex = cardsIndex === 0 ? cardsList.length - 1 : cardsIndex - 1;
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
    
    function goToStart() {
        if (cardsList.length) {
            cardsIndex = 0;
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
    document.getElementById('resetStartBtn').onclick = goToStart;
    
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        animateFade(() => updateCardDisplayContent());
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('card').onclick = () => {
        if (isAnimating) return;
        if (cardsList.length) {
            cardsFlipped = !cardsFlipped;
            animateFade(() => updateCardDisplayContent());
        }
    };
    
    document.getElementById('studyBtn').onclick = () => {
        if (isAnimating) return;
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            cardsIndex = cardsList.length ? 0 : 0;
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
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
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
        
        const total = cardsList.length;
        let html = '';
        for (let i = -2; i <= 2; i++) {
            let idx = cardsIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            const word = cardsList[idx];
            const displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
            html += `
                <div class="card" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%;">
                    <div class="card-word">${displayText}</div>
                </div>
            `;
        }
        return html;
    }
    
    function updateCarouselPosition(animate = true) {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        if (!animate) track.style.transition = 'none';
        else track.style.transition = `transform ${snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        
        const offset = -2 * containerWidth;
        track.style.transform = `translateX(${offset}px)`;
        
        if (!animate) setTimeout(() => { if (track) track.style.transition = ''; }, 50);
    }
    
    function refreshCarousel() {
        const track = document.getElementById('carouselTrack');
        if (!track) return;
        track.innerHTML = generateCarouselCards();
        updateCarouselPosition(false);
        attachCardEvents();
    }
    
    function attachCardEvents() {
        const cards = document.querySelectorAll('#carouselTrack .card');
        cards.forEach((card, domIdx) => {
            const wordIdx = parseInt(card.getAttribute('data-idx'));
            // Переворот только для центральной карточки
            if (domIdx === 2) {
                card.onclick = () => {
                    const word = cardsList[cardsIndex];
                    const wordDiv = card.querySelector('.card-word');
                    if (!cardsFlipped) {
                        wordDiv.textContent = AppConfig.show_language === 'de' 
                            ? `${word.de}\n\n➡️\n\n${word.ru}`
                            : `${word.ru}\n\n➡️\n\n${word.de}`;
                    } else {
                        wordDiv.textContent = AppConfig.show_language === 'de' ? word.de : word.ru;
                    }
                    cardsFlipped = !cardsFlipped;
                };
            } else {
                card.onclick = () => {
                    let newIndex = wordIdx;
                    if (newIndex < 0) newIndex = cardsList.length + newIndex;
                    if (newIndex >= cardsList.length) newIndex = newIndex - cardsList.length;
                    cardsIndex = newIndex;
                    cardsFlipped = false;
                    refreshCarousel();
                    updateCounter();
                };
            }
        });
    }
    
    const wrapper = document.getElementById('carouselWrapper');
    const track = document.getElementById('carouselTrack');
    if (track && wrapper) {
        containerWidth = wrapper.offsetWidth;
        updateCarouselPosition(false);
        attachCardEvents();
        
        track.addEventListener('touchstart', (e) => {
            if (isAnimating) return;
            isDragging = true;
            touchStartX = e.changedTouches[0].screenX;
            track.style.transition = 'none';
        });
        
        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const touchCurrentX = e.changedTouches[0].screenX;
            const delta = touchCurrentX - touchStartX;
            let newTransform = (-2 * containerWidth) + delta;
            track.style.transform = `translateX(${newTransform}px)`;
        });
        
        track.addEventListener('touchend', (e) => {
            if (!isDragging) return;
            isDragging = false;
            const endX = e.changedTouches[0].screenX;
            const delta = endX - touchStartX;
            
            if (Math.abs(delta) > minSwipeDistance) {
                if (delta > 0) {
                    // вправо — предыдущая
                    cardsIndex = cardsIndex === 0 ? cardsList.length - 1 : cardsIndex - 1;
                } else {
                    // влево — следующая
                    cardsIndex = (cardsIndex + 1) % cardsList.length;
                }
                cardsFlipped = false;
                refreshCarousel();
                updateCounter();
            } else {
                updateCarouselPosition(true);
            }
            dragOffset = 0;
        });
    }
    
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
    
    document.getElementById('resetStartBtn').onclick = () => {
        if (cardsList.length) {
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

// Модальное окно контейнера (без крестика)
function showStudiedWordsModal(studiedWords) {
    const oldModal = document.getElementById('studiedWordsModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'studiedWordsModal';
    modal.style.cssText = `position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;`;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `background:white; border-radius:20px; max-width:500px; width:90%; max-height:80vh; display:flex; flex-direction:column; margin:20px;`;
    
    let itemsHtml = '';
    studiedWords.forEach((word, idx) => {
        const safeDe = word.de.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRu = word.ru.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        itemsHtml += `<button class="studied-word-item" data-index="${idx}" style="width:100%; text-align:left; padding:12px 15px; background:#E8F0FE; border:none; border-bottom:1px solid #ddd; cursor:pointer; font-size:14px;"><strong>${safeDe}</strong> — ${safeRu}</button>`;
    });
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">
            <h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studiedWords.length} слов)</h3>
        </div>
        <div style="overflow-y: auto; flex: 1; padding: 10px 0;">
            ${itemsHtml}
        </div>
        <div style="padding: 15px; border-top: 1px solid #ddd; display: flex; gap: 10px;">
            <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 ВЕРНУТЬ ВСЁ</button>
            <button id="cancelModalBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    document.getElementById('cancelModalBtn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    // Вернуть всё — сразу обновляем интерфейс и закрываем
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm("Вы уверены? Все слова из контейнера будут возвращены в изучение.")) {
            resetAllStudied();
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            cardsFlipped = false;
            if (isMobileDevice()) {
                refreshCarousel();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            closeModal();
        }
    };
    
    document.querySelectorAll('.studied-word-item').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const word = studiedWords[idx];
            unstudyWord(word);
            cardsList = getUnstudiedWords();
            if (isMobileDevice()) {
                refreshCarousel();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            btn.remove();
            const header = modalContent.querySelector('h3');
            if (header) header.textContent = `📦 КОНТЕЙНЕР (${getStudiedWordsList().length} слов)`;
            if (getStudiedWordsList().length === 0) closeModal();
        };
    });
}
