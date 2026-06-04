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
    updateDoc,
    collection,
    getDocs,
    deleteDoc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// ИСПРАВЛЕННЫЙ API ключ
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
let isAdmin = false;

function initFirebase() {
    if (app) return;
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        console.log('Firebase инициализирован');
        
        onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            isGuestMode = false;
            
            if (user) {
                console.log('Пользователь вошёл:', user.email);
                await checkIfAdmin(user.email);
                await loadUserProgressFromFirebase();
            } else if (!isGuestMode) {
                console.log('Гостевой режим');
                isGuestMode = true;
                isAdmin = false;
            }
            
            updateAuthUI();
            updateAdminButton();
        });
    } catch (error) {
        console.error('Ошибка инициализации Firebase:', error);
        isGuestMode = true;
        currentUser = null;
        updateAuthUI();
    }
}

async function checkIfAdmin(email) {
    if (!email) return;
    try {
        // Список email админов - вы можете добавить свои email
        const adminEmails = ['admin@deutsch-meister.com', 'your-email@gmail.com'];
        isAdmin = adminEmails.includes(email);
        
        // Или проверка через Firestore (более гибко)
        const adminDoc = await getDoc(doc(db, 'admins', email.replace(/[.#$]/g, '_')));
        if (adminDoc.exists()) {
            isAdmin = true;
        }
    } catch (error) {
        console.error('Ошибка проверки админа:', error);
        isAdmin = false;
    }
}

function updateAdminButton() {
    const sidebar = document.querySelector('.sidebar-content');
    if (!sidebar) return;
    
    let adminBtn = document.getElementById('adminPanelBtn');
    
    if (isAdmin && currentUser && !isGuestMode) {
        if (!adminBtn) {
            adminBtn = document.createElement('button');
            adminBtn.id = 'adminPanelBtn';
            adminBtn.className = 'btn';
            adminBtn.innerHTML = '👑 АДМИН-ПАНЕЛЬ';
            adminBtn.style.background = '#FF9800';
            adminBtn.style.color = 'white';
            adminBtn.style.marginTop = '10px';
            adminBtn.onclick = () => showAdminPanel();
            
            const loginBtn = document.getElementById('loginBtn');
            if (loginBtn) {
                loginBtn.insertAdjacentElement('afterend', adminBtn);
            } else {
                const levelsContainer = document.querySelector('.levels-container');
                if (levelsContainer) {
                    levelsContainer.insertAdjacentElement('afterend', adminBtn);
                }
            }
        }
    } else if (adminBtn) {
        adminBtn.remove();
    }
}

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
                    ${isAdmin ? '<span style="background:#FF9800; color:white; padding:2px 6px; border-radius:10px; font-size:10px;">ADMIN</span>' : ''}
                </div>
                <button id="logoutBtn" style="padding:4px 12px; background:#f44336; color:white; border:none; border-radius:16px; cursor:pointer; width:100%; font-size:11px;">
                    Выйти
                </button>
            </div>
        `;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) logoutBtn.onclick = () => logout();
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'none';
        userInfo.innerHTML = '';
        
        if (isGuestMode) {
            userInfo.style.display = 'block';
            userInfo.innerHTML = `
                <div style="background:#FFF3E0; border-radius:8px; padding:8px; text-align:center; font-size:11px;">
                    Гостевой режим (прогресс не сохранится)
                </div>
            `;
        }
    }
}

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
        <div id="authModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:10000;">
            <div style="background:white; padding:25px; border-radius:20px; max-width:380px; width:90%;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3 style="margin:0;">Deutsch-Meister</h3>
                    <button id="closeModalBtn" style="background:none; border:none; font-size:24px; cursor:pointer;">&times;</button>
                </div>
                
                <div style="display:flex; gap:10px; margin-bottom:20px; border-bottom:2px solid #E0E0E0;">
                    <button id="tabLogin" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:bold; color:#3B6FE0;">Вход</button>
                    <button id="tabRegister" style="flex:1; padding:10px; background:none; border:none; cursor:pointer; font-weight:bold;">Регистрация</button>
                </div>
                
                <div id="authForm">
                    <input type="email" id="authEmail" placeholder="Email" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:12px; box-sizing:border-box;" />
                    <input type="password" id="authPassword" placeholder="Пароль (мин. 6 символов)" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:12px; box-sizing:border-box;" />
                </div>
                
                <div id="authButtons">
                    <button id="doLogin" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>
                </div>
                
                <div style="text-align:center; margin-top:15px;">
                    <button id="resetPasswordBtn" style="background:none; border:none; color:#666; cursor:pointer; font-size:12px;">Забыли пароль?</button>
                </div>
                
                <div style="text-align:center; margin-top:15px; padding-top:15px; border-top:1px solid #E0E0E0;">
                    <button id="continueAsGuest" style="width:100%; padding:10px; background:#F5F5F5; border:2px solid #E0E0E0; border-radius:12px; cursor:pointer;">Продолжить без регистрации</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('closeModalBtn').onclick = () => hideLoginModal();
    document.getElementById('authModal').onclick = (e) => {
        if (e.target === document.getElementById('authModal')) hideLoginModal();
    };
    
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const authButtons = document.getElementById('authButtons');
    
    tabLogin.onclick = () => {
        tabLogin.style.color = '#3B6FE0';
        tabRegister.style.color = '#333';
        authButtons.innerHTML = `<button id="doLogin" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:12px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>`;
        document.getElementById('doLogin').onclick = () => login();
    };
    
    tabRegister.onclick = () => {
        tabRegister.style.color = '#3B6FE0';
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
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderGrammar === 'function') renderGrammar();
        if (typeof renderQuiz === 'function') renderQuiz();
        if (typeof renderSentences === 'function') renderSentences();
        if (typeof updateCounter === 'function') updateCounter();
    };
}

function hideLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    if (emailInput) emailInput.value = '';
    if (passwordInput) passwordInput.value = '';
}

async function login() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoginModal();
    } catch (error) {
        let message = 'Ошибка входа';
        if (error.code === 'auth/invalid-credential') message = 'Неверный email или пароль';
        if (error.code === 'auth/user-not-found') message = 'Пользователь не найден';
        if (error.code === 'auth/too-many-requests') message = 'Слишком много попыток';
        alert(message);
    }
}

async function register() {
    const email = document.getElementById('authEmail').value.trim();
    const password = document.getElementById('authPassword').value;
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        const userDoc = {
            wordsProgress: wordsProgress || {},
            sentencesProgress: sentencesProgress || {},
            grammarProgress: grammarProgress || {},
            createdAt: new Date().toISOString(),
            subscription: { type: 'free', expiresAt: null }
        };
        
        await setDoc(doc(db, 'users', userCredential.user.uid), userDoc);
        hideLoginModal();
        alert('Регистрация успешна!');
    } catch (error) {
        let message = 'Ошибка регистрации';
        if (error.code === 'auth/email-already-in-use') message = 'Email уже используется';
        if (error.code === 'auth/weak-password') message = 'Пароль слишком слабый';
        alert(message);
    }
}

async function resetPassword() {
    const email = document.getElementById('authEmail').value.trim();
    if (!email) {
        alert('Введите email');
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        alert('Инструкции отправлены на email');
    } catch (error) {
        alert('Ошибка: пользователь не найден');
    }
}

async function logout() {
    try {
        if (currentUser && !isGuestMode && typeof saveUserProgressToFirebase === 'function') {
            await saveUserProgressToFirebase();
        }
        await signOut(auth);
        isGuestMode = true;
        currentUser = null;
        isAdmin = false;
        updateAuthUI();
        updateAdminButton();
        
        if (typeof renderCards === 'function') renderCards();
        if (typeof renderGrammar === 'function') renderGrammar();
        if (typeof renderQuiz === 'function') renderQuiz();
        if (typeof renderSentences === 'function') renderSentences();
        if (typeof updateCounter === 'function') updateCounter();
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// ============ АДМИН-ПАНЕЛЬ ============

async function showAdminPanel() {
    if (!isAdmin) {
        alert('Нет доступа к админ-панели');
        return;
    }
    
    const users = await getAllUsers();
    
    const modalHtml = `
        <div id="adminModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:10001; overflow:auto;">
            <div style="background:white; border-radius:20px; max-width:900px; width:95%; margin:30px auto; max-height:90vh; overflow-y:auto;">
                <div style="padding:20px; border-bottom:1px solid #E0E0E0; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">👑 Админ-панель</h2>
                    <button id="closeAdminModal" style="background:none; border:none; font-size:28px; cursor:pointer;">&times;</button>
                </div>
                
                <div style="padding:20px;">
                    <h3>Статистика</h3>
                    <p>Всего пользователей: ${users.length}</p>
                    
                    <h3>Список пользователей</h3>
                    <div id="usersList" style="margin-top:15px;"></div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('closeAdminModal').onclick = () => {
        document.getElementById('adminModal').remove();
    };
    
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = users.map(user => `
        <div style="border:1px solid #E0E0E0; border-radius:12px; padding:15px; margin-bottom:10px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div>
                <strong>${user.email}</strong><br>
                <small>ID: ${user.uid.substring(0, 15)}...</small><br>
                <small>Дата: ${user.createdAt || 'Неизвестно'}</small><br>
                <small>Подписка: ${user.subscription?.type || 'free'}</small>
            </div>
            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                <button onclick="window.makeAdmin('${user.uid}', '${user.email}')" style="padding:8px 15px; background:#FF9800; color:white; border:none; border-radius:8px; cursor:pointer;">👑 Сделать админом</button>
                <button onclick="window.deleteUserAccount('${user.uid}')" style="padding:8px 15px; background:#f44336; color:white; border:none; border-radius:8px; cursor:pointer;">🗑️ Удалить</button>
            </div>
        </div>
    `).join('');
}

async function getAllUsers() {
    if (!db) return [];
    
    try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const users = [];
        
        for (const docSnap of usersSnapshot) {
            const userData = docSnap.data();
            users.push({
                uid: docSnap.id,
                email: userData.email || 'Email не указан',
                createdAt: userData.createdAt,
                subscription: userData.subscription
            });
        }
        
        return users;
    } catch (error) {
        console.error('Ошибка получения пользователей:', error);
        return [];
    }
}

window.makeAdmin = async function(uid, email) {
    if (!isAdmin) {
        alert('Нет прав');
        return;
    }
    
    try {
        await setDoc(doc(db, 'admins', email.replace(/[.#$]/g, '_')), {
            uid: uid,
            email: email,
            createdAt: new Date().toISOString()
        });
        alert(`Пользователь ${email} теперь админ!`);
        document.getElementById('adminModal')?.remove();
        showAdminPanel();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при назначении админа');
    }
};

window.deleteUserAccount = async function(uid) {
    if (!isAdmin) {
        alert('Нет прав');
        return;
    }
    
    if (!confirm('Вы уверены, что хотите удалить этого пользователя? Все данные будут потеряны!')) {
        return;
    }
    
    try {
        await deleteDoc(doc(db, 'users', uid));
        alert('Пользователь удалён');
        document.getElementById('adminModal')?.remove();
        showAdminPanel();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при удалении');
    }
};

async function loadUserProgressFromFirebase() {
    if (!currentUser || isGuestMode) return;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        
        if (userDoc.exists()) {
            const data = userDoc.data();
            
            if (data.wordsProgress) {
                Object.assign(wordsProgress, data.wordsProgress);
            }
            if (data.sentencesProgress) {
                Object.assign(sentencesProgress, data.sentencesProgress);
            }
            if (data.grammarProgress) {
                Object.assign(grammarProgress, data.grammarProgress);
                if (typeof saveGrammarProgress === 'function') saveGrammarProgress();
            }
            
            window.userSubscription = data.subscription || { type: 'free', expiresAt: null };
            
            if (typeof updateCounter === 'function') updateCounter();
            if (typeof renderCards === 'function') renderCards();
            if (typeof renderQuiz === 'function') renderQuiz();
            if (typeof renderSentences === 'function') renderSentences();
            if (typeof renderGrammar === 'function') renderGrammar();
        } else {
            await saveUserProgressToFirebase();
        }
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
    }
}

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
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
    }
}

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

window.updateSubscription = async function(subscriptionData) {
    if (!currentUser || isGuestMode) return false;
    try {
        await updateDoc(doc(db, 'users', currentUser.uid), {
            subscription: subscriptionData,
            lastUpdated: new Date().toISOString()
        });
        window.userSubscription = subscriptionData;
        return true;
    } catch (error) {
        console.error('Ошибка обновления подписки:', error);
        return false;
    }
};

const originalSaveProgress = window.saveProgress || function() {};
window.saveProgress = function() {
    originalSaveProgress();
    if (currentUser && !isGuestMode && typeof saveUserProgressToFirebase === 'function') {
        saveUserProgressToFirebase();
    }
};

window.saveUserProgressToFirebase = saveUserProgressToFirebase;
window.isGuestMode = () => isGuestMode;
window.isAuthenticated = () => currentUser !== null && !isGuestMode;
window.getCurrentUser = () => currentUser;

initFirebase();
