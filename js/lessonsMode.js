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
            if (currentMode === 'lessons') renderLessons();
            else { setMode('lessons'); renderLessons(); }
        };
    });
}

function renderLessons() {
    document.getElementById('content').innerHTML = `
        <div class="lesson-header">
            <div class="lesson-title">📖 УРОК ${currentLesson}</div>
            <div>Урок ${currentLesson} из 50</div>
        </div>
        <div class="lesson-mode">
            <button id="theoryBtn" class="lesson-mode-btn active">ТЕОРИЯ</button>
            <button id="practiceBtn" class="lesson-mode-btn">ПРАКТИКА</button>
        </div>
        <div id="lessonContent" class="lesson-text"></div>
    `;
    
    document.getElementById('theoryBtn').onclick = () => {
        lessonMode = 'theory';
        document.getElementById('theoryBtn').classList.add('active');
        document.getElementById('practiceBtn').classList.remove('active');
        showLessonContent();
    };
    
    document.getElementById('practiceBtn').onclick = () => {
        lessonMode = 'practice';
        document.getElementById('practiceBtn').classList.add('active');
        document.getElementById('theoryBtn').classList.remove('active');
        showLessonContent();
    };
    
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
    
    function showLessonContent() {
        const container = document.getElementById('lessonContent');
        if (!container) return;
        
        if (lessonMode === 'theory') {
            let content = lessonsCache[currentLesson] || `=== УРОК ${currentLesson} ===\n\nСодержание урока пока не добавлено.`;
            content = content.replace(/\[озвучка:([^\]]+)\]/g, (match, word) => {
                return `<button class="speak-btn-inline" onclick="speak('${word.replace(/'/g, "\\'")}')">🔊 ${word}</button>`;
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
            const exercises = [];
            for (const line of lines) {
                if (line.includes('|')) {
                    const parts = line.split('|');
                    if (parts.length >= 2) {
                        const question = parts[0].trim();
                        const answer = parts[1].trim();
                        if (question && answer) {
                            exercises.push({
                                question: question,
                                answer: answer,
                                answer_tokens: answer.split(/\s+/)
                            });
                        }
                    }
                }
            }
            if (!exercises.length) {
                container.innerHTML = '<div style="text-align:center;padding:40px;">✨ В этом уроке нет упражнений ✨</div>';
                return;
            }
            
            container.innerHTML = '<div style="max-width:700px;margin:0 auto;"></div>';
            const innerDiv = container.firstChild;
            
            exercises.forEach((ex, idx) => {
                const correctTokens = ex.answer_tokens;
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
                
                const state = {
                    available: allTokens,
                    selected: [],
                    active: {},
                    answer: normalizeText(ex.answer)
                };
                allTokens.forEach(w => { state.active[w] = true; });
                
                function refresh() {
                    const wordsDiv = document.getElementById(`practice_words_${idx}`);
                    const selectedDiv = document.getElementById(`practice_selected_${idx}`);
                    if (!wordsDiv) return;
                    wordsDiv.innerHTML = '';
                    state.available.forEach(word => {
                        if (state.active[word]) {
                            const btn = document.createElement('button');
                            btn.className = 'word-btn';
                            btn.textContent = word;
                            btn.onclick = () => {
                                if (state.active[word]) {
                                    state.active[word] = false;
                                    state.selected.push(word);
                                    refresh();
                                }
                            };
                            wordsDiv.appendChild(btn);
                        }
                    });
                    selectedDiv.textContent = state.selected.join(' ');
                }
                
                const containerDiv = document.createElement('div');
                containerDiv.style.background = 'white';
                containerDiv.style.borderRadius = '16px';
                containerDiv.style.padding = '20px';
                containerDiv.style.marginBottom = '20px';
                containerDiv.innerHTML = `
                    <div style="font-size:18px;font-weight:bold;margin-bottom:15px;">📝 ${ex.question}</div>
                    <div class="words-container" id="practice_words_${idx}"></div>
                    <div class="sent-result" id="practice_selected_${idx}" style="min-height:60px;"></div>
                    <div class="btn-group" style="margin-top:15px;">
                        <button class="ctrl-btn" id="practice_undo_${idx}">ВЕРНУТЬ СЛОВО</button>
                        <button class="ctrl-btn" id="practice_reset_${idx}">СБРОСИТЬ ВСЁ</button>
                        <button class="ctrl-btn" id="practice_check_${idx}" style="background:#3B6FE0;color:white;">ПРОВЕРИТЬ</button>
                    </div>
                    <div id="practice_msg_${idx}" class="hint" style="margin-top:10px;"></div>
                `;
                innerDiv.appendChild(containerDiv);
                
                refresh();
                
                document.getElementById(`practice_undo_${idx}`).onclick = () => {
                    if (state.selected.length) {
                        const last = state.selected.pop();
                        state.active[last] = true;
                        refresh();
                    }
                };
                document.getElementById(`practice_reset_${idx}`).onclick = () => {
                    state.selected = [];
                    state.available.forEach(w => { state.active[w] = true; });
                    refresh();
                    const msgDiv = document.getElementById(`practice_msg_${idx}`);
                    if (msgDiv) msgDiv.textContent = '';
                };
                document.getElementById(`practice_check_${idx}`).onclick = () => {
                    const user = normalizeText(state.selected.join(' '));
                    const msgDiv = document.getElementById(`practice_msg_${idx}`);
                    if (user === state.answer) {
                        msgDiv.innerHTML = '✅ Правильно!';
                        msgDiv.style.color = '#1B5E20';
                    } else {
                        msgDiv.innerHTML = `❌ Неправильно! Правильный ответ: ${ex.answer}`;
                        msgDiv.style.color = '#B71C1C';
                    }
                };
            });
        }
    }
    
    showLessonContent();
    updateCounter();
}
