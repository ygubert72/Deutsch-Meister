// activityTracker.js — логирование активности пользователя и анализ флагов

// ========== ПОЛУЧЕНИЕ IP И ГОРОДА ==========
async function getUserLocation() {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        return {
            ip: data.ip || 'unknown',
            city: data.city || 'unknown',
            country: data.country_name || 'unknown',
            region: data.region || 'unknown'
        };
    } catch (e) {
        Logger.debug('Не удалось определить геолокацию');
        return {
            ip: 'unknown',
            city: 'unknown',
            country: 'unknown',
            region: 'unknown'
        };
    }
}

// ========== ID УСТРОЙСТВА ==========
function getDeviceId() {
    let id = navigator.userAgent + navigator.platform + window.screen.width + window.screen.height;
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ========== ПРОВЕРКА МОБИЛЬНОГО УСТРОЙСТВА ==========
function isMobileDevice() {
    const mobilePlatforms = ['iPhone', 'iPad', 'iPod', 'Android', 'BlackBerry', 'Windows Phone'];
    return mobilePlatforms.some(p => navigator.platform.includes(p));
}

// ========== АНАЛИЗ ФЛАГОВ ПОДОЗРИТЕЛЬНОСТИ ==========
function analyzeFlags(userData, today) {
    const flags = {
        multipleDevices: false,
        differentCities: false,
        highActivity: false,
        manyIPs: false,
        unnaturalHours: false,
        totalFlags: 0
    };
    
    if (userData.devices && userData.devices.length > 2) {
        flags.multipleDevices = true;
        flags.totalFlags++;
    }
    
    const stats = userData.dailyStats?.[today];
    if (stats && stats.uniqueCities && stats.uniqueCities.length > 2) {
        flags.differentCities = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.totalMinutes > 180) {
        flags.highActivity = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.uniqueIPs && stats.uniqueIPs.length > 3) {
        flags.manyIPs = true;
        flags.totalFlags++;
    }
    
    if (stats && stats.firstActivity && stats.lastActivity) {
        const firstHour = new Date(stats.firstActivity).getHours();
        const lastHour = new Date(stats.lastActivity).getHours();
        if ((firstHour >= 0 && firstHour <= 6) && (lastHour >= 8 && lastHour <= 12)) {
            flags.unnaturalHours = true;
            flags.totalFlags++;
        }
        if ((firstHour >= 8 && firstHour <= 12) && (lastHour >= 20 && lastHour <= 23)) {
            flags.unnaturalHours = true;
            flags.totalFlags++;
        }
    }
    
    return flags;
}

// ========== ОСНОВНАЯ ФУНКЦИЯ ЛОГИРОВАНИЯ АКТИВНОСТИ ==========
async function logUserActivity(user) {
    if (!user || !db) return;
    
    // Админ не отслеживается
    if (user.email === 'ygubert72@gmail.com') {
        Logger.debug('Админ не отслеживается');
        return;
    }
    
    const uid = user.uid;
    const today = new Date().toISOString().split('T')[0];
    
    try {
        const location = await getUserLocation();
        const deviceId = getDeviceId();
        const deviceType = isMobileDevice() ? 'mobile' : 'desktop';
        
        const userDoc = await db.collection('users').doc(uid).get();
        let data = userDoc.exists ? userDoc.data() : {};
        
        // Обновляем устройства
        if (!data.devices) data.devices = [];
        const existingDevice = data.devices.find(d => d.id === deviceId);
        
        if (!existingDevice) {
            data.devices.push({
                id: deviceId,
                type: deviceType,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                userAgent: navigator.userAgent,
                ip: location.ip,
                city: location.city,
                country: location.country
            });
        } else {
            existingDevice.lastSeen = new Date().toISOString();
            existingDevice.ip = location.ip;
            existingDevice.city = location.city;
            existingDevice.country = location.country;
        }
        
        // Обновляем дневную статистику
        if (!data.dailyStats) data.dailyStats = {};
        if (!data.dailyStats[today]) {
            data.dailyStats[today] = {
                sessions: 0,
                totalMinutes: 0,
                uniqueIPs: [],
                uniqueCities: [],
                wordsLearned: 0,
                firstActivity: null,
                lastActivity: null
            };
        }
        
        const stats = data.dailyStats[today];
        stats.sessions += 1;
        
        if (!stats.uniqueIPs.includes(location.ip) && location.ip !== 'unknown') {
            stats.uniqueIPs.push(location.ip);
        }
        if (!stats.uniqueCities.includes(location.city) && location.city !== 'unknown') {
            stats.uniqueCities.push(location.city);
        }
        if (!stats.firstActivity) {
            stats.firstActivity = new Date().toISOString();
        }
        stats.lastActivity = new Date().toISOString();
        
        // Анализ флагов
        const flags = analyzeFlags(data, today);
        data.flags = flags;
        
        // Логирование увеличения флагов
        const oldFlags = data._previousFlags || { totalFlags: 0 };
        if (flags.totalFlags > oldFlags.totalFlags) {
            await db.collection('admin_logs').add({
                userId: uid,
                email: user.email,
                timestamp: new Date().toISOString(),
                event: 'flags_increased',
                flagsBefore: oldFlags.totalFlags,
                flagsAfter: flags.totalFlags,
                flags: flags,
                details: {
                    deviceId: deviceId,
                    deviceType: deviceType,
                    ip: location.ip,
                    city: location.city,
                    country: location.country
                }
            });
        }
        data._previousFlags = flags;
        
        // Обновление статуса
        if (flags.totalFlags >= 3) {
            data.status = 'warning';
        } else if (flags.totalFlags >= 2) {
            data.status = 'monitor';
        } else {
            data.status = 'ok';
        }
        
        await db.collection('users').doc(uid).set(data, { merge: true });
        Logger.debug('Активность пользователя залогирована, флагов:', flags.totalFlags);
        
    } catch (e) {
        Logger.error('Ошибка логирования активности:', e);
    }
}

// ========== ЛОГИРОВАНИЕ ДЕЙСТВИЙ ПОЛЬЗОВАТЕЛЯ ==========
async function logUserAction(action, details = {}) {
    try {
        if (typeof window.isAuthenticated === 'undefined' || !window.isAuthenticated()) {
            return;
        }
        
        const user = window.getCurrentUser ? window.getCurrentUser() : null;
        if (!user) return;
        
        await db.collection('user_actions').add({
            userId: user.uid,
            email: user.email,
            action: action,
            details: details,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            deviceId: getDeviceId()
        });
        
        Logger.debug('Действие залогировано:', action, details);
    } catch(e) {
        Logger.error('Ошибка логирования действия:', e);
    }
}

// ========== СОХРАНЕНИЕ ПРОГРЕССА В ОБЛАКО ==========
async function saveProgressToFirebase() {
    if (!auth || !auth.currentUser) return;
    const userId = auth.currentUser.uid;
    if (!db) return;
    try {
        const progressData = {
            wordsProgress: wordsProgress,
            sentencesProgress: sentencesProgress,
            grammarProgress: grammarProgress,
            config: {
                last_level: AppConfig.currentLevel,
                show_language: AppConfig.show_language,
                quiz_direction: AppConfig.quiz_direction,
                sentence_lang_from: AppConfig.sentence_lang_from,
                last_mode: currentMode
            },
            lastUpdated: new Date().toISOString()
        };
        await db.collection('users').doc(userId).set({
            progress: progressData
        }, { merge: true });
        Logger.debug('Прогресс сохранён в облаке');
    } catch(e) {
        Logger.error('Ошибка сохранения прогресса:', e);
    }
}

// ========== ЗАГРУЗКА ПРОГРЕССА ИЗ ОБЛАКА ==========
async function loadProgressFromFirebase() {
    if (!auth || !auth.currentUser) return false;
    const userId = auth.currentUser.uid;
    if (!db) return false;
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists && userDoc.data().progress) {
            const progress = userDoc.data().progress;
            if (progress.wordsProgress) {
                Object.assign(wordsProgress, progress.wordsProgress);
                localStorage.setItem('dm_words_progress', JSON.stringify(wordsProgress));
            }
            if (progress.sentencesProgress) {
                Object.assign(sentencesProgress, progress.sentencesProgress);
                localStorage.setItem('dm_sentences_progress', JSON.stringify(sentencesProgress));
            }
            if (progress.grammarProgress) {
                Object.assign(grammarProgress, progress.grammarProgress);
                localStorage.setItem('dm_grammar_progress', JSON.stringify(grammarProgress));
            }
            if (progress.config) {
                AppConfig.currentLevel = progress.config.last_level || 'A1';
                AppConfig.show_language = progress.config.show_language || 'de';
                AppConfig.quiz_direction = progress.config.quiz_direction || 'de_to_ru';
                AppConfig.sentence_lang_from = progress.config.sentence_lang_from || 'ru';
                currentMode = progress.config.last_mode || 'grammar';
                localStorage.setItem('dm_config', JSON.stringify(progress.config));
            }
            Logger.info('Прогресс загружен из облака');
            return true;
        }
    } catch(e) {
        Logger.error('Ошибка загрузки прогресса:', e);
    }
    return false;
}

// Экспорт
window.ActivityTracker = {
    logUserActivity,
    logUserAction,
    saveProgressToFirebase,
    loadProgressFromFirebase,
    getUserLocation,
    getDeviceId,
    analyzeFlags
};
