// containerManager.js — универсальный менеджер контейнера выученного материала

function showContainerModal(config) {
    // Удаляем старую модалку
    const oldModal = document.getElementById('containerModal');
    if (oldModal) oldModal.remove();
    
    const {
        title,           // "📦 КОНТЕЙНЕР (X слов)"
        items,           // массив объектов с полями display и callback
        onReturnAll,     // функция для кнопки "Вернуть всё"
        onItemClick,     // функция при клике на элемент
        emptyMessage,    // "📭 Контейнер пуст"
        itemTemplate     // функция для отображения элемента
    } = config;
    
    // Если items пуст — показываем сообщение
    const isEmpty = !items || items.length === 0;
    
    // Создаём модалку
    const modal = document.createElement('div');
    modal.id = 'containerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000000;
        overflow: auto;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        margin: 20px;
    `;
    
    // Функция обновления содержимого (для динамического обновления)
    function updateContent() {
        const currentItems = config.getItems ? config.getItems() : items;
        const header = modalContent.querySelector('.modal-header');
        const itemsContainer = modalContent.querySelector('.items-container');
        
        if (header) {
            const count = currentItems ? currentItems.length : 0;
            header.textContent = `${title.replace(/\d+/, count)} (${count})`;
        }
        
        if (itemsContainer) {
            if (!currentItems || currentItems.length === 0) {
                itemsContainer.innerHTML = `
                    <div style="text-align:center; padding:40px; color:#999;">
                        ${emptyMessage || '📭 Контейнер пуст'}
                    </div>
                `;
            } else {
                let html = '';
                currentItems.forEach((item, idx) => {
                    const display = itemTemplate ? itemTemplate(item) : item.display || item;
                    html += `
                        <button class="container-item-btn" data-index="${idx}" style="
                            width: 100%;
                            text-align: left;
                            padding: 12px 15px;
                            background: #E8F0FE;
                            border: none;
                            border-bottom: 1px solid #ddd;
                            cursor: pointer;
                            font-size: 14px;
                        ">${display}</button>
                    `;
                });
                itemsContainer.innerHTML = html;
                
                // Обработчики кликов
                itemsContainer.querySelectorAll('.container-item-btn').forEach(btn => {
                    btn.onclick = () => {
                        const idx = parseInt(btn.getAttribute('data-index'));
                        if (onItemClick) {
                            const item = currentItems[idx];
                            onItemClick(item, idx, updateContent);
                        }
                    };
                });
            }
        }
    }
    
    // Строим HTML
    const displayTitle = isEmpty 
        ? title.replace(/\d+/, '0') 
        : title;
    
    modalContent.innerHTML = `
        <div style="padding: 15px; border-bottom: 1px solid #ddd; text-align: center;">
            <h3 class="modal-header" style="margin: 0;">${displayTitle}</h3>
        </div>
        <div class="items-container" style="overflow-y: auto; flex: 1; padding: 10px 0;">
            ${isEmpty ? `<div style="text-align:center; padding:40px; color:#999;">${emptyMessage || '📭 Контейнер пуст'}</div>` : ''}
        </div>
        <div style="padding: 15px; border-top: 1px solid #ddd; display: flex; gap: 10px;">
            <button id="returnAllBtn" style="flex: 1; padding: 10px; background: #FF9800; color: white; border: none; border-radius: 8px; cursor: pointer;">🔄 ВЕРНУТЬ ВСЁ</button>
            <button id="cancelModalBtn" style="flex: 1; padding: 10px; background: #ddd; border: none; border-radius: 8px; cursor: pointer;">ЗАКРЫТЬ</button>
        </div>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // Если есть динамическое обновление — заполняем
    if (!isEmpty) {
        updateContent();
    }
    
    // Обработчики
    document.getElementById('cancelModalBtn').onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    document.getElementById('returnAllBtn').onclick = () => {
        if (confirm('Вы уверены? Все элементы будут возвращены.')) {
            if (onReturnAll) {
                onReturnAll(updateContent);
            }
        }
    };
    
    // Возвращаем объект для управления
    return {
        modal,
        update: updateContent,
        close: () => modal.remove()
    };
}

// Экспорт
window.ContainerManager = {
    show: showContainerModal
};
