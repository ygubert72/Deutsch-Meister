// cardsMode.js — обновленная версия с использованием StudyMode

let cardsModeInstance = null;

function renderCards() {
    // Удаляем старый экземпляр
    if (cardsModeInstance) {
        cardsModeInstance.destroy();
        cardsModeInstance = null;
    }
    
    // Получаем слова для текущего уровня
    const words = wordsDB[AppConfig.currentLevel] || [];
    const unstudied = getUnstudiedWords();
    
    // Настройки для режима карточек
    const config = {
        prefix: 'cards',
        items: unstudied,
        getItems: getUnstudiedWords,
        emptyMessage: '🎉 Все слова изучены!',
        directionLabel: AppConfig.show_language === 'de' ? 'De → Ru' : 'Ru → De',
        enableSpeak: true,
        showResult: false,
        showWords
