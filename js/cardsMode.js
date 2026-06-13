let cardsList = [];
let cardsIndex = 0;
let cardsFlipped = false;

function renderCards() {
    cardsList = getUnstudiedWords();
    cardsIndex = 0;
    cardsFlipped = false;
    
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="dirBtn">${AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De'}</button>
            <div class="card" id="card">
                <div class="card-word" id="cardWord"></div>
            </div>
            <div class="btn-group">
                <button class="ctrl-btn" id="studyBtn">В ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="unstudyBtn">ВЕРНУТЬ</button>
                <button class="ctrl-btn" id="resetBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="ctrl-btn" id="speakBtn">🔊</button>
                <button class="ctrl-btn" id="prevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="nextBtn">ВПЕРЕД ▶</button>
            </div>
            <div class="hint">Нажмите на карточку для перевода</div>
        </div>
    `;
    
    function updateCardDisplay() {
        const wordEl = document.getElementById('cardWord');
        if (!cardsList.length) {
            wordEl.textContent = "🎉 Все слова изучены!\n\nВерните слова из 'Изучено' или\nвыберите другой уровень";
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
    
    document.getElementById('dirBtn').onclick = () => {
        AppConfig.show_language = AppConfig.show_language === 'de' ? 'ru' : 'de';
        cardsFlipped = false;
        updateCardDisplay();
        document.getElementById('dirBtn').textContent = AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('card').onclick = () => {
        if (cardsList.length) {
            cardsFlipped = !cardsFlipped;
            updateCardDisplay();
        }
    };
    
    document.getElementById('studyBtn').onclick = () => {
        if (cardsList.length && cardsList[cardsIndex]) {
            markWordAsStudied(cardsList[cardsIndex]);
            cardsList = getUnstudiedWords();
            if (cardsIndex >= cardsList.length && cardsList.length) cardsIndex = 0;
            cardsFlipped = false;
            updateCardDisplay();
            updateCounter();
        }
    };
    
    document.getElementById('unstudyBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { alert("Нет изученных слов"); return; }
        showWordReturnModal(studied, (word) => {
            unstudyWord(word);
            cardsList = getUnstudiedWords();
            updateCardDisplay();
            updateCounter();
        });
    };
    
    document.getElementById('resetBtn').onclick = () => {
        if (confirm("Вы уверены? Все изученные слова будут возвращены.")) {
            resetAllStudied();
            cardsList = getUnstudiedWords();
            cardsIndex = 0;
            cardsFlipped = false;
            updateCardDisplay();
            updateCounter();
        }
    };
    
    document.getElementById('speakBtn').onclick = () => {
        if (cardsList[cardsIndex]) speak(cardsList[cardsIndex].de);
    };
    
    document.getElementById('prevBtn').onclick = () => {
        if (cardsList.length && cardsIndex > 0) {
            cardsIndex--;
            cardsFlipped = false;
            updateCardDisplay();
        }
    };
    
    document.getElementById('nextBtn').onclick = () => {
        if (cardsList.length) {
            cardsIndex = (cardsIndex + 1) % cardsList.length;
            cardsFlipped = false;
            updateCardDisplay();
        }
    };
    
    updateCardDisplay();
    updateCounter();
}

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ ВЫБОРА СЛОВА ==========
function showWordReturnModal(wordsList, onSelect) {
    // Удаляем старый модал, если есть
    const oldModal = document.getElementById('wordReturnModal');
    if (oldModal) oldModal.remove();
    
    const modal = document.createElement('div');
    modal.id = 'wordReturnModal';
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
    wordsList.forEach((word, idx) => {
        itemsHtml += `
            <button class="word-return-item" data-index="${idx}" style="
                width: 100%;
                text-align: left;
                padding: 12px 15px;
                background: #E8F0FE;
                border: none;
                border-bottom: 1px solid #ddd;
                cursor: pointer;
                font-size: 14px;
            ">
                <strong>${word.de}</strong> — ${word.ru}
            </button>
        `;
    });
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="margin: 0;">📖 Выберите слово для возврата</h3>
            <button id="closeWordModalBtn" style="background: none; border: none; font-size: 24px; cursor: pointer;">&times;</button>
        </div>
        <div style="overflow-y: auto; flex: 1; padding: 10px 0;">
            ${itemsHtml}
        </div>
        <div style="padding: 15px; border-top: 1px solid #ddd;">
            <button id="cancelWordModalBtn" style="width: 100%; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">Отмена</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    const closeModal = () => modal.remove();
    
    document.getElementById('closeWordModalBtn').onclick = closeModal;
    document.getElementById('cancelWordModalBtn').onclick = closeModal;
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };
    
    document.querySelectorAll('.word-return-item').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const selectedWord = wordsList[idx];
            closeModal();
            onSelect(selectedWord);
        };
    });
}
