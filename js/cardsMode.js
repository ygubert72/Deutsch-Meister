let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;
let isAnimating = false; // блокировка анимации во время переключения

// Переменные для свайпа
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
const minSwipeDistance = 50;

// Проверка, мобильное ли устройство (ширина экрана <= 768px)
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// Анимированное обновление карточки
function animateCardUpdate(callback) {
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
    
    const navigationButtons = isMobile ? '' : `
        <button class="ctrl-btn" id="prevBtn">◀ НАЗАД</button>
        <button class="ctrl-btn" id="nextBtn">ВПЕРЕД ▶</button>
    `;
    
    const swipeHint = isMobile ? '<div class="hint">👆 Свайп влево/вправо для листания карточек</div>' : '';
    
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
                ${navigationButtons}
            </div>
            ${swipeHint}
        </div>
    `;
    
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
        if (cardsIndex >= cardsList.length) cardsIndex = 0;
        const word = cardsList[cardsIndex];
        
        if (!cardsFlipped) {
            wordEl.textContent = AppConfig.show_language === 'de' ? word.de : word.ru;
        } else {
            if (AppConfig.show_language === 'de') {
                wordEl.textContent = `${word.de}\n\n➡️\n\n${word.ru}`;
            } else {
                wordEl.textContent = `${word.ru}\n\n➡️\n\n${word.de}`;
            }
        }
    }
    
    function updateCardDisplay() {
        animateCardUpdate(() => {
            updateCardDisplayContent();
        });
    }
    
    // ========== СВАЙПЫ (ТОЛЬКО ДЛЯ МОБИЛЬНЫХ) ==========
    if (isMobile) {
        const cardElement = document.getElementById('card');
        
        cardElement.addEventListener('touchstart', (e) => {
            if (isAnimating) return;
            touchStartX = e.changedTouches[0].screenX;
            touchStartY = e.changedTouches[0].screenY;
        });
        
        cardElement.addEventListener('touchend', (e) => {
            if (isAnimating) return;
            touchEndX = e.changedTouches[0].screenX;
            touchEndY = e.changedTouches[0].screenY;
            handleSwipe();
        });
        
        function handleSwipe() {
            const deltaX = touchEndX - touchStartX;
            const deltaY = touchEndY - touchStartY;
            
            if (Math.abs(deltaX) < Math.abs(deltaY)) return;
            if (Math.abs(deltaX) < minSwipeDistance) return;
            
            if (deltaX > 0) {
                // Свайп вправо - ПРЕДЫДУЩАЯ
                if (cardsList.length && cardsIndex > 0) {
                    cardsIndex--;
                    cardsFlipped = false;
                    updateCardDisplay();
                } else if (cardsList.length && cardsIndex === 0) {
                    cardsIndex = cardsList.length - 1;
                    cardsFlipped = false;
                    updateCardDisplay();
                }
            } else {
                // Свайп влево - СЛЕДУЮЩАЯ
                if (cardsList.length) {
                    cardsIndex = (cardsIndex + 1) % cardsList.length;
                    cardsFlipped = false;
                    updateCardDisplay();
                }
            }
        }
    }
    
    // ========== КНОПКИ НАВИГАЦИИ (ДЛЯ КОМПЬЮТЕРА) ==========
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (isAnimating) return;
            if (cardsList.length && cardsIndex > 0) {
                cardsIndex--;
                cardsFlipped = false;
                updateCardDisplay();
            } else if (cardsList.length && cardsIndex === 0) {
                cardsIndex = cardsList.length - 1;
                cardsFlipped = false;
                updateCardDisplay();
            }
        };
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (isAnimating) return;
            if (cardsList.length) {
                cardsIndex = (cardsIndex + 1) % cardsList.length;
                cardsFlipped = false;
                updateCardDisplay();
            }
        };
    }
    
    // ========== ОБЩИЕ ОБРАБОТЧИКИ ==========
    document.getElementById('dirBtn').onclick = () => {
        if (isAnimating) return;
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        updateCardDisplay();
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    const cardElement = document.getElementById('card');
    cardElement.onclick = () => {
        if (isAnimating) return;
        if (cardsList.length) {
            cardsFlipped = !cardsFlipped;
            updateCardDisplay();
        }
    };
    
    document.getElementById('studyBtn').onclick = () => {
        if (isAnimating) return;
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            if (cardsIndex >= cardsList.length && cardsList.length) cardsIndex = 0;
            cardsFlipped = false;
            updateCardDisplay();
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
    
    updateCardDisplayContent();
    updateCounter();
}

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА И ВОЗВРАТА ИЗУЧЕННЫХ СЛОВ ==========
function showStudiedWordsModal(studiedWords) {
    const oldModal = document.getElementById('studiedWordsModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'studiedWordsModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000000;
        overflow: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
    `;
    
    let itemsHtml = '';
    studiedWords.forEach((word, idx) => {
        const safeDe = word.de.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const safeRu = word.ru.replace(/'/g, "\\'").replace(/"/g, '&quot;');
        itemsHtml += `
            <button class="studied-word-item" data-index="${idx}" style="
                width: 100%;
                text-align: left;
                padding: 12px 15px;
                background: #E8F0FE;
                border: none;
                border-bottom: 1px solid #ddd;
                cursor: pointer;
                font-size: 14px;
            ">
                <strong>${safeDe}</strong> — ${safeRu}
            </button>
        `;
    });
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">📦 КОНТЕЙНЕР (${studiedWords.length} слов)</h3>
            <button id="closeModalBtn" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
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
    
    document.getElementById('closeModalBtn').onclick = closeModal;
    document.getElementById('cancelModalBtn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm("Вы уверены? Все слова из контейнера будут возвращены в изучение.")) {
            resetAllStudied();
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            cardsFlipped = false;
            updateCardDisplay();
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
            updateCardDisplay();
            updateCounter();
            const updatedStudied = getStudiedWordsList();
            if (updatedStudied.length === 0) {
                closeModal();
                alert("📦 Контейнер пуст");
            } else {
                btn.remove();
                const header = modalContent.querySelector('h3');
                if (header) header.textContent = `📦 КОНТЕЙНЕР (${updatedStudied.length} слов)`;
            }
        };
    });
}
