// grammarMode.js - полная версия с умной озвучкой (замена _____ на answer, удаление скобок, исправление пробелов, очистка от иероглифов)

let grammarDB = { A1: [], A2: [], B1: [], B2: [], C1: [] };
let currentGrammarLesson = null;
let currentGrammarMode = 'theory';
let grammarLessonData = null;

let grammarExercises = [];
let currentGrammarExerciseIndex = 0;
let grammarBlinkTimer = null;

// ========== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ИСПРАВЛЕНИЯ ПРОБЕЛОВ (с сохранением скобок и кавычек) ==========
function fixTextSpacing(text) {
    if (!text) return text;
    
    // Временно заменяем содержимое скобок и кавычек на плейсхолдеры
    const placeholders = [];
    
    // Сохраняем содержимое круглых скобок
    text = text.replace(/\(([^)]+)\)/g, (match, content) => {
        placeholders.push(`(${content})`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    
    // Сохраняем содержимое квадратных скобок
    text = text.replace(/\[([^\]]+)\]/g, (match, content) => {
        placeholders.push(`[${content}]`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    
    // Сохраняем содержимое фигурных скобок
    text = text.replace(/\{([^}]+)\}/g, (match, content) => {
        placeholders.push(`{${content}}`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    
    // Сохраняем содержимое двойных кавычек
    text = text.replace(/"([^"]+)"/g, (match, content) => {
        placeholders.push(`"${content}"`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    
    // Сохраняем содержимое одинарных кавычек
    text = text.replace(/'([^']+)'/g, (match, content) => {
        placeholders.push(`'${content}'`);
        return `%%%${placeholders.length - 1}%%%`;
    });
    
    // Теперь добавляем пробелы после знаков препинания во всём остальном тексте
    text = text.replace(/([.!?;:),}\]>»])([А-Яа-яA-Za-z0-9])/g, '$1 $2');
    
    // Восстанавливаем сохранённые скобки и кавычки
    text = text.replace(/%%%(\d+)%%%/g, (match, index) => {
        return placeholders[parseInt(index)];
    });
    
    // Убираем лишние пробелы
    text = text.replace(/\s+/g, ' ');
    
    return text;
}

// ========== ФУНКЦИЯ ДЛЯ ОЧИСТКИ ТЕКСТА ОТ КИТАЙСКИХ ИЕРОГЛИФОВ ==========
function cleanChineseCharacters(text) {
    if (!text) return text;
    
    // Заменяем "一方面" на нормальный разделитель
    let cleaned = text.replace(/一方面/g, '▶ ');
    
    // Заменяем остальные китайские иероглифы (диапазон Unicode) на пробелы
    cleaned = cleaned.replace(/[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/g, ' ');
    
    // Убираем лишние пробелы
    cleaned = cleaned.replace(/\s+/g, ' ');
    
    return cleaned;
}

// ========== ЗАГРУЗКА ГРАММАТИКИ ==========
async function loadGrammarData() {
    console.log('loadGrammarData: загрузка грамматики');
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    
    for (const level of levels) {
        grammarDB[level] = [];
        
        try {
            const indexUrl = `docs/grammar/${level}/index.json`;
            const indexResp = await fetch(indexUrl);
            
            if (!indexResp.ok) {
                console.log(`⚠️ Грамматика для уровня ${level} не найдена`);
                continue;
            }
            
            const index = await indexResp.json();
            console.log(`📚 Загружаю ${level}: ${index.lessons.length} уроков`);
            
            for (const lessonPath of index.lessons) {
                const lessonUrl = `docs/grammar/${level}/${lessonPath}`;
                const lessonResp = await fetch(lessonUrl);
                
                if (lessonResp.ok) {
                    const lessonData = await lessonResp.json();
                    grammarDB[level].push(lessonData);
                    console.log(`  ✅ Урок ${lessonData.lesson}: ${lessonData.title}`);
                } else {
                    console.log(`  ❌ Ошибка загрузки: ${lessonPath}`);
                }
            }
            
            if (!grammarProgress[level]) {
                grammarProgress[level] = [];
                for (let i = 0; i < grammarDB[level].length; i++) {
                    grammarProgress[level][i] = { completed: false };
                }
            }
            
        } catch(e) {
            console.error(`Ошибка загрузки ${level}:`, e);
            grammarDB[level] = [];
        }
    }
    
    saveGrammarProgress();
    console.log('loadGrammarData: завершено');
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
    console.log('renderGrammar: начат');
    const level = AppConfig.currentLevel;
    const lessons = grammarDB[level];
    
    const savedLesson = localStorage.getItem('dm_last_grammar_lesson');
    const savedLevel = localStorage.getItem('dm_last_grammar_level');
    if (savedLesson !== null && savedLevel === level && lessons && lessons[parseInt(savedLesson)]) {
        const lessonIdx = parseInt(savedLesson);
        console.log('Восстанавливаю урок:', lessonIdx);
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
            console.log('КЛИК по уроку:', lessonIdx);
            renderGrammarLesson(lessonIdx);
        };
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
    console.log('renderGrammarLesson: открытие урока', lessonIdx);
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
    
    document.getElementById('content').innerHTML = `
        <div style="max-width: 900px; margin: 0 auto;">
            <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
                <button class="ctrl-btn" id="backToGrammarList" style="cursor: pointer; background: #3B6FE0; color: white;">← К СПИСКУ УРОКОВ</button>
                <div style="display: flex; gap: 10px;">
                    ${!isFirstLesson ? '<button class="ctrl-btn" id="prevLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">← ПРЕДЫДУЩИЙ УРОК</button>' : ''}
                    ${!isLastLesson ? '<button class="ctrl-btn" id="nextLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">СЛЕДУЮЩИЙ УРОК →</button>' : ''}
                </div>
            </div>
            <div class="lesson-header">
                <div class="lesson-title">📖 Урок ${lesson.lesson}: ${lesson.title}</div>
                <div>Уровень ${level}</div>
            </div>
            <div class="lesson-mode" id="grammarModeContainer">
                <button id="grammarTheoryBtn" class="lesson-mode-btn active" style="cursor: pointer;">ТЕОРИЯ</button>
                <button id="grammarPracticeBtn" class="lesson-mode-btn" style="cursor: pointer;">УПРАЖНЕНИЯ</button>
            </div>
            <div id="grammarContent" class="lesson-text"></div>
        </div>
    `;
    
    document.getElementById('backToGrammarList').onclick = () => {
        localStorage.removeItem('dm_last_grammar_lesson');
        localStorage.removeItem('dm_last_grammar_level');
        renderGrammar();
    };
    
    const prevLessonBtn = document.getElementById('prevLessonBtn');
    if (prevLessonBtn && !isFirstLesson) {
        prevLessonBtn.onclick = () => {
            renderGrammarLesson(lessonIdx - 1);
        };
    }
    
    const nextLessonBtn = document.getElementById('nextLessonBtn');
    if (nextLessonBtn && !isLastLesson) {
        nextLessonBtn.onclick = () => {
            renderGrammarLesson(lessonIdx + 1);
        };
    }
    
    document.getElementById('grammarTheoryBtn').onclick = () => {
        currentGrammarMode = 'theory';
        document.getElementById('grammarTheoryBtn').classList.add('active');
        document.getElementById('grammarPracticeBtn').classList.remove('active');
        showGrammarTheory();
    };
    
    document.getElementById('grammarPracticeBtn').onclick = () => {
        currentGrammarMode = 'practice';
        document.getElementById('grammarPracticeBtn').classList.add('active');
        document.getElementById('grammarTheoryBtn').classList.remove('active');
        showGrammarPractice(lessonIdx);
    };
    
    showGrammarTheory();
}

function showGrammarTheory() {
    const container = document.getElementById('grammarContent');
    if (!container || !grammarLessonData) return;
    
    // Очищаем текст теории от китайских иероглифов
    let fixedTheory = grammarLessonData.theory || '';
    if (fixedTheory) {
        // Удаляем китайские иероглифы
        fixedTheory = cleanChineseCharacters(fixedTheory);
        // Исправляем пробелы после знаков препинания
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
    
    console.log('📊 Всего упражнений в уроке:', grammarExercises.length);
    
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

// Функция для получения чистого текста для озвучки (заменяет _____ на answer и удаляет текст в скобках)
function getCleanTextForSpeak(exercise) {
    // 1. Если есть original_sentence - используем его
    let text = '';
    if (exercise.original_sentence) {
        text = exercise.original_sentence;
    }
    // 2. Если есть sentence - заменяем подчёркивания на answer
    else if (exercise.sentence) {
        text = exercise.sentence;
        // Заменяем _____ или ___ на правильный ответ
        if (exercise.answer) {
            text = text.replace(/_{3,}/g, exercise.answer);
        } else {
            // Если ответа нет - просто убираем подчёркивания
            text = text.replace(/_{3,}/g, '');
        }
    }
    // 3. Если есть question - используем его
    else if (exercise.question) {
        text = exercise.question;
    }
    // 4. В крайнем случае - ответ
    else if (exercise.answer) {
        text = exercise.answer;
    }
    
    if (!text) return '';
    
    // Удаляем всё, что в круглых скобках, включая сами скобки
    text = text.replace(/\s*\([^)]*\)\s*/g, ' ');
    
    // Убираем лишние пробелы
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
    
    // Единый формат для всех типов упражнений — голубой фон
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
        let sentenceText = exercise.sentence || '';
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
    
    // Сохраняем чистый текст для озвучки
    const cleanTextForSpeak = getCleanTextForSpeak(exercise);
    
    // Обработчики для полей ввода
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
    
    // Обработчики для choice (кнопки)
    if (exercise.type === 'choice') {
        const options = document.querySelectorAll('.quiz-opt');
        options.forEach(opt => {
            opt.onclick = () => {
                const userAnswer = opt.getAttribute('data-value').toLowerCase();
                checkGrammarAnswer(userAnswer, exercise, lessonIdx);
            };
        });
    }
    
    // Кнопка проверки для fill/transform/order
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
    
    // ========== КНОПКА ОЗВУЧКИ ==========
    const speakBtn = document.getElementById('grammarSpeakBtn');
    if (speakBtn) {
        speakBtn.onclick = () => {
            if (cleanTextForSpeak) {
                console.log('Озвучиваю:', cleanTextForSpeak);
                speak(cleanTextForSpeak);
            } else {
                console.log('Нет текста для озвучки');
            }
        };
    }
    
    // Кнопка подсказки
    const hintBtn = document.getElementById('grammarHintBtn');
    if (hintBtn) {
        hintBtn.onclick = () => {
            const hintLabel = document.getElementById('grammarHintLabel');
            hintLabel.innerHTML = `💡 ${exercise.hint || 'Попробуйте ещё раз! Подсказки нет.'}`;
            setTimeout(() => { hintLabel.innerHTML = ''; }, 4000);
        };
    }
    
    // Кнопка назад
    const prevBtn = document.getElementById('grammarPrevBtn');
    if (prevBtn) {
        prevBtn.onclick = () => {
            if (currentGrammarExerciseIndex > 0) {
                currentGrammarExerciseIndex--;
                showGrammarExercise(grammarExercises[currentGrammarExerciseIndex], lessonIdx);
            }
        };
    }
    
    // Кнопка вперёд
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
        
        if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
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
                    document.getElementById('backToGrammarFromComplete').onclick = () => renderGrammar();
                }
            }
        }, 500);
    } else {
        if (input) {
            input.style.backgroundColor = '#FFCDD2';
            input.style.borderColor = '#F44336';
            
            if (grammarBlinkTimer) clearTimeout(grammarBlinkTimer);
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
