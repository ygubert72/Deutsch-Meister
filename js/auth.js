// auth.js — ТОЛЬКО вход, выход, регистрация и состояние пользователя

let auth = null;
let db = null;
let currentUserData = null;
let authInitialized = false;

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAUj_2cLQyWvs2JTT7Zl2BYox0krDb3X7I",
    authDomain: "deutsch-meister-248cf.firebaseapp.com",
    projectId: "deutsch-meister-248cf",
    storageBucket: "deutsch-meister-248cf.firebasestorage.app",
    messagingSenderId: "549700335996",
    appId: "1:549700335996:web:97ed9e8f91224e34ab0cf9"
};

// ========== ИНИЦИАЛИЗАЦИЯ FIREBASE ==========
function initFirebase() {
    if (typeof firebase === 'undefined') {
        setTimeout(initFirebase, 500);
        return;
    }
    
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            if (window.Logger) Logger.info('Сессия будет сохраняться');
        })
        .catch((error) => {
            if (window.Logger) Logger.error('Ошибка настройки сохранения:', error);
        });
    
    if (window.Logger) Logger.info('Firebase готов');
    
    auth.onAuthStateChanged(async (user) => {
        authInitialized = true;
        
        if (user) {
            if (window.Logger) Logger.info('Пользователь в системе:', user.email);
            
            if (window.ActivityTracker) {
                await window.ActivityTracker.logUserActivity(user);
            }
            
            await loadUserData(user.uid);
            await window.loadUserProgressFromFirebase();
            await addUserToFirestore(user);
            await checkIfBlocked(user);
        } else {
            currentUserData = null;
            setTimeout(() => {
                if (typeof window.applyAppState === 'function' && !window.stateApplied) {
                    console.log('👤 Пользователь вышел, применяем состояние из localStorage');
                    window.applyAppState();
                }
            }, 100);
        }
        
        updateUI(user);
        
        if (typeof updateCounter === 'function') {
            updateCounter();
        }
    });
}

// ========== ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ ==========
async function loadUserData(uid) {
    if (!db) return;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            if (window.Logger) {
                Logger.info('Данные пользователя загружены, доступ к B1-C1:', currentUserData.hasPremiumAccess);
            }
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка загрузки данных пользователя:', e);
    }
}

// ========== ПРОВЕРКА ДОСТУПА К УРОВНЮ (ИСПРАВЛЕНО) ==========
window.hasAccessToLevel = function(level) {
    // Админ имеет доступ ко всем уровням
    if (auth.currentUser && auth.currentUser.email === 'ygubert72@gmail.com') {
        return true;
    }
    
    // Уровни A1 и A2 доступны всем
    if (level === 'A1' || level === 'A2') {
        return true;
    }
    
    // Уровни B1, B2, C1 требуют премиум-доступа
    if (level === 'B1' || level === 'B2' || level === 'C1') {
        // Если пользователь не авторизован — нет доступа
        if (!auth.currentUser) {
            return false;
        }
        // Проверяем премиум-доступ
        if (currentUserData && currentUserData.hasPremiumAccess === true) {
            return true;
        }
        return false;
    }
    
    return false;
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
window.isAuthenticated = function() {
    return auth !== null && auth.currentUser !== null;
};

window.getCurrentUser = function() {
    return auth ? auth.currentUser : null;
};

// ========== ПРОВЕРКА БЛОКИРОВКИ ==========
async function checkIfBlocked(user) {
    if (!db || !user) return;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().blocked === true) {
            alert('❌ Ваш аккаунт заблокирован. Обратитесь к администратору.');
            await auth.signOut();
            location.reload();
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка проверки блокировки:', e);
    }
}

// ========== ДОБАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function addUserToFirestore(user) {
    if (!db || !user) return;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (!userDoc.exists) {
            await db.collection('users').doc(user.uid).set({
                email: user.email,
                createdAt: new Date().toISOString(),
                hasPremiumAccess: false,
                premiumActivatedAt: null,
                blocked: false,
                status: 'ok',
                devices: [],
                dailyStats: {},
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
            });
            if (window.Logger) Logger.info('Пользователь добавлен в Firestore:', user.email);
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка добавления пользователя:', e);
    }
}

// ========== ВХОД ==========
async function login(email, password) {
    try {
        await auth.signInWithEmailAndPassword(email, password);
        await window.loadUserProgressFromFirebase();
        if (window.Logger) Logger.info('Вход выполнен:', email);
        return { success: true };
    } catch(error) {
        if (window.Logger) Logger.error('Ошибка входа:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== РЕГИСТРАЦИЯ ==========
async function register(email, password) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        if (db) {
            await db.collection('users').doc(userCredential.user.uid).set({
                email: email,
                createdAt: new Date().toISOString(),
                hasPremiumAccess: false,
                premiumActivatedAt: null,
                blocked: false,
                status: 'ok',
                devices: [],
                dailyStats: {},
                flags: { totalFlags: 0 },
                _previousFlags: { totalFlags: 0 }
            });
        }
        if (window.Logger) Logger.info('Регистрация выполнена:', email);
        return { success: true };
    } catch(error) {
        if (window.Logger) Logger.error('Ошибка регистрации:', error.message);
        return { success: false, error: error.message };
    }
}

// ========== ВЫХОД ==========
window.logout = async function() {
    if (auth) {
        await auth.signOut();
        if (window.Logger) Logger.info('Выход выполнен');
    }
    location.reload();
};

// ========== ОБНОВЛЕНИЕ ИНТЕРФЕЙСА ==========
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    const loginBtnMobile = document.getElementById('loginBtnMobile');
    const userInfoMobile = document.getElementById('userInfoMobile');
    
    if (!loginBtn || !userInfo) return;
    
    if (user) {
        loginBtn.style.display = 'none';
        if (loginBtnMobile) loginBtnMobile.style.display = 'none';
        
        userInfo.style.display = 'block';
        if (userInfoMobile) userInfoMobile.style.display = 'block';
        
        const hasPremium = currentUserData && currentUserData.hasPremiumAccess === true;
        const isAdmin = user.email === 'ygubert72@gmail.com';
        
        if (window.AdminUI) {
            window.AdminUI.updateAdminButtonVisibility(isAdmin);
        }
        
        const premiumButtonHtml = (!isAdmin) ? `
            <div style="margin-top:8px;">
                ${!hasPremium 
                    ? `<button id="premiumPayBtn" style="width:100%; padding:8px; background:linear-gradient(135deg, #FFD700, #FFA500); color:#333; border:none; border-radius:16px; cursor:pointer; font-weight:bold; font-size:12px;">💎 ОПЛАТИТЬ ПРЕМИУМ</button>`
                    : `<div style="background:#4CAF50; border-radius:16px; padding:8px; text-align:center; color:white; font-weight:bold; font-size:12px;">✅ ПРЕМИУМ АКТИВЕН</div>`
                }
            </div>
        ` : '';
        
        const userInfoHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px; flex-wrap:wrap;">
                    <span style="font-size:20px;">🎓</span>
                    <span style="word-break:break-all;">${user.email}</span>
                </div>
                <button onclick="window.logout()" style="margin-top:5px; padding:8px 12px; background:#4CAF50; color:white; border:none; border-radius:16px; cursor:pointer; width:100%; font-size:12px; font-weight:bold;">🚪 Выйти</button>
                ${premiumButtonHtml}
            </div>
        `;
        
        userInfo.innerHTML = userInfoHtml;
        if (userInfoMobile) userInfoMobile.innerHTML = userInfoHtml;
        
        if (!isAdmin && !hasPremium) {
            setTimeout(() => {
                const payBtn = document.getElementById('premiumPayBtn');
                if (payBtn) payBtn.onclick = () => showPaymentModal();
            }, 100);
        }
        
    } else {
        loginBtn.style.display = 'block';
        if (loginBtnMobile) loginBtnMobile.style.display = 'block';
        
        userInfo.style.display = 'block';
        if (userInfoMobile) userInfoMobile.style.display = 'block';
        
        if (window.AdminUI) {
            window.AdminUI.updateAdminButtonVisibility(false);
        }
        
        const guestHtml = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:14px; font-weight:bold;">👋 Гостевой режим</div>
                <div style="font-size:11px; color:#666; margin-top:4px;">прогресс не сохраняется между устройствами</div>
            </div>
        `;
        
        userInfo.innerHTML = guestHtml;
        if (userInfoMobile) userInfoMobile.innerHTML = guestHtml;
        
        loginBtn.onclick = () => showLoginModal();
        if (loginBtnMobile) loginBtnMobile.onclick = () => showLoginModal();
    }
}

// ========== МОДАЛЬНОЕ ОКНО ОПЛАТЫ ==========
function showPaymentModal() {
    if (!auth.currentUser) {
        alert('Сначала войдите в аккаунт');
        showLoginModal();
        return;
    }
    
    const PREMIUM_PRICE = 500;
    const CONTACTS = {
        telegram: "@SEO_2020",
        email: "ygubert72@gmail.com"
    };
    
    const modal = document.createElement('div');
    modal.id = 'paymentModal';
    modal.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;';
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = 'background:white; border-radius:20px; max-width:400px; width:90%; padding:25px; text-align:center; margin:20px; max-height:90vh; overflow-y:auto;';
    modalContent.innerHTML = `
        <h2 style="margin:0 0 10px 0; font-size:22px;">💎 Премиум доступ</h2>
        <div style="font-size:13px; color:#666; margin-bottom:15px;">Уровни B1, B2, C1</div>
        <div style="font-size:32px; color:#3B6FE0; font-weight:bold; margin-bottom:10px;">${PREMIUM_PRICE} ₽</div>
        <div style="font-size:11px; color:#666; margin-bottom:15px;">Разовый платёж / бессрочный доступ</div>
        
        <div style="background:#f5f5f5; border-radius:12px; padding:12px; margin-bottom:15px; text-align:left;">
            <div style="margin-bottom:6px; font-size:13px;">✅ Все уровни немецкого (A1-C1)</div>
            <div style="margin-bottom:6px; font-size:13px;">✅ Все уроки грамматики</div>
            <div style="margin-bottom:6px; font-size:13px;">✅ Тренажёры и тесты</div>
            <div style="font-size:13px;">✅ Сохранение прогресса в облаке</div>
        </div>
        
        <div style="background:#FFF3E0; border-radius:12px; padding:15px; margin-bottom:15px; text-align:center;">
            <div style="font-weight:bold; margin-bottom:12px; font-size:14px;">📱 Свяжитесь с нами любым удобным способом:</div>
            <div style="margin:8px 0;">
                <div style="background:#0088cc; color:white; padding:10px; border-radius:10px; margin:5px 0; font-size:14px;">
                    📲 Telegram: <strong>${CONTACTS.telegram}</strong>
                </div>
                <div style="background:#EA4335; color:white; padding:10px; border-radius:10px; margin:5px 0; font-size:14px;">
                    📧 Email: <strong>${CONTACTS.email}</strong>
                </div>
            </div>
            <div style="font-size:14px; color:#333; margin-top:12px; padding:8px; background:#fff; border-radius:8px; font-weight:bold;">
                📧 В сообщении укажите ваш email: <strong style="color:#3B6FE0;">${auth.currentUser.email}</strong>
            </div>
        </div>
        
        <button id="paymentCloseBtn" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:14px; font-weight:bold;">Закрыть</button>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    document.getElementById('paymentCloseBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== МОДАЛЬНОЕ ОКНО ВХОДА/РЕГИСТРАЦИИ ==========
window.showLoginModal = function() {
    if (document.getElementById('authModal')) {
        document.getElementById('authModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:999999;">
            <div style="background:white; border-radius:20px; max-width:400px; width:90%; padding:25px;">
                <h2 style="text-align:center; margin:0 0 20px 0;">🔐 Deutsch-Meister</h2>
                
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <button id="loginTab" style="flex:1; padding:10px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer;">Вход</button>
                    <button id="registerTab" style="flex:1; padding:10px; background:#E0E0E0; border:none; border-radius:10px; cursor:pointer;">Регистрация</button>
                </div>
                
                <input type="email" id="authEmail" placeholder="Email" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box;">
                
                <div style="position: relative; margin:10px 0;">
                    <input type="password" id="authPassword" placeholder="Пароль (мин. 6 символов)" style="width:100%; padding:12px; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box; padding-right: 40px;">
                    <span id="togglePasswordEye" onclick="togglePasswordVisibility('authPassword', 'togglePasswordEye')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 20px;">👁️</span>
                </div>
                
                <div id="confirmPasswordContainer" style="position: relative; margin:10px 0; display: none;">
                    <input type="password" id="authConfirmPassword" placeholder="Повторите пароль" style="width:100%; padding:12px; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box; padding-right: 40px;">
                    <span id="toggleConfirmEye" onclick="togglePasswordVisibility('authConfirmPassword', 'toggleConfirmEye')" style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); cursor: pointer; font-size: 20px;">👁️</span>
                </div>
                
                <button id="actionBtn" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>
                
                <button id="guestBtn" style="width:100%; margin-top:10px; padding:10px; background:#F5F5F5; border:2px solid #E0E0E0; border-radius:10px; cursor:pointer;">👤 Продолжить без регистрации</button>
                
                <button id="closeModal" style="width:100%; margin-top:10px; padding:8px; background:none; border:none; cursor:pointer; color:#999;">Закрыть</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    let isLogin = true;
    const loginTab = document.getElementById('loginTab');
    const registerTab = document.getElementById('registerTab');
    const actionBtn = document.getElementById('actionBtn');
    const emailInput = document.getElementById('authEmail');
    const passInput = document.getElementById('authPassword');
    const confirmContainer = document.getElementById('confirmPasswordContainer');
    const confirmInput = document.getElementById('authConfirmPassword');
    
    loginTab.onclick = () => {
        isLogin = true;
        loginTab.style.background = '#3B6FE0';
        loginTab.style.color = 'white';
        registerTab.style.background = '#E0E0E0';
        registerTab.style.color = 'black';
        actionBtn.textContent = 'Войти';
        confirmContainer.style.display = 'none';
    };
    
    registerTab.onclick = () => {
        isLogin = false;
        registerTab.style.background = '#3B6FE0';
        registerTab.style.color = 'white';
        loginTab.style.background = '#E0E0E0';
        loginTab.style.color = 'black';
        actionBtn.textContent = 'Зарегистрироваться';
        confirmContainer.style.display = 'block';
    };
    
    actionBtn.onclick = async () => {
        const email = emailInput.value.trim();
        const password = passInput.value;
        
        if (!email || !password) {
            alert('Введите email и пароль');
            return;
        }
        
        if (!isLogin && password.length < 6) {
            alert('Пароль должен быть минимум 6 символов');
            return;
        }
        
        if (!isLogin) {
            const confirmPassword = confirmInput.value;
            if (password !== confirmPassword) {
                alert('❌ Пароли не совпадают!');
                return;
            }
        }
        
        try {
            if (isLogin) {
                const result = await login(email, password);
                if (result.success) {
                    alert('Добро пожаловать, ' + email + '!');
                    modal.remove();
                    location.reload();
                } else {
                    alert('Ошибка входа: ' + result.error);
                }
            } else {
                const result = await register(email, password);
                if (result.success) {
                    alert('Регистрация успешна! Добро пожаловать, ' + email + '!');
                    modal.remove();
                    location.reload();
                } else {
                    alert('Ошибка регистрации: ' + result.error);
                }
            }
        } catch(error) {
            let msg = 'Ошибка: ';
            if (error.code === 'auth/invalid-credential') msg = 'Неверный email или пароль';
            else if (error.code === 'auth/email-already-in-use') msg = 'Этот email уже зарегистрирован';
            else if (error.code === 'auth/weak-password') msg = 'Пароль слишком слабый (минимум 6 символов)';
            else if (error.code === 'auth/user-not-found') msg = 'Пользователь не найден';
            else if (error.code === 'auth/wrong-password') msg = 'Неверный пароль';
            else if (error.code === 'auth/too-many-requests') msg = 'Слишком много попыток. Попробуйте позже';
            else msg += error.message;
            alert(msg);
        }
    };
    
    document.getElementById('guestBtn').onclick = () => {
        modal.remove();
        alert('Гостевой режим (прогресс не сохраняется между устройствами)');
    };
    
    document.getElementById('closeModal').onclick = () => modal.remove();
};

// ========== ПЕРЕКЛЮЧЕНИЕ ВИДИМОСТИ ПАРОЛЯ ==========
function togglePasswordVisibility(inputId, eyeIconId) {
    const input = document.getElementById(inputId);
    const eyeIcon = document.getElementById(eyeIconId);
    if (input.type === 'password') {
        input.type = 'text';
        eyeIcon.textContent = '🙈';
    } else {
        input.type = 'password';
        eyeIcon.textContent = '👁️';
    }
}

// ========== ПРОВЕРКА АДМИНА ==========
window.isAdmin = function() {
    if (auth && auth.currentUser && auth.currentUser.email === 'ygubert72@gmail.com') {
        return true;
    }
    return false;
};

// ========== СОХРАНЕНИЕ ПРОГРЕССА В ОБЛАКО ==========
window.saveUserProgressToFirebase = async function() {
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
        if (window.Logger) Logger.debug('Прогресс сохранён в облаке');
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка сохранения прогресса:', e);
    }
};

// ========== ЗАГРУЗКА ПРОГРЕССА ИЗ ОБЛАКА ==========
window.loadUserProgressFromFirebase = async function() {
    if (!auth || !auth.currentUser) {
        setTimeout(() => {
            if (typeof window.applyAppState === 'function' && !window.stateApplied) {
                console.log('👤 Пользователь не авторизован, применяем состояние из localStorage');
                window.applyAppState();
            }
        }, 100);
        return false;
    }
    
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
                const config = progress.config;
                localStorage.setItem('dm_config', JSON.stringify(config));
                AppConfig.show_language = config.show_language || 'de';
                AppConfig.quiz_direction = config.quiz_direction || 'de_to_ru';
                AppConfig.sentence_lang_from = config.sentence_lang_from || 'ru';
            }
            
            if (window.Logger) {
                Logger.info('Прогресс загружен из облака');
            }
            
            setTimeout(() => {
                if (typeof window.applyAppState === 'function' && !window.stateApplied) {
                    console.log('☁️ Применяем состояние после загрузки из облака');
                    window.applyAppState();
                }
            }, 100);
            
            return true;
        }
    } catch(e) {
        if (window.Logger) Logger.error('Ошибка загрузки прогресса:', e);
    }
    
    setTimeout(() => {
        if (typeof window.applyAppState === 'function' && !window.stateApplied) {
            console.log('☁️ Облачного прогресса нет, применяем состояние из localStorage');
            window.applyAppState();
        }
    }, 100);
    
    return false;
};

// ========== ЗАПУСК ==========
window.addEventListener('load', function() {
    if (window.Logger) Logger.info('Загрузка страницы...');
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.background = '#4CAF50';
        loginBtn.style.color = 'white';
        loginBtn.innerHTML = '🔐 Войти';
    }
    
    if (typeof firebase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        script.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            authScript.onload = () => {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
                firestoreScript.onload = initFirebase;
                document.head.appendChild(firestoreScript);
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(script);
    } else {
        initFirebase();
    }
});

window.auth = auth;
window.db = db;
window.currentUserData = currentUserData;
window.authInitialized = authInitialized;
