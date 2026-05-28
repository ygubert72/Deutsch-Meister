    function showPracticeExercise(exercise, index, total) {
        resetHint(); // Сбрасываем подсказку при загрузке нового упражнения
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
        
        // Перестраиваем HTML, чтобы кнопка "ПОДСКАЗАТЬ" была на месте
        container.innerHTML = `
            <div style="max-width:700px;margin:0 auto;">
                <div style="background:white;border-radius:16px;padding:20px;margin-bottom:20px;">
                    <div style="font-size:18px;font-weight:bold;margin-bottom:15px;">📝 ${exercise.question}</div>
                    <div class="words-container" id="practice_words_dynamic">${buttonsHtml}</div>
                    <div class="sent-result" id="practice_selected_dynamic" style="min-height:60px; margin:15px 0;"></div>
                    <div class="btn-group" style="margin-top:15px;">
                        <button class="ctrl-btn" id="practice_undo_dynamic">ВЕРНУТЬ СЛОВО</button>
                        <button class="ctrl-btn" id="practice_reset_dynamic">СБРОСИТЬ ВСЁ</button>
                        <button class="ctrl-btn" id="practice_check_dynamic" style="background:#3B6FE0;color:white;">ПРОВЕРИТЬ</button>
                        <button class="ctrl-btn" id="practice_hint_dynamic_btn">ПОДСКАЗАТЬ</button>
                    </div>
                    <div class="btn-group">
                        <button class="ctrl-btn" id="practice_prev_dynamic">◀ ПРЕДЫДУЩЕЕ</button>
                        <button class="ctrl-btn" id="practice_next_dynamic">СЛЕДУЮЩЕЕ ▶</button>
                    </div>
                    <div id="practice_counter_dynamic" class="hint" style="margin-top:10px;">Упражнение ${index + 1} из ${total}</div>
                    <div id="practice_hint_dynamic" class="hint" style="margin-top:10px; color:#3B6FE0; font-weight:bold;"></div>
                </div>
            </div>
        `;
        
        // ... (привязываем все кнопки) ...
        // Особенно важно: привязываем кнопку подсказки
        const hintButton = document.getElementById('practice_hint_dynamic_btn');
        if (hintButton) {
            hintButton.onclick = () => { showHint(); };
        } else {
            console.error("Кнопка 'practice_hint_dynamic_btn' не найдена в DOM!");
        }
        
        // Привязываем остальные кнопки (они должны быть в коде)
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
        
        document.getElementById('practice_undo_dynamic').onclick = () => { /* ... */ };
        document.getElementById('practice_reset_dynamic').onclick = () => { /* ... */ };
        document.getElementById('practice_check_dynamic').onclick = () => { /* ... */ };
        document.getElementById('practice_prev_dynamic').onclick = () => { /* ... */ };
        document.getElementById('practice_next_dynamic').onclick = () => { /* ... */ };
        
        refreshDisplay();
    }
