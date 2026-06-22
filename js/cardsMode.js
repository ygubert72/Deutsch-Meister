function attachCardEvents() {
    const cards = document.querySelectorAll('#carouselTrack .card');
    cards.forEach(function(card, domIdx) {
        const wordIdx = parseInt(card.getAttribute('data-idx'));
        
        // Центральная карточка (индекс 2) — переворот по клику
        if (domIdx === 2) {
            card.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                const word = cardsList[cardsIndex];
                const wordDiv = card.querySelector('.card-word');
                if (!wordDiv) return;
                
                if (!cardsFlipped) {
                    var displayText = AppConfig.show_language === 'de' 
                        ? word.de + '\n\n➡️\n\n' + word.ru
                        : word.ru + '\n\n➡️\n\n' + word.de;
                    wordDiv.textContent = displayText;
                } else {
                    var displayText = AppConfig.show_language === 'de' ? word.de : word.ru;
                    wordDiv.textContent = displayText;
                }
                cardsFlipped = !cardsFlipped;
            };
        } else {
            // Боковые карточки — переход к слову по клику
            card.onclick = function(e) {
                e.stopPropagation();
                e.preventDefault();
                
                let newIndex = wordIdx;
                if (newIndex < 0) newIndex = cardsList.length + newIndex;
                if (newIndex >= cardsList.length) newIndex = newIndex - cardsList.length;
                cardsIndex = newIndex;
                cardsFlipped = false;
                refreshCarousel();
                updateCounter();
            };
        }
    });
}
