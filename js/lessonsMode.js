async function loadLessonsAndPractice() {
    for (let i = 1; i <= 50; i++) {
        try {
            const respLesson = await fetch(`/Deutsch-Meister/docs/lessons/lesson_${i}.txt`);
            lessonsCache[i] = respLesson.ok ? await respLesson.text() : `=== УРОК ${i} ===\n\nСодержание урока пока не добавлено.`;
        } catch(e) { lessonsCache[i] = `=== УРОК ${i} ===\n\nОшибка загрузки.`; }
        
        try {
            const respPractice = await fetch(`/Deutsch-Meister/docs/practice/lesson_${i}.txt`);
            practiceCache[i] = respPractice.ok ? await respPractice.text() : '';
        } catch(e) { practiceCache[i] = ''; }
    }
}

function buildLessonsList() {
    const panel = document.getElementById('lessonsPanel');
    if (!panel) return;
    let html = '<div class="lessons-grid">';
    for (let i = 1; i <= 50; i++) {
        html += `<button class="lesson-grid-btn" data-lesson="${i}">${i}</button>`;
    }
    html += '</div>';
    panel.innerHTML = html;
    document.querySelectorAll('[data-lesson]').forEach(btn => {
        btn.onclick = () => {
            currentLesson = parseInt(btn.dataset.lesson);
            lessonMode = 'theory';
            if (currentMode === 'lessons') renderLessons();
            else { setMode('lessons'); renderLessons(); }
        };
    });
}

let lessonExercises = [];
let currentExerciseIndex = 0;
let currentExerciseState = null;
let blinkTimer = null;
let practiceHintIndex = 0;
let practiceHintWords = [];

function normalizeText(text) {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').trim();
}

function getDistractors(count, excludeTokens) {
    const allWords = wordsDB[AppConfig.currentLevel] || [];
    let allTokens = [];
    allWords.forEach(w => {
        const tokens = w.de.split(/\s+/);
        tokens.forEach(t => allTokens.push(t.toLowerCase().replace(/[.,!?;:]/g, '')));
    });
    const basic = ['der','die','das','den','dem','des','ein','eine','und','oder','aber','sehr','gut','nicht','auch'];
    allTokens.push(...basic);
    const excludeSet = new Set(excludeTokens.map(t => t.toLowerCase()));
    const available = [...new Set(allTokens.filter(t => !excludeSet.has(t) && t.length > 1))];
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count);
}

function renderLessons() {
    document.getElementById('content').innerHTML = `
        <div class="lesson-header">
            <div class="lesson-title">📖 УРОК ${currentLesson}</div>
            <div>Урок ${currentLesson} из 50</div>
        </div>
        <div class="lesson-mode" id="lessonModeContainer">
            <button id="theoryBtn" class="lesson-mode-btn active">ТЕОРИЯ</button>
            <button id="practiceBtn" class="lesson-mode-btn">ПРАКТИКА</button>
        </div>
        <div id="lessonContent" class="lesson-text"></div>
    `;
    
    const practiceBtn = document.getElementById('practiceBtn');
    if (currentLesson === 1 || currentLesson === 2) {
        if (practiceBtn) practiceBtn.style.display = 'none';
        if (lessonMode === 'practice') {
            lessonMode = 'theory';
        }
    } else {
        if (practiceBtn) practiceBtn.style.display = 'block';
    }
    
    document.getElementById('theoryBtn').onclick = () => {
        if (blinkTimer) clearTimeout(blinkTimer);
        lessonMode = 'theory';
        document.getElementById('theoryBtn').classList.add('active');
        const pBtn = document.getElementById('practiceBtn');
        if (pBtn) pBtn.classList.remove('active');
        showLessonContent();
    };
    
    if (practiceBtn) {
        practiceBtn.onclick = () => {
            if (blinkTimer) clearTimeout(blinkTimer);
            lessonMode = 'practice';
            practiceBtn.classList.add('active');
            document.getElementById('theoryBtn').classList.remove('active');
            showLessonContent();
        };
    }
    
    function showHint() {
        if (!practiceHintWords.length) return;
        if (practiceHintIndex >= practiceHintWords.length) return;
        const currentHint = practiceHintWords.slice(0, practiceHintIndex + 1).join(' ');
        const hintDiv = document.getElementById('practice_hint_dynamic');
        if (hintDiv) hintDiv.textContent = '💡 ' + currentHint;
        practiceHintIndex++;
    }
    
    function resetHint() {
        practiceHintIndex = 0;
        const hintDiv = document.getElementById('practice_hint_dynamic');
        if (hintDiv) hintDiv.textContent = '';
    }
    
    function showPracticeExercise(exercise, index, total) {
        resetHint();
        practiceHintWords = exercise.answer_tokens || exercise.answer.split(/\s+/);
        practiceHintWords = practiceHintWords.map(w => w.replace(/[.,!?;:]/g, ''));
        
        const container = document.getElementById('lessonContent');
        if (!container) return;
        
        const correctTokens = exercise.answer_tokens || exercise.answer.split(/\s+/);
        const maxTokens = 12;
        const neededCount = correctTokens.length;
        const distractorsCount = Math.max(0, maxTokens - neededCount);
        let allTokens = [...correctTokens];
        if (distractorsCount > 0 && neededCount > 0) {
            const distractors = getDistractors(distractorsCount, correctTokens);
            allTokens.push(...distractors);
        }
        for (let i = allTokens.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allTokens[i], allTokens[j]] = [allTokens[j], allTokens[i]];
        }
        
        currentExerciseState = {
            available: allTokens,
            selected: [],
            active: {},
            answer: normalizeText(exercise.answer),
            question: exercise.question,
            index: index
        };
        allTokens.forEach(w => { currentExerciseState.active[w] = true; });
        
        function refreshDisplay() {
            const wordsDiv = document.getElementById('practice_words_dynamic');
            const selectedDiv = document.getElementById('practice_selected_dynamic');
            if (!wordsDiv) return;
            
            const existingButtons = wordsDiv.querySelectorAll('.word-btn');
            existingButtons.forEach(btn => {
                const word = btn.getAttribute('data-word');
                if (currentExerciseState.active[word]) {
                    btn.style.display = 'inline-block';
                    btn.disabled = false;
                } else {
                    btn.style.display = 'none';
                    btn.disabled = true;
                }
            });
            selectedDiv.textContent = currentExerciseState.selected.join(' ');
        }
        
        let buttonsHtml = '';
        currentExerciseState.available.forEach(word => {
            const safeWord = word.replace(/"/g, '&quot;');
            buttonsHtml += `<button class="word-btn" data-word="${safeWord}" style="display: inline-block;">${word}</button>`;
        });
        
        container.innerHTML = `
            <div style="max-width:700px;margin:0 auto;">
                <div style="background:white;border-radius:16px;padding:20px;margin-bottom:20px;">
                    <div style="font-size:18px;font-weight:bold;margin-bottom:15px;">📝 ${exercise.question}</div>
                    
                    <div class="practice-selected-area" id="practice_selected_dynamic"></div>
                    
                    <div class="words-container" id="practice_words_dynamic">
                        ${buttonsHtml}
                    </div>
                    
                    <div class="btn-group" style="margin-top:15px;">
                        <button class="ctrl-btn" id="practice_undo_dynamic">ВЕРНУТЬ СЛОВО</button>
                        <button class="ctrl-btn" id="practice_reset_dynamic">СБРОСИТЬ ВСЁ</button>
                        <button class="ctrl-btn check-btn" id="practice_check_dynamic">ПРОВЕРИТЬ</button>
                    </div>
                    
                    <div class="hint-area">
                        <button class="ctrl-btn" id="practice_hint_dynamic_btn">ПОДСКАЗАТЬ</button>
                        <div class="hint-label" id="practice_hint_dynamic"></div>
                    </div>
                    
                    <div class="btn-group">
                        <button class="ctrl-btn" id="practice_prev_dynamic">◀ НАЗАД</button>
                        <button class="ctrl-btn" id="practice_next_dynamic">ВПЕРЁД ▶</button>
                    </div>
                    
                    <div id="practice_counter_dynamic" class="hint" style="margin-top:10px;">Упражнение ${index + 1} из ${total}</div>
                </div>
            </div>
        `;
        
        const wordButtons = document.querySelectorAll('#practice_words_dynamic .word-btn');
        wordButtons.forEach(btn => {
            const word = btn.getAttribute('data-word');
            btn.onclick = () => {
                if (currentExerciseState.active[word]) {
                    currentExerciseState.active[word] = false;
                    currentExerciseState.selected.push(word);
                    refreshDisplay();
                }
            };
        });
        
        document.getElementById('practice_undo_dynamic').onclick = () => {
            if (currentExerciseState.selected.length) {
                const last = currentExerciseState.selected.pop();
                currentExerciseState.active[last] = true;
                refreshDisplay();
            }
        };
        
        document.getElementById('practice_reset_dynamic').onclick = () => {
            currentExerciseState.selected = [];
            currentExerciseState.available.forEach(w => { currentExerciseState.active[w] = true; });
            refreshDisplay();
            resetHint();
        };
        
        document.getElementById('practice_check_dynamic').onclick = () => {
            const user = normalizeText(currentExerciseState.selected.join(' '));
            const resultDiv = document.getElementById('practice_selected_dynamic');
            
            if (user === currentExerciseState.answer) {
                resultDiv.style.transition = 'background-color 0.2s';
                resultDiv.style.backgroundColor = '#C8E6C9';
                if (blinkTimer) clearTimeout(blinkTimer);
                blinkTimer = setTimeout(() => {
                    resultDiv.style.backgroundColor = '#FFFFFF';
                    if (currentExerciseIndex + 1 < lessonExercises.length) {
                        currentExerciseIndex++;
                        showPracticeExercise(lessonExercises[currentExerciseIndex], currentExerciseIndex, lessonExercises.length);
                    } else {
                        const container = document.getElementById('lessonContent');
                        if (container) {
                            container.innerHTML = `
                                <div style="text-align:center;padding:40px;">
                                    <div style="font-size:24px;margin-bottom:20px;">🎉 Поздравляем! 🎉</div>
                                    <div style="font-size:18px;">Все упражнения урока ${currentLesson} выполнены!</div>
                                </div>
                            `;
                        }
                    }
                }, 400);
            } else {
                resultDiv.style.transition = 'background-color 0.2s';
                resultDiv.style.backgroundColor = '#FFCDD2';
                if (blinkTimer) clearTimeout(blinkTimer);
                blinkTimer = setTimeout(() => {
                    resultDiv.style.backgroundColor = '#FFFFFF';
                    currentExerciseState.selected = [];
                    currentExerciseState.available.forEach(w => { currentExerciseState.active[w] = true; });
                    refreshDisplay();
                    resetHint();
                }, 400);
            }
        };
        
        document.getElementById('practice_hint_dynamic_btn').onclick = () => {
            showHint();
        };
        
        document.getElementById('practice_prev_dynamic').onclick = () => {
            if (currentExerciseIndex > 0) {
                currentExerciseIndex--;
                showPracticeExercise(lessonExercises[currentExerciseIndex], currentExerciseIndex, lessonExercises.length);
            }
        };
        
        document.getElementById('practice_next_dynamic').onclick = () => {
            if (currentExerciseIndex + 1 < lessonExercises.length) {
                currentExerciseIndex++;
                showPracticeExercise(lessonExercises[currentExerciseIndex], currentExerciseIndex, lessonExercises.length);
            }
        };
        
        refreshDisplay();
    }
    
    function showLessonContent() {
        const container = document.getElementById('lessonContent');
        if (!container) return;
        
        if (lessonMode === 'theory') {
            let content = lessonsCache[currentLesson] || `=== УРОК ${currentLesson} ===\n\nСодержание урока пока не добавлено.`;
            content = content.replace(/\[озвучк[аa]:([^\]]+)\]/g, (match, word) => {
                return `<button class="speak-btn-inline" onclick="speak('${word.replace(/'/g, "\\'")}')">🔊</button>`;
            });
            content = content.replace(/\n/g, '<br>');
            container.innerHTML = `<div>${content}</div>`;
        } else {
            const practiceText = practiceCache[currentLesson] || '';
            if (!practiceText.trim()) {
                container.innerHTML = '<div style="text-align:center;padding:40px;">✨ В этом уроке нет упражнений ✨</div>';
                return;
            }
            const lines = practiceText.split('\n');
            lessonExercises = [];
            for (const line of lines) {
                if (line.includes('|')) {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        const question = parts[0].trim();
                        const answer = parts[1].trim();
                        if (question && answer && question.length > 1 && answer.length > 1) {
                            lessonExercises.push({
                                question: question,
                                answer: answer,
                                answer_tokens: answer.split(/\s+/)
                            });
                        }
                    }
                }
            }
            if (!lessonExercises.length) {
                container.innerHTML = '<div style="text-align:center;padding:40px;">✨ В этом уроке нет упражнений ✨</div>';
                return;
            }
            currentExerciseIndex = 0;
            showPracticeExercise(lessonExercises[0], 0, lessonExercises.length);
        }
    }
    
    showLessonContent();
    updateCounter();
}
