document.addEventListener('DOMContentLoaded', () => {
    // =================================================================================
    // КОНФИГУРАЦИЯ
    // =================================================================================
    const GITHUB_CONFIG = {
        owner: '2mmisha',
        repo: 'etude',
        token: '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', 
        receiptsPath: 'receipts.json',
        clientsPath: 'clients.json'
    };
    
    const APP_CONFIG = {
        password: '1234',
        vatRate: 0.18 // 18% НДС
    };

    // =================================================================================
    // ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ И СОСТОЯНИЕ
    // =================================================================================
    let state = {
        receipts: [],
        clients: [],
        receiptsSha: null,
        clientsSha: null,
        currentPage: 'main',
        editingClientId: null
    };

    // =================================================================================
    // МОДУЛЬ GITHUB API
    // =================================================================================
    const githubApi = {
        headers: {
            'Authorization': `token ${GITHUB_CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json',
        },
        async getFile(path) {
            const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
            try {
                const response = await fetch(url, { headers: this.headers });
                if (response.status === 404) {
                    console.log(`${path} не найден. Будет создан новый.`);
                    return { content: [], sha: null };
                }
                if (!response.ok) throw new Error(`Ошибка GitHub API: ${response.statusText}`);
                const data = await response.json();
                const content = JSON.parse(atob(data.content));
                return { content, sha: data.sha };
            } catch (error) {
                console.error(`Ошибка при получении файла ${path}:`, error);
                alert(`Не удалось загрузить данные из ${path}. Проверьте токен и настройки репозитория.`);
                return { content: [], sha: null };
            }
        },

        async updateFile(path, content, sha) {
            const url = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${path}`;
            const newContentBase64 = btoa(JSON.stringify(content, null, 2));
            const body = {
                message: `Update ${path} from web app`,
                content: newContentBase64,
                sha: sha,
            };
            // Если sha null, это значит, что файл создается впервые
            if (!sha) {
                delete body.sha;
            }
            try {
                const response = await fetch(url, {
                    method: 'PUT',
                    headers: this.headers,
                    body: JSON.stringify(body),
                });
                if (!response.ok) throw new Error(`Ошибка GitHub API: ${response.statusText}`);
                const data = await response.json();
                return data.content.sha; // Возвращаем новый sha
            } catch (error) {
                console.error(`Ошибка при обновлении файла ${path}:`, error);
                alert(`Не удалось сохранить данные в ${path}.`);
                return sha; // Возвращаем старый sha в случае ошибки
            }
        }
    };
    
    // =================================================================================
    // ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ
    // =================================================================================
    function init() {
        // Проверка сессии
        if (sessionStorage.getItem('isLoggedIn') !== 'true') {
            showPage('login');
        } else {
            initializeApp();
        }

        // Обработчики событий
        document.getElementById('login-button').addEventListener('click', handleLogin);
        document.getElementById('logout-button').addEventListener('click', handleLogout);
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = e.target.getAttribute('href').substring(1);
                navigateTo(page);
            });
        });
        
        // ... (другие глобальные обработчики)
    }

    async function initializeApp() {
        showPage('app-loading'); // Можно добавить состояние загрузки
        document.getElementById('app').style.display = 'block';

        // Загрузка данных
        const [receiptsData, clientsData] = await Promise.all([
            githubApi.getFile(GITHUB_CONFIG.receiptsPath),
            githubApi.getFile(GITHUB_CONFIG.clientsPath)
        ]);

        state.receipts = receiptsData.content;
        state.receiptsSha = receiptsData.sha;
        state.clients = clientsData.content;
        state.clientsSha = clientsData.sha;
        
        // Сортируем чеки по дате (новые вверху)
        state.receipts.sort((a, b) => new Date(b.date) - new Date(a.date));

        navigateTo('main');
    }
    
    // =================================================================================
    // АУТЕНТИФИКАЦИЯ
    // =================================================================================
    function handleLogin() {
        const password = document.getElementById('password').value;
        const errorEl = document.getElementById('login-error');
        if (password === APP_CONFIG.password) {
            sessionStorage.setItem('isLoggedIn', 'true');
            errorEl.textContent = '';
            document.getElementById('login-page').classList.remove('active');
            initializeApp();
        } else {
            errorEl.textContent = 'Неверный пароль';
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('isLoggedIn');
        window.location.reload();
    }
    
    // =================================================================================
    // НАВИГАЦИЯ
    // =================================================================================
    function showPage(pageId) {
         if (pageId === 'app-loading') {
            // Управление состоянием загрузки, если нужно
             return;
         }
         if (pageId === 'login') {
             document.getElementById('login-page').style.display = 'block';
             document.getElementById('app').style.display = 'none';
         } else {
             document.getElementById('login-page').style.display = 'none';
             document.getElementById('app').style.display = 'block';
             document.querySelectorAll('#app .page').forEach(p => p.style.display = 'none');
             const targetPage = document.getElementById(`${pageId}-page`);
             if (targetPage) {
                 targetPage.style.display = 'block';
             }
         }
    }
    
    function navigateTo(pageId, params = null) {
        state.currentPage = pageId;
        showPage(pageId);
        
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${pageId}`);
        });

        switch(pageId) {
            case 'main':
                renderMainPage();
                break;
            case 'all-checks':
                renderAllChecksPage();
                break;
            case 'check':
                renderCheckForm(); //params could be a checkId to edit
                break;
            case 'view-check':
                if (params && params.receiptNumber) {
                    renderCheckView(params.receiptNumber);
                }
                break;
            case 'clients':
                renderClientsPage();
                break;
        }
    }
    
    // =================================================================================
    // РЕНДЕРИНГ СТРАНИЦ
    // =================================================================================
    
    // -- ГЛАВНАЯ СТРАНИЦА --
    function renderMainPage() {
        // Статистика
        document.getElementById('total-receipts-stat').textContent = state.receipts.length;
        document.getElementById('total-clients-stat').textContent = state.clients.length;
        
        const monthlyRevenue = state.receipts
            .filter(r => new Date(r.date).getMonth() === new Date().getMonth() && new Date(r.date).getFullYear() === new Date().getFullYear())
            .reduce((sum, r) => sum + r.total, 0);
        document.getElementById('monthly-revenue-stat').textContent = `${monthlyRevenue.toFixed(2)} ₪`;

        // Последние 10 чеков
        const recentChecks = state.receipts.slice(0, 10);
        const tbody = document.getElementById('recent-checks-table').querySelector('tbody');
        tbody.innerHTML = recentChecks.map(r => `
            <tr>
                <td>${r.receiptNumber}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${r.customerName}</td>
                <td>${r.total.toFixed(2)} ₪</td>
                <td>
                    <button class="action-btn view-btn" onclick="app.viewCheck('${r.receiptNumber}')">🔍</button>
                    <button class="action-btn delete-btn" onclick="app.deleteCheck('${r.receiptNumber}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }

    // -- СТРАНИЦА "ВСЕ ЧЕКИ" --
    function renderAllChecksPage(filteredReceipts = null) {
        const receiptsToRender = filteredReceipts || state.receipts;
        const tbody = document.getElementById('all-checks-table').querySelector('tbody');
        tbody.innerHTML = receiptsToRender.map(r => `
            <tr>
                <td>${r.receiptNumber}</td>
                <td>${new Date(r.date).toLocaleDateString()}</td>
                <td>${r.customerName}</td>
                <td>${r.total.toFixed(2)} ₪</td>
                <td>
                    <button class="action-btn view-btn" onclick="app.viewCheck('${r.receiptNumber}')">Просмотр</button>
                    <button class="action-btn delete-btn" onclick="app.deleteCheck('${r.receiptNumber}')">Удалить</button>
                </td>
            </tr>
        `).join('');
    }

    // -- СТРАНИЦА ПРОСМОТРА ЧЕКА --
    function renderCheckView(receiptNumber) {
         const receipt = state.receipts.find(r => r.receiptNumber === receiptNumber);
        if (!receipt) {
            alert('Чек не найден!');
            navigateTo('all-checks');
            return;
        }

        const business = receipt.businessInfo;
        const itemsHtml = receipt.items.map(item => `
            <tr>
                <td dir="rtl">${item.details}</td>
                <td>${item.quantity}</td>
                <td>${item.amount.toFixed(2)}</td>
                <td>${(item.quantity * item.amount).toFixed(2)}</td>
            </tr>
        `).join('');

        const previewHtml = `
            <div class="receipt-header">
                <div class="business-info" dir="rtl">
                    <h2>${business.name}</h2>
                    <p><strong>${business.owner}</strong></p>
                    <p>ע.מ. ${business.taxId}</p>
                    <p>${business.address}</p>
                    <p>טל׳: ${business.phone}</p>
                </div>
                <div class="receipt-details">
                    <h1>חשבונית מס</h1>
                    <h2>#${receipt.receiptNumber}</h2>
                    <p><strong>תאריך:</strong> ${new Date(receipt.date).toLocaleDateString('he-IL')}</p>
                </div>
            </div>
            
            <div class="customer-info" dir="rtl">
                <h3>לכבוד:</h3>
                <p><strong>${receipt.customerName}</strong></p>
                <p>ח.פ./ע.מ: ${receipt.customerId || ''}</p>
                <p>כתובת: ${receipt.customerAddress || ''}</p>
            </div>
            
            <table class="receipt-table">
                <thead>
                    <tr>
                        <th dir="rtl">פירוט</th>
                        <th>כמות</th>
                        <th>מחיר יח׳</th>
                        <th>סה״כ</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <div class="receipt-totals">
                <div><span>Subtotal:</span><span>₪ ${receipt.subtotal.toFixed(2)}</span></div>
                <div><span>VAT (${(APP_CONFIG.vatRate * 100).toFixed(0)}%):</span><span>₪ ${receipt.vat.toFixed(2)}</span></div>
                <div><strong>Total:</strong><strong>₪ ${receipt.total.toFixed(2)}</strong></div>
            </div>

            <div class="receipt-signature" dir="rtl">
                <p>בברכה,</p>
                <img src="signature.png" alt="Signature">
                <p>${business.owner}</p>
            </div>
        `;
        document.getElementById('check-preview-container').innerHTML = previewHtml;
    }


    // -- СТРАНИЦА КЛИЕНТОВ --
    function renderClientsPage(filteredClients = null) {
        const clientsToRender = filteredClients || state.clients;
        const tbody = document.getElementById('clients-table').querySelector('tbody');
        tbody.innerHTML = clientsToRender.map(c => `
             <tr>
                <td dir="auto">${c.name}</td>
                <td>${c.phone || ''}</td>
                <td dir="auto">${c.address || ''}</td>
                <td>
                    <button class="action-btn edit-btn" onclick="app.editClient('${c.id}')">✏️</button>
                    <button class="action-btn delete-btn" onclick="app.deleteClient('${c.id}')">🗑️</button>
                </td>
            </tr>
        `).join('');
    }
    
    // =================================================================================
    // ЛОГИКА УПРАВЛЕНИЯ ДАННЫМИ
    // =================================================================================
    
    // -- Управление чеками --
    async function saveCheck(checkData) {
        // Здесь должна быть логика добавления или обновления чека в state.receipts
        // Например, state.receipts.push(checkData);
        state.receipts.unshift(checkData); // Добавляем в начало
        state.receipts.sort((a, b) => new Date(b.date) - new Date(a.date));

        const newSha = await githubApi.updateFile(GITHUB_CONFIG.receiptsPath, state.receipts, state.receiptsSha);
        if (newSha !== state.receiptsSha) {
            state.receiptsSha = newSha;
            alert('Чек успешно сохранен!');
            navigateTo('view-check', { receiptNumber: checkData.receiptNumber });
        }
    }
    
    async function deleteCheck(receiptNumber) {
        if (confirm(`Вы уверены, что хотите удалить чек #${receiptNumber}?`)) {
            state.receipts = state.receipts.filter(r => r.receiptNumber !== receiptNumber);
            const newSha = await githubApi.updateFile(GITHUB_CONFIG.receiptsPath, state.receipts, state.receiptsSha);
            if (newSha !== state.receiptsSha) {
                state.receiptsSha = newSha;
                alert('Чек удален.');
                navigateTo(state.currentPage); // Обновить текущую страницу
            }
        }
    }

    // -- Управление клиентами --
    async function saveClient(clientData) {
        if (state.editingClientId) {
            // Редактирование
            const index = state.clients.findIndex(c => c.id === state.editingClientId);
            if (index !== -1) {
                state.clients[index] = { ...state.clients[index], ...clientData, updatedAt: new Date().toISOString() };
            }
        } else {
            // Добавление нового
            const newClient = {
                ...clientData,
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            state.clients.push(newClient);
        }
        
        state.editingClientId = null;
        
        const newSha = await githubApi.updateFile(GITHUB_CONFIG.clientsPath, state.clients, state.clientsSha);
        if (newSha !== state.clientsSha) {
            state.clientsSha = newSha;
            alert('Клиент сохранен.');
            renderClientsPage();
            document.getElementById('client-form').reset();
        }
    }
    
    function editClient(clientId) {
        const client = state.clients.find(c => c.id === clientId);
        if (client) {
            state.editingClientId = clientId;
            document.getElementById('client-id').value = client.id;
            document.getElementById('client-name').value = client.name;
            document.getElementById('client-taxId').value = client.taxId || '';
            document.getElementById('client-phone').value = client.phone || '';
            document.getElementById('client-address').value = client.address || '';
            document.getElementById('client-notes').value = client.notes || '';
            document.getElementById('cancel-edit-client-btn').style.display = 'inline-block';
            window.scrollTo(0, 0);
        }
    }
    
    async function deleteClient(clientId) {
        if (confirm('Вы уверены, что хотите удалить этого клиента?')) {
            state.clients = state.clients.filter(c => c.id !== clientId);
            const newSha = await githubApi.updateFile(GITHUB_CONFIG.clientsPath, state.clients, state.clientsSha);
            if (newSha !== state.clientsSha) {
                state.clientsSha = newSha;
                alert('Клиент удален.');
                renderClientsPage();
            }
        }
    }

    // =================================================================================
    // ПУБЛИЧНЫЙ ИНТЕРФЕЙС (для вызовов из HTML)
    // =================================================================================
    window.app = {
        viewCheck: (receiptNumber) => navigateTo('view-check', { receiptNumber }),
        deleteCheck,
        editClient,
        deleteClient
    };

    init();
});
// Этот код должен быть расширен для полной реализации всех функций,
// таких как фильтрация, пагинация, создание чека, и т.д.
// Это основа, на которой строится вся логика.