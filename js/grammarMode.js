// grammarMode.js — с кешированием грамматики в localStorage

let grammarDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let currentGrammarLesson = null;
let currentGrammarMode = 'theory';
let grammarLessonData = null;
let grammarExercises = [];
let currentGrammarExerciseIndex = 0;
let grammarBlinkTimer = null;

const GRAMMAR_CACHE_KEY = 'dm_grammar_cache';

// ========== КЕШИРОВАНИЕ ГРАММАТИКИ ==========
function getGrammarCache() {
    try {
        const cache = localStorage.getItem(GRAMMAR_CACHE_KEY);
        return cache ? JSON.parse(cache) : {};
    } catch(e) {
        return {};
    }
}

function setGrammarCache(level, data) {
    try {
        const cache = getGrammarCache();
        cache[level] = data;
        localStorage.setItem(GRAMMAR_CACHE_KEY, JSON.stringify(cache));
        Logger.debug('Грамматика кеширована для уровня:', level);
    } catch(e) {
        Logger.error('Ошибка кеширования грамматики:', e);
    }
}

function getGrammarFromCache(level) {
    const cache = getGrammarCache();
    return cache[level] || null;
}

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ИСПРАВЛЕНИЯ ПРОБЕЛОВ ==========
function fixTextSpacing(text) {
    if (!text) return text;
    const placeholders = [];
    
    text = text.replace(/\(([^)]+)\)/g, (match, content) => {
        placeholders.push(`(${content})`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    text = text.replace(/\[([^\]]+)\]/g, (match, content) => {
        placeholders.push(`[${content}]`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    text = text.replace(/\{([^}]+)\}/g, (match, content) => {
        placeholders.push(`{${content}}`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    text = text.replace(/"([^"]+)"/g, (match, content) => {
        placeholders.push(`"${content}"`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    text = text.replace(/'([^']+)'/g, (match, content) => {
        placeholders.push(`'${content}'`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    text = text.replace(/([.!?;:),}\]>»])([А-Яа-яA-Za-z0-9])/g, '$1 $2');
    text = text.replace(/%%%(\d+)%%%/g, (match, index) => {
        return placeholders[parseInt(index)];
    });
    text = text.replace(/\s+/g, ' ');
    return text;
}

// ========== ЗАГРУЗКА ГРАММАТИКИ С КЕШИРОВАНИЕМ ==========
async function loadGrammarData() {
    Logger.info('Загрузка грамматики...');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    
    for (const level of levels) {
        const cached = getGrammarFromCache(level);
        if (cached && cached.length > 0) {
            grammarDB[level] = cached;
            Logger.info(`Грамматика ${level} загружена из кеша (${cached.length} уроков)`);
            continue;
        }
        
        grammarDB[level] = [];
        try {
            const indexUrl = `docs/grammar/${level}/index.json`;
            const indexResp = await fetch(indexUrl);
            
            if (!indexResp.ok) {
                Logger.warn(`Грамматика для уровня ${level} не найдена`);
                continue;
            }
            
            const index = await indexResp.json();
            Logger.info(`Загружаю ${level}: ${index.lessons.length} уроков`);
            
            const lessons = [];
            for (const lessonPath of index.lessons) {
                const lessonUrl = `docs/grammar/${level}/${lessonPath}`;
                const lessonResp = await fetch(lessonUrl);
                if (lessonResp.ok) {
                    const lessonData = await lessonResp.json();
                    lessons.push(lessonData);
                    Logger.debug(`  ✅ Урок ${lessonData.lesson}: ${lessonData.title}`);
                } else {
                    Logger.warn(`  ❌ Ошибка загрузки: ${lessonPath}`);
                }
            }
            
            grammarDB[level] = lessons;
            
            if (lessons.length > 0) {
                setGrammarCache(level, lessons);
            }
            
        } catch(e) {
            Logger.error(`Ошибка загрузки ${level}:`, e);
            grammarDB[level] = [];
        }
        
        if (!grammarProgress[level]) {
            grammarProgress[level] = [];
            for (let i = 0; i < grammarDB[level].length; i++) {
                grammarProgress[level][i] = { completed: false };
            }
        }
    }
    
    saveGrammarProgress();
    Logger.info('Загрузка грамматики завершена');
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

// ========== ОСНОВНАЯ ФУНКЦИЯ ОТОБРАЖЕНИЯ ГРАММАТИКИ ==========
function renderGrammar() {
    Logger.debug('renderGrammar: начат');
    const level = AppConfig.currentLevel;
    const lessons = grammarDB[level];
    
    const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
    const savedLevel = localStorage.getItem('dm_last_grammar_level');
    
    if (savedLesson !== null && savedLevel === level && lessons && lessons[parseInt(savedLesson)]) {
        const lessonIdx = parseInt(savedLesson);
        Logger.debug('Восстанавливаю урок:', lessonIdx);
        renderGrammarLesson(lessonIdx);
        return;
    }
    
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
            <button class="lesson-grid-btn" data-lesson-index="${i}" style="display: flex; justify-content: space-between; align-items: center; padding: 15px; cursor: pointer; text-align: left;">
                <span>${completedIcon} Урок ${lesson.lesson}: ${lesson.title}</span>
            </button>
        `;
    }
    
    html += `</div></div>`;
    
    document.getElementById('content').innerHTML = html;
    
    const buttons = document.querySelectorAll('[data-lesson-index]');
    for (const btn of buttons) {
        const lessonIdx = parseInt(btn.getAttribute('data-lesson-index'));
        btn.onclick = () => {
            Logger.debug('КЛИК по уроку:', lessonIdx);
            renderGrammarLesson(lessonIdx);
        };
    }
    
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
        modeIndicator.textContent = `Грамматика ${level}`;
    }
    
    updateCounter();
    
    setTimeout(() => {
        const lessonsList = document.getElementById('grammarLessonsList');
        if (lessonsList) {
            lessonsList.style.maxHeight = 'none';
            lessonsList.style.overflowY = 'auto';
            lessonsList.style.paddingBottom = '50px';
        }
        const content = document.getElementById('content');
        if (content) {
            content.style.paddingBottom = '60px';
            content.style.overflowY = 'auto';
            content.style.webkitOverflowScrolling = 'touch';
        }
    }, 100);
}

function renderGrammarLesson(lessonIdx) {
    Logger.debug('renderGrammarLesson: открытие урока', lessonIdx);
    const level = AppConfig.currentLevel;
    
    localStorage.setItem('dm_last_grammar_lesson', lessonIdx);
    localStorage.setItem('dm_last_grammar_level', level);
    
    const lesson = grammarDB[level][lessonIdx];
    grammarLessonData = lesson;
    
    if (!lesson) {
        document.getElementById('content').innerHTML = '<div style="text-align:center;padding:40px;">Ошибка: урок не найден</div>';
        return;
    }
    
    const lessons = grammarDB[level];
    const isFirstLesson = (lessonIdx === 0);
    const isLastLesson = (lessonIdx + 1 >= lessons.length);
    const totalLessons = lessons.length;
    const completedCount = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
    
    const modeIndicator = document.getElementById('modeIndicator');
    if (modeIndicator) {
        modeIndicator.textContent = `Грамматика ${level} | Урок ${lesson.lesson}`;
        modeIndicator.style.background = 'none';
        modeIndicator.style.padding = '0';
        modeIndicator.style.color = '#333';
        modeIndicator.style.fontWeight = 'normal';
        modeIndicator.style.fontSize = '12px';
    }
    
    const counterEl = document.getElementById('counter');
    if (counterEl) {
        counterEl.textContent = `Пройдено: ${completedCount} из ${totalLessons} уроков`;
        counterEl.style.fontSize = '12px';
        counterEl.style.color = '#888';
    }
    
    document.getElementById('content').innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <button class="ctrl-btn" id="backToGrammarList" style="cursor: pointer; background: #3B6FE0; color: white;">← К СПИСКУ УРОКОВ</button>
                <div style="display: flex; gap: 10px;">
                    ${!isFirstLesson ? '<button class="ctrl-btn" id="prevLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">← ПРЕДЫДУЩИЙ УРОК</button>' : ''}
                    ${!isLastLesson ? '<button class="ctrl-btn" id="nextLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">СЛЕДУЮЩИЙ УРОК →</button>' : ''}
                </div>
            </div>
            <div class="lesson-header">
                <div class="lesson-title">📖 Урок ${lesson.lesson}: ${lesson.title}</div>
            </div>
            <div class="lesson-mode" id="grammarModeContainer">
                <button id="grammarTheoryBtn" class="lesson-mode-btn active" style="cursor: pointer;">📘 ТЕОРИЯ</button>
                <button id="grammarPracticeBtn" class="lesson-mode-btn" style="cursor: pointer;">✍️ УПРАЖНЕНИЯ</button>
            </div>
            <div class="grammar-scrollable-content" id="grammarContent"></div>
        </div>
    `;
    
    const backBtn = document.getElementById('backToGrammarList');
    if (backBtn) {
        backBtn.onclick = () => {
            localStorage.removeItem('dm_last_grammar_lesson');
            localStorage.removeItem('dm_last_grammar_level');
            if (modeIndicator) {
                modeIndicator.textContent = `Грамматика ${level}`;
                modeIndicator.style.background = '';
                modeIndicator.style.padding = '';
                modeIndicator.style.color = '';
                modeIndicator.style.fontWeight = '';
            }
            updateCounter();
            updateModeIndicator();
            renderGrammar();
        };
    }
    
    const prevBtn = document.getElementById('prevLessonBtn');
    if (prevBtn && !isFirstLesson) {
        prevBtn.onclick = () => renderGrammarLesson(lessonIdx - 1);
    }
    
    const nextBtn = document.getElementById('nextLessonBtn');
    if (nextBtn && !isLastLesson) {
        nextBtn.onclick = () => renderGrammarLesson(lessonIdx + 1);
    }
    
    const theoryBtn = document.getElementById('grammarTheoryBtn');
    const practiceBtn = document.getElementById('grammarPracticeBtn');
    
    if (theoryBtn) {
        theoryBtn.onclick = () => {
            currentGrammarMode = 'theory';
            theoryBtn.classList.add('active');
            if (practiceBtn) practiceBtn.classList.remove('active');
            showGrammarTheory();
        };
    }
    
    if (practiceBtn) {
        practiceBtn.onclick = () => {
            currentGrammarMode = 'practice';
            practiceBtn.classList.add('active');
            if (theoryBtn) theoryBtn.classList.remove('active');
            showGrammarPractice(lessonIdx);
        };
    }
    
    showGrammarTheory();
}

function showGrammarTheory() {
    const container = document.getElementById('grammarContent');
    if (!container || !grammarLessonData) return;
    
    let fixedTheory = grammarLessonData.theory || '';
    if (fixedTheory) {
        fixedTheory = fixTextSpacing(fixedTheory);
    }
    
    let examplesHtml = '';
    if (grammarLessonData.examples && grammarLessonData.examples.length) {
        examplesHtml = '<div style="margin-top: 20px;"><h4>📝 Примеры с озвучкой:</h4><ul style="list-style: none; padding: 0;">';
        for (const ex of grammarLessonData.examples) {
            let fixedDe = ex.de || '';
            if (fixedDe) {
                fixedDe = fixTextSpacing(fixedDe);
            }
            const safeText = fixedDe.replace(/'/g, "\\'");
            examplesHtml += `
                <li style="background: #E8F0FE; margin: 8px 0; padding: 10px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span><strong>${fixedDe}</strong> — ${ex.ru}</span>
                    <button class="speak-btn-inline" onclick="speak('${safeText}')">🔊</button>
                </li>
            `;
        }
        examplesHtml += '</ul></div>';
    }
    
    container.innerHTML = `
        <div style="background: white; border-radius: 16px; padding: 25px; line-height: 1.6;">
            ${fixedTheory}
            ${examplesHtml}
        </div>
    `;
}

function showGrammarPractice(lessonIdx) {
    const lesson = grammarDB[AppConfig.currentLevel][lessonIdx];
    grammarExercises = lesson.exercises || [];
    currentGrammarExerciseIndex = 0;
    
    Logger.debug('Всего упражнений в уроке:', grammarExercises.length);
    
    if (!grammarExercises.length) {
        document.getElementById('grammarContent').innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <div style="font-size: 48px;">✨</div>
                <div style="font-size: 18px; margin-top: 20px;">В этом уроке пока нет упражнений</div>
            </div>
        `;
        return;
    }
    
    showGrammarExercise(grammarExercises[0], lessonIdx);
}

function getCleanTextForSpeak(exercise) {
    let text = '';
    if (exercise.original_sentence) {
        text = exercise.original_sentence;
    }
    else if (exercise.sentence) {
        text = exercise.sentence;
        if (exercise.answer) {
            text = text.replace(/_{3,}/g, exercise.answer);
        } else {
            text = text.replace(/_{3,}/g, '');
        }
    }
    else if (exercise.question) {
        text = exercise.question;
    }
    else if (exercise.answer) {
        text = exercise.answer;
    }
    
    if (!text) return '';
    text = text.replace(/\s*\([^)]*\)\s*/g, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    return text;
}

function showGrammarExercise(exercise, lessonIdx) {
    const container = document.getElementById('grammarContent');
    if (!container) return;
    
    const total = grammarExercises.length;
    const current = currentGrammarExerciseIndex + 1;
    
    let html = `
        <div style="background: white; border-radius: 16px; padding: 25px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 14px; color: #666;">
                <span>📋 Упражнение ${current} из ${total}</span>
                <span>⭐ Уровень ${AppConfig.currentLevel}</span>
            </div>
    `;
    
    if (exercise.question) {
        html += `<div style="font-size: 16px; color: #666; margin-bottom: 10px;">${exercise.question}</div>`;
    }
    
    if (exercise.type === 'choice') {
        html += `
            <div style="background: #E8F0FE; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: 500;">
                ${exercise.sentence}
            </div>
        `;
        let optionsHtml = '<div class="quiz-grid" style="margin: 20px 0;">';
        for (let opt of exercise.options) {
            optionsHtml += `<button class="quiz-opt" data-value="${opt}">${opt}</button>`;
        }
        optionsHtml += '</div>';
        html += optionsHtml;
    } 
    else if (exercise.type === 'fill' || exercise.type === 'transform' || exercise.type === 'order' || !exercise.type) {
        if (exercise.sentence) {
            html += `
                <div style="background: #E8F0FE; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center; font-size: 18px; font-weight: 500;">
                    ${exercise.sentence}
                </div>
            `;
        }
        html += `
            <div style="margin: 20px 0;">
                <input type="text" id="grammarAnswerInput" 
                    style="width: 100%; padding: 14px; font-size: 16px; border: 2px solid #D0D0D0; border-radius: 12px; text-align: center;"
                    placeholder="Введите ответ..." 
                    autocomplete="off">
            </div>
        `;
    }
    
    html += `
        <div class="btn-group" style="margin-top: 15px;">
            <button class="ctrl-btn check-btn" id="grammarCheckBtn" style="cursor: pointer; background: #3B6FE0; color: white;">ПРОВЕРИТЬ</button>
            <button class="ctrl-btn" id="grammarSpeakBtn" style="cursor: pointer;">🔊 ОЗВУЧИТЬ</button>
        </div>
        
        <div class="hint-area" style="margin-top: 15px;">
            <button class="ctrl-btn" id="grammarHintBtn" style="cursor: pointer;">💡 ПОДСКАЗКА</button>
            <div class="hint-label" id="grammarHintLabel" style="min-height: 45px;"></div>
        </div>
        
        <div class="btn-group" style="margin-top: 15px;">
            <button class="ctrl-btn" id="grammarPrevBtn" style="cursor: pointer;">◀ НАЗАД</button>
            <button class="ctrl-btn" id="grammarNextBtn" style="cursor: pointer;">ВПЕРЕД ▶</button>
        </div>
        
        <div id="grammarCounter" style="margin-top: 15px; text-align: center; font-size: 12px; color: #888;">
            Прогресс: ${current} из ${total}
        </div>
    </div>`;
    
    container.innerHTML = html;
    
    const cleanTextForSpeak = getCleanTextForSpeak(exercise);
    
    if (exercise.type !== 'choice') {
        const input = document.getElementById('grammarAnswerInput');
        if (input) {
            input.focus();
            input.onkeypress = (e) => {
                if (e.key === 'Enter') {
                    const userAnswer = input.value.trim().toLowerCase();
                    checkGrammarAnswer(userAnswer, exercise, lessonIdx);
                }
            };
        }
    }
    
    if (exercise.type === 'choice') {
        const options = document.querySelectorAll('.quiz-opt');
        options.forEach(opt => {
            opt.onclick = () => {
                const userAnswer = opt.getAttribute('data-value').toLowerCase();
                checkGrammarAnswer(userAnswer, exercise, lessonIdx);
            };
        });
    }
    
    if (exercise.type !== 'choice') {
        const checkBtn = document.getElementById('grammarCheckBtn');
        if (checkBtn) {
            checkBtn.onclick = () => {
                const input = document.getElementById('grammarAnswerInput');
                if (input) {
                    const userAnswer = input.value.trim().toLowerCase();
                    checkGrammarAnswer(userAnswer, exercise, lessonIdx);
                }
            };
        }
    }
    
    const speakBtn = document.getElementById('grammarSpeakBtn');
    if (speakBtn) {
        speakBtn.onclick = () => {
            if (cleanTextForSpeak) {
                speak(cleanTextForSpeak);
            }
        };
    }
    
    const hintBtn = document.getElementById('grammarHintBtn');
    if (hintBtn) {
        hintBtn.onclick = () => {
            const hintLabel = document.getElementById('grammarHintLabel');
            hintLabel.innerHTML = `💡 ${exercise.hint || 'Попробуйте ещё раз! Подсказки нет.'}`;
            setTimeout(() => { hintLabel.innerHTML = ''; }, 4000);
        };
    }
    
    const prevBtn = document.getElementById('grammarPrevBtn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentGrammarExerciseIndex > 0) {
                currentGrammarExerciseIndex--;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lessonIdx);
            }
        };
    }
    
    const nextBtn = document.getElementById('grammarNextBtn');
    if (nextBtn) {
        nextBtn.onclick = () => {
            if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
                currentGrammarExerciseIndex++;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lessonIdx);
            }
        };
    }
}

function checkGrammarAnswer(userAnswer, exercise, lessonIdx) {
    const correctAnswer = exercise.answer.toLowerCase();
    const input = document.getElementById('grammarAnswerInput');
    
    function clearBlinkTimer() {
        if (grammarBlinkTimer) {
            clearTimeout(grammarBlinkTimer);
            grammarBlinkTimer = null;
        }
    }
    
    if (userAnswer === correctAnswer) {
        if (input) {
            input.style.backgroundColor = '#C8E6C9';
            input.style.borderColor = '#4CAF50';
        } else {
            const btns = document.querySelectorAll('.quiz-opt');
            btns.forEach(btn => {
                if (btn.getAttribute('data-value').toLowerCase() === userAnswer) {
                    btn.style.backgroundColor = '#C8E6C9';
                    btn.style.borderColor = '#4CAF50';
                }
            });
        }
        
        clearBlinkTimer();
        grammarBlinkTimer = setTimeout(() => {
            if (input) {
                input.style.backgroundColor = '';
                input.style.borderColor = '#D0D0D0';
                input.value = '';
            } else {
                const btns = document.querySelectorAll('.quiz-opt');
                btns.forEach(btn => {
                    btn.style.backgroundColor = '';
                    btn.style.borderColor = '#D0D0D0';
                });
            }
            
            if (currentGrammarExerciseIndex + 1 < grammarExercises.length) {
                currentGrammarExerciseIndex++;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lessonIdx);
            } else {
                if (!isGrammarLessonCompleted(lessonIdx)) {
                    markGrammarLessonCompleted(lessonIdx);
                }
                
                const container = document.getElementById('grammarContent');
                if (container) {
                    container.innerHTML = `
                        <div style="text-align: center; padding: 40px;">
                            <div style="font-size: 64px; margin-bottom: 20px;">🎉</div>
                            <div style="font-size: 24px; margin-bottom: 20px;">Поздравляем!</div>
                            <div style="font-size: 16px; margin-bottom: 20px;">Вы успешно завершили все упражнения урока "${grammarLessonData.title}"</div>
                            <button class="ctrl-btn" id="backToGrammarFromComplete" style="cursor: pointer;">ВЕРНУТЬСЯ К СПИСКУ УРОКОВ</button>
                        </div>
                    `;
                    document.getElementById('backToGrammarFromComplete').onclick = () => {
                        localStorage.removeItem('dm_last_grammar_lesson');
                        localStorage.removeItem('dm_last_grammar_level');
                        const level = AppConfig.currentLevel;
                        const modeIndicator = document.getElementById('modeIndicator');
                        if (modeIndicator) {
                            modeIndicator.textContent = `Грамматика ${level}`;
                            modeIndicator.style.background = '';
                            modeIndicator.style.padding = '';
                            modeIndicator.style.color = '';
                            modeIndicator.style.fontWeight = '';
                        }
                        updateCounter();
                        updateModeIndicator();
                        renderGrammar();
                    };
                }
            }
        }, 500);
    } else {
        if (input) {
            input.style.backgroundColor = '#FFCDD2';
            input.style.borderColor = '#F44336';
            clearBlinkTimer();
            grammarBlinkTimer = setTimeout(() => {
                input.style.backgroundColor = '';
                input.style.borderColor = '#D0D0D0';
                input.value = '';
                input.focus();
            }, 500);
        } else {
            const btns = document.querySelectorAll('.quiz-opt');
            btns.forEach(btn => {
                if (btn.getAttribute('data-value').toLowerCase() === userAnswer) {
                    btn.style.backgroundColor = '#FFCDD2';
                    btn.style.borderColor = '#F44336';
                    setTimeout(() => {
                        btn.style.backgroundColor = '';
                        btn.style.borderColor = '#D0D0D0';
                    }, 500);
                }
            });
        }
    }
}
