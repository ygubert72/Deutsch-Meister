let quizList = [];
let quizIndex = 0;
let quizCurrentWord = null;
let quizOptionsList = [];
let quizCorrectAnswer = '';

function renderQuiz() {
    quizList = getUnstudiedWords();
    quizIndex = 0;
    
    document.getElementById('content').innerHTML = `
        <div style="text-align: center;">
            <button class="dir-btn" id="quizDirBtn">${AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De'}</button>
            <div class="quiz-question" id="quizQuestion"></div>
            <div class="quiz-grid" id="quizGrid"></div>
            <div class="btn-group">
                <button class="ctrl-btn" id="quizStudyBtn">В ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="quizUnstudyBtn">ВЕРНУТЬ</button>
                <button class="ctrl-btn" id="quizResetBtn">ВЕРНУТЬ ВСЕ</button>
                <button class="ctrl-btn" id="quizPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="quizNextBtn">ВПЕРЕД ▶</button>
            </div>
            <div class="hint" id="quizProgress"></div>
        </div>
    `;
    
    function showCurrentQuiz() {
        if (!quizList.length) {
            document.getElementById('quizQuestion').textContent = "🎉 Все слова изучены!";
            document.getElementById('quizGrid').innerHTML = '';
            return;
        }
        if (quizIndex >= quizList.length) quizIndex = 0;
        quizCurrentWord = quizList[quizIndex];
        
        const allWords = wordsDB[AppConfig.currentLevel] || [];
        const otherWords = allWords.filter(w => w.de !== quizCurrentWord.de);
        const shuffled = [...otherWords];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        quizOptionsList = [quizCurrentWord, ...shuffled.slice(0, 5)];
        for (let i = quizOptionsList.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [quizOptionsList[i], quizOptionsList[j]] = [quizOptionsList[j], quizOptionsList[i]];
        }
        
        if (AppConfig.quiz_direction === 'de_to_ru') {
            document.getElementById('quizQuestion').textContent = quizCurrentWord.de;
            quizCorrectAnswer = quizCurrentWord.ru;
        } else {
            document.getElementById('quizQuestion').textContent = quizCurrentWord.ru;
            quizCorrectAnswer = quizCurrentWord.de;
        }
        
        const grid = document.getElementById('quizGrid');
        grid.innerHTML = '';
        quizOptionsList.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-opt';
            btn.textContent = AppConfig.quiz_direction === 'de_to_ru' ? opt.ru : opt.de;
            btn.onclick = () => {
                const isCorrect = AppConfig.quiz_direction === 'de_to_ru' 
                    ? (opt.ru === quizCorrectAnswer) 
                    : (opt.de === quizCorrectAnswer);
                if (isCorrect) {
                    btn.classList.add('correct');
                    setTimeout(() => {
                        quizIndex = (quizIndex + 1) % quizList.length;
                        showCurrentQuiz();
                    }, 400);
                } else {
                    btn.classList.add('wrong');
                    setTimeout(() => btn.classList.remove('wrong'), 500);
                }
            };
            grid.appendChild(btn);
        });
        
        document.getElementById('quizProgress').textContent = `Текущее слово: ${quizIndex+1} из ${quizList.length}`;
    }
    
    document.getElementById('quizDirBtn').onclick = () => {
        AppConfig.quiz_direction = AppConfig.quiz_direction === 'de_to_ru' ? 'ru_to_de' : 'de_to_ru';
        showCurrentQuiz();
        document.getElementById('quizDirBtn').textContent = AppConfig.quiz_direction === 'de_to_ru' ? 'De → Ru' : 'Ru → De';
        saveProgress();
    };
    
    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizCurrentWord) {
            markWordAsStudied(quizCurrentWord);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    };
    
    document.getElementById('quizUnstudyBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { alert("Нет изученных слов"); return; }
        showWordReturnModalQuiz(studied, (word) => {
            unstudyWord(word);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        });
    };
    
    document.getElementById('quizResetBtn').onclick = () => {
        if (confirm("Вы уверены? Все изученные слова будут возвращены.")) {
            resetAllStudied();
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    };
    
    document.getElementById('quizPrevBtn').onclick = () => {
        if (quizList.length && quizIndex > 0) {
            quizIndex--;
            showCurrentQuiz();
        }
    };
    
    document.getElementById('quizNextBtn').onclick = () => {
        if (quizList.length) {
            quizIndex = (quizIndex + 1) % quizList.length;
            showCurrentQuiz();
        }
    };
    
    showCurrentQuiz();
    updateCounter();
}

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ ВЫБОРА СЛОВА (QUIZ) ==========
function showWordReturnModalQuiz(wordsList, onSelect) {
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
