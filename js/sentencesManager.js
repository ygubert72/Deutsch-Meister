function showCurrentSentence() {
    resetHint();
    
    if (!sentencesList.length) {
        document.getElementById('sentQuestion').innerHTML = "🎉 Все фразы изучены!<br><br>Верните фразы из 'Изучено' или<br>выберите другой уровень";
        const container = document.getElementById('sentWordsContainer');
        if (container) container.innerHTML = '';
        const result = document.getElementById('sentResult');
        if (result) result.textContent = '';
        return;
    }
    if (sentencesIndex >= sentencesList.length) sentencesIndex = 0;
    sentencesCurrent = sentencesList[sentencesIndex];
    
    let question, correctTokens;
    let targetLangForDistractors; // определяем язык для дистракторов
    
    if (AppConfig.sentence_lang_from === 'ru') {
        question = sentencesCurrent.ru;
        correctTokens = sentencesCurrent.de.split(/\s+/);
        sentencesHintWords = sentencesCurrent.de.split(/\s+/);
        targetLangForDistractors = 'de'; // дистракторы на немецком
    } else {
        question = sentencesCurrent.de;
        correctTokens = sentencesCurrent.ru.split(/\s+/);
        sentencesHintWords = sentencesCurrent.ru.split(/\s+/);
        targetLangForDistractors = 'ru'; // дистракторы на русском
    }
    
    sentencesHintWords = sentencesHintWords.map(w => w.replace(/[.,!?;:]/g, ''));
    
    document.getElementById('sentQuestion').innerHTML = `Составьте предложение:<br><br><strong>${question}</strong>`;
    
    correctTokens = correctTokens.map(t => t.replace(/[.,!?;:]/g, ''));
    
    let available = [...correctTokens];
    const needed = 12 - available.length;
    if (needed > 0) {
        // Передаём язык для дистракторов
        const distractors = getDistractorsForSentences(needed, correctTokens, targetLangForDistractors);
        available.push(...distractors);
    }
    
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }
    sentencesAvailable = available.slice(0, 12);
    sentencesSelected = [];
    sentencesActive = {};
    sentencesAvailable.forEach(w => { sentencesActive[w] = true; });
    
    updateSentenceDisplay();
}
