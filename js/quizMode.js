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
        let msg = "Выберите слово для возврата:\n";
        studied.forEach((w, i) => msg += `${i+1}. ${w.de} - ${w.ru}\n`);
        const n = prompt(msg);
        if (n) {
            const idx = parseInt(n) - 1;
            if (idx >= 0 && idx < studied.length) {
                unstudyWord(studied[idx]);
                quizList = getUnstudiedWords();
                quizIndex = 0;
                showCurrentQuiz();
                updateCounter();
            }
        }
    };
    
    document.getElementById('quizResetBtn').onclick = () => {
        resetAllStudied();
        quizList = getUnstudiedWords();
        quizIndex = 0;
        showCurrentQuiz();
        updateCounter();
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
