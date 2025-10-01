// Основные переменные и функции
const GITHUB_TOKEN = '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';
const REPO_OWNER = '2mmisha';
const REPO_NAME = 'etude';
const DATA_PATH = 'deepseek/data/';

let receipts = [];
let clients = [];
let currentReceipt = null;
let currentPage = 1;
const itemsPerPage = 10;

// Главная функция инициализации
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, current page:', window.location.pathname);
    
    const currentPage = getCurrentPage();
    console.log('Current page identified as:', currentPage);
    
    if (currentPage === 'login') {
        initLoginPage();
        return;
    }
    
    if (localStorage.getItem('authenticated') !== 'true') {
        console.log('Not authenticated, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    initializeData().then(() => {
        initProtectedPage(currentPage);
    }).catch(error => {
        console.error('Error during initialization:', error);
        initProtectedPage(currentPage);
    });
});

function getCurrentPage() {
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path === '/' || path === '' || path.endsWith('/')) {
        return 'login';
    } else if (path.includes('main.html')) {
        return 'main';
    } else if (path.includes('check.html')) {
        return 'check';
    } else if (path.includes('all-checks.html')) {
        return 'all-checks';
    } else if (path.includes('clients.html')) {
        return 'clients';
    } else if (path.includes('view-check.html')) {
        return 'view-check';
    }
    
    return 'login';
}

function initLoginPage() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.error('Login form not found!');
        return;
    }
    
    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        
        if (password === '1234') {
            localStorage.setItem('authenticated', 'true');
            window.location.href = 'main.html';
        } else {
            alert('סיסמה לא נכונה!');
        }
    });
}

function initProtectedPage(pageType) {
    console.log('Initializing protected page:', pageType);
    
    switch (pageType) {
        case 'main':
            initMainPage();
            break;
        case 'check':
            initCheckPage();
            break;
        case 'all-checks':
            initAllChecksPage();
            break;
        case 'clients':
            initClientsPage();
            break;
        case 'view-check':
            initViewCheckPage();
            break;
    }
}

async function initializeData() {
    console.log('=== INITIALIZING DATA FROM GITHUB ===');
    
    const githubDataLoaded = await loadDataFromGitHub();
    
    if (!githubDataLoaded) {
        console.log('GitHub load failed, trying localStorage...');
        loadDataFromLocalStorage();
    }
    
    console.log('Data initialization complete - receipts:', receipts.length, 'clients:', clients.length);
}

async function loadDataFromGitHub() {
    try {
        console.log('🔄 Loading data from GitHub...');
        
        const receiptsData = await fetchJSONFromGitHub('receipts.json');
        if (receiptsData !== null) {
            receipts = receiptsData;
            console.log('✅ Receipts loaded from GitHub:', receipts.length);
        } else {
            console.log('❌ Receipts not found on GitHub');
            return false;
        }
        
        const clientsData = await fetchJSONFromGitHub('clients.json');
        if (clientsData !== null) {
            clients = clientsData;
            console.log('✅ Clients loaded from GitHub:', clients.length);
        } else {
            console.log('❌ Clients not found on GitHub');
            return false;
        }
        
        localStorage.setItem('receipts', JSON.stringify(receipts));
        localStorage.setItem('clients', JSON.stringify(clients));
        console.log('✅ Data cached to localStorage');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error loading from GitHub:', error);
        return false;
    }
}

async function fetchJSONFromGitHub(fileName) {
    const filePath = DATA_PATH + fileName;
    const urlsToTry = [
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${filePath}`,
        `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/${filePath}`,
        `https://${REPO_OWNER}.github.io/${REPO_NAME}/${filePath}`,
        `https://github.com/${REPO_OWNER}/${REPO_NAME}/raw/main/${filePath}`
    ];
    
    for (const url of urlsToTry) {
        try {
            console.log(`Trying URL: ${url}`);
            const response = await fetch(url);
            
            if (response.ok) {
                const text = await response.text();
                console.log(`✅ Response received from ${url}`);
                
                if (text.trim()) {
                    const data = JSON.parse(text);
                    console.log(`✅ Successfully parsed JSON from ${url}`);
                    return data;
                } else {
                    console.log(`⚠️ Empty response from ${url}`);
                }
            } else {
                console.log(`❌ ${url} returned status: ${response.status}`);
            }
        } catch (error) {
            console.log(`❌ Error fetching from ${url}:`, error.message);
        }
    }
    
    if (GITHUB_TOKEN && GITHUB_TOKEN !== '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') {
        try {
            console.log('Trying GitHub API with token...');
            const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = atob(data.content.replace(/\n/g, ''));
                const parsedData = JSON.parse(content);
                console.log('✅ Successfully loaded via GitHub API');
                return parsedData;
            } else {
                console.log(`❌ GitHub API returned status: ${response.status}`);
            }
        } catch (error) {
            console.log('❌ GitHub API also failed:', error.message);
        }
    }
    
    console.log(`❌ All methods failed for ${filePath}`);
    return null;
}

function loadDataFromLocalStorage() {
    console.log('Loading data from localStorage...');
    
    const localReceipts = localStorage.getItem('receipts');
    const localClients = localStorage.getItem('clients');
    
    if (localReceipts) {
        receipts = JSON.parse(localReceipts);
        console.log('📁 Receipts loaded from localStorage:', receipts.length);
    } else {
        receipts = [];
        console.log('📁 No receipts in localStorage');
    }
    
    if (localClients) {
        clients = JSON.parse(localClients);
        console.log('📁 Clients loaded from localStorage:', clients.length);
    } else {
        clients = [];
        console.log('📁 No clients in localStorage');
    }
}

async function saveData() {
    console.log('💾 Saving data...');
    
    try {
        localStorage.setItem('receipts', JSON.stringify(receipts));
        localStorage.setItem('clients', JSON.stringify(clients));
        console.log('✅ Data saved to localStorage');
        
        try {
            const githubSaved = await saveDataToGitHub();
            if (githubSaved) {
                console.log('✅ Data saved to GitHub');
            } else {
                console.log('⚠️ Data saved only to localStorage (GitHub failed)');
            }
        } catch (githubError) {
            console.error('❌ GitHub save error:', githubError);
            console.log('⚠️ Data saved only to localStorage');
        }
        
    } catch (error) {
        console.error('❌ Error saving data:', error);
    }
}

async function saveDataToGitHub() {
    if (!GITHUB_TOKEN || GITHUB_TOKEN === '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') {
        console.log('⚠️ GitHub token not configured, skipping GitHub save');
        return false;
    }
    
    try {
        console.log('🔄 Saving to GitHub...');
        
        const receiptsSaved = await saveToGitHub('receipts.json', receipts);
        const clientsSaved = await saveToGitHub('clients.json', clients);
        
        return receiptsSaved && clientsSaved;
        
    } catch (error) {
        console.error('❌ Error saving to GitHub:', error);
        return false;
    }
}

async function saveToGitHub(fileName, data) {
    const filePath = DATA_PATH + fileName;
    
    try {
        let sha = null;
        
        try {
            const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`;
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (response.ok) {
                const fileData = await response.json();
                sha = fileData.sha;
                console.log(`📝 Found existing file with SHA: ${sha.substring(0, 8)}...`);
            }
        } catch (error) {
            console.log('📝 No existing file found, creating new one');
        }
        
        const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
        const message = `Update ${fileName} from web interface`;
        
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                content: content,
                sha: sha
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`GitHub API error ${response.status}: ${errorText}`);
        }
        
        console.log(`✅ Successfully saved ${filePath} to GitHub`);
        return true;
        
    } catch (error) {
        console.error(`❌ Error saving ${filePath} to GitHub:`, error);
        return false;
    }
}

function initMainPage() {
    updateStatistics();
    loadRecentReceipts();
}

function updateStatistics() {
    document.getElementById('total-receipts').textContent = receipts.length;
    document.getElementById('total-clients').textContent = clients.length;
    
    const totalAmount = receipts.reduce((sum, receipt) => sum + receipt.total, 0);
    document.getElementById('total-amount').textContent = totalAmount.toFixed(2) + ' ₪';
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthReceipts = receipts.filter(receipt => {
        const receiptDate = new Date(receipt.date);
        return receiptDate.getMonth() === currentMonth && receiptDate.getFullYear() === currentYear;
    });
    document.getElementById('month-receipts').textContent = monthReceipts.length;
}

function loadRecentReceipts() {
    const recentReceipts = receipts.slice(-10).reverse();
    const tbody = document.querySelector('#recent-receipts tbody');
    tbody.innerHTML = '';
    
    if (recentReceipts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center;">אין חשבוניות עדיין</td>
            </tr>
        `;
        return;
    }
    
    recentReceipts.forEach(receipt => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${receipt.receiptNumber}</td>
            <td>${receipt.customerName}</td>
            <td>${formatDate(receipt.date)}</td>
            <td>${receipt.total.toFixed(2)} ₪</td>
            <td>
                <a href="view-check.html?receipt=${receipt.receiptNumber}" class="btn">צפייה</a>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function initCheckPage() {
    setupReceiptForm();
}

function setupReceiptForm() {
    const nextReceiptNumber = receipts.length > 0 ? 
        Math.max(...receipts.map(r => parseInt(r.receiptNumber))) + 1 : 1;
    document.getElementById('receipt-number').value = nextReceiptNumber;
    
    loadCustomers();
    
    document.getElementById('customer-info').classList.remove('d-none');
    
    addItemRow();
    
    document.getElementById('add-item-btn').addEventListener('click', addItemRow);
    document.getElementById('preview-btn').addEventListener('click', previewReceipt);
    document.getElementById('receipt-form').addEventListener('submit', saveReceipt);
    document.getElementById('customer-select').addEventListener('change', handleCustomerSelect);
    document.getElementById('add-customer-btn').addEventListener('click', showClientModalFromCheck);
    
    setupManualCustomerInput();
}

function loadCustomers() {
    const customerSelect = document.getElementById('customer-select');
    customerSelect.innerHTML = '<option value="">בחר לקוח מהרשימה</option>';
    
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        customerSelect.appendChild(option);
    });
    
    const manualOption = document.createElement('option');
    manualOption.value = 'manual';
    manualOption.textContent = 'הזן פרטי לקוח ידנית';
    customerSelect.appendChild(manualOption);
}

function setupManualCustomerInput() {
    const customerNameInput = document.getElementById('customer-name');
    const customerIdInput = document.getElementById('customer-id');
    const customerAddressInput = document.getElementById('customer-address');
    const customerPhoneInput = document.getElementById('customer-phone');
    
    customerNameInput.addEventListener('focus', function() {
        document.getElementById('customer-select').value = 'manual';
    });
    
    customerIdInput.addEventListener('focus', function() {
        document.getElementById('customer-select').value = 'manual';
    });
    
    customerAddressInput.addEventListener('focus', function() {
        document.getElementById('customer-select').value = 'manual';
    });
    
    customerPhoneInput.addEventListener('focus', function() {
        document.getElementById('customer-select').value = 'manual';
    });
}

function handleCustomerSelect() {
    const clientId = this.value;
    const customerInfo = document.getElementById('customer-info');
    
    if (clientId === 'manual') {
        document.getElementById('customer-name').value = '';
        document.getElementById('customer-id').value = '';
        document.getElementById('customer-address').value = '';
        document.getElementById('customer-phone').value = '';
        customerInfo.classList.remove('d-none');
    } else if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            document.getElementById('customer-name').value = client.name;
            document.getElementById('customer-id').value = client.taxId || '';
            document.getElementById('customer-address').value = client.address || '';
            document.getElementById('customer-phone').value = client.phone || '';
            customerInfo.classList.remove('d-none');
        }
    } else {
        customerInfo.classList.add('d-none');
    }
}

function showClientModalFromCheck() {
    const currentName = document.getElementById('customer-name').value;
    const currentTaxId = document.getElementById('customer-id').value;
    const currentPhone = document.getElementById('customer-phone').value;
    const currentAddress = document.getElementById('customer-address').value;
    
    document.getElementById('client-modal-title').textContent = 'הוסף לקוח חדש';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    
    if (currentName) document.getElementById('client-name').value = currentName;
    if (currentTaxId) document.getElementById('client-tax-id').value = currentTaxId;
    if (currentPhone) document.getElementById('client-phone').value = currentPhone;
    if (currentAddress) document.getElementById('client-address').value = currentAddress;
    
    document.getElementById('client-modal').classList.remove('d-none');
}

function addItemRow() {
    const container = document.getElementById('items-container');
    const row = document.createElement('div');
    row.className = 'item-row';
    row.innerHTML = `
        <div>
            <input type="text" class="item-details" placeholder="תיאור הפריט/שירות" required>
        </div>
        <div>
            <input type="number" class="item-quantity" value="1" min="1" step="1" required>
        </div>
        <div>
            <input type="number" class="item-amount" placeholder="מחיר" step="0.01" min="0" required>
        </div>
        <div class="item-total">0.00 ₪</div>
        <div>
            <button type="button" class="btn danger remove-item">&times;</button>
        </div>
    `;
    container.appendChild(row);
    
    const quantityInput = row.querySelector('.item-quantity');
    const amountInput = row.querySelector('.item-amount');
    
    quantityInput.addEventListener('input', updateItemTotal);
    amountInput.addEventListener('input', updateItemTotal);
    
    row.querySelector('.remove-item').addEventListener('click', function() {
        row.remove();
        updateTotals();
    });
}

function updateItemTotal() {
    const row = this.closest('.item-row');
    const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
    const amount = parseFloat(row.querySelector('.item-amount').value) || 0;
    const total = quantity * amount;
    
    row.querySelector('.item-total').textContent = total.toFixed(2) + ' ₪';
    updateTotals();
}

function updateTotals() {
    let subtotal = 0;
    
    document.querySelectorAll('.item-row').forEach(row => {
        const totalText = row.querySelector('.item-total').textContent;
        const total = parseFloat(totalText.replace(' ₪', '')) || 0;
        subtotal += total;
    });
    
    const vat = subtotal * 0.18;
    const total = subtotal + vat;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + ' ₪';
    document.getElementById('vat').textContent = vat.toFixed(2) + ' ₪';
    document.getElementById('total').innerHTML = '<strong>' + total.toFixed(2) + ' ₪</strong>';
}

function previewReceipt() {
    if (!validateReceiptForm()) return;
    
    const receiptData = collectReceiptData();
    localStorage.setItem('currentReceipt', JSON.stringify(receiptData));
    window.open('view-check.html?preview=true', '_blank');
}

function validateReceiptForm() {
    const receiptNumber = document.getElementById('receipt-number').value;
    const customerName = document.getElementById('customer-name').value;
    
    if (!receiptNumber) {
        alert('נא להזין מספר חשבונית');
        return false;
    }
    
    if (!customerName) {
        alert('נא להזין שם לקוח');
        return false;
    }
    
    let hasValidItems = false;
    document.querySelectorAll('.item-row').forEach(row => {
        const details = row.querySelector('.item-details').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const amount = parseFloat(row.querySelector('.item-amount').value) || 0;
        
        if (details && quantity > 0 && amount > 0) {
            hasValidItems = true;
        }
    });
    
    if (!hasValidItems) {
        alert('נא להוסיף לפחות פריט או שירות אחד');
        return false;
    }
    
    return true;
}

function collectReceiptData() {
    const items = [];
    document.querySelectorAll('.item-row').forEach(row => {
        const details = row.querySelector('.item-details').value;
        const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
        const amount = parseFloat(row.querySelector('.item-amount').value) || 0;
        
        if (details && quantity > 0 && amount > 0) {
            items.push({
                details: details,
                quantity: quantity,
                amount: amount
            });
        }
    });
    
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.amount), 0);
    const vat = subtotal * 0.18;
    const total = subtotal + vat;
    
    return {
        receiptNumber: document.getElementById('receipt-number').value,
        customerName: document.getElementById('customer-name').value,
        customerId: document.getElementById('customer-id').value,
        customerAddress: document.getElementById('customer-address').value,
        customerPhone: document.getElementById('customer-phone').value,
        items: items,
        subtotal: subtotal,
        vat: vat,
        total: total,
        paymentType: document.getElementById('payment-type').value,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString(),
        businessInfo: {
            name: "Etude",
            owner: "יבגניה גרומובה",
            address: "הבה״דים 4, ראשל״צ",
            phone: "0534726469",
            taxId: "346776909"
        }
    };
}

async function saveReceipt(e) {
    e.preventDefault();
    console.log('Save receipt started...');
    
    if (!validateReceiptForm()) return;
    
    const receiptData = collectReceiptData();
    console.log('Collected receipt data:', receiptData);
    
    const existingIndex = receipts.findIndex(r => r.receiptNumber === receiptData.receiptNumber);
    if (existingIndex !== -1) {
        if (!confirm('חשבונית עם מספר זה כבר קיימת. האם להחליף?')) {
            return;
        }
        receipts[existingIndex] = receiptData;
    } else {
        receipts.push(receiptData);
    }
    
    await saveClientFromReceipt(receiptData);
    
    await saveData();
    
    alert('חשבונית נשמרה בהצלחה!');
    localStorage.setItem('currentReceipt', JSON.stringify(receiptData));
    window.open('view-check.html?print=true', '_blank');
}

async function saveClientFromReceipt(receiptData) {
    if (!receiptData.customerName) return;
    
    const existingClient = clients.find(c => 
        c.taxId === receiptData.customerId || 
        c.name === receiptData.customerName
    );
    
    if (!existingClient) {
        const newClient = {
            id: Date.now().toString(),
            name: receiptData.customerName,
            taxId: receiptData.customerId || '',
            phone: receiptData.customerPhone || '',
            address: receiptData.customerAddress || '',
            notes: 'נוצר אוטומטית מחשבונית',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        clients.push(newClient);
        console.log('New client automatically created:', newClient.name);
    }
}

function initAllChecksPage() {
    loadAllChecks();
    setupFilters();
    
    document.getElementById('force-save')?.addEventListener('click', async function() {
        try {
            await saveData();
            alert('הנתונים נשמרו בהצלחה!');
        } catch (error) {
            alert('שגיאה בשמירת הנתונים: ' + error.message);
        }
    });
}

function loadAllChecks() {
    loadCustomerFilter();
    filterReceipts();
}

function loadCustomerFilter() {
    const customerFilter = document.getElementById('filter-customer');
    customerFilter.innerHTML = '<option value="">כל הלקוחות</option>';
    clients.forEach(client => {
        const option = document.createElement('option');
        option.value = client.id;
        option.textContent = client.name;
        customerFilter.appendChild(option);
    });
}

function setupFilters() {
    document.getElementById('search-receipts').addEventListener('input', filterReceipts);
    document.getElementById('date-from').addEventListener('change', filterReceipts);
    document.getElementById('date-to').addEventListener('change', filterReceipts);
    document.getElementById('filter-customer').addEventListener('change', filterReceipts);
    document.getElementById('filter-payment').addEventListener('change', filterReceipts);
    document.getElementById('export-csv').addEventListener('click', exportToCSV);
}

function filterReceipts() {
    const searchTerm = document.getElementById('search-receipts').value.toLowerCase();
    const dateFrom = document.getElementById('date-from').value;
    const dateTo = document.getElementById('date-to').value;
    const customerFilter = document.getElementById('filter-customer').value;
    const paymentFilter = document.getElementById('filter-payment').value;
    
    let filteredReceipts = receipts.filter(receipt => {
        const matchesSearch = !searchTerm || 
            receipt.receiptNumber.toLowerCase().includes(searchTerm) ||
            receipt.customerName.toLowerCase().includes(searchTerm);
        
        const matchesDateFrom = !dateFrom || receipt.date >= dateFrom;
        const matchesDateTo = !dateTo || receipt.date <= dateTo;
        
        let matchesCustomer = true;
        if (customerFilter) {
            const client = clients.find(c => c.id === customerFilter);
            matchesCustomer = client && receipt.customerName === client.name;
        }
        
        const matchesPayment = !paymentFilter || receipt.paymentType === paymentFilter;
        
        return matchesSearch && matchesDateFrom && matchesDateTo && matchesCustomer && matchesPayment;
    });
    
    filteredReceipts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    displayFilteredReceipts(filteredReceipts);
}

function displayFilteredReceipts(filteredReceipts) {
    const tbody = document.querySelector('#all-receipts-table tbody');
    tbody.innerHTML = '';
    
    if (filteredReceipts.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">לא נמצאו חשבוניות</td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredReceipts.length);
    const pageReceipts = filteredReceipts.slice(startIndex, endIndex);
    
    pageReceipts.forEach(receipt => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${receipt.receiptNumber}</td>
            <td>${receipt.customerName}</td>
            <td>${formatDate(receipt.date)}</td>
            <td>${receipt.total.toFixed(2)} ₪</td>
            <td>${getPaymentTypeText(receipt.paymentType)}</td>
            <td>
                <a href="view-check.html?receipt=${receipt.receiptNumber}" class="btn">צפייה</a>
                <button class="btn danger delete-receipt" data-id="${receipt.receiptNumber}">מחיקה</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.delete-receipt').forEach(button => {
        button.addEventListener('click', function() {
            const receiptNumber = this.getAttribute('data-id');
            deleteReceipt(receiptNumber);
        });
    });
    
    setupPagination(filteredReceipts.length);
}

async function deleteReceipt(receiptNumber) {
    if (confirm('האם אתה בטוח שברצונך למחוק חשבונית זו?')) {
        receipts = receipts.filter(r => r.receiptNumber !== receiptNumber);
        await saveData();
        filterReceipts();
    }
}

function setupPagination(totalItems) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = i;
        if (i === currentPage) {
            a.classList.add('active');
        }
        
        a.addEventListener('click', function(e) {
            e.preventDefault();
            currentPage = i;
            filterReceipts();
        });
        
        li.appendChild(a);
        pagination.appendChild(li);
    }
}

function exportToCSV() {
    if (receipts.length === 0) {
        alert('אין חשבוניות לייצוא');
        return;
    }
    
    let csvContent = "מספר,לקוח,תאריך,סיכום ביניים,מע\"מ,סך הכל,אמצעי תשלום\n";
    
    receipts.forEach(receipt => {
        csvContent += `"${receipt.receiptNumber}","${receipt.customerName}","${receipt.date}",${receipt.subtotal},${receipt.vat},${receipt.total},"${getPaymentTypeText(receipt.paymentType)}"\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'receipts.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function initClientsPage() {
    loadClientsTable();
    setupClientModal();
}

function loadClientsTable() {
    displayClients(clients);
    document.getElementById('search-clients').addEventListener('input', filterClients);
}

function filterClients() {
    const searchTerm = document.getElementById('search-clients').value.toLowerCase();
    
    const filteredClients = clients.filter(client => {
        return !searchTerm || 
            client.name.toLowerCase().includes(searchTerm) ||
            (client.taxId && client.taxId.toLowerCase().includes(searchTerm)) ||
            (client.phone && client.phone.toLowerCase().includes(searchTerm)) ||
            (client.address && client.address.toLowerCase().includes(searchTerm));
    });
    
    displayClients(filteredClients);
}

function displayClients(clientsToDisplay) {
    const tbody = document.querySelector('#clients-table tbody');
    tbody.innerHTML = '';
    
    if (clientsToDisplay.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center;">לא נמצאו לקוחות</td>
            </tr>
        `;
        return;
    }
    
    clientsToDisplay.forEach(client => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${client.taxId || '-'}</td>
            <td>${client.name}</td>
            <td>${client.phone || '-'}</td>
            <td>${client.address || '-'}</td>
            <td>${formatDate(client.createdAt)}</td>
            <td>
                <button class="btn edit-client" data-id="${client.id}">עריכה</button>
                <button class="btn danger delete-client" data-id="${client.id}">מחיקה</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.edit-client').forEach(button => {
        button.addEventListener('click', function() {
            const clientId = this.getAttribute('data-id');
            editClient(clientId);
        });
    });
    
    document.querySelectorAll('.delete-client').forEach(button => {
        button.addEventListener('click', function() {
            const clientId = this.getAttribute('data-id');
            deleteClient(clientId);
        });
    });
}

function setupClientModal() {
    document.getElementById('add-client-btn').addEventListener('click', showClientModal);
    document.getElementById('close-client-modal').addEventListener('click', hideClientModal);
    document.getElementById('cancel-client').addEventListener('click', hideClientModal);
    document.getElementById('client-form').addEventListener('submit', saveClient);
}

function showClientModal() {
    document.getElementById('client-modal-title').textContent = 'הוסף לקוח';
    document.getElementById('client-form').reset();
    document.getElementById('client-id').value = '';
    document.getElementById('client-modal').classList.remove('d-none');
}

function hideClientModal() {
    document.getElementById('client-modal').classList.add('d-none');
}

function editClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    if (client) {
        document.getElementById('client-modal-title').textContent = 'ערוך לקוח';
        document.getElementById('client-id').value = client.id;
        document.getElementById('client-name').value = client.name;
        document.getElementById('client-tax-id').value = client.taxId || '';
        document.getElementById('client-phone').value = client.phone || '';
        document.getElementById('client-address').value = client.address || '';
        document.getElementById('client-notes').value = client.notes || '';
        
        document.getElementById('client-modal').classList.remove('d-none');
    }
}

async function saveClient(e) {
    e.preventDefault();
    
    const clientId = document.getElementById('client-id').value;
    const clientData = {
        name: document.getElementById('client-name').value,
        taxId: document.getElementById('client-tax-id').value,
        phone: document.getElementById('client-phone').value,
        address: document.getElementById('client-address').value,
        notes: document.getElementById('client-notes').value,
        updatedAt: new Date().toISOString()
    };
    
    if (clientId) {
        const index = clients.findIndex(c => c.id === clientId);
        if (index !== -1) {
            clients[index] = { ...clients[index], ...clientData };
        }
    } else {
        clientData.id = Date.now().toString();
        clientData.createdAt = new Date().toISOString();
        clients.push(clientData);
    }
    
    await saveData();
    hideClientModal();
    loadClientsTable();
    
    if (window.location.pathname.includes('check.html')) {
        loadCustomers();
    }
}

async function deleteClient(clientId) {
    const client = clients.find(c => c.id === clientId);
    const clientReceipts = receipts.filter(r => r.customerName === client.name);
    
    if (clientReceipts.length > 0) {
        if (!confirm(`ללקוח זה יש ${clientReceipts.length} חשבונית(ות). מחיקת הלקוח לא תמחק את החשבוניות. להמשיך?`)) {
            return;
        }
    }
    
    if (confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) {
        clients = clients.filter(c => c.id !== clientId);
        await saveData();
        loadClientsTable();
        
        if (window.location.pathname.includes('check.html')) {
            loadCustomers();
        }
    }
}

function initViewCheckPage() {
    console.log('Initializing view check page');
    
    const urlParams = new URLSearchParams(window.location.search);
    const receiptNumber = urlParams.get('receipt');
    const isPreview = urlParams.get('preview') === 'true';
    const shouldPrint = urlParams.get('print') === 'true';
    
    let receiptData;
    
    if (isPreview) {
        receiptData = JSON.parse(localStorage.getItem('currentReceipt'));
        console.log('Preview mode, receipt data:', receiptData);
    } else if (receiptNumber) {
        receiptData = receipts.find(r => r.receiptNumber === receiptNumber);
        console.log('View mode, found receipt:', receiptData);
    }
    
    if (receiptData) {
        displayReceipt(receiptData);
        
        if (shouldPrint) {
            setTimeout(() => {
                console.log('Auto-printing receipt...');
                window.print();
            }, 1000);
        }
    } else {
        console.error('Receipt data not found');
        document.getElementById('receipt-preview').innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <h2>חשבונית לא נמצאה</h2>
                <a href="all-checks.html" class="btn">חזרה לחשבוניות</a>
            </div>
        `;
    }
    
    const printBtn = document.getElementById('print-receipt');
    const savePdfBtn = document.getElementById('save-pdf');
    
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            console.log('Print button clicked');
            window.print();
        });
    }
    
    if (savePdfBtn) {
        savePdfBtn.addEventListener('click', function() {
            console.log('Save PDF button clicked');
            const receiptElement = document.getElementById('receipt-preview');
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>חשבונית ${receiptData?.receiptNumber || ''}</title>
                        <style>
                            body { font-family: Arial; direction: rtl; }
                            .receipt-preview { max-width: 800px; margin: 0 auto; padding: 20px; }
                        </style>
                    </head>
                    <body>
                        ${receiptElement.innerHTML}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.print();
        });
    }
}

function displayReceipt(receiptData) {
    const preview = document.getElementById('receipt-preview');
    
    let itemsHTML = '';
    receiptData.items.forEach(item => {
        itemsHTML += `
            <tr>
                <td>${item.details}</td>
                <td>${item.quantity}</td>
                <td>${item.amount.toFixed(2)} ₪</td>
                <td>${(item.quantity * item.amount).toFixed(2)} ₪</td>
            </tr>
        `;
    });
    
    preview.innerHTML = `
        <div class="receipt-header">
            <h1>${receiptData.businessInfo.name}</h1>
            <p>${receiptData.businessInfo.owner}</p>
            <p>${receiptData.businessInfo.address}</p>
            <p>טל: ${receiptData.businessInfo.phone} | ח.פ.: ${receiptData.businessInfo.taxId}</p>
        </div>
        
        <div class="receipt-details">
            <div>
                <p><strong>מספר חשבונית:</strong> ${receiptData.receiptNumber}</p>
                <p><strong>תאריך:</strong> ${formatDate(receiptData.date)}</p>
            </div>
            <div>
                <p><strong>לקוח:</strong> ${receiptData.customerName}</p>
                <p><strong>ת.ז./ח.פ.:</strong> ${receiptData.customerId || '-'}</p>
                <p><strong>כתובת:</strong> ${receiptData.customerAddress || '-'}</p>
                <p><strong>טלפון:</strong> ${receiptData.customerPhone || '-'}</p>
            </div>
        </div>
        
        <div class="receipt-items">
            <table>
                <thead>
                    <tr>
                        <th>תיאור</th>
                        <th>כמות</th>
                        <th>מחיר</th>
                        <th>סכום</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHTML}
                </tbody>
            </table>
        </div>
        
        <div class="receipt-totals">
            <p>סיכום ביניים: ${receiptData.subtotal.toFixed(2)} ₪</p>
            <p>מע"מ (18%): ${receiptData.vat.toFixed(2)} ₪</p>
            <p><strong>סך הכל: ${receiptData.total.toFixed(2)} ₪</strong></p>
            <p>אמצעי תשלום: ${getPaymentTypeText(receiptData.paymentType)}</p>
        </div>
        
        <div class="receipt-footer">
            <p>תודה על העסקתך!</p>
            <div style="margin-top: 2rem; text-align: center;">
                <div style="border-top: 1px solid #000; width: 200px; margin: 20px auto; padding-top: 10px;">
                    <p style="margin-top: 5px; font-size: 14px;">חתימה _________________________</p>
                </div>
            </div>
        </div>
    `;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getPaymentTypeText(paymentType) {
    const types = {
        'cash': 'מזומן',
        'transfer': 'העברה בנקאית',
        'check': 'צ\'ק',
        'bit': 'BIT'
    };
    return types[paymentType] || paymentType;
}

function logout() {
    localStorage.removeItem('authenticated');
    localStorage.removeItem('currentReceipt');
    window.location.href = 'index.html';
}