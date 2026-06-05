// wordsManager.js - исправлены пути
async function loadWords() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    for (const lvl of levels) {
        try {
            // ИСПРАВЛЕНО: убран /Deutsch-Meister/ в начале
            const resp = await fetch(`docs/words/${lvl}.json`);
            if (resp.ok) wordsDB[lvl] = await resp.json();
            else wordsDB[lvl] = [];
        } catch(e) { wordsDB[lvl] = []; }
    }
    if (wordsDB.A1.length === 0) createDemoWords();
}

function createDemoWords() {
    wordsDB.A1 = [
        {de:"der Mann",ru:"мужчина"},{de:"die Frau",ru:"женщина"},{de:"das Kind",ru:"ребенок"},
        {de:"der Vater",ru:"отец"},{de:"die Mutter",ru:"мать"},{de:"gut",ru:"хороший"},
        {de:"schlecht",ru:"плохой"},{de:"groß",ru:"большой"},{de:"klein",ru:"маленький"}
    ];
    for (let i = 0; i < 50; i++) {
        if (wordsDB.A2) wordsDB.A2.push({de:`Wort_A2_${i}`, ru:`Слово_A2_${i}`});
        if (wordsDB.B1) wordsDB.B1.push({de:`Wort_B1_${i}`, ru:`Слово_B1_${i}`});
        if (wordsDB.B2 && i < 30) wordsDB.B2.push({de:`Wort_B2_${i}`, ru:`Слово_B2_${i}`});
        if (wordsDB.C1 && i < 20) wordsDB.C1.push({de:`Wort_C1_${i}`, ru:`Слово_C1_${i}`});
    }
}

function getUnstudiedWords() {
    const words = wordsDB[AppConfig.currentLevel] || [];
    const progress = wordsProgress[AppConfig.currentLevel] || [];
    return words.filter((_, idx) => !progress[idx]?.studied);
}

function getStudiedWordsList() {
    const words = wordsDB[AppConfig.currentLevel] || [];
    const progress = wordsProgress[AppConfig.currentLevel] || [];
    return words.filter((_, idx) => progress[idx]?.studied === true);
}

function markWordAsStudied(word) {
    const words = wordsDB[AppConfig.currentLevel];
    const idx = words.findIndex(w => w.de === word.de && w.ru === word.ru);
    if (idx !== -1) {
        if (!wordsProgress[AppConfig.currentLevel]) wordsProgress[AppConfig.currentLevel] = [];
        wordsProgress[AppConfig.currentLevel][idx] = { studied: true };
        saveProgress();
    }
}

function unstudyWord(word) {
    const words = wordsDB[AppConfig.currentLevel];
    const idx = words.findIndex(w => w.de === word.de && w.ru === word.ru);
    if (idx !== -1) {
        if (!wordsProgress[AppConfig.currentLevel]) wordsProgress[AppConfig.currentLevel] = [];
        wordsProgress[AppConfig.currentLevel][idx] = { studied: false };
        saveProgress();
    }
}

function resetAllStudied() {
    if (!wordsProgress[AppConfig.currentLevel]) wordsProgress[AppConfig.currentLevel] = [];
    for (let i = 0; i < wordsDB[AppConfig.currentLevel].length; i++) {
        wordsProgress[AppConfig.currentLevel][i] = { studied: false };
    }
    saveProgress();
}
