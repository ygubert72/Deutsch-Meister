async function loadSentences() {
    const levels = ['A1', 'A2', 'B1', 'B2', 'C1'];
    for (const lvl of levels) {
        try {
            const resp = await fetch(`/Deutsch-Meister/docs/sentences/${lvl}.json`);
            if (resp.ok) sentencesDB[lvl] = await resp.json();
            else sentencesDB[lvl] = [];
        } catch(e) { sentencesDB[lvl] = []; }
    }
    // Если фразы для A1 не загрузились (пусто) - создаем нормальные
    if (sentencesDB.A1.length === 0) createNormalSentences();
}

// НОВАЯ ФУНКЦИЯ: создает нормальные фразы для A1 (без цифр)
function createNormalSentences() {
    sentencesDB.A1 = [
        {de:"Hallo!", ru:"Привет!"},
        {de:"Guten Morgen!", ru:"Доброе утро!"},
        {de:"Guten Tag!", ru:"Добрый день!"},
        {de:"Wie geht es dir?", ru:"Как дела?"},
        {de:"Mir geht es gut.", ru:"У меня всё хорошо."},
        {de:"Ich heiße Anna.", ru:"Меня зовут Анна."},
        {de:"Woher kommst du?", ru:"Откуда ты?"},
        {de:"Ich komme aus Russland.", ru:"Я из России."},
        {de:"Das ist mein Buch.", ru:"Это моя книга."},
        {de:"Die Katze ist süß.", ru:"Кошка милая."},
        {de:"Wir gehen nach Hause.", ru:"Мы идём домой."},
        {de:"Es regnet heute.", ru:"Сегодня идёт дождь."},
        {de:"Ich habe Durst.", ru:"Я хочу пить."},
        {de:"Wo ist der Bahnhof?", ru:"Где вокзал?"},
        {de:"Bitte schön!", ru:"Пожалуйста!"},
        {de:"Danke schön!", ru:"Большое спасибо!"},
        {de:"Auf Wiedersehen!", ru:"До свидания!"},
        {de:"Tschüss!", ru:"Пока!"},
        {de:"Gute Nacht!", ru:"Спокойной ночи!"},
        {de:"Ich liebe Deutsch.", ru:"Я люблю немецкий язык."}
    ];
    // Заполняем другие уровни демо-фразами (можно оставить как было, но лучше тоже сделать нормальные)
    for (let i = 0; i < 20; i++) {
        if (sentencesDB.A2.length < 20) sentencesDB.A2.push({de:`Satz_A2_${i}`, ru:`Фраза_A2_${i}`});
        if (sentencesDB.B1.length < 20) sentencesDB.B1.push({de:`Satz_B1_${i}`, ru:`Фраза_B1_${i}`});
        if (i < 15 && sentencesDB.B2.length < 15) sentencesDB.B2.push({de:`Satz_B2_${i}`, ru:`Фраза_B2_${i}`});
        if (i < 10 && sentencesDB.C1.length < 10) sentencesDB.C1.push({de:`Satz_C1_${i}`, ru:`Фраза_C1_${i}`});
    }
}

// Функция для получения лишних слов (дистракторов) - ИСПРАВЛЕНА, исключает числа
function getDistractorsForSentences(count, excludeTokens) {
    const allWords = wordsDB[AppConfig.currentLevel] || [];
    let allTokens = [];
    allWords.forEach(w => {
        const tokens = w.de.split(/\s+/);
        tokens.forEach(t => allTokens.push(t));
    });
    
    // Базовые безопасные слова (без чисел)
    const basic = ['der','die','das','den','dem','des','ein','eine','und','oder','aber','sehr','gut','nicht','auch','man','sich'];
    allTokens.push(...basic);
    
    // 🔥 ГЛАВНОЕ: фильтруем числа и числительные
    const excludeSet = new Set(excludeTokens.map(t => t.toLowerCase()));
    const available = [...new Set(allTokens.filter(t => {
        const lower = t.toLowerCase();
        // Исключаем, если это цифры (1,2,10) или числительные (eins, zwei, drei...)
        const isNumber = !isNaN(parseFloat(lower)) && isFinite(lower);
        const isNumberWord = /^(eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|hundert|tausend)$/i.test(lower);
        return !excludeSet.has(lower) && t.length > 1 && !isNumber && !isNumberWord;
    }))];
    
    // Перемешиваем
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    return available.slice(0, count);
}
