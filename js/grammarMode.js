// ============================================================
// grammarMode.js - Режим ГРАММАТИКА
// ============================================================

// Объявляем ВСЕ переменные ПЕРЕД их использованием
let grammarDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let grammarProgress = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let currentGrammarLesson = null;
let currentGrammarMode = 'theory';
window.currentGrammarLesson = null;
window.currentGrammarMode = 'theory';

let grammarExercises = [];
let currentGrammarExerciseIndex = 0;
let grammarBlinkTimer = null;

// Загрузка грамматики из JSON файлов
async function loadGrammarData() {
    console.log('loadGrammarData: началась загрузка');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    
    for (const level of levels) {
        try {
            let url = `docs/grammar/${level}.json`;
            let resp = await fetch(url);
            
            if (!resp.ok) {
                url = `/Deutsch-Meister/docs/grammar/${level}.json`;
                resp = await fetch(url);
            }
            
            if (resp.ok) {
                grammarDB[level] = await resp.json();
                console.log(`✅ Загружен ${level}: ${grammarDB[level].length} уроков`);
                
                if (!grammarProgress[level]) {
                    grammarProgress[level] = [];
                    for (let i = 0; i < grammarDB[level].length; i++) {
                        grammarProgress[level][i] = { completed: false };
                    }
                }
            } else {
                console.log(`❌ Не найден ${level}`);
                grammarDB[level] = [];
            }
        } catch(e) { 
            console.error(`Ошибка ${level}:`, e);
            grammarDB[level] = []; 
        }
    }
    saveProgress();
}

// Сохранение прогресса
function saveGrammarProgress() {
    localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
}

// Загрузка прогресса
function loadGrammarProgress() {
    try {
        const gp = localStorage.getItem('dm_grammar_progress');
        if (gp) grammarProgress = JSON.parse(gp);
    } catch(e) {}
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!grammarProgress[lvl]) grammarProgress[lvl] = [];
    });
}

// Отметить урок как пройденный
function markGrammarLessonCompleted(lessonIndex) {
    const level = AppConfig.currentLevel;
    if (!grammarProgress[level]) grammarProgress[level] = [];
    grammarProgress[level][lessonIndex] = { completed: true };
    saveGrammarProgress();
    saveProgress();
    updateCounter();
}

// Проверить, пройден ли урок
function isGrammarLessonCompleted(lessonIndex) {
    const level = AppConfig.currentLevel;
    return grammarProgress[level]?.[lessonIndex]?.completed === true;
}

// ГЛАВНАЯ ФУНКЦИЯ ОТРИСОВКИ
function renderGrammar() {
    console.log('renderGrammar: начата, уровень:', AppConfig.currentLevel);
    const level = AppConfig.currentLevel;
    const lessons = grammarDB[level];
    
    if (!lessons || lessons.length === 0) {
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 20px;">📚 Грамматика ${level}</div>
                <div style="font-size: 16px; color: #666;">Материалы загружаются...</div>
                <div style="font-size: 14px; margin-top: 20px;">Попробуйте обновить страницу (F5)</div>
            </div>
        `;
        return;
    }
    
    const savedLesson = window.currentGrammarLesson;
    const savedMode = window.currentGrammarMode;
    
    if (savedLesson !== null && savedLesson !== undefined && lessons[savedLesson]) {
        console.log('Восстанавливаю урок грамматики:', savedLesson, 'на уровне', level);
        currentGrammarLesson = savedLesson;
        currentGrammarMode = savedMode || 'theory';
        window.currentGrammarLesson = savedLesson;
        window.currentGrammarMode = savedMode || 'theory';
        setTimeout(() => {
            renderGrammarLesson(savedLesson);
        }, 50);
        return;
    }
    
    if (savedLesson !== null) {
        console.log('Сохранённый урок не найден на уровне', level);
        window.currentGrammarLesson = null;
        currentGrammarLesson = null;
    }
    
    let html = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div class="lesson-header">
                <div class="lesson-title">📚 Грамматика ${level}</div>
                <div>Всего уроков: ${lessons.length}</div>
            </div>
            <div id="grammarLessonsList" style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
    `;
    
    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const isCompleted = isGrammarLessonCompleted(i);
        const completedIcon = isCompleted ? '✅' : '📘';
        html += `
            <button class="lesson-grid-btn" data-lesson-index="${i}" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; cursor: pointer;">
                <span>${completedIcon} Урок ${lesson.lesson}: ${lesson.title}</span>
                <span style="font-size: 12px; color: #3B6FE0;">Начать →</span>
            </button>
        `;
    }
    
    html += `</div></div>`;
    
    document.getElementById('content').innerHTML = html;
    
    const buttons = document.querySelectorAll('[data-lesson-index]');
    console.log('Найдено кнопок уроков:', buttons.length);
    
    for (let i = 0; i < buttons.length; i++) {
        const btn = buttons[i];
        const lessonIdx = parseInt(btn.getAttribute('data-lesson-index'));
        
        btn.onclick = (function(idx) {
            return function() {
                console.log('КЛИК по уроку с индексом:', idx);
                currentGrammarLesson = idx;
                currentGrammarMode = 'theory';
                window.currentGrammarLesson = idx;
                window.currentGrammarMode = 'theory';
                renderGrammarLesson(idx);
            };
        })(lessonIdx);
    }
    
    updateCounter();
}

// Отрисовка конкретного урока
function renderGrammarLesson(lessonIdx) {
    console.log('renderGrammarLesson: открытие урока', lessonIdx);
    const level = AppConfig.currentLevel;
    
    currentGrammarLesson = lessonIdx;
    window.currentGrammarLesson = lessonIdx;
    saveProgress();
    
    if (isNaN(lessonIdx)) {
        console.error('Ошибка: lessonIdx = NaN');
        document.getElementById('content').innerHTML = '<div style="text-align:center;padding:40px;">Ошибка: индекс урока не определён</div>';
        return;
    }
    
    const lesson = grammarDB[level][lessonIdx];
    
    if (!lesson) {
        console.error('Урок не найден!');
        document.getElementById('content').innerHTML = '<div style="text-align:center;padding:40px;">Ошибка: урок не найден</div>';
        return;
    }
    
    console.log('Урок найден:', lesson.title);
    
    document.getElementById('content').innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="margin-bottom: 10px;">
                <button class="ctrl-btn" id="backToGrammarList" style="cursor: pointer;">← К СПИСКУ УРОКОВ</button>
            </div>
            <div class="lesson-header">
                <div class="lesson-title">📖 Урок ${lesson.lesson}: ${lesson.title}</div>
                <div>Уровень ${level}</div>
            </div>
            <div class="lesson-mode" id="grammarModeContainer">
                <button id="grammarTheoryBtn" class="lesson-mode-btn ${currentGrammarMode === 'theory' ? 'active' : ''}" style="cursor: pointer;">ТЕОРИЯ</button>
                <button id="grammarPracticeBtn" class="lesson-mode-btn ${currentGrammarMode === 'practice' ? 'active' : ''}" style="cursor: pointer;">УПРАЖНЕНИЯ</button>
            </div>
            <div id="grammarContent" class="lesson-text"></div>
        </div>
    `;
    
    document.getElementById('backToGrammarList').onclick = () => {
        currentGrammarLesson = null;
        window.currentGrammarLesson = null;
        renderGrammar();
    };
    
    document.getElementById('grammarTheoryBtn').onclick = () => {
        currentGrammarMode = 'theory';
        window.currentGrammarMode = 'theory';
        document.getElementById('grammarTheoryBtn').classList.add('active');
        document.getElementById('grammarPracticeBtn').classList.remove('active');
        showGrammarTheory(lesson);
        saveProgress();
    };
    
    document.getElementById('grammarPracticeBtn').onclick = () => {
        currentGrammarMode = 'practice';
        window.currentGrammarMode = 'practice';
        document.getElementById('grammarPracticeBtn').classList.add('active');
        document.getElementById('grammarTheoryBtn').classList.remove('active');
        showGrammarPractice(lesson, lessonIdx);
        saveProgress();
    };
    
    if (currentGrammarMode === 'theory') {
        showGrammarTheory(lesson);
    } else {
        showGrammarPractice(lesson, lessonIdx);
    }
}

// Отображение теории
function showGrammarTheory(lesson) {
    const container = document.getElementById('grammarContent');
    if (!container) return;
    
    let examplesHtml = '';
    if (lesson.examples && lesson.examples.length) {
        examplesHtml = '<div style="margin-top: 20px;"><h4>📝 Примеры:</h4><ul style="list-style: none; padding: 0;">';
        for (const ex of lesson.examples) {
            examplesHtml += `
                <li style="background: #E8F0FE; margin: 8px 0; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${ex.de}</strong> — ${ex.ru}</span>
                    <button class="speak-btn-inline" onclick="speak('${ex.de.replace(/'/g, "\\'")}')">🔊</button>
                </li>
            `;
        }
        examplesHtml += '</ul></div>';
    }
    
    let exercisesHtml = '';
    if (lesson.exercises && lesson.exercises.length) {
        exercisesHtml = `
            <div style="margin-top: 20px; padding: 15px; background: #FFF3E0; border-radius: 12px;">
                <h4>✍️ Упражнения для самопроверки:</h4>
                <div style="font-size: 14px; color: #666;">Перейдите в режим "УПРАЖНЕНИЯ" для выполнения заданий</div>
            </div>
        `;
    }
    
    container.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 20px;">
            ${lesson.theory}
            ${examplesHtml}
            ${exercisesHtml}
        </div>
    `;
}

// Отображение практики
function showGrammarPractice(lesson, lessonIdx) {
    // Сбрасываем упражнения только если это новый урок
    if (grammarExercises !== (lesson.exercises || [])) {
        grammarExercises = lesson.exercises || [];
        currentGrammarExerciseIndex = 0;
    }
    
    if (!grammarExercises.length) {
        document.getElementById('grammarContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px;">✨</div>
                <div>В этом уроке пока нет упражнений</div>
            </div>
        `;
        return;
    }
    
    if (currentGrammarExerciseIndex >= grammarExercises.length) {
        currentGrammarExerciseIndex = 0;
    }
    
    showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
}

function showGrammarExercise(exercise, lesson, lessonIdx) {
    const container = document.getElementById('grammarContent');
    if (!container) return;
    
    container.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 20px;">
            <div style="font-size: 18px; font-weight: bold; margin-bottom: 20px; text-align: center;">
                📝 ${exercise.question}
            </div>
            
            <div id="grammarAnswerArea" style="margin: 20px 0;">
                <input type="text" id="grammarAnswerInput" 
                    style="width: 100%; padding: 12px; font-size: 16px; border: 2px solid #D0D0D0; border-radius: 12px; text-align: center;"
                    placeholder="Введите ответ..." 
                    autocomplete="off">
            </div>
            
            <div class="btn-group" style="margin-top: 15px;">
                <button class="ctrl-btn" id="grammarCheckBtn" style="cursor: pointer;">ПРОВЕРИТЬ</button>
                <button class="ctrl-btn" id="grammarSpeakBtn" style="background:#E8F0FE; border:2px solid #D0D0D0; cursor: pointer;">🔊</button>
            </div>
            
            <div class="hint-area">
                <button class="ctrl-btn" id="grammarHintBtn" style="cursor: pointer;">ПОДСКАЗКА</button>
                <div class="hint-label" id="grammarHintLabel"></div>
            </div>
            
            <div class="btn-group" style="margin-top: 15px;">
                <button class="ctrl-btn" id="grammarPrevBtn" style="cursor: pointer;">◀ НАЗАД</button>
                <button class="ctrl-btn" id="grammarNextBtn" style="cursor: pointer;">ВПЕРЕД ▶</button>
            </div>
            
            <div id="grammarCounter" style="margin-top: 10px; text-align: center; font-size: 12px; color: #666;">
                Упражнение ${currentGrammarExerciseIndex + 1} из ${grammarExercises.length}
            </div>
        </div>
    `;
    
    const input = document.getElementById('grammarAnswerInput');
    if (input) input.focus();
    
    const correctAnswer = exercise.answer.toLowerCase();
    
    document.getElementById('grammarCheckBtn').onclick = () => {
        const userAnswer = input.value.trim().toLowerCase();
        const resultDiv = document.getElementById('grammarAnswerArea');
        
        if (userAnswer === correctAnswer) {
            resultDiv.style.backgroundColor = '#C8E6C9';
            if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
            grammarBlinkTimer = setTimeout(() => {
                resultDiv.style.backgroundColor = 'transparent';
                
                if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
                    currentGrammarExerciseIndex++;
                    showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
                } else {
                    if (!isGrammarLessonCompleted(lessonIdx)) {
                        markGrammarLessonCompleted(lessonIdx);
                    }
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                            <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                            <div style="font-size: 16px; margin-bottom: 20px;">Вы успешно завершили урок "${lesson.title}"</div>
                            <button class="ctrl-btn" id="backToGrammarFromComplete" style="cursor: pointer;">ВЕРНУТЬСЯ К СПИСКУ УРОКОВ</button>
                        </div>
                    `;
                    document.getElementById('backToGrammarFromComplete').onclick = () => renderGrammar();
                }
            }, 600);
        } else {
            resultDiv.style.backgroundColor = '#FFCDD2';
            if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
            grammarBlinkTimer = setTimeout(() => {
                resultDiv.style.backgroundColor = 'transparent';
                input.value = '';
                input.focus();
            }, 500);
        }
    };
    
    document.getElementById('grammarSpeakBtn').onclick = () => {
        let textToSpeak = exercise.question;
        const germanMatch = exercise.question.match(/[A-ZÄÖÜ][a-zäöüß]+/);
        if (germanMatch) textToSpeak = germanMatch[0];
        speak(textToSpeak);
    };
    
    document.getElementById('grammarHintBtn').onclick = () => {
        const hintLabel = document.getElementById('grammarHintLabel');
        hintLabel.textContent = '💡 ' + (exercise.hint || correctAnswer);
        setTimeout(() => { hintLabel.textContent = ''; }, 3000);
    };
    
    document.getElementById('grammarPrevBtn').onclick = () => {
        if (currentGrammarExerciseIndex > 0) {
            currentGrammarExerciseIndex--;
            showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
        }
    };
    
    document.getElementById('grammarNextBtn').onclick = () => {
        if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
            currentGrammarExerciseIndex++;
            showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
        }
    };
    
    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                document.getElementById('grammarCheckBtn').click();
            }
        };
    }
}
