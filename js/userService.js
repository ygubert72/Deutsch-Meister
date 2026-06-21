// userService.js — работа с пользователями (CRUD, блокировка, премиум)

// ========== ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function updateUser(uid, data) {
    if (!db) return { success: false, error: 'Firebase не инициализирован' };
    try {
        await db.collection('users').doc(uid).update(data);
        Logger.info('Пользователь обновлён:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка обновления пользователя:', e);
        return { success: false, error: e.message };
    }
}

// ========== ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ==========
async function getUserData(uid) {
    if (!db) return null;
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch(e) {
        Logger.error('Ошибка получения пользователя:', e);
        return null;
    }
}

// ========== ПОИСК ПОЛЬЗОВАТЕЛЯ ПО EMAIL ==========
async function findUserByEmail(email) {
    if (!db) return null;
    try {
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { uid: doc.id, data: doc.data() };
        }
        return null;
    } catch(e) {
        Logger.error('Ошибка поиска пользователя:', e);
        return null;
    }
}

// ========== АКТИВАЦИЯ ПРЕМИУМА ==========
async function activatePremium(uid) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        return { success: false, error: 'Нет прав администратора' };
    }
    try {
        await db.collection('users').doc(uid).update({
            hasPremiumAccess: true,
            premiumActivatedAt: new Date().toISOString()
        });
        Logger.info('Премиум активирован для:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка активации премиума:', e);
        return { success: false, error: e.message };
    }
}

// ========== ДЕАКТИВАЦИЯ ПРЕМИУМА ==========
async function deactivatePremium(uid) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        return { success: false, error: 'Нет прав администратора' };
    }
    try {
        await db.collection('users').doc(uid).update({
            hasPremiumAccess: false,
            premiumActivatedAt: null
        });
        Logger.info('Премиум деактивирован для:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка деактивации премиума:', e);
        return { success: false, error: e.message };
    }
}

// ========== БЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ ==========
async function blockUser(uid) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        return { success: false, error: 'Нет прав администратора' };
    }
    try {
        await db.collection('users').doc(uid).update({ blocked: true, status: 'blocked' });
        Logger.info('Пользователь заблокирован:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка блокировки:', e);
        return { success: false, error: e.message };
    }
}

// ========== РАЗБЛОКИРОВКА ПОЛЬЗОВАТЕЛЯ ==========
async function unblockUser(uid) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        return { success: false, error: 'Нет прав администратора' };
    }
    try {
        await db.collection('users').doc(uid).update({ blocked: false, status: 'ok' });
        Logger.info('Пользователь разблокирован:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка разблокировки:', e);
        return { success: false, error: e.message };
    }
}

// ========== УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ==========
async function deleteUser(uid) {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        return { success: false, error: 'Нет прав администратора' };
    }
    try {
        await db.collection('users').doc(uid).delete();
        const logsSnapshot = await db.collection('admin_logs').where('userId', '==', uid).get();
        logsSnapshot.forEach(async doc => await doc.ref.delete());
        const actionsSnapshot = await db.collection('user_actions').where('userId', '==', uid).get();
        actionsSnapshot.forEach(async doc => await doc.ref.delete());
        Logger.info('Пользователь удалён:', uid);
        return { success: true };
    } catch(e) {
        Logger.error('Ошибка удаления пользователя:', e);
        return { success: false, error: e.message };
    }
}

// ========== ПОЛУЧЕНИЕ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ==========
async function getAllUsers() {
    if (!db) return [];
    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            users.push({
                uid: doc.id,
                email: data.email || 'Email не указан',
                createdAt: data.createdAt || 'Неизвестно',
                hasPremiumAccess: data.hasPremiumAccess === true,
                blocked: data.blocked === true,
                status: data.status || 'ok'
            });
        });
        return users;
    } catch(e) {
        Logger.error('Ошибка получения пользователей:', e);
        return [];
    }
}

// Экспорт
window.UserService = {
    updateUser,
    getUserData,
    findUserByEmail,
    activatePremium,
    deactivatePremium,
    blockUser,
    unblockUser,
    deleteUser,
    getAllUsers
};
