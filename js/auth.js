// auth.js - система входа и регистрации

let currentUser = null;

// Инициализация Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzsaSyAUj_2cLQyWvs2JTT7ZL2BYox6krDb3X7I",
  authDomain: "deutsch-meister-248cf.firebaseapp.com",
  projectId: "deutsch-meister-248cf",
  storageBucket: "deutsch-meister-248cf.firebasestorage.app",
  messagingSenderId: "549700335996",
  appId: "1:549700335996:web:97ed9e8f91224e34ab0cf9",
  measurementId: "G-06C9Q76FJY"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Показать модальное окно входа
window.showLoginModal = function() {
    let modal = document.getElementById('authModal');
    if (!modal) {
        createModal();
        modal = document.getElementById('authModal');
    }
    modal.style.display = 'flex';
}

function createModal() {
    const modalHtml = `
        <div id="authModal" class="modal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:1000;">
            <div style="background:white; padding:30px; border-radius:20px; max-width:400px; width:90%;">
                <h3 style="margin-top:0;">Вход / Регистрация</h3>
                <input type="text" id="loginEmail" placeholder="Email" style="width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;" />
                <input type="password" id="loginPassword" placeholder="Пароль (мин. 6 символов)" style="width:100%; padding:10px; margin:10px 0; border:1px solid #ddd; border-radius:8px; box-sizing:border-box;" />
                <div style="display:flex; gap:10px; margin-top:20px;">
                    <button id="doLogin" style="flex:1; padding:10px; background:#3B6FE0; color:white; border:none; border-radius:8px; cursor:pointer;">Войти</button>
                    <button id="doRegister" style="flex:1; padding:10px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">Регистрация</button>
                    <button id="closeModal" style="flex:1; padding:10px; background:#999; color:white; border:none; border-radius:8px; cursor:pointer;">Отмена</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('doLogin').onclick = () => login();
    document.getElementById('doRegister').onclick = () => register();
    document.getElementById('closeModal').onclick = () => hideLoginModal();
}

function hideLoginModal() {
    const modal = document.getElementById('authModal');
    if (modal) modal.style.display = 'none';
}

async function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoginModal();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } catch (error) {
        let message = 'Ошибка входа';
        if (error.code === 'auth/invalid-credential') message = 'Неверный email или пароль';
        if (error.code === 'auth/user-not-found') message = 'Пользователь не найден';
        alert(message);
    }
}

async function register() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    if (password.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        hideLoginModal();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    } catch (error) {
        let message = 'Ошибка регистрации';
        if (error.code === 'auth/email-already-in-use') message = 'Email уже используется';
        if (error.code === 'auth/weak-password') message = 'Пароль слишком слабый';
        alert(message);
    }
}

async function logout() {
    await signOut(auth);
}

// Отслеживание состояния входа
onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'block';
            userInfo.innerHTML = `
                <div style="background:#E8F0FE; border-radius:8px; padding:8px; text-align:center; font-size:12px;">
                    👤 ${user.email}<br>
                    <button id="logoutBtn" style="margin-top:5px; padding:4px 12px; background:#f44336; color:white; border:none; border-radius:16px; cursor:pointer; width:100%;">🚪 Выйти</button>
                </div>
            `;
            document.getElementById('logoutBtn')?.addEventListener('click', logout);
        }
        await loadUserProgress();
    } else {
        if (loginBtn) loginBtn.style.display = 'block';
        if (userInfo) {
            userInfo.style.display = 'none';
            userInfo.innerHTML = '';
        }
    }
});

async function loadUserProgress() {
    if (!currentUser) return;
    try {
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.wordsProgress) wordsProgress = data.wordsProgress;
            if (data.sentencesProgress) sentencesProgress = data.sentencesProgress;
            if (typeof updateCounter === 'function') updateCounter();
            if (typeof renderCards === 'function') renderCards();
            else if (typeof renderQuiz === 'function') renderQuiz();
            else if (typeof renderSentences === 'function') renderSentences();
        }
    } catch (error) {
        console.error('Ошибка загрузки прогресса:', error);
    }
}

async function saveUserProgressToFirebase() {
    if (!currentUser) return;
    try {
        await setDoc(doc(db, 'users', currentUser.uid), {
            wordsProgress: wordsProgress,
            sentencesProgress: sentencesProgress,
            lastUpdated: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error('Ошибка сохранения прогресса:', error);
    }
}

window.saveUserProgressToFirebase = saveUserProgressToFirebase;
