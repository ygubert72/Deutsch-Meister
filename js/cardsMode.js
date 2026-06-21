// cardsMode.js — упрощённая версия с использованием containerManager и carousel

let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;
let isAnimating = false;
let cardsCarousel = null;

function renderCards() {
    cardsList = getUnstudiedWords();
    cardsIndex = 0;
    cardsFlipped = false;
    
    if (window.utils.isMobileDevice()) {
        renderCardsMobile();
    } else {
        renderCardsDesktop();
    }
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
    
    updateCardDisplayContent();
    attachDesktopEvents();
}

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
        wordEl.textContent = studiedCount > 0 
            ? "🎉 Все слова в контейнере!\n\nНажмите 'В КОНТЕЙНЕР' чтобы просмотреть\nили вернуть слова"
            : "🎉 Все слова изучены!\n\nВыберите другой уровень";
        return;
    }
    wordEl.textContent = getCurrentWordText();
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

function attachDesktopEvents() {
    // Навигация
    document.getElementById('prevBtn').onclick = () => {
        if (cardsList.length) {
            cardsIndex = cardsIndex === 0 ? cardsList.length - 1 : cardsIndex - 1;
            cardsFlipped = false;
            animateFade(() => { updateCardDisplayContent(); updateCounter(); });
        }
    };
    
    document.getElementById('nextBtn').onclick = () => {
        if (cardsList.length) {
            cardsIndex = (cardsIndex + 1) % cardsList.length;
            cardsFlipped = false;
            animateFade(() => { updateCardDisplayContent(); updateCounter(); });
        }
    };
    
    document.getElementById('resetStartBtn').onclick = () => {
        if (cardsList.length) {
            cardsIndex = 0;
            cardsFlipped = false;
            animateFade(() => { updateCardDisplayContent(); updateCounter(); });
        }
    };
    
    // Направление
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        animateFade(() => updateCardDisplayContent());
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    // Карточка
    document.getElementById('card').onclick = () => {
        if (isAnimating || !cardsList.length) return;
        cardsFlipped = !cardsFlipped;
        animateFade(() => updateCardDisplayContent());
    };
    
    // Изучено
    document.getElementById('studyBtn').onclick = () => {
        if (isAnimating || !cardsList.length || !cardsList[cardsIndex]) return;
        markWordAsStudied(cardsList[cardsIndex]);
        cardsList = getUnstudiedWords();
        cardsIndex = cardsList.length ? 0 : 0;
        cardsFlipped = false;
        animateFade(() => { updateCardDisplayContent(); updateCounter(); });
    };
    
    // Контейнер
    document.getElementById('containerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) {
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.");
            return;
        }
        showWordsContainer(studied);
    };
    
    // Озвучка
    document.getElementById('speakBtn').onclick = () => {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
}

// ========== МОБИЛЬНАЯ ВЕРСИЯ (с использованием Carousel) ==========
function renderCardsMobile() {
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div id="carouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                <div id="carouselTrack" style="display: flex; will-change: transform;"></div>
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
    
    // Инициализируем карусель
    if (cardsCarousel) cardsCarousel.destroy();
    
    cardsCarousel = new window.Carousel({
        containerId: 'carouselWrapper',
        trackId: 'carouselTrack',
        initialIndex: 0,
        getItems: () => cardsList,
        emptyMessage: '🎉 Все слова изучены!',
        renderItem: (word, idx) => {
            const displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
            return `
                <div style="background: #FFFFFF; border-radius: 20px; box-shadow: 0 8px 24px rgba(0,0,0,0.1); min-height: 220px; display: flex; align-items: center; justify-content: center; text-align: center; padding: 20px;">
                    <div style="font-size: 22px; font-weight: bold; color: #1A1A1A; white-space: pre-wrap;">${displayText}</div>
                </div>
            `;
        },
        onSlideClick: (word, idx) => {
            // Переворот карточки
            const slides = document.querySelectorAll('#carouselTrack .carousel-slide');
            const centerSlide = slides[2];
            if (!centerSlide) return;
            const wordDiv = centerSlide.querySelector('div > div');
            if (!wordDiv) return;
            
            if (!cardsFlipped) {
                wordDiv.textContent = AppConfig.show_language === 'de' 
                    ? `${word.de}\n\n➡️\n\n${word.ru}`
                    : `${word.ru}\n\n➡️\n\n${word.de}`;
            } else {
                wordDiv.textContent = AppConfig.show_language === 'de' ? word.de : word.ru;
            }
            cardsFlipped = !cardsFlipped;
        },
        onSlideChange: (word, idx) => {
            cardsIndex = idx;
            cardsFlipped = false;
            updateCounter();
        }
    });
    
    attachMobileEvents();
}

function attachMobileEvents() {
    // Направление
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        if (cardsCarousel) cardsCarousel.refresh();
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    // Изучено
    document.getElementById('studyBtn').onclick = () => {
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            if (cardsCarousel) cardsCarousel.refresh();
            updateCounter();
        }
    };
    
    // В начало
    document.getElementById('resetStartBtn').onclick = () => {
        if (cardsList.length) {
            cardsIndex = 0;
            cardsFlipped = false;
            if (cardsCarousel) cardsCarousel.goTo(0);
            updateCounter();
        }
    };
    
    // Контейнер
    document.getElementById('containerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) {
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь.");
            return;
        }
        showWordsContainer(studied);
    };
    
    // Озвучка
    document.getElementById('speakBtn').onclick = () => {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
}

// ========== УНИВЕРСАЛЬНЫЙ КОНТЕЙНЕР ДЛЯ СЛОВ ==========
function showWordsContainer(studiedWords) {
    window.ContainerManager.show({
        title: `📦 КОНТЕЙНЕР (${studiedWords.length} слов)`,
        items: studiedWords,
        getItems: getStudiedWordsList,
        emptyMessage: '📭 Контейнер пуст',
        itemTemplate: (word) => `${word.de} — ${word.ru}`,
        onItemClick: (word, idx, update) => {
            unstudyWord(word);
            cardsList = getUnstudiedWords();
            if (window.utils.isMobileDevice()) {
                if (cardsCarousel) cardsCarousel.refresh();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            update();
        },
        onReturnAll: (update) => {
            resetAllStudied();
            cardsList = getUnstudiedWords();
            if (window.utils.isMobileDevice()) {
                if (cardsCarousel) cardsCarousel.refresh();
            } else {
                updateCardDisplayContent();
            }
            updateCounter();
            update();
        }
    });
}

// Сохраняем старую функцию для обратной совместимости
function showStudiedWordsModal(words) {
    showWordsContainer(words);
}
