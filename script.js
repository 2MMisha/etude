// פונקציות כלליות למערכת

// אבטחה - בדיקת התחברות בכל דף
function checkAuth() {
    if (!localStorage.getItem('loggedIn') && !window.location.href.includes('index.html')) {
        window.location.href = 'index.html';
    }
}

// ניהול מספרי קבלות
function getNextReceiptNumber() {
    let currentNumber = parseInt(localStorage.getItem('currentReceiptNumber') || '1');
    return currentNumber;
}

function incrementReceiptNumber() {
    let currentNumber = getNextReceiptNumber();
    localStorage.setItem('currentReceiptNumber', (currentNumber + 1).toString());
}

// שמירה וטעינת נתונים
function saveCheckData(checkData) {
    const checks = JSON.parse(localStorage.getItem('checks') || '[]');
    checks.push(checkData);
    localStorage.setItem('checks', JSON.stringify(checks));
    incrementReceiptNumber();
}

function loadChecks() {
    return JSON.parse(localStorage.getItem('checks') || '[]');
}

// פורמט תאריך עברי (בסיסי)
function formatHebrewDate(date) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(date).toLocaleDateString('he-IL', options);
}

// חישוב מע"מ
function calculateVAT(amount) {
    return amount * 0.17;
}

// בדיקת תקינות מספרי טלפון (ישראל)
function isValidIsraeliPhone(phone) {
    const phoneRegex = /^0(5[^7]|[2-4]|[8-9]|7[0-9])[0-9]{7}$/;
    return phoneRegex.test(phone.replace(/-/g, ''));
}

// בדיקת תקינות ח.פ./ע.מ
function isValidIsraeliID(id) {
    if (!id) return true; // לא חובה
    id = id.toString().trim();
    if (id.length !== 9) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
        let digit = parseInt(id.charAt(i));
        let weight = (i % 2 === 0) ? 1 : 2;
        let product = digit * weight;
        sum += (product > 9) ? product - 9 : product;
    }
    
    return sum % 10 === 0;
}
