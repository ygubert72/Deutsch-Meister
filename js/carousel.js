// carousel.js — универсальный компонент карусели для мобильных устройств

class Carousel {
    constructor(config) {
        this.config = config;
        this.currentIndex = config.initialIndex || 0;
        this.isDragging = false;
        this.touchStartX = 0;
        this.containerWidth = 0;
        this.currentTranslate = 0;
        this.minSwipeDistance = config.minSwipeDistance || 50;
        this.snapDuration = config.snapDuration || 250;
        this.isAnimating = false;
        
        this._init();
    }
    
    _init() {
        this.container = document.getElementById(this.config.containerId);
        this.track = document.getElementById(this.config.trackId);
        
        if (!this.container || !this.track) {
            console.error('Carousel: контейнер или трек не найдены');
            return;
        }
        
        this.containerWidth = this.container.offsetWidth;
        this._render();
        this._attachEvents();
        
        // Обновляем при изменении размера
        this._resizeHandler = window.utils.debounce(() => {
            this.containerWidth = this.container.offsetWidth;
            this._updatePosition(false);
        }, 200);
        
        window.addEventListener('resize', this._resizeHandler);
    }
    
    _render() {
        const items = this.config.getItems ? this.config.getItems() : this.config.items;
        const total = items.length;
        
        if (total === 0) {
            this.track.innerHTML = `
                <div class="carousel-slide" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    <div style="text-align:center; padding:40px;">${this.config.emptyMessage || '🎉 Нет элементов'}</div>
                </div>
            `;
            this._updatePosition(false);
            return;
        }
        
        let html = '';
        const visibleCount = 5; // показываем 5 слайдов (текущий + по 2 с каждой стороны)
        const half = Math.floor(visibleCount / 2);
        
        for (let i = -half; i <= half; i++) {
            let idx = this.currentIndex + i;
            if (idx < 0) idx = total + idx;
            if (idx >= total) idx = idx - total;
            
            const item = items[idx];
            const slideContent = this.config.renderItem ? this.config.renderItem(item, idx) : String(item);
            
            html += `
                <div class="carousel-slide" data-idx="${idx}" style="flex: 0 0 100%; min-width: 100%; padding: 20px;">
                    ${slideContent}
                </div>
            `;
        }
        
        this.track.innerHTML = html;
        this._updatePosition(false);
        this._attachSlideEvents();
    }
    
    _updatePosition(animate = true) {
        if (!this.track) return;
        
        if (!animate) {
            this.track.style.transition = 'none';
        } else {
            this.track.style.transition = `transform ${this.snapDuration}ms cubic-bezier(0.2, 0.9, 0.4, 1.1)`;
        }
        
        const offset = -2 * this.containerWidth;
        this.track.style.transform = `translateX(${offset}px)`;
        this.currentTranslate = offset;
        
        if (!animate) {
            setTimeout(() => {
                if (this.track) this.track.style.transition = '';
            }, 50);
        }
    }
    
    _attachSlideEvents() {
        const slides = this.track.querySelectorAll('.carousel-slide');
        const total = this.config.getItems ? this.config.getItems().length : this.config.items.length;
        
        slides.forEach((slide, domIdx) => {
            const idx = parseInt(slide.getAttribute('data-idx'));
            
            if (domIdx === 2) {
                // Центральный слайд — клик для взаимодействия
                if (this.config.onSlideClick) {
                    slide.onclick = () => {
                        const items = this.config.getItems ? this.config.getItems() : this.config.items;
                        if (items.length > 0 && items[this.currentIndex]) {
                            this.config.onSlideClick(items[this.currentIndex], this.currentIndex);
                        }
                    };
                }
            } else {
                // Боковые слайды — клик для перехода
                slide.onclick = () => {
                    let newIndex = idx;
                    if (newIndex < 0) newIndex = total + newIndex;
                    if (newIndex >= total) newIndex = newIndex - total;
                    this.goTo(newIndex);
                };
            }
        });
    }
    
    _attachEvents() {
        if (!this.track) return;
        
        this.track.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.touchStartX = e.changedTouches[0].screenX;
            this.track.style.transition = 'none';
        }, { passive: true });
        
        this.track.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            const touchCurrentX = e.changedTouches[0].screenX;
            const delta = touchCurrentX - this.touchStartX;
            this.track.style.transform = `translateX(${this.currentTranslate + delta}px)`;
        }, { passive: true });
        
        this.track.addEventListener('touchend', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            const endX = e.changedTouches[0].screenX;
            const delta = endX - this.touchStartX;
            const total = this.config.getItems ? this.config.getItems().length : this.config.items.length;
            
            if (Math.abs(delta) > this.minSwipeDistance && total > 0) {
                if (delta > 0) {
                    this.currentIndex = this.currentIndex === 0 ? total - 1 : this.currentIndex - 1;
                } else {
                    this.currentIndex = (this.currentIndex + 1) % total;
                }
                this._refresh();
            } else {
                this._updatePosition(true);
            }
        }, { passive: true });
    }
    
    _refresh() {
        this._render();
        if (this.config.onSlideChange) {
            const items = this.config.getItems ? this.config.getItems() : this.config.items;
            if (items.length > 0 && items[this.currentIndex]) {
                this.config.onSlideChange(items[this.currentIndex], this.currentIndex);
            }
        }
    }
    
    goTo(index) {
        const total = this.config.getItems ? this.config.getItems().length : this.config.items.length;
        if (index >= 0 && index < total) {
            this.currentIndex = index;
            this._refresh();
        }
    }
    
    refresh(items) {
        if (items) {
            this.config.items = items;
        }
        this._refresh();
    }
    
    destroy() {
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
        }
        if (this.track) {
            this.track.innerHTML = '';
        }
    }
    
    getCurrentIndex() {
        return this.currentIndex;
    }
    
    getCurrentItem() {
        const items = this.config.getItems ? this.config.getItems() : this.config.items;
        return items.length > 0 ? items[this.currentIndex] : null;
    }
}

// Экспорт
window.Carousel = Carousel;
