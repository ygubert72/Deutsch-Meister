// adminUI.js — админ-панель и кнопки

// ========== УПРАВЛЕНИЕ КНОПКОЙ АДМИНА ==========
function updateAdminButtonVisibility(show) {
    // Десктопная кнопка
    let adminBtn = document.getElementById('adminBtn');
    if (show) {
        if (!adminBtn) {
            adminBtn = document.createElement('button');
            adminBtn.id = 'adminBtn';
            adminBtn.className = 'btn';
            adminBtn.innerHTML = '📊 МОНИТОРИНГ';
            adminBtn.style.background = '#FF9800';
            adminBtn.style.color = 'white';
            adminBtn.style.marginTop = '10px';
            adminBtn.style.cursor = 'pointer';
            adminBtn.onclick = () => window.open('admin.html', '_blank');
            
            const sidebarContent = document.querySelector('.sidebar .sidebar-content');
            if (sidebarContent) {
                // ВСТАВЛЯЕМ В КОНЕЦ, НЕ ТРОГАЕМ КНОПКУ "ПОДЕЛИТЬСЯ"
                sidebarContent.appendChild(adminBtn);
            }
        } else {
            adminBtn.style.display = 'block';
        }
    } else {
        if (adminBtn) {
            adminBtn.style.display = 'none';
        }
    }
    
    // Мобильная кнопка
    let adminBtnMobile = document.getElementById('adminBtnMobile');
    if (show) {
        if (!adminBtnMobile) {
            adminBtnMobile = document.createElement('button');
            adminBtnMobile.id = 'adminBtnMobile';
            adminBtnMobile.className = 'btn';
            adminBtnMobile.innerHTML = '📊 МОНИТОРИНГ';
            adminBtnMobile.style.background = '#FF9800';
            adminBtnMobile.style.color = 'white';
            adminBtnMobile.style.marginTop = '10px';
            adminBtnMobile.style.cursor = 'pointer';
            adminBtnMobile.onclick = () => window.open('admin.html', '_blank');
            
            const mobileSidebarContent = document.querySelector('#mobileMenu .sidebar-content');
            if (mobileSidebarContent) {
                mobileSidebarContent.appendChild(adminBtnMobile);
            }
        } else {
            adminBtnMobile.style.display = 'block';
        }
    } else {
        if (adminBtnMobile) {
            adminBtnMobile.style.display = 'none';
        }
    }
}

// ========== АДМИН-ПАНЕЛЬ ==========
async function showAdminPanel() {
    if (!auth.currentUser || auth.currentUser.email !== 'ygubert72@gmail.com') {
        alert('У вас нет прав администратора');
        return;
    }
    
    const users = await window.UserService.getAllUsers();
    
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
                    <h3>📊 Статистика</h3>
                    <div style="display:flex; gap:15px; flex-wrap:wrap; margin-bottom:20px;">
                        <div style="background:#E8F0FE; padding:10px 20px; border-radius:12px;">Всего: <strong>${users.length}</strong></div>
                        <div style="background:#C8E6C9; padding:10px 20px; border-radius:12px;">Премиум: <strong>${users.filter(u => u.hasPremiumAccess).length}</strong></div>
                        <div style="background:#FFCDD2; padding:10px 20px; border-radius:12px;">Заблокировано: <strong>${users.filter(u => u.blocked).length}</strong></div>
                    </div>
                    
                    <h3>🔧 Ручное управление пользователями</h3>
                    <div style="display:flex; gap:10px; margin-bottom:20px; flex-wrap:wrap;">
                        <input type="email" id="premiumEmail" placeholder="Email пользователя" style="flex:1; padding:10px; border:2px solid #E0E0E0; border-radius:8px;">
                        <button id="activatePremiumBtn" style="padding:10px 20px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">💎 Активировать премиум</button>
                        <button id="deactivatePremiumBtn" style="padding:10px 20px; background:#FF9800; color:white; border:none; border-radius:8px; cursor:pointer;">🔒 Снять премиум</button>
                    </div>
                    
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
                                        ? `<button onclick="window.AdminUI.activatePremiumByUid('${user.uid}')" style="padding:5px 15px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">💎 Дать премиум</button>`
                                        : `<button onclick="window.AdminUI.deactivatePremiumByUid('${user.uid}')" style="padding:5px 15px; background:#FF9800; color:white; border:none; border-radius:8px; cursor:pointer;">🔒 Снять премиум</button>`
                                    }
                                    ${!user.blocked 
                                        ? `<button onclick="window.AdminUI.blockUserByUid('${user.uid}')" style="padding:5px 15px; background:#f44336; color:white; border:none; border-radius:8px; cursor:pointer;">🚫 Заблокировать</button>`
                                        : `<button onclick="window.AdminUI.unblockUserByUid('${user.uid}')" style="padding:5px 15px; background:#4CAF50; color:white; border:none; border-radius:8px; cursor:pointer;">🔓 Разблокировать</button>`
                                    }
                                    <button onclick="window.AdminUI.deleteUserByUid('${user.uid}')" style="padding:5px 15px; background:#555; color:white; border:none; border-radius:8px; cursor:pointer;">🗑️ Удалить</button>
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
    document.getElementById('activatePremiumBtn').onclick = async () => {
        const email = document.getElementById('premiumEmail').value;
        if (email) {
            const user = await window.UserService.findUserByEmail(email);
            if (user) {
                await window.UserService.activatePremium(user.uid);
                modal.remove();
                showAdminPanel();
            } else {
                alert('Пользователь не найден');
            }
        } else {
            alert('Введите email');
        }
    };
    document.getElementById('deactivatePremiumBtn').onclick = async () => {
        const email = document.getElementById('premiumEmail').value;
        if (email) {
            const user = await window.UserService.findUserByEmail(email);
            if (user) {
                await window.UserService.deactivatePremium(user.uid);
                modal.remove();
                showAdminPanel();
            } else {
                alert('Пользователь не найден');
            }
        } else {
            alert('Введите email');
        }
    };
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
}

// ========== ОБЁРТКИ ДЛЯ КНОПОК В АДМИН-ПАНЕЛИ ==========
async function activatePremiumByUid(uid) {
    const result = await window.UserService.activatePremium(uid);
    if (result.success) {
        alert('✅ Премиум активирован');
        document.getElementById('adminPanel')?.remove();
        showAdminPanel();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

async function deactivatePremiumByUid(uid) {
    if (!confirm('Снять премиум доступ?')) return;
    const result = await window.UserService.deactivatePremium(uid);
    if (result.success) {
        alert('✅ Премиум снят');
        document.getElementById('adminPanel')?.remove();
        showAdminPanel();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

async function blockUserByUid(uid) {
    if (!confirm('Заблокировать пользователя?')) return;
    const result = await window.UserService.blockUser(uid);
    if (result.success) {
        alert('✅ Пользователь заблокирован');
        document.getElementById('adminPanel')?.remove();
        showAdminPanel();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

async function unblockUserByUid(uid) {
    if (!confirm('Разблокировать пользователя?')) return;
    const result = await window.UserService.unblockUser(uid);
    if (result.success) {
        alert('✅ Пользователь разблокирован');
        document.getElementById('adminPanel')?.remove();
        showAdminPanel();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

async function deleteUserByUid(uid) {
    if (!confirm('Удалить пользователя?')) return;
    const result = await window.UserService.deleteUser(uid);
    if (result.success) {
        alert('✅ Пользователь удалён');
        document.getElementById('adminPanel')?.remove();
        showAdminPanel();
    } else {
        alert('Ошибка: ' + result.error);
    }
}

// Экспорт
window.AdminUI = {
    updateAdminButtonVisibility,
    showAdminPanel,
    activatePremiumByUid,
    deactivatePremiumByUid,
    blockUserByUid,
    unblockUserByUid,
    deleteUserByUid
};
