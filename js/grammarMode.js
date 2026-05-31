// ============================================================
// grammarMode.js - Режим ГРАММАТИКА
// ============================================================

let grammarExercises = [];
let currentGrammarExerciseIndex = 0;
let currentGrammarExerciseState = null;
let grammarBlinkTimer = null;
let grammarHintIndex = 0;
let grammarHintWords = [];

// Загрузка грамматики из JSON файлов
async function loadGrammarData() {
    console.log('loadGrammarData: началась загрузка грамматики');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    for (const level of levels) {
        try {
            const url = `/Deutsch-Meister/docs/grammar/${level}.json`;
            console.log(`Загрузка: ${url}`);
            const resp = await fetch(url);
            if (resp.ok) {
                grammarDB[level] = await resp.json();
                console.log(`Успешно загружен ${level}: ${grammarDB[level].length} уроков`);
                // Инициализация прогресса для уроков
                if (!grammarProgress[level]) {
                    grammarProgress[level] = [];
                    for (let i = 0; i < grammarDB[level].length; i++) {
                        grammarProgress[level][i] = { completed: false };
                    }
                }
            } else {
                console.log(`Не найден файл для ${level}`);
                grammarDB[level] = [];
            }
        } catch(e) { 
            console.error(`Ошибка загрузки ${level}:`, e);
            grammarDB[level] = []; 
        }
    }
    saveProgress();
    console.log('loadGrammarData: завершена, grammarDB =', grammarDB);
}

// Сохранение прогресса грамматики
function saveGrammarProgress() {
    localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
    if (window.saveUserProgressToFirebase) {
        window.saveUserProgressToFirebase();
    }
}

// Загрузка прогресса грамматики
function loadGrammarProgress() {
    try {
        const gp = localStorage.getItem('dm_grammar_progress');
        if (gp) grammarProgress = JSON.parse(gp);
    } catch(e) {}
    
    // Инициализация для всех уровней
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

// Главная функция отрисовки режима грамматики
function renderGrammar() {
    console.log('renderGrammar: начата отрисовка');
    const level = AppConfig.currentLevel;
    const lessons = grammarDB[level];
    
    console.log(`renderGrammar: уровень ${level}, уроков:`, lessons ? lessons.length : 0);
    
    if (!lessons || lessons.length === 0) {
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 20px;">📚 Грамматика ${level}</div>
                <div style="font-size: 16px; color: #666;">Материалы пока не загружены.</div>
                <div style="font-size: 14px; margin-top: 20px;">Проверьте наличие файла /docs/grammar/${level}.json</div>
                <div style="font-size: 12px; margin-top: 10px; color: #999;">И убедитесь, что файл имеет правильный формат JSON</div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div class="lesson-header">
                <div class="lesson-title">📚 Грамматика ${level}</div>
                <div>Всего уроков: ${lessons.length}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 20px;">
    `;
    
    for (let i = 0; i < lessons.length; i++) {
        const lesson = lessons[i];
        const isCompleted = isGrammarLessonCompleted(i);
        const completedIcon = isCompleted ? '✅' : '📘';
        html += `
            <button class="lesson-grid-btn" data-grammar-lesson="${i}" style="display: flex; justify-content: space-between; align-items: center; padding: 15px;">
                <span>${completedIcon} Урок ${lesson.lesson}: ${lesson.title}</span>
                ${isCompleted ? '<span style="font-size: 12px;">Пройдено</span>' : '<span style="font-size: 12px; color: #3B6FE0;">Начать →</span>'}
            </button>
        `;
    }
    
    html += `
            </div>
        </div>
    `;
    
    document.getElementById('content').innerHTML = html;
    
    document.querySelectorAll('[data-grammar-lesson]').forEach(btn => {
        btn.onclick = () => {
            const lessonIdx = parseInt(btn.dataset.grammar_lesson);
            console.log('Выбран урок с индексом:', lessonIdx);
            currentGrammarLesson = lessonIdx;
            renderGrammarLesson(lessonIdx);
        };
    });
    
    updateCounter();
}

// Отрисовка конкретного урока грамматики
function renderGrammarLesson(lessonIdx) {
    console.log('renderGrammarLesson: открытие урока', lessonIdx);
    const level = AppConfig.currentLevel;
    const lesson = grammarDB[level][lessonIdx];
    
    if (!lesson) {
        console.error('Урок не найден!', lessonIdx, grammarDB[level]);
        return;
    }
    
    console.log('Урок:', lesson);
    
    document.getElementById('content').innerHTML = `
        <div style="max-width: 800px; margin: 0 auto;">
            <div style="margin-bottom: 10px;">
                <button class="ctrl-btn" id="backToGrammarList">← К СПИСКУ УРОКОВ</button>
            </div>
            <div class="lesson-header">
                <div class="lesson-title">📖 Урок ${lesson.lesson}: ${lesson.title}</div>
                <div>Уровень ${level}</div>
            </div>
            <div class="lesson-mode" id="grammarModeContainer">
                <button id="grammarTheoryBtn" class="lesson-mode-btn active">ТЕОРИЯ</button>
                <button id="grammarPracticeBtn" class="lesson-mode-btn">ПРАКТИКА</button>
            </div>
            <div id="grammarContent" class="lesson-text"></div>
        </div>
    `;
    
    document.getElementById('backToGrammarList').onclick = () => renderGrammar();
    
    document.getElementById('grammarTheoryBtn').onclick = () => {
        currentGrammarMode = 'theory';
        document.getElementById('grammarTheoryBtn').classList.add('active');
        document.getElementById('grammarPracticeBtn').classList.remove('active');
        showGrammarTheory(lesson);
    };
    
    document.getElementById('grammarPracticeBtn').onclick = () => {
        currentGrammarMode = 'practice';
        document.getElementById('grammarPracticeBtn').classList.add('active');
        document.getElementById('grammarTheoryBtn').classList.remove('active');
        showGrammarPractice(lesson, lessonIdx);
    };
    
    showGrammarTheory(lesson);
}

// Отображение теории
function showGrammarTheory(lesson) {
    console.log('showGrammarTheory: отображение теории');
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
                <div style="font-size: 14px; color: #666;">Перейдите в режим "ПРАКТИКА" для выполнения заданий</div>
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

// Отображение практики (упражнения)
function showGrammarPractice(lesson, lessonIdx) {
    console.log('showGrammarPractice: отображение практики');
    grammarExercises = lesson.exercises || [];
    currentGrammarExerciseIndex = 0;
    
    if (!grammarExercises.length) {
        document.getElementById('grammarContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px;">✨</div>
                <div>В этом уроке пока нет упражнений</div>
            </div>
        `;
        return;
    }
    
    showGrammarExercise(grammarExercises[0], lesson, lessonIdx);
}

function showGrammarExercise(exercise, lesson, lessonIdx) {
    console.log('showGrammarExercise: показ упражнения', exercise);
    const container = document.getElementById('grammarContent');
    if (!container) return;
    
    // Сброс состояния
    grammarHintIndex = 0;
    
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
                <button class="ctrl-btn" id="grammarCheckBtn">ПРОВЕРИТЬ</button>
                <button class="ctrl-btn speak-btn-inline" id="grammarSpeakBtn" style="background:#E8F0FE; border:2px solid #D0D0D0;">🔊</button>
            </div>
            
            <div class="hint-area">
                <button class="ctrl-btn" id="grammarHintBtn">ПОДСКАЗКА</button>
                <div class="hint-label" id="grammarHintLabel"></div>
            </div>
            
            <div class="btn-group" style="margin-top: 15px;">
                <button class="ctrl-btn" id="grammarPrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="grammarNextBtn">ВПЕРЕД ▶</button>
            </div>
            
            <div id="grammarCounter" class="hint" style="margin-top: 10px; text-align: center;">
                Упражнение ${currentGrammarExerciseIndex + 1} из ${grammarExercises.length}
            </div>
        </div>
    `;
    
    const input = document.getElementById('grammarAnswerInput');
    if (input) input.focus();
    
    // Кнопка проверки
    const checkBtn = document.getElementById('grammarCheckBtn');
    if (checkBtn) {
        checkBtn.onclick = () => {
            const userAnswer = input.value.trim().toLowerCase();
            const correctAnswer = exercise.answer.toLowerCase();
            const resultDiv = document.getElementById('grammarAnswerArea');
            
            if (userAnswer === correctAnswer) {
                resultDiv.style.transition = 'background-color 0.2s';
                resultDiv.style.backgroundColor = '#C8E6C9';
                if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
                grammarBlinkTimer = setTimeout(() => {
                    resultDiv.style.backgroundColor = 'transparent';
                    
                    // Переход к следующему упражнению
                    if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
                        currentGrammarExerciseIndex++;
                        showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
                    } else {
                        // Все упражнения пройдены - отмечаем урок как завершённый
                        if (!isGrammarLessonCompleted(lessonIdx)) {
                            markGrammarLessonCompleted(lessonIdx);
                        }
                        container.innerHTML = `
                            <div style="text-align: center; padding: 40px;">
                                <div style="font-size: 48px; margin-bottom: 20px;">🎉</div>
                                <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                                <div style="font-size: 16px; margin-bottom: 20px;">Вы успешно завершили урок "${lesson.title}"</div>
                                <button class="ctrl-btn" id="backToGrammarFromComplete">ВЕРНУТЬСЯ К СПИСКУ УРОКОВ</button>
                            </div>
                        `;
                        const backBtn = document.getElementById('backToGrammarFromComplete');
                        if (backBtn) backBtn.onclick = () => renderGrammar();
                    }
                }, 600);
            } else {
                resultDiv.style.transition = 'background-color 0.2s';
                resultDiv.style.backgroundColor = '#FFCDD2';
                if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
                grammarBlinkTimer = setTimeout(() => {
                    resultDiv.style.backgroundColor = 'transparent';
                    input.value = '';
                    input.focus();
                }, 500);
            }
        };
    }
    
    // Озвучка вопроса
    const speakBtn = document.getElementById('grammarSpeakBtn');
    if (speakBtn) {
        speakBtn.onclick = () => {
            let textToSpeak = exercise.question;
            const germanMatch = exercise.question.match(/[A-ZÄÖÜ][a-zäöüß]+/);
            if (germanMatch) {
                textToSpeak = germanMatch[0];
            }
            speak(textToSpeak);
        };
    }
    
    // Подсказка
    const hintBtn = document.getElementById('grammarHintBtn');
    if (hintBtn) {
        hintBtn.onclick = () => {
            const hintLabel = document.getElementById('grammarHintLabel');
            if (exercise.hint) {
                hintLabel.textContent = '💡 ' + exercise.hint;
            } else {
                hintLabel.textContent = '💡 ' + correctAnswer;
            }
            setTimeout(() => {
                hintLabel.textContent = '';
            }, 3000);
        };
    }
    
    // Навигация
    const prevBtn = document.getElementById('grammarPrevBtn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentGrammarExerciseIndex > 0) {
                currentGrammarExerciseIndex--;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
            }
        };
    }
    
    const nextBtn = document.getElementById('grammarNextBtn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
                currentGrammarExerciseIndex++;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lesson, lessonIdx);
            }
        };
    }
    
    // Enter для проверки
    if (input) {
        input.onkeypress = (e) => {
            if (e.key === 'Enter') {
                const btn = document.getElementById('grammarCheckBtn');
                if (btn) btn.click();
            }
        };
    }
}
