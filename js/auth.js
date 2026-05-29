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
function showLoginModal() {
    let modal = document.getElementById('authModal');
    if (!modal) {
        createModal();
        modal = document.getElementById('authModal');
    }
    modal.style.display = 'flex';
}

function createModal() {
    const modalHtml = `
        <div id="authModal" class="modal" style="display:none;">
            <div class="modal-content">
                <h3>Вход / Регистрация</h3>
                <input type="text" id="loginEmail" placeholder="Email" />
                <input type="password" id="loginPassword" placeholder="Пароль" />
                <div class="modal-buttons">
                    <button id="doLogin">Войти</button>
                    <button id="doRegister">Регистрация</button>
                    <button id="closeModal">Отмена</button>
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
    try {
        await signInWithEmailAndPassword(auth, email, password);
        hideLoginModal();
    } catch (error) {
        alert('Ошибка входа: ' + error.message);
    }
}

async function register() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        hideLoginModal();
    } catch (error) {
        alert('Ошибка регистрации: ' + error.message);
    }
}

async function logout() {
    await signOut(auth);
}

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    const loginBtn = document.getElementById('loginBtn');
    const userInfo = document.getElementById('userInfo');
    
    if (user) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (userInfo) {
            userInfo.style.display = 'flex';
            userInfo.innerHTML = `👤 ${user.email} <button id="logoutBtn">Выйти</button>`;
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
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.wordsProgress) wordsProgress = data.wordsProgress;
        if (data.sentencesProgress) sentencesProgress = data.sentencesProgress;
        updateCounter();
        if (currentMode === 'cards') renderCards();
        else if (currentMode === 'quiz') renderQuiz();
        else if (currentMode === 'sentences') renderSentences();
    }
}

async function saveUserProgress() {
    if (!currentUser) return;
    await setDoc(doc(db, 'users', currentUser.uid), {
        wordsProgress: wordsProgress,
        sentencesProgress: sentencesProgress,
        lastUpdated: new Date().toISOString()
    }, { merge: true });
}

window.saveUserProgress = saveUserProgress;
window.showLoginModal = showLoginModal;
