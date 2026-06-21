// studyMode.js — универсальный модуль для всех режимов обучения

class StudyMode {
    constructor(config) {
        this.config = config;
        this.items = [];
        this.currentIndex = 0;
        this.isMobile = window.utils ? window.utils.isMobileDevice() : window.innerWidth <= 768;
        
        // Состояние для режимов
        this.flipped = false;
        this.selected = [];
        this.activeItems = {};
        this.hintIndex = 0;
        this.hintWords = [];
        this.currentItem = null;
        this.selectedItems = [];
        
        // Конфигурация карусели
        this.touchStartX = 0;
        this.isDragging = false;
        this.containerWidth = 0;
        this.currentTranslate = 0;
        this.minSwipeDistance = 50;
        this.snapDuration = 250;
        this.resizeHandler = null;
        
        // Инициализация
        this.items = this.getItems();
        this.currentIndex = 0;
    }

    // ========== ОСНОВНЫЕ МЕТОДЫ ==========
    
    getItems() {
        return this.config.getItems ? this.config.getItems() : (this.config.items || []);
    }

    getCurrentItem() {
        const items = this.getItems();
        return items.length > 0 ? items[this.currentIndex % items.length] : null;
    }

    render() {
        const container = document.getElementById('content');
        if (!container) return;
        
        // Определяем мобильное устройство при каждом рендере
        this.isMobile = window.utils ? window.utils.isMobileDevice() : window.innerWidth <= 768;
        this.items = this.getItems();
        this.currentIndex = 0;
        
        if (this.isMobile) {
            this.renderMobile(container);
        } else {
            this.renderDesktop(container);
        }
        
        this.updateDisplay();
        this.updateCounter();
        this.attachEvents();
    }

    // ========== ДЕСКТОПНАЯ ВЕРСИЯ ==========
    
    renderDesktop(container) {
        const items = this.getItems();
        const hasItems = items.length > 0;
        
        let html = `
            <div style="text-align: center;">
                ${this.renderDirectionButton()}
                ${this.renderQuestion(hasItems)}
                ${this.renderResult()}
                ${this.renderWordsContainer(hasItems)}
                ${this.renderDesktopButtons()}
                ${this.renderHintArea()}
                ${this.renderNavigationButtons()}
                ${this.renderProgress()}
            </div>
        `;
        
        container.innerHTML = html;
    }

    renderDirectionButton() {
        const label = this.config.directionLabel || 'De → Ru';
        return `<button class="dir-btn" id="${this.config.prefix}DirBtn">${label}</button>`;
    }

    renderQuestion(hasItems) {
        if (!hasItems) {
            const emptyMsg = this.config.emptyMessage || '🎉 Все элементы изучены!';
            return `<div class="${this.config.prefix}-question" id="${this.config.prefix}Question">${emptyMsg}</div>`;
        }
        return `<div class="${this.config.prefix}-question" id="${this.config.prefix}Question"></div>`;
    }

    renderResult() {
        if (!this.config.showResult) return '';
        return `<div class="${this.config.prefix}-result" id="${this.config.prefix}Result"></div>`;
    }

    renderWordsContainer(hasItems) {
        if (!this.config.showWordsContainer) return '';
        const containerClass = this.isMobile ? 'words-container-mobile' : 'words-container';
        return `<div class="${containerClass}" id="${this.config.prefix}WordsContainer"></div>`;
    }

    renderDesktopButtons() {
        const buttons = this.config.desktopButtons || [];
        let html = '<div class="btn-group">';
        
        buttons.forEach(btn => {
            if (btn.id === 'speakBtn' && !this.config.enableSpeak) return;
            html += `<button class="ctrl-btn ${btn.class || ''}" id="${this.config.prefix}${btn.id}">${btn.label}</button>`;
        });
        
        // Добавляем дополнительные кнопки
        if (this.config.extraButtons) {
            this.config.extraButtons.forEach(btn => {
                html += `<button class="ctrl-btn ${btn.class || ''}" id="${this.config.prefix}${btn.id}">${btn.label}</button>`;
            });
        }
        
        html += '</div>';
        return html;
    }

    renderHintArea() {
        if (!this.config.showHint) return '';
        return `
            <div class="hint-area">
                <button class="ctrl-btn" id="${this.config.prefix}HintBtn">ПОДСКАЗКА</button>
                <div class="hint-label" id="${this.config.prefix}HintLabel"></div>
            </div>
        `;
    }

    renderNavigationButtons() {
        if (!this.config.showNavigation) return '';
        return `
            <div class="btn-group">
                <button class="ctrl-btn" id="${this.config.prefix}PrevBtn">◀ НАЗАД</button>
                <button class="ctrl-btn" id="${this.config.prefix}NextBtn">ВПЕРЕД ▶</button>
                <button class="ctrl-btn" id="${this.config.prefix}ResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
        `;
    }

    renderProgress() {
        return `<div class="hint" id="${this.config.prefix}Progress"></div>`;
    }

    // ========== МОБИЛЬНАЯ ВЕРСИЯ ==========
    
    renderMobile(container) {
        const items = this.getItems();
        const hasItems = items.length > 0;
        
        let html = `
            <div style="text-align: center;">
                ${this.renderDirectionButton()}
                <div id="${this.config.prefix}CarouselWrapper" style="overflow: hidden; width: 100%; position: relative; touch-action: pan-y pinch-zoom;">
                    <div id="${this.config.prefix}CarouselTrack" style="display: flex; transition: transform ${this.snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1); will-change: transform;">
                        ${this.generateCarouselCards()}
                    </div>
                </div>
                ${this.renderResult()}
                ${this.renderWordsContainer(hasItems)}
                ${this.renderMobileButtons()}
                ${this.renderHintArea()}
                ${this.renderMobileNavigation()}
                ${this.renderProgress()}
                <div class="hint">👆 Свайп влево/вправо для листания</div>
            </div>
        `;
        
        container.innerHTML = html;
        
        if (hasItems) {
            this.initCarousel();
        }
    }

    generateCarouselCards() {
        const items = this.getItems();
        if (!items.length) {
            const emptyMsg = this.config.emptyMessage || '🎉 Все элементы изучены!';
            return `<div class="${this.config.prefix}-carousel-card" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                <div style="background: #E8F0FE; border-radius: 20px; padding: 40px; text-align: center;">${emptyMsg}</div>
            </div>`;
        }
        
        const total = items.length;
        let html = '';
        const half = 2;
        
        for (let i = -half; i <= half; i++) {
            let idx = this.currentIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            
            const item = items[idx];
            let cardContent = '';
            
            // Используем renderCard для мобильной версии, если он есть
            if (this.config.renderCard) {
                cardContent = this.config.renderCard(item, idx);
            } else if (this.config.renderItem) {
                cardContent = this.config.renderItem(item);
            } else {
                cardContent = JSON.stringify(item);
            }
            
            html += `
                <div class="${this.config.prefix}-carousel-card" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    ${cardContent}
                </div>
            `;
        }
        
        return html;
    }

    renderMobileButtons() {
        const buttons = this.config.mobileButtons || [];
        let html = '<div class="btn-group">';
        
        buttons.forEach(btn => {
            if (btn.id === 'speakBtn' && !this.config.enableSpeak) return;
            html += `<button class="ctrl-btn ${btn.class || ''}" id="${this.config.prefix}${btn.id}">${btn.label}</button>`;
        });
        
        // Добавляем дополнительные кнопки
        if (this.config.extraButtons) {
            this.config.extraButtons.forEach(btn => {
                html += `<button class="ctrl-btn ${btn.class || ''}" id="${this.config.prefix}${btn.id}">${btn.label}</button>`;
            });
        }
        
        html += '</div>';
        return html;
    }

    renderMobileNavigation() {
        if (!this.config.showNavigation) return '';
        return `
            <div class="btn-group">
                <button class="ctrl-btn" id="${this.config.prefix}ResetStartBtn">⏮ В НАЧАЛО</button>
            </div>
        `;
    }

    // ========== КАРУСЕЛЬ ==========
    
    initCarousel() {
        const wrapper = document.getElementById(`${this.config.prefix}CarouselWrapper`);
        const track = document.getElementById(`${this.config.prefix}CarouselTrack`);
        
        if (!track || !wrapper) return;
        
        this.containerWidth = wrapper.offsetWidth;
        this.updateCarouselPosition(false);
        this.attachCarouselEvents(track);
        
        // Удаляем старый обработчик
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        this.resizeHandler = () => {
            this.containerWidth = wrapper.offsetWidth;
            this.updateCarouselPosition(false);
        };
        
        window.addEventListener('resize', this.resizeHandler);
    }

    updateCarouselPosition(animate = true) {
        const track = document.getElementById(`${this.config.prefix}CarouselTrack`);
        if (!track) return;
        
        if (!animate) {
            track.style.transition = 'none';
        } else {
            track.style.transition = `transform ${this.snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        }
        
        const offset = -2 * this.containerWidth;
        track.style.transform = `translateX(${offset}px)`;
        this.currentTranslate = offset;
        
        if (!animate) {
            setTimeout(() => { 
                if (track) track.style.transition = ''; 
            }, 50);
        }
    }

    attachCarouselEvents(track) {
        // Удаляем старые обработчики (клон)
        const newTrack = track.cloneNode(true);
        track.parentNode.replaceChild(newTrack, track);
        
        newTrack.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.touchStartX = e.changedTouches[0].screenX;
            newTrack.style.transition = 'none';
        }, { passive: true });
        
        newTrack.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const touchCurrentX = e.changedTouches[0].screenX;
            const delta = touchCurrentX - this.touchStartX;
            newTrack.style.transform = `translateX(${this.currentTranslate + delta}px)`;
        }, { passive: true });
        
        newTrack.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            const endX = e.changedTouches[0].screenX;
            const delta = endX - this.touchStartX;
            const items = this.getItems();
            
            if (Math.abs(delta) > this.minSwipeDistance && items.length > 0) {
                if (delta > 0) {
                    this.currentIndex = this.currentIndex === 0 ? items.length - 1 : this.currentIndex - 1;
                } else {
                    this.currentIndex = (this.currentIndex + 1) % items.length;
                }
                this.refreshCarousel();
            } else {
                this.updateCarouselPosition(true);
            }
        }, { passive: true });
        
        // Привязываем клики на слайды
        this.attachSlideEvents(newTrack);
    }

    attachSlideEvents(track) {
        const slides = track.querySelectorAll(`.${this.config.prefix}-carousel-card`);
        const items = this.getItems();
        const total = items.length;
        
        slides.forEach((slide, domIdx) => {
            const idx = parseInt(slide.getAttribute('data-idx'));
            
            if (domIdx === 2 && this.config.onCenterClick) {
                // Центральный слайд
                slide.onclick = () => {
                    if (items.length > 0 && items[this.currentIndex]) {
                        this.config.onCenterClick(items[this.currentIndex], this);
                    }
                };
            } else if (domIdx !== 2) {
                // Боковые слайды — переход
                slide.onclick = () => {
                    if (total === 0) return;
                    let newIndex = idx;
                    if (newIndex < 0) newIndex = total + newIndex;
                    if (newIndex >= total) newIndex = newIndex - total;
                    this.currentIndex = newIndex;
                    this.refreshCarousel();
                };
            }
        });
    }

    refreshCarousel() {
        const track = document.getElementById(`${this.config.prefix}CarouselTrack`);
        if (!track) return;
        
        this.items = this.getItems();
        track.innerHTML = this.generateCarouselCards();
        this.updateCarouselPosition(false);
        this.attachCarouselEvents(track);
        this.updateDisplay();
        this.updateCounter();
    }

    // ========== ОБНОВЛЕНИЕ ДИСПЛЕЯ ==========
    
    updateDisplay() {
        const items = this.getItems();
        if (!items.length) {
            this.updateEmptyState();
            return;
        }
        
        this.currentItem = items[this.currentIndex % items.length];
        
        // Обновляем вопрос
        const questionEl = document.getElementById(`${this.config.prefix}Question`);
        if (questionEl && this.config.getQuestion) {
            questionEl.innerHTML = this.config.getQuestion(this.currentItem);
        }
        
        // Обновляем слова
        if (this.config.updateWords) {
            this.config.updateWords(this.currentItem);
        }
        
        // Обновляем результат
        if (this.config.updateResult) {
            this.config.updateResult();
        }
        
        this.updateProgress();
    }

    updateEmptyState() {
        const questionEl = document.getElementById(`${this.config.prefix}Question`);
        if (questionEl) {
            const emptyMsg = this.config.emptyMessage || '🎉 Все элементы изучены!';
            questionEl.innerHTML = emptyMsg;
        }
        
        const container = document.getElementById(`${this.config.prefix}WordsContainer`);
        if (container) container.innerHTML = '';
        
        const result = document.getElementById(`${this.config.prefix}Result`);
        if (result) result.textContent = '';
    }

    updateProgress() {
        const progressEl = document.getElementById(`${this.config.prefix}Progress`);
        if (!progressEl) return;
        
        const items = this.getItems();
        if (!items.length) {
            progressEl.textContent = 'Нет элементов';
            return;
        }
        
        const total = items.length;
        progressEl.textContent = `${this.config.progressLabel || 'Элемент'}: ${this.currentIndex + 1} из ${total}`;
    }

    updateCounter() {
        if (typeof updateCounter === 'function') {
            updateCounter();
        }
    }

    // ========== НАВИГАЦИЯ ==========
    
    goToPrev() {
        const items = this.getItems();
        if (!items.length) return;
        
        this.currentIndex = this.currentIndex === 0 ? items.length - 1 : this.currentIndex - 1;
        this.refreshCarousel();
        this.updateCounter();
    }

    goToNext() {
        const items = this.getItems();
        if (!items.length) return;
        
        this.currentIndex = (this.currentIndex + 1) % items.length;
        this.refreshCarousel();
        this.updateCounter();
    }

    goToStart() {
        const items = this.getItems();
        if (!items.length) return;
        
        this.currentIndex = 0;
        this.refreshCarousel();
        this.updateCounter();
    }

    // ========== ПОДСКАЗКИ ==========
    
    showHint() {
        if (!this.hintWords.length) return;
        if (this.hintIndex >= this.hintWords.length) return;
        
        const currentHint = this.hintWords.slice(0, this.hintIndex + 1).join(' ');
        const hintLabel = document.getElementById(`${this.config.prefix}HintLabel`);
        if (hintLabel) hintLabel.textContent = '💡 ' + currentHint;
        this.hintIndex++;
    }

    resetHint() {
        this.hintIndex = 0;
        const hintLabel = document.getElementById(`${this.config.prefix}HintLabel`);
        if (hintLabel) hintLabel.textContent = '';
    }

    // ========== ПОМОЩНИКИ ==========
    
    speak(text) {
        if (typeof speak === 'function' && text) {
            speak(text);
        }
    }

    // ========== ПРИВЯЗКА СОБЫТИЙ ==========
    
    attachEvents() {
        const prefix = this.config.prefix;
        
        // Кнопка направления
        const dirBtn = document.getElementById(`${prefix}DirBtn`);
        if (dirBtn && this.config.onDirectionChange) {
            dirBtn.onclick = () => {
                this.config.onDirectionChange();
                this.items = this.getItems();
                this.currentIndex = 0;
                if (this.isMobile) {
                    this.refreshCarousel();
                } else {
                    this.updateDisplay();
                }
                dirBtn.textContent = this.config.directionLabel || 'De → Ru';
                if (typeof saveProgress === 'function') saveProgress();
            };
        }
        
        // Кнопки навигации
        const prevBtn = document.getElementById(`${prefix}PrevBtn`);
        if (prevBtn) prevBtn.onclick = () => this.goToPrev();
        
        const nextBtn = document.getElementById(`${prefix}NextBtn`);
        if (nextBtn) nextBtn.onclick = () => this.goToNext();
        
        const resetBtn = document.getElementById(`${prefix}ResetStartBtn`);
        if (resetBtn) resetBtn.onclick = () => this.goToStart();
        
        // Кнопка подсказки
        const hintBtn = document.getElementById(`${prefix}HintBtn`);
        if (hintBtn) hintBtn.onclick = () => this.showHint();
        
        // Кнопка озвучки
        const speakBtn = document.getElementById(`${prefix}SpeakBtn`);
        if (speakBtn && this.config.enableSpeak) {
            speakBtn.onclick = () => {
                if (this.currentItem && this.config.getSpeakText) {
                    this.speak(this.config.getSpeakText(this.currentItem));
                }
            };
        }
        
        // Кастомные кнопки
        if (this.config.customButtons) {
            this.config.customButtons.forEach(btn => {
                const el = document.getElementById(`${prefix}${btn.id}`);
                if (el && btn.onClick) {
                    el.onclick = () => btn.onClick(this);
                }
            });
        }
    }

    // ========== УНИЧТОЖЕНИЕ ==========
    
    destroy() {
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
            this.resizeHandler = null;
        }
        
        const track = document.getElementById(`${this.config.prefix}CarouselTrack`);
        if (track) {
            track.innerHTML = '';
        }
    }
}

// Экспорт
window.StudyMode = StudyMode;

console.log('✅ StudyMode загружен');
