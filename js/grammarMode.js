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
    const totalLessons = lessons.length;
    const completedCount = grammarProgress[level]?.filter(p => p?.completed === true).length || 0;
    
    // Сохраняем текущий индекс урока в глобальную переменную для навигации
    window.currentGrammarLessonIndex = lessonIdx;
    
    // HTML-структура с поддержкой десктопной и мобильной прокрутки
    document.getElementById('content').innerHTML = `
        <div class="grammar-lesson-container" style="height: 100%; display: flex; flex-direction: column;">
            <!-- ДЕСКТОПНАЯ ВЕРСИЯ: обычные заголовки (без фиксации) -->
            <div class="desktop-only-header">
                <div style="margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <button class="ctrl-btn" id="backToGrammarList" style="cursor: pointer; background: #3B6FE0; color: white;">← К СПИСКУ УРОКОВ</button>
                    <div style="display: flex; gap: 10px;">
                        ${!isFirstLesson ? '<button class="ctrl-btn" id="prevLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">← ПРЕДЫДУЩИЙ</button>' : ''}
                        ${!isLastLesson ? '<button class="ctrl-btn" id="nextLessonBtn" style="cursor: pointer; background: #3B6FE0; color: white;">СЛЕДУЮЩИЙ →</button>' : ''}
                    </div>
                </div>
                <div class="lesson-header">
                    <div class="lesson-title">📖 Урок ${lesson.lesson}: ${lesson.title}</div>
                    <div>Уровень ${level} | Пройдено: ${completedCount} из ${totalLessons} уроков</div>
                </div>
                <div class="lesson-mode" id="grammarModeContainer">
                    <button id="grammarTheoryBtn" class="lesson-mode-btn active" style="cursor: pointer;">📘 ТЕОРИЯ</button>
                    <button id="grammarPracticeBtn" class="lesson-mode-btn" style="cursor: pointer;">✍️ УПРАЖНЕНИЯ</button>
                </div>
            </div>
            
            <!-- МОБИЛЬНАЯ ВЕРСИЯ: фиксированная верхняя панель -->
            <div class="grammar-mobile-fixed-bar">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="mobile-lesson-title">📖 Урок ${lesson.lesson}</span>
                    <span class="mobile-counter">📊 ${completedCount}/${totalLessons}</span>
                </div>
                <div style="display: flex; gap: 8px;">
                    ${!isFirstLesson ? '<button class="ctrl-btn" id="mobilePrevLessonBtn" style="padding: 4px 10px; font-size: 11px;">←</button>' : ''}
                    ${!isLastLesson ? '<button class="ctrl-btn" id="mobileNextLessonBtn" style="padding: 4px 10px; font-size: 11px;">→</button>' : ''}
                    <button class="ctrl-btn" id="mobileBackToListBtn" style="padding: 4px 10px; font-size: 11px;">📋</button>
                </div>
            </div>
            
            <!-- МОБИЛЬНЫЕ КНОПКИ ПЕРЕКЛЮЧЕНИЯ РЕЖИМОВ (под фиксированной панелью) -->
            <div class="lesson-mode" id="mobileGrammarModeContainer" style="margin: 10px 12px; display: none;">
                <button id="mobileGrammarTheoryBtn" class="lesson-mode-btn active" style="cursor: pointer;">📘 ТЕОРИЯ</button>
                <button id="mobileGrammarPracticeBtn" class="lesson-mode-btn" style="cursor: pointer;">✍️ УПРАЖНЕНИЯ</button>
            </div>
            
            <!-- ПРОКРУЧИВАЕМАЯ ОБЛАСТЬ (общая для теории и упражнений) -->
            <div class="grammar-scrollable-content" id="grammarContent">
                <!-- Сюда динамически загружается теория или упражнения -->
            </div>
        </div>
    `;
    
    // ========== ДЕСКТОПНЫЕ ОБРАБОТЧИКИ ==========
    const backBtn = document.getElementById('backToGrammarList');
    if (backBtn) {
        backBtn.onclick = () => {
            localStorage.removeItem('dm_last_grammar_lesson');
            localStorage.removeItem('dm_last_grammar_level');
            renderGrammar();
        };
    }
    
    const prevBtn = document.getElementById('prevLessonBtn');
    if (prevBtn && !isFirstLesson) {
        prevBtn.onclick = () => {
            renderGrammarLesson(lessonIdx - 1);
        };
    }
    
    const nextBtn = document.getElementById('nextLessonBtn');
    if (nextBtn && !isLastLesson) {
        nextBtn.onclick = () => {
            renderGrammarLesson(lessonIdx + 1);
        };
    }
    
    // ========== МОБИЛЬНЫЕ ОБРАБОТЧИКИ ==========
    const mobilePrevBtn = document.getElementById('mobilePrevLessonBtn');
    if (mobilePrevBtn && !isFirstLesson) {
        mobilePrevBtn.onclick = () => {
            renderGrammarLesson(lessonIdx - 1);
        };
    }
    
    const mobileNextBtn = document.getElementById('mobileNextLessonBtn');
    if (mobileNextBtn && !isLastLesson) {
        mobileNextBtn.onclick = () => {
            renderGrammarLesson(lessonIdx + 1);
        };
    }
    
    const mobileBackBtn = document.getElementById('mobileBackToListBtn');
    if (mobileBackBtn) {
        mobileBackBtn.onclick = () => {
            localStorage.removeItem('dm_last_grammar_lesson');
            localStorage.removeItem('dm_last_grammar_level');
            renderGrammar();
        };
    }
    
    // ========== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ==========
    // Десктопные кнопки
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
    
    // Мобильные кнопки
    const mobileModeContainer = document.getElementById('mobileGrammarModeContainer');
    if (mobileModeContainer) {
        mobileModeContainer.style.display = 'flex';
    }
    
    const mobileTheoryBtn = document.getElementById('mobileGrammarTheoryBtn');
    const mobilePracticeBtn = document.getElementById('mobileGrammarPracticeBtn');
    
    if (mobileTheoryBtn) {
        mobileTheoryBtn.onclick = () => {
            currentGrammarMode = 'theory';
            mobileTheoryBtn.classList.add('active');
            if (mobilePracticeBtn) mobilePracticeBtn.classList.remove('active');
            if (theoryBtn) {
                theoryBtn.classList.add('active');
                if (practiceBtn) practiceBtn.classList.remove('active');
            }
            showGrammarTheory();
        };
    }
    
    if (mobilePracticeBtn) {
        mobilePracticeBtn.onclick = () => {
            currentGrammarMode = 'practice';
            mobilePracticeBtn.classList.add('active');
            if (mobileTheoryBtn) mobileTheoryBtn.classList.remove('active');
            if (practiceBtn) {
                practiceBtn.classList.add('active');
                if (theoryBtn) theoryBtn.classList.remove('active');
            }
            showGrammarPractice(lessonIdx);
        };
    }
    
    // Показываем теорию по умолчанию
    showGrammarTheory();
}
