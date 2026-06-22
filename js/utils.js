// utils.js — общие утилиты для всего приложения

// ========== ОПРЕДЕЛЕНИЕ УСТРОЙСТВА ==========
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// ========== ID УСТРОЙСТВА (единая версия) ==========
function getDeviceId() {
    var id = navigator.userAgent + navigator.platform + window.screen.width + window.screen.height;
    var hash = 0;
    for (var i = 0; i < id.length; i++) {
        hash = ((hash << 5) - hash) + id.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
}

// ========== ДЕБАУНС ДЛЯ RESIZE ==========
function debounce(func, wait) {
    var timeout;
    return function() {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function() {
            func.apply(context, args);
        }, wait);
    };
}

// ========== БЕЗОПАСНОЕ ОТОБРАЖЕНИЕ ТЕКСТА ==========
function safeText(text) {
    if (!text) return '';
    return text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// ========== ОЧИСТКА ТАЙМЕРОВ ==========
function clearTimer(timer) {
    if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
        return null;
    }
    return null;
}

// ========== ПРОВЕРКА, ЯВЛЯЕТСЯ ЛИ ПОЛЬЗОВАТЕЛЬ АДМИНОМ ==========
function isAdminUser(user) {
    if (!user) return false;
    return user.email === 'ygubert72@gmail.com';
}

// ========== ЭКСПОРТ ==========
window.utils = {
    isMobileDevice: isMobileDevice,
    getDeviceId: getDeviceId,
    debounce: debounce,
    safeText: safeText,
    clearTimer: clearTimer,
    isAdminUser: isAdminUser
};
