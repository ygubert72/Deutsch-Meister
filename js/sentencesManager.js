async function loadSentences() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    for (const lvl of levels) {
        try {
            const resp = await fetch(`/Deutsch-Meister/docs/sentences/${lvl}.json`);
            if (resp.ok) sentencesDB[lvl] = await resp.json();
            else sentencesDB[lvl] = [];
        } catch(e) { sentencesDB[lvl] = []; }
    }
    if (sentencesDB.A1.length === 0) createDemoSentences();
}

function createDemoSentences() {
    sentencesDB.A1 = [
        {de:"Hallo!", ru:"Привет!"},{de:"Guten Morgen!", ru:"Доброе утро!"},
        {de:"Guten Tag!", ru:"Добрый день!"},{de:"Wie geht es dir?", ru:"Как дела?"}
    ];
    for (let i = 0; i < 30; i++) {
        sentencesDB.A2.push({de:`Satz_A2_${i}`, ru:`Фраза_A2_${i}`});
        sentencesDB.B1.push({de:`Satz_B1_${i}`, ru:`Фраза_B1_${i}`});
        if (i < 20) sentencesDB.B2.push({de:`Satz_B2_${i}`, ru:`Фраза_B2_${i}`});
        if (i < 10) sentencesDB.C1.push({de:`Satz_C1_${i}`, ru:`Фраза_C1_${i}`});
    }
}

function getUnstudiedSentences() {
    const sents = sentencesDB[AppConfig.currentLevel] || [];
    const progress = sentencesProgress[AppConfig.currentLevel] || [];
    return sents.filter((_, idx) => !progress[idx]?.studied);
}

function markSentenceAsStudied(sentence) {
    const sents = sentencesDB[AppConfig.currentLevel];
    const idx = sents.findIndex(s => s.de === sentence.de && s.ru === sentence.ru);
    if (idx !== -1) {
        if (!sentencesProgress[AppConfig.currentLevel]) sentencesProgress[AppConfig.currentLevel] = [];
        sentencesProgress[AppConfig.currentLevel][idx] = { studied: true };
        saveProgress();
    }
}

function resetAllSentences() {
    if (!sentencesProgress[AppConfig.currentLevel]) sentencesProgress[AppConfig.currentLevel] = [];
    for (let i = 0; i < sentencesDB[AppConfig.currentLevel].length; i++) {
        sentencesProgress[AppConfig.currentLevel][i] = { studied: false };
    }
    saveProgress();
}
