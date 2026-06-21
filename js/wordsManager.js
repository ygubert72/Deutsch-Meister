// wordsManager.js — загрузка слов (ПАРАЛЛЕЛЬНАЯ)

async function loadWords() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    
    try {
        // Параллельная загрузка всех уровней
        const results = await Promise.all(
            levels.map(lvl => 
                fetch(`docs/words/${lvl}.json`)
                    .then(resp => {
                        if (resp.ok) return resp.json();
                        return [];
                    })
                    .catch(() => [])
            )
        );
        
        // Распределяем результаты по уровням
        levels.forEach((lvl, i) => {
            wordsDB[lvl] = results[i] || [];
        });
        
        Logger.info('Слова загружены параллельно');
        
    } catch(e) {
        Logger.error('Ошибка загрузки слов:', e);
        // В случае ошибки — создаём демо-слова
        levels.forEach(lvl => {
            if (!wordsDB[lvl] || wordsDB[lvl].length === 0) {
                wordsDB[lvl] = [];
            }
        });
        createDemoWords();
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
    Logger.info('Созданы демо-слова');
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

// Адаптация для параллельной загрузки предложений
async function loadSentences() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    
    try {
        const results = await Promise.all(
            levels.map(lvl => 
                fetch(`docs/sentences/${lvl}.json`)
                    .then(resp => {
                        if (resp.ok) return resp.json();
                        return [];
                    })
                    .catch(() => [])
            )
        );
        
        levels.forEach((lvl, i) => {
            sentencesDB[lvl] = results[i] || [];
        });
        
        Logger.info('Предложения загружены параллельно');
        
    } catch(e) {
        Logger.error('Ошибка загрузки предложений:', e);
        levels.forEach(lvl => {
            if (!sentencesDB[lvl] || sentencesDB[lvl].length === 0) {
                sentencesDB[lvl] = [];
            }
        });
    }
    
    if (sentencesDB.A1.length === 0) createNormalSentences();
}

function createNormalSentences() {
    sentencesDB.A1 = [
        {de:"Hallo!", ru:"Привет!"},
        {de:"Guten Morgen!", ru:"Доброе утро!"},
        {de:"Guten Tag!", ru:"Добрый день!"},
        {de:"Guten Abend!", ru:"Добрый вечер!"},
        {de:"Gute Nacht!", ru:"Спокойной ночи!"},
        {de:"Wie geht es dir?", ru:"Как дела?"},
        {de:"Mir geht es gut.", ru:"У меня всё хорошо."},
        {de:"Ich heiße Anna.", ru:"Меня зовут Анна."},
        {de:"Wie heißt du?", ru:"Как тебя зовут?"},
        {de:"Woher kommst du?", ru:"Откуда ты?"},
        {de:"Ich komme aus Russland.", ru:"Я из России."},
        {de:"Das ist mein Buch.", ru:"Это моя книга."},
        {de:"Die Katze ist süß.", ru:"Кошка милая."},
        {de:"Der Hund ist laut.", ru:"Собака громкая."},
        {de:"Wir gehen nach Hause.", ru:"Мы идём домой."},
        {de:"Es regnet heute.", ru:"Сегодня идёт дождь."},
        {de:"Die Sonne scheint.", ru:"Солнце светит."},
        {de:"Ich habe Durst.", ru:"Я хочу пить."},
        {de:"Ich habe Hunger.", ru:"Я хочу есть."},
        {de:"Wo ist der Bahnhof?", ru:"Где вокзал?"},
        {de:"Bitte schön!", ru:"Пожалуйста!"},
        {de:"Danke schön!", ru:"Большое спасибо!"},
        {de:"Auf Wiedersehen!", ru:"До свидания!"},
        {de:"Tschüss!", ru:"Пока!"},
        {de:"Bis morgen!", ru:"До завтра!"},
        {de:"Ich liebe Deutsch.", ru:"Я люблю немецкий язык."},
        {de:"Sprichst du Englisch?", ru:"Ты говоришь по-английски?"},
        {de:"Ich verstehe nicht.", ru:"Я не понимаю."},
        {de:"Kannst du mir helfen?", ru:"Ты можешь мне помочь?"},
        {de:"Ja, natürlich!", ru:"Да, конечно!"}
    ];
    
    for (let i = 0; i < 20; i++) {
        if (sentencesDB.A2 && sentencesDB.A2.length < 20) sentencesDB.A2.push({de:`Satz_A2_${i}`, ru:`Фраза_A2_${i}`});
        if (sentencesDB.B1 && sentencesDB.B1.length < 20) sentencesDB.B1.push({de:`Satz_B1_${i}`, ru:`Фраза_B1_${i}`});
        if (sentencesDB.B2 && i < 15 && sentencesDB.B2.length < 15) sentencesDB.B2.push({de:`Satz_B2_${i}`, ru:`Фраза_B2_${i}`});
        if (sentencesDB.C1 && i < 10 && sentencesDB.C1.length < 10) sentencesDB.C1.push({de:`Satz_C1_${i}`, ru:`Фраза_C1_${i}`});
    }
    Logger.info('Созданы демо-предложения');
}

// ========== ДИСТРАКТОРЫ ДЛЯ ТРЕНАЖЁРА ==========
function getDistractorsForSentences(count, excludeTokens, targetLang = 'de') {
    const allWords = wordsDB[AppConfig.currentLevel] || [];
    let allTokens = [];
    
    allWords.forEach(w => {
        let sourceText;
        if (targetLang === 'de') {
            sourceText = w.de;
        } else {
            sourceText = w.ru;
        }
        const tokens = sourceText.split(/\s+/);
        tokens.forEach(t => allTokens.push(t));
    });
    
    const basic = ['der','die','das','den','dem','des','ein','eine','und','oder','aber','sehr','gut','nicht','auch','man','sich','ist','sind','bin','bist'];
    const basicRu = ['и','или','но','очень','хорошо','нет','также','себя','есть','ты','я','он','она','оно','мы','вы','они'];
    if (targetLang === 'ru') {
        allTokens.push(...basicRu);
    } else {
        allTokens.push(...basic);
    }
    
    const excludeSet = new Set(excludeTokens.map(t => t.toLowerCase().replace(/[.,!?;:]/g, '')));
    
    const available = [...new Set(allTokens.filter(t => {
        const lower = t.toLowerCase().replace(/[.,!?;:]/g, '');
        const isNumber = !isNaN(parseFloat(lower)) && isFinite(lower);
        const isNumberWord = /^(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|hundert|tausend|first|second|third|один|два|три|четыре|пять|шесть|семь|восемь|девять|десять)$/i.test(lower);
        return !excludeSet.has(lower) && t.length > 1 && !isNumber && !isNumberWord;
    }))];
    
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count);
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
