// auth.js - полная версия с оплатой премиум (без заявок)

let auth = null;
let db = null;
let currentUserData = null;

// Цена подписки (в рублях)
const PREMIUM_PRICE = 500;

// Контакты для связи
const CONTACTS = {
    telegram: "@SEO_2020",
    email: "ygubert72@gmail.com"
};

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
    
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .then(() => console.log('✅ Сессия будет сохраняться'))
        .catch((error) => console.error('Ошибка настройки сохранения:', error));
    
    console.log('Firebase готов');
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Пользователь в системе:', user.email);
            await loadUserData(user.uid);
            await addUserToFirestore(user);
            await checkIfBlocked(user);
        } else {
            currentUserData = null;
        }
        updateUI(user);
    });
}

// Загрузка данных пользователя
async function loadUserData(uid) {
    if (!db) return;
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            currentUserData = userDoc.data();
            console.log('📊 Данные пользователя загружены, доступ к B1-C1:', currentUserData.hasPremiumAccess);
        }
    } catch(e) {
        console.error('Ошибка загрузки данных:', e);
    }
}

// Проверка доступа к уровню
window.hasAccessToLevel = function(level) {
    // Админ имеет доступ ко всему
    if (auth.currentUser && auth.currentUser.email === 'ygubert72@gmail.com') {
        return true;
    }
    
    // Уровни A1 и A2 бесплатны для всех
    if (level === 'A1' || level === 'A2') {
        return true;
    }
    
    // Проверка наличия доступа к B1-C1
    if (currentUserData && currentUserData.hasPremiumAccess === true) {
        return true;
    }
    
    return false;
};

// Проверка, заблокирован ли пользователь
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
        console.error('Ошибка проверки блокировки:', e);
    }
}

// Добавление пользователя в Firestore
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
                blocked: false
            });
            console.log('✅ Пользователь добавлен в Firestore:', user.email);
        } else {
            if (userDoc.data().hasPremiumAccess === undefined) {
                await db.collection('users').doc(user.uid).update({ hasPremiumAccess: false });
            }
        }
    } catch(e) {
        console.error('Ошибка добавления пользователя:', e);
    }
}

// Обновление интерфейса
function updateUI(user) {
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (!loginBtn || !userInfo) return;
    
    if (user) {
        loginBtn.style.display = 'none';
        userInfo.style.display = 'block';
        
        const hasPremium = currentUserData && currentUserData.hasPremiumAccess === true;
        
        // Показываем кнопку премиум (кроме админа)
        const premiumButtonHtml = (user.email !== 'ygubert72@gmail.com') ? `
            <div style="margin-top:8px;">
                ${!hasPremium 
                    ? `<button id="premiumPayBtn" style="width:100%; padding:8px; background:linear-gradient(135deg, #FFD700, #FFA500); color:#333; border:none; border-radius:16px; cursor:pointer; font-weight:bold; font-size:12px;">💎 ОПЛАТИТЬ ПРЕМИУМ</button>`
                    : `<div style="background:#4CAF50; border-radius:16px; padding:8px; text-align:center; color:white; font-weight:bold; font-size:12px;">✅ ПРЕМИУМ АКТИВЕН</div>`
                }
            </div>
        ` : '';
        
        userInfo.innerHTML = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:5px; flex-wrap:wrap;">
                    <span style="font-size:20px;">🎓</span>
                    <span style="word-break:break-all;">${user.email}</span>
                </div>
                <button onclick="logout()" style="margin-top:5px; padding:8px 12px; background:#f44336; color:white; border:none; border-radius:16px; cursor:pointer; width:100%; font-size:12px; font-weight:bold;">🚪 Выйти</button>
                ${premiumButtonHtml}
            </div>
        `;
        
        // Привязываем обработчик кнопки оплаты
        if (!hasPremium && user.email !== 'ygubert72@gmail.com') {
            setTimeout(() => {
                const payBtn = document.getElementById('premiumPayBtn');
                if (payBtn) payBtn.onclick = () => showPaymentModal();
            }, 100);
        }
        
        // Кнопка админа
        if (user.email === 'ygubert72@gmail.com') {
            let adminBtn = document.getElementById('adminBtn');
            if (!adminBtn) {
                adminBtn = document.createElement('button');
                adminBtn.id = 'adminBtn';
                adminBtn.className = 'btn';
                adminBtn.innerHTML = '👑 АДМИН-ПАНЕЛЬ';
                adminBtn.style.background = '#FF9800';
                adminBtn.style.color = 'white';
                adminBtn.style.marginTop = '10px';
                adminBtn.style.cursor = 'pointer';
                adminBtn.onclick = () => window.showAdminPanel();
                const sidebar = document.querySelector('.sidebar-content');
                if (sidebar) sidebar.appendChild(adminBtn);
            }
        }
        
    } else {
        loginBtn.style.display = 'block';
        userInfo.style.display = 'block';
        userInfo.innerHTML = `
            <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:14px; font-weight:bold;">👋 Гостевой режим</div>
                <div style="font-size:11px; color:#666; margin-top:4px;">прогресс не сохраняется</div>
            </div>
        `;
        loginBtn.onclick = () => showLoginModal();
    }
}

// Функция выхода
window.logout = async function() {
    if (auth) await auth.signOut();
    location.reload();
};

// Модальное окно оплаты (улучшенная версия для телефонов)
function showPaymentModal() {
    if (!auth.currentUser) {
        alert('Сначала войдите в аккаунт');
        showLoginModal();
        return;
    }
    
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

// ========== АКТИВАЦИЯ ПРЕМИУМА (админ) ==========
window.activatePremium = async function(email) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        alert('Нет прав');
        return;
    }
    
    try {
        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
        if (usersSnapshot.empty) {
            alert('Пользователь с таким email не найден');
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            hasPremiumAccess: true,
            premiumActivatedAt: new Date().toISOString()
        });
        
        alert(`✅ Премиум доступ активирован для ${email}`);
        
        if (auth.currentUser && auth.currentUser.email === email) {
            currentUserData.hasPremiumAccess = true;
            updateUI(auth.currentUser);
        }
        
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

window.deactivatePremium = async function(email) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        alert('Нет прав');
        return;
    }
    
    if (!confirm('Отключить премиум доступ для этого пользователя?')) return;
    
    try {
        const usersSnapshot = await db.collection('users').where('email', '==', email).get();
        if (usersSnapshot.empty) {
            alert('Пользователь с таким email не найден');
            return;
        }
        
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            hasPremiumAccess: false,
            premiumActivatedAt: null
        });
        
        alert(`✅ Премиум доступ деактивирован для ${email}`);
        
        if (auth.currentUser && auth.currentUser.email === email) {
            currentUserData.hasPremiumAccess = false;
            updateUI(auth.currentUser);
        }
        
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

// ========== АДМИН-ПАНЕЛЬ ==========
window.showAdminPanel = async function() {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        alert('У вас нет прав администратора');
        return;
    }
    
    // Получаем пользователей
    let users = [];
    if (db) {
        try {
            const usersSnapshot = await db.collection('users').get();
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                users.push({
                    uid: doc.id,
                    email: data.email || 'Email не указан',
                    createdAt: data.createdAt || 'Неизвестно',
                    hasPremiumAccess: data.hasPremiumAccess === true,
                    blocked: data.blocked === true
                });
            });
        } catch(e) {
            console.error('Ошибка:', e);
        }
    }
    
    const modal = document.createElement('div');
    modal.id = 'adminPanel';
    modal.innerHTML = `
        <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.7); display:flex; justify-content:center; align-items:center; z-index:1000000; overflow:auto;">
            <div style="background:white; border-radius:20px; max-width:900px; width:95%; max-height:90vh; overflow-y:auto; margin:20px;">
                <div style="padding:20px; border-bottom:1px solid #E0E0E0; display:flex; justify-content:space-between; align-items:center;">
                    <h2 style="margin:0;">👑 Админ-панель</h2>
                    <button id="closeAdminPanel" style="background:none; border:none; font-size:28px; cursor:pointer;">&times;</button>
                </div>
                <div style="padding:20px;">
                    <!-- Статистика -->
                    <h3>📊 Статистика</h3>
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px;">
                        <div style="background:#E8F0FE; padding:10px 20px; border-radius:12px;">Всего: <strong>${users.length}</strong></div>
                        <div style="background:#C8E6C9; padding:10px 20px; border-radius:12px;">Премиум: <strong>${users.filter(u => u.hasPremiumAccess).length}</strong></div>
                        <div style="background:#FFCDD2; padding:10px 20px; border-radius:12px;">Заблокировано: <strong>${users.filter(u => u.blocked).length}</strong></div>
                    </div>
                    
                    <!-- Ручное управление -->
                    <h3>🔧 Ручное управление пользователями</h3>
                    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                        <input type="email" id="premiumEmail" placeholder="Email пользователя" style="flex:1; padding:10px; border:2px solid #E0E0E0; border-radius:8px;">
                        <button id="activatePremiumBtn" style="padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">💎 Активировать премиум</button>
                        <button id="deactivatePremiumBtn" style="padding:10px 20px; background:#FF9800; color:white; border:none; border-radius:8px; cursor:pointer;">🔒 Снять премиум</button>
                    </div>
                    
                    <!-- Список пользователей -->
                    <h3>👥 Список пользователей</h3>
                    <div id="usersList">
                        ${users.map(user => `
                            <div style="border:1px solid ${user.blocked ? '#f44336' : '#E0E0E0'}; border-radius:12px; padding:15px; margin-bottom:10px; background:${user.blocked ? '#FFEBEE' : 'white'}">
                                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
                                    <div>
                                        <strong>${user.email}</strong>
                                        ${user.hasPremiumAccess ? '<span style="background:#4CAF50; color:white; padding:2px 8px; border-radius:10px; font-size:10px; margin-left:8px;">ПРЕМИУМ</span>' : '<span style="background:#999; color:white; padding:2px 8px; border-radius:10px; font-size:10px; margin-left:8px;">БЕСПЛАТНЫЙ</span>'}
                                        ${user.blocked ? '<span style="color:#f44336; margin-left:8px;">[ЗАБЛОКИРОВАН]</span>' : ''}
                                    </div>
                                    <div style="font-size:11px; color:#666;">Регистрация: ${user.createdAt}</div>
                                </div>
                                <div style="margin-top:12px; display:flex; gap:10px; flex-wrap:wrap;">
                                    ${!user.hasPremiumAccess 
                                        ? `<button onclick="window.activatePremiumByUid('${user.uid}')" style="padding:5px 15px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">💎 Дать премиум</button>`
                                        : `<button onclick="window.deactivatePremiumByUid('${user.uid}')" style="padding:5px 15px; background:#FF9800; color:white; border:none; border-radius:8px; cursor:pointer;">🔒 Снять премиум</button>`
                                    }
                                    ${!user.blocked 
                                        ? `<button onclick="window.blockUser('${user.uid}')" style="padding:5px 15px; background:#f44336; color:white; border:none; border-radius:8px; cursor:pointer;">🚫 Заблокировать</button>`
                                        : `<button onclick="window.unblockUser('${user.uid}')" style="padding:5px 15px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">🔓 Разблокировать</button>`
                                    }
                                    <button onclick="window.deleteUser('${user.uid}')" style="padding:5px 15px; background:#555; color:white; border:none; border-radius:8px; cursor:pointer;">🗑️ Удалить</button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('closeAdminPanel').onclick = () => modal.remove();
    document.getElementById('activatePremiumBtn').onclick = () => {
        const email = document.getElementById('premiumEmail').value;
        if (email) window.activatePremium(email);
        else alert('Введите email');
    };
    document.getElementById('deactivatePremiumBtn').onclick = () => {
        const email = document.getElementById('premiumEmail').value;
        if (email) window.deactivatePremium(email);
        else alert('Введите email');
    };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
};

window.activatePremiumByUid = async function(uid) {
    try {
        await db.collection('users').doc(uid).update({
            hasPremiumAccess: true,
            premiumActivatedAt: new Date().toISOString()
        });
        alert('✅ Премиум активирован');
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

window.deactivatePremiumByUid = async function(uid) {
    if (!confirm('Снять премиум доступ?')) return;
    try {
        await db.collection('users').doc(uid).update({
            hasPremiumAccess: false,
            premiumActivatedAt: null
        });
        alert('✅ Премиум снят');
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

// Блокировка пользователя
window.blockUser = async function(uid) {
    if (!confirm('Заблокировать пользователя?')) return;
    try {
        await db.collection('users').doc(uid).update({ blocked: true });
        alert('✅ Пользователь заблокирован');
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

window.unblockUser = async function(uid) {
    if (!confirm('Разблокировать пользователя?')) return;
    try {
        await db.collection('users').doc(uid).update({ blocked: false });
        alert('✅ Пользователь разблокирован');
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

window.deleteUser = async function(uid) {
    if (!confirm('Удалить пользователя?')) return;
    try {
        await db.collection('users').doc(uid).delete();
        alert('✅ Пользователь удалён');
        document.getElementById('adminPanel')?.remove();
        window.showAdminPanel();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

// Модальное окно входа/регистрации
window.showLoginModal = function() {
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
    
    loginTab.onclick = () => {
        isLogin = true;
        loginTab.style.background = '#3B6FE0';
        loginTab.style.color = 'white';
        registerTab.style.background = '#E0E0E0';
        registerTab.style.color = 'black';
        actionBtn.textContent = 'Войти';
    };
    
    registerTab.onclick = () => {
        isLogin = false;
        registerTab.style.background = '#3B6FE0';
        registerTab.style.color = 'white';
        loginTab.style.background = '#E0E0E0';
        loginTab.style.color = 'black';
        actionBtn.textContent = 'Зарегистрироваться';
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
        
        try {
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
                alert('Добро пожаловать, ' + email + '!');
                modal.remove();
            } else {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                if (db) {
                    await db.collection('users').doc(userCredential.user.uid).set({
                        email: email,
                        createdAt: new Date().toISOString(),
                        hasPremiumAccess: false,
                        premiumActivatedAt: null,
                        blocked: false
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
    
    document.getElementById('guestBtn').onclick = () => {
        modal.remove();
        alert('Гостевой режим (прогресс не сохранится)');
    };
    
    document.getElementById('closeModal').onclick = () => modal.remove();
};

// Запуск при загрузке страницы
window.addEventListener('load', function() {
    console.log('Загрузка страницы...');
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
