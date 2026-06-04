// auth.js - полная рабочая версия с сохранением входа

let auth = null;
let db = null;

// Правильная конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAUj_2cLQyWvs2JTT7Zl2BYox0krDb3X7I",
    authDomain: "deutsch-meister-248cf.firebaseapp.com",
    projectId: "deutsch-meister-248cf",
    storageBucket: "deutsch-meister-248cf.firebasestorage.app",
    messagingSenderId: "549700335996",
    appId: "1:549700335996:web:97ed9e8f91224e34ab0cf9"
};

// Инициализация Firebase
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
    
    // Устанавливаем постоянное сохранение сессии (ВАЖНО!)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => {
            console.log('✅ Сессия будет сохраняться');
        })
        .catch((error) => {
            console.error('Ошибка настройки сохранения:', error);
        });
    
    console.log('Firebase готов');
    
    // Слушатель входа
    auth.onAuthStateChanged((user) => {
        updateUI(user);
        if (user) {
            console.log('Пользователь в системе:', user.email);
        }
    });
}

// Обновление интерфейса
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (!loginBtn || !userInfo) return;
    
    if (user) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div>👤 ${user.email}</div>
                <button onclick="logout()" style="margin-top:8px; padding:4px 12px; background:#f44336; color:white; border:none; border-radius:16px; cursor:pointer; width:100%;">🚪 Выйти</button>
            </div>
        `;
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `<div style="background:#FFF3E0; border-radius:8px; padding:8px; text-align:center; font-size:11px;">🧸 Гостевой режим (прогресс не сохранится)</div>`;
        loginBtn.onclick = () => showLoginModal();
    }
}

// Функция выхода
window.logout = async function() {
    if (auth) {
        await auth.signOut();
    }
    location.reload();
};

// Модальное окно входа/регистрации
window.showLoginModal = function() {
    // Удаляем старое окно если есть
    if (document.getElementById('authModal')) {
        document.getElementById('authModal').remove();
    }
    
    const modal = document.createElement('div');
    modal.id = 'authModal';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; justify-content:center; align-items:center; z-index:999999;">
            <div style="background:white; border-radius:20px; max-width:380px; width:90%; padding:25px;">
                <h2 style="text-align:center; margin:0 0 20px 0;">🔐 Deutsch-Meister</h2>
                
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <button id="loginTab" style="flex:1; padding:10px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer;">Вход</button>
                    <button id="registerTab" style="flex:1; padding:10px; background:#E0E0E0; border:none; border-radius:10px; cursor:pointer;">Регистрация</button>
                </div>
                
                <input type="email" id="authEmail" placeholder="Email" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box;">
                <input type="password" id="authPassword" placeholder="Пароль (мин. 6 символов)" style="width:100%; padding:12px; margin:10px 0; border:2px solid #E0E0E0; border-radius:10px; box-sizing:border-box;">
                
                <button id="actionBtn" style="width:100%; padding:12px; background:#3B6FE0; color:white; border:none; border-radius:10px; cursor:pointer; font-size:16px; font-weight:bold;">Войти</button>
                
                <button id="guestBtn" style="width:100%; margin-top:15px; padding:10px; background:#F5F5F5; border:2px solid #E0E0E0; border-radius:10px; cursor:pointer;">👤 Продолжить без регистрации</button>
                
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
    const guestBtn = document.getElementById('guestBtn');
    const closeBtn = document.getElementById('closeModal');
    
    // Вкладка Вход
    loginTab.onclick = () => {
        isLogin = true;
        loginTab.style.background = '#3B6FE0';
        loginTab.style.color = 'white';
        registerTab.style.background = '#E0E0E0';
        registerTab.style.color = 'black';
        actionBtn.textContent = 'Войти';
    };
    
    // Вкладка Регистрация
    registerTab.onclick = () => {
        isLogin = false;
        registerTab.style.background = '#3B6FE0';
        registerTab.style.color = 'white';
        loginTab.style.background = '#E0E0E0';
        loginTab.style.color = 'black';
        actionBtn.textContent = 'Зарегистрироваться';
    };
    
    // Кнопка действия (Войти / Зарегистрироваться)
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
        
        try {
            if (isLogin) {
                // Вход
                await auth.signInWithEmailAndPassword(email, password);
                alert('Добро пожаловать, ' + email + '!');
                modal.remove();
            } else {
                // Регистрация
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                // Создаём запись пользователя в Firestore
                if (db) {
                    await db.collection('users').doc(userCredential.user.uid).set({
                        email: email,
                        createdAt: new Date().toISOString(),
                        subscription: { type: 'free' }
                    });
                }
                alert('Регистрация успешна! Добро пожаловать, ' + email + '!');
                modal.remove();
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
    
    // Гостевой режим
    guestBtn.onclick = () => {
        modal.remove();
        alert('Гостевой режим (прогресс не сохранится)');
    };
    
    // Закрыть
    closeBtn.onclick = () => modal.remove();
};

// Запуск при загрузке страницы
window.addEventListener('load', function() {
    console.log('Загрузка страницы, инициализация Firebase...');
    
    // Привязываем кнопку входа (чтобы была зелёной)
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.style.background = '#4CAF50';
        loginBtn.style.color = 'white';
        loginBtn.innerHTML = '🔐 Войти';
    }
    
    // Загружаем Firebase скрипты
    if (typeof firebase === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js';
        script.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth-compat.js';
            authScript.onload = () => {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js';
                firestoreScript.onload = () => {
                    initFirebase();
                };
                document.head.appendChild(firestoreScript);
            };
            document.head.appendChild(authScript);
        };
        document.head.appendChild(script);
    } else {
        initFirebase();
    }
});
