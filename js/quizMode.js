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
                <button class="ctrl-btn" id="quizStudyBtn">ИЗУЧЕНО</button>
                <button class="ctrl-btn" id="quizContainerBtn">В КОНТЕЙНЕР</button>
                <button class="ctrl-btn" id="quizPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="quizNextBtn">ВПЕРЕД ▶</button>
            </div>
            <div class="hint" id="quizProgress"></div>
        </div>
    `;
    
    function showCurrentQuiz() {
        if (!quizList.length) {
            const studiedCount = getStudiedWordsList().length;
            if (studiedCount > 0) {
                document.getElementById('quizQuestion').textContent = "🎉 Все слова в контейнере!";
                document.getElementById('quizGrid').innerHTML = '<div style="text-align:center; padding:20px;">Нажмите "В КОНТЕЙНЕР" чтобы просмотреть или вернуть слова</div>';
            } else {
                document.getElementById('quizQuestion').textContent = "🎉 Все слова изучены!";
                document.getElementById('quizGrid').innerHTML = '';
            }
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
    
    // Кнопка "ИЗУЧЕНО" - перемещает слово в контейнер (изученные)
    document.getElementById('quizStudyBtn').onclick = () => {
        if (quizCurrentWord) {
            markWordAsStudied(quizCurrentWord);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
        }
    };
    
    // Кнопка "В КОНТЕЙНЕР" - открывает модальное окно со списком изученных слов
    document.getElementById('quizContainerBtn').onclick = () => {
        const studied = getStudiedWordsList();
        if (!studied.length) { 
            alert("📦 Контейнер пуст\n\nВыучите слова, чтобы они появились здесь."); 
            return; 
        }
        showStudiedWordsModalQuiz(studied);
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

// ========== МОДАЛЬНОЕ ОКНО ДЛЯ ПРОСМОТРА И ВОЗВРАТА ИЗУЧЕННЫХ СЛОВ (QUIZ) ==========
function showStudiedWordsModalQuiz(studiedWords) {
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
    
    // Возврат всех слов
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm("Вы уверены? Все слова из контейнера будут возвращены в изучение.")) {
            resetAllStudied();
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
            updateCounter();
            closeModal();
        }
    };
    
    // Возврат отдельного слова
    document.querySelectorAll('.studied-word-item').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            const word = studiedWords[idx];
            unstudyWord(word);
            quizList = getUnstudiedWords();
            quizIndex = 0;
            showCurrentQuiz();
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
