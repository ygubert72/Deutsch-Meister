// auth.js - система входа, регистрации и гостевого режима

let currentUser = null;
let isGuestMode = false;

// Инициализация Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    getDoc, 
    setDoc, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ИСПРАВЛЕННЫЙ API ключ (было AIzsaSy, стало AIzaSy)
const firebaseConfig = {
    apiKey: "AIzaSyAUj_2cLQyWvs2JTT7ZL2BYox6krDb3X7I",
    authDomain: "deutsch-meister-248cf.firebaseapp.com",
    projectId: "deutsch-meister-248cf",
    storageBucket: "deutsch-meister-248cf.firebasestorage.app",
    messagingSenderId: "549700335996",
    appId: "1:549700335996:web:97ed9e8f91224e34ab0cf9",
    measurementId: "G-06C9Q76FJY"
};

let app, auth, db;

// Функция для отложенной инициализации Firebase (если конфиг валидный)
function initFirebase() {
    if (app) return;
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log('✅ Firebase инициализирован');
        
        // Настройка слушателя состояния входа
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            isGuestMode = false;
            
            if (user) {
                console.log('✅ Пользователь вошёл:', user.email);
                await loadUserProgressFromFirebase();
            } else if (!isGuestMode) {
                console.log('👤 Гостевой режим');
                isGuestMode = true;
            }
            
            updateAuthUI();
        });
    } catch (error) {
        console.error('❌ Ошибка инициализации Firebase:', error);
        // При ошибке Firebase переходим в гостевой режим
        isGuestMode = true;
        currentUser = null;
        updateAuthUI();
    }
}

// Обновление UI в зависимости от состояния авторизации
function updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (!loginBtn || !userInfo) return;
    
    if (currentUser && !isGuestMode) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center; font-size:12px;">
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; margin-bottom:8px;">
                    <span>👤</span>
                    <span style="word-break:break-all;">${currentUser.email}</span>
                </div>
                <button id="logoutBtn" class="logout-btn" style="padding:4px 12px; background:#f44336; color:white; border:none; border-radius:16px; cursor:pointer; width:100%; font-size:11px;">
                    🚪 Выйти
                </button>
            </div>
        `;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.onclick = () => logout();
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        userInfo.innerHTML = '';
        
        // В гостевом режиме показываем индикатор
        if (isGuestMode) {
            userInfo.style.display = 'block';
            userInfo.innerHTML = `
                <div style="background:#FFF3E0; border-radius:8px; padding:8px; text-align:center; font-size:11px;">
                    🧸 Гостевой режим (прогресс не сохранится)
                </div>
            `;
        }
    }
}

// Показать модальное окно входа
window.showLoginModal = function() {
    if (!auth) initFirebase();
    
    let modal = document.getElementById('authModal');
    if (!modal) {
        createModal();
        modal = document.getElementById('authModal');
    }
    modal.style.display = 'flex';
}

function createModal() {
    const modalHtml = `
        <div id="authModal" class="auth-modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:10000;">
            <div style="background:white; padding:25px; border-radius:20px; max-width:380px; width:90%; box-shadow:0 20px 35px rgba(0,0,0,0.2);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0;">🔐 Deutsch-Meister</h3>
                    <button id="closeModalBtn" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                
                <div id="authTabs" style="display:flex; gap:10px; margin-bottom:20px; border-bottom:2px solid #E0E0E0;">
                    <button id="tabLogin" class="auth-tab active" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:bold; color:#3B6FE0;">Вход</button>
                    <button id="tabRegister" class="auth-tab" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:bold;">Регистрация</button>
                </div>
                
                <div id="authForm">
                    <input type="email" id="authEmail" placeholder="Email" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:12px; box-sizing:border-box; font-size:14px;" />
                    <input type="password" id="authPassword" placeholder="Пароль (мин. 6 символов)" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:12px; box-sizing:border-box; font-size:14px;" />
                </div>
                
                <div id="authButtons">
                    <button id="doLogin" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>
                </div>
                
                <div id="forgotPassword" style="text-align:center; margin-top:15px;">
                    <button id="resetPasswordBtn" style="background:none; border:none; color:#666; cursor:pointer; font-size:12px;">Забыли пароль?</button>
                </div>
                
                <div style="text-align:center; margin-top:15px; padding-top:15px; border-top:1px solid #E0E0E0;">
                    <button id="continueAsGuest" style="width:100%; padding:10px; background:#F5F5F5; border:2px solid #E0E0E0; border-radius:12px; cursor:pointer; font-size:14px;">👤 Продолжить без регистрации</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Закрытие модалки
    document.getElementById('closeModalBtn').onclick = () => hideLoginModal();
    document.getElementById('authModal').onclick = (e) => {
        if (e.target === document.getElementById('authModal')) hideLoginModal();
    };
    
    // Переключение табов
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authButtons = document.getElementById('authButtons');
    const authFormTitle = document.querySelector('#authModal h3');
    
    tabLogin.onclick = () => {
        tabLogin.classList.add('active');
        tabLogin.style.color = '#3B6FE0';
        tabRegister.classList.remove('active');
        tabRegister.style.color = '#333';
        authButtons.innerHTML = `<button id="doLogin" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>`;
        document.getElementById('doLogin').onclick = () => login();
    };
    
    tabRegister.onclick = () => {
        tabRegister.classList.add('active');
        tabRegister.style.color = '#3B6FE0';
        tabLogin.classList.remove('active');
        tabLogin.style.color = '#333';
        authButtons.innerHTML = `<button id="doRegister" style="width:100%; padding:12px; background:#4CAF50; color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold;">Зарегистрироваться</button>`;
        document.getElementById('doRegister').onclick = () => register();
    };
    
    document.getElementById('doLogin').onclick = () => login();
    document.getElementById('resetPasswordBtn').onclick = () => resetPassword();
    document.getElementById('continueAsGuest').onclick = () => {
        hideLoginModal();
        isGuestMode = true;
        currentUser = null;
        updateAuthUI();
        // Перезагружаем текущий режим
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderGrammar === 'function') renderGrammar();
        if (typeof renderQuiz === 'function') renderQuiz();
        if (typeof renderSentences === 'function') renderSentences();
        updateCounter();
    };
}

function hideLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
    // Очищаем поля
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

async function login() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showAuthError('Введите email и пароль');
        return;
    }
    
    try {
        showAuthLoading(true);
        await signInWithEmailAndPassword(auth, email, password);
        hideLoginModal();
        showAuthMessage('✅ Вход выполнен!', 'success');
    } catch (error) {
        let message = 'Ошибка входа';
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
            message = 'Неверный email или пароль';
        } else if (error.code === 'auth/too-many-requests') {
            message = 'Слишком много попыток. Попробуйте позже';
        }
        showAuthError(message);
    } finally {
        showAuthLoading(false);
    }
}

async function register() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        showAuthError('Введите email и пароль');
        return;
    }
    
    if (password.length < 6) {
        showAuthError('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        showAuthLoading(true);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Инициализируем прогресс нового пользователя
        const userDoc = {
            wordsProgress: wordsProgress || {},
            sentencesProgress: sentencesProgress || {},
            grammarProgress: grammarProgress || {},
            createdAt: new Date().toISOString(),
            subscription: {
                type: 'free', // free, premium
                expiresAt: null
            }
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
        
        hideLoginModal();
        showAuthMessage('✅ Регистрация успешна!', 'success');
    } catch (error) {
        let message = 'Ошибка регистрации';
        if (error.code === 'auth/email-already-in-use') {
            message = 'Этот email уже зарегистрирован';
        } else if (error.code === 'auth/weak-password') {
            message = 'Пароль слишком слабый';
        }
        showAuthError(message);
    } finally {
        showAuthLoading(false);
    }
}

async function resetPassword() {
    const email = document.getElementById('authEmail').value.trim();
    
    if (!email) {
        showAuthError('Введите email для сброса пароля');
        return;
    }
    
    try {
        await sendPasswordResetEmail(auth, email);
        showAuthMessage('📧 Инструкции по сбросу пароля отправлены на email', 'success');
    } catch (error) {
        let message = 'Ошибка';
        if (error.code === 'auth/user-not-found') {
            message = 'Пользователь с таким email не найден';
        }
        showAuthError(message);
    }
}

async function logout() {
    try {
        // Сохраняем прогресс перед выходом
        if (currentUser && !isGuestMode && typeof saveUserProgressToFirebase === 'function') {
            await saveUserProgressToFirebase();
        }
        await signOut(auth);
        isGuestMode = true;
        currentUser = null;
        updateAuthUI();
        
        // Перезагружаем текущий режим
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderGrammar === 'function') renderGrammar();
        if (typeof renderQuiz === 'function') renderQuiz();
        if (typeof renderSentences === 'function') renderSentences();
        updateCounter();
        
        showAuthMessage('👋 Вы вышли из аккаунта', 'info');
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// UI вспомогательные функции
function showAuthError(message) {
    let errorDiv = document.querySelector('.auth-error');
    if (!errorDiv) {
        errorDiv = document.createElement('div');
        errorDiv.className = 'auth-error';
        const authForm = document.getElementById('authForm');
        if (authForm) authForm.parentNode.insertBefore(errorDiv, authForm.nextSibling);
    }
    errorDiv.innerHTML = `<div style="background:#FFCDD2; color:#c62828; padding:10px; border-radius:8px; margin:10px 0; font-size:13px;">⚠️ ${message}</div>`;
    setTimeout(() => {
        if (errorDiv) errorDiv.innerHTML = '';
    }, 3000);
}

function showAuthMessage(message, type) {
    let msgDiv = document.querySelector('.auth-message');
    if (!msgDiv) {
        msgDiv = document.createElement('div');
        msgDiv.className = 'auth-message';
        const authModal = document.getElementById('authModal');
        if (authModal && authModal.querySelector('div')) {
            authModal.querySelector('div').insertBefore(msgDiv, authModal.querySelector('div').firstChild.nextSibling);
        }
    }
    const bgColor = type === 'success' ? '#C8E6C9' : '#E3F2FD';
    const textColor = type === 'success' ? '#2E7D32' : '#1565C0';
    msgDiv.innerHTML = `<div style="background:${bgColor}; color:${textColor}; padding:10px; border-radius:8px; margin:10px 0; font-size:13px; text-align:center;">${message}</div>`;
    setTimeout(() => {
        if (msgDiv) msgDiv.innerHTML = '';
    }, 3000);
}

function showAuthLoading(show) {
    const btn = document.querySelector('#doLogin, #doRegister');
    if (btn) {
        if (show) {
            btn.dataset.originalText = btn.textContent;
            btn.textContent = '⏳ Загрузка...';
            btn.disabled = true;
        } else {
            btn.textContent = btn.dataset.originalText || (btn.id === 'doLogin' ? 'Войти' : 'Зарегистрироваться');
            btn.disabled = false;
        }
    }
}

// Загрузка прогресса пользователя из Firebase
async function loadUserProgressFromFirebase() {
    if (!currentUser || isGuestMode) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            // Загружаем прогресс слов
            if (data.wordsProgress) {
                Object.assign(wordsProgress, data.wordsProgress);
            }
            
            // Загружаем прогресс фраз
            if (data.sentencesProgress) {
                Object.assign(sentencesProgress, data.sentencesProgress);
            }
            
            // Загружаем прогресс грамматики
            if (data.grammarProgress) {
                Object.assign(grammarProgress, data.grammarProgress);
                if (typeof saveGrammarProgress === 'function') saveGrammarProgress();
            }
            
            // Сохраняем информацию о подписке для будущей монетизации
            window.userSubscription = data.subscription || { type: 'free', expiresAt: null };
            
            console.log('✅ Прогресс загружен из облака');
            
            // Обновляем UI
            if (typeof updateCounter === 'function') updateCounter();
            if (typeof renderCards === 'function') renderCards();
            if (typeof renderQuiz === 'function') renderQuiz();
            if (typeof renderSentences === 'function') renderSentences();
            if (typeof renderGrammar === 'function') renderGrammar();
        } else {
            // Новый пользователь - сохраняем текущий локальный прогресс
            await saveUserProgressToFirebase();
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки прогресса:', error);
    }
}

// Сохранение прогресса пользователя в Firebase
async function saveUserProgressToFirebase() {
    if (!currentUser || isGuestMode) return;
    
    try {
        const userData = {
            wordsProgress: wordsProgress || {},
            sentencesProgress: sentencesProgress || {},
            grammarProgress: grammarProgress || {},
            lastUpdated: new Date().toISOString(),
            lastLevel: AppConfig?.currentLevel || 'A1'
        };
        
        await setDoc(doc(db, 'users', currentUser.uid), userData, { merge: true });
        console.log('💾 Прогресс сохранён в облаке');
    } catch (error) {
        console.error('❌ Ошибка сохранения прогресса:', error);
    }
}

// Функция для проверки статуса подписки (для будущей монетизации)
window.checkSubscriptionStatus = function() {
    if (!currentUser || isGuestMode) {
        return { isPremium: false, type: 'guest' };
    }
    
    const subscription = window.userSubscription || { type: 'free', expiresAt: null };
    const isExpired = subscription.expiresAt && new Date(subscription.expiresAt) < new Date();
    
    if (subscription.type === 'premium' && !isExpired) {
        return { isPremium: true, type: 'premium' };
    }
    
    return { isPremium: false, type: 'free' };
};

// Функция для обновления подписки (вызовется после оплаты)
window.updateSubscription = async function(subscriptionData) {
    if (!currentUser || isGuestMode) return false;
    
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            subscription: subscriptionData,
            lastUpdated: new Date().toISOString()
        });
        window.userSubscription = subscriptionData;
        console.log('✅ Подписка обновлена');
        return true;
    } catch (error) {
        console.error('❌ Ошибка обновления подписки:', error);
        return false;
    }
};

// Переопределяем saveProgress для автоматического сохранения в Firebase
const originalSaveProgress = window.saveProgress || function() {};
window.saveProgress = function() {
    originalSaveProgress();
    if (currentUser && !isGuestMode && typeof saveUserProgressToFirebase === 'function') {
        saveUserProgressToFirebase();
    }
};

// Экспортируем функции для использования в других модулях
window.saveUserProgressToFirebase = saveUserProgressToFirebase;
window.loadUserProgressFromFirebase = loadUserProgressFromFirebase;
window.isGuestMode = () => isGuestMode;
window.isAuthenticated = () => currentUser !== null && !isGuestMode;
window.getCurrentUser = () => currentUser;

// Инициализация Firebase при загрузке модуля
initFirebase();
