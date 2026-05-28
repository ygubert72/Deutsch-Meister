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
        let msg = "Выберите слово для возврата:\n";
        studied.forEach((w, i) => msg += `${i+1}. ${w.de} - ${w.ru}\n`);
        const n = prompt(msg);
        if (n) {
            const idx = parseInt(n) - 1;
            if (idx >= 0 && idx < studied.length) {
                unstudyWord(studied[idx]);
                cardsList = getUnstudiedWords();
                updateCardDisplay();
                updateCounter();
            }
        }
    };
    
    document.getElementById('resetBtn').onclick = () => {
        resetAllStudied();
        cardsList = getUnstudiedWords();
        cardsIndex = 0;
        cardsFlipped = false;
        updateCardDisplay();
        updateCounter();
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
