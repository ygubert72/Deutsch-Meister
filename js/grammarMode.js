// ============================================================
// grammarMode.js - Режим ГРАММАТИКА
// ============================================================

let grammarDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let grammarProgress = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let currentGrammarLesson = null;
let currentGrammarMode = 'theory';

let grammarExercises = [];
let currentGrammarExerciseIndex = 0;
let grammarBlinkTimer = null;

async function loadGrammarData() {
    console.log('loadGrammarData: загрузка');
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

function saveGrammarProgress() {
    localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
}

function loadGrammarProgress() {
    try {
        const gp = localStorage.getItem('dm_grammar_progress');
        if (gp) grammarProgress = JSON.parse(gp);
    } catch(e) {}
    
    ['A1','A2','B1','B2','C1'].forEach(lvl => {
        if (!grammarProgress[lvl]) grammarProgress[lvl] = [];
    });
}

function markGrammarLessonCompleted(lessonIndex) {
    const level = AppConfig.currentLevel;
    if (!grammarProgress[level]) grammarProgress[level] = [];
    grammarProgress[level][lessonIndex] = { completed: true };
    saveGrammarProgress();
    saveProgress();
    updateCounter();
}

function isGrammarLessonCompleted(lessonIndex) {
    const level = AppConfig.currentLevel;
    return grammarProgress[level]?.[lessonIndex]?.completed === true;
}

function renderGrammar() {
    console.log('renderGrammar: уровень', AppConfig.currentLevel);
    const level = AppConfig.currentLevel;
    const lessons = grammarDB[level];
    
    if (!lessons || lessons.length === 0) {
        document.getElementById('content').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 24px; margin-bottom: 20px;">📚 Грамматика ${level}</div>
                <div style="font-size: 16px; color: #666;">Материалы загружаются...</div>
            </div>
        `;
        return;
    }
    
    // Восстановление последнего урока (сохраняем в localStorage)
    const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
    const savedMode = localStorage.getItem('dm_last_grammar_mode');
    
    if (savedLesson !== null && lessons[parseInt(savedLesson)]) {
        const lessonIdx = parseInt(savedLesson);
        console.log('Восстанавливаю урок:', lessonIdx);
        currentGrammarLesson = lessonIdx;
        currentGrammarMode = savedMode || 'theory';
        renderGrammarLesson(lessonIdx);
        return;
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
    
    document.querySelectorAll('[data-lesson-index]').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.dataset.lessonIndex);
            currentGrammarLesson = idx;
            currentGrammarMode = 'theory';
            localStorage.setItem('dm_last_grammar_lesson', idx);
            localStorage.setItem('dm_last_grammar_mode', 'theory');
            renderGrammarLesson(idx);
        };
    });
    
    updateCounter();
}

function renderGrammarLesson(lessonIdx) {
    console.log('open lesson:', lessonIdx);
    const level = AppConfig.currentLevel;
    const lesson = grammarDB[level][lessonIdx];
    
    if (!lesson) {
        renderGrammar();
        return;
    }
    
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
        localStorage.removeItem('dm_last_grammar_lesson');
        currentGrammarLesson = null;
        renderGrammar();
    };
    
    document.getElementById('grammarTheoryBtn').onclick = () => {
        currentGrammarMode = 'theory';
        localStorage.setItem('dm_last_grammar_mode', 'theory');
        document.getElementById('grammarTheoryBtn').classList.add('active');
        document.getElementById('grammarPracticeBtn').classList.remove('active');
        showGrammarTheory(lesson);
    };
    
    document.getElementById('grammarPracticeBtn').onclick = () => {
        currentGrammarMode = 'practice';
        localStorage.setItem('dm_last_grammar_mode', 'practice');
        document.getElementById('grammarPracticeBtn').classList.add('active');
        document.getElementById('grammarTheoryBtn').classList.remove('active');
        showGrammarPractice(lesson, lessonIdx);
    };
    
    if (currentGrammarMode === 'theory') {
        showGrammarTheory(lesson);
    } else {
        showGrammarPractice(lesson, lessonIdx);
    }
}

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
    
    container.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 20px;">
            ${lesson.theory}
            ${examplesHtml}
            <div style="margin-top: 20px; padding: 15px; background: #FFF3E0; border-radius: 12px;">
                <h4>✍️ Упражнения</h4>
                <div style="font-size: 14px; color: #666;">Перейдите в режим "УПРАЖНЕНИЯ" для выполнения заданий</div>
            </div>
        </div>
    `;
}

function showGrammarPractice(lesson, lessonIdx) {
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
                <button class="ctrl-btn" id="grammarSpeakBtn" style="background:#E8F0FE; cursor: pointer;">🔊</button>
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
                            <div style="font-size: 16px; margin-bottom: 20px;">Урок "${lesson.title}" завершён!</div>
                            <button class="ctrl-btn" id="backToGrammarFromComplete" style="cursor: pointer;">К СПИСКУ УРОКОВ</button>
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
