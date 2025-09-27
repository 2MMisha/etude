// Конфигурация системы
const CONFIG = {
    VAT_RATE: 0.18, // 18% НДС
    BUSINESS_INFO: {
        name: "Etude",
        owner: "Евгения Громова",
        address: "Ха-Бадим 4, Ришон-ле-Цион",
        phone: "0534726469",
        taxId: "346776909"
    }
};

// Функции для работы с клиентами
function loadAllClients() {
    return JSON.parse(localStorage.getItem('customers') || '[]');
}

function findCustomerById(customerId) {
    const customers = loadAllClients();
    return customers.find(c => c.id === customerId);
}

function searchCustomers(query) {
    const customers = loadAllClients();
    return customers.filter(customer => 
        customer.name.toLowerCase().includes(query.toLowerCase()) ||
        customer.phone.includes(query) ||
        customer.taxId.includes(query)
    );
}

// Функции для генерации PDF
function generateHebrewReceiptPDF(checkData, signatureImage = null) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a5'
    });

    // Установка направления текста справа налево для иврита
    doc.setLanguage('he');
    
    let yPosition = 20;
    
    // Заголовок на иврите
    doc.setFontSize(16);
    doc.text('קבלה - Etude', 105, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Информация о бизнесе
    doc.setFontSize(10);
    doc.text('יבגניה גרומובה', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('הבה״דים 4, ראשל״צ', 105, yPosition, { align: 'center' });
    yPosition += 5;
    doc.text('נייד: 0534726469 | עסק מורשה: 346776909', 105, yPosition, { align: 'center' });
    yPosition += 10;
    
    // Номер чека и дата
    doc.text(`חשבונית/קבלה מס׳: ${checkData.receiptNumber}`, 190, yPosition, { align: 'right' });
    yPosition += 5;
    doc.text(`תאריך: ${formatHebrewDate(checkData.date)}`, 190, yPosition, { align: 'right' });
    yPosition += 10;
    
    // Информация о клиенте
    doc.text(`לכבוד: ${checkData.customerName}`, 190, yPosition, { align: 'right' });
    yPosition += 5;
    
    if (checkData.customerId) {
        doc.text(`ח.פ./ע.מ: ${checkData.customerId}`, 190, yPosition, { align: 'right' });
        yPosition += 5;
    }
    
    if (checkData.customerAddress) {
        doc.text(`כתובת: ${checkData.customerAddress}`, 190, yPosition, { align: 'right' });
        yPosition += 5;
    }
    
    if (checkData.customerPhone) {
        doc.text(`טלפון: ${checkData.customerPhone}`, 190, yPosition, { align: 'right' });
        yPosition += 10;
    } else {
        yPosition += 5;
    }
    
    // Таблица товаров/услуг
    doc.text('פרטים', 190, yPosition, { align: 'right' });
    doc.text('כמות', 140, yPosition);
    doc.text('מחיר', 100, yPosition);
    doc.text('סכום', 60, yPosition);
    yPosition += 5;
    
    doc.line(10, yPosition, 140, yPosition);
    yPosition += 5;
    
    checkData.items.forEach(item => {
        if (yPosition > 180) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.text(item.details, 190, yPosition, { align: 'right', maxWidth: 80 });
        doc.text(item.quantity.toString(), 140, yPosition);
        doc.text(item.amount.toFixed(2), 100, yPosition);
        doc.text((item.amount * item.quantity).toFixed(2), 60, yPosition);
        yPosition += 10;
    });
    
    yPosition += 5;
    
    // Итоги
    doc.text(`סה״כ לפני מע״מ: ${checkData.subtotal.toFixed(2)} ₪`, 190, yPosition, { align: 'right' });
    yPosition += 5;
    doc.text(`מע״מ (18%): ${checkData.vat.toFixed(2)} ₪`, 190, yPosition, { align: 'right' });
    yPosition += 5;
    doc.setFontSize(12);
    doc.text(`סה״כ כולל מע״מ: ${checkData.total.toFixed(2)} ₪`, 190, yPosition, { align: 'right' });
    yPosition += 10;
    
    // Тип оплаты
    doc.setFontSize(10);
    doc.text(`סוג תשלום: ${getPaymentTypeHebrew(checkData.paymentType)}`, 190, yPosition, { align: 'right' });
    yPosition += 10;
    
    // Подпись
    if (signatureImage) {
        doc.addImage(signatureImage, 'PNG', 20, yPosition, 40, 20);
    } else {
        doc.line(20, yPosition + 10, 60, yPosition + 10);
    }
    doc.text('חתימה:', 65, yPosition + 15);
    
    return doc;
}

function formatHebrewDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
}

function getPaymentTypeHebrew(type) {
    const types = {
        'cash': 'מזומן',
        'credit': 'אשראי',
        'check': 'צ\'ק',
        'transfer': 'העברה'
    };
    return types[type] || type;
}

// Валидация данных
function validateCustomerData(customerData) {
    const errors = [];
    
    if (!customerData.name.trim()) {
        errors.push('Требуется имя клиента');
    }
    
    if (customerData.phone && !isValidIsraeliPhone(customerData.phone)) {
        errors.push('Неверный формат телефона');
    }
    
    return errors;
}

function isValidIsraeliPhone(phone) {
    const phoneRegex = /^0(5[^7]|[2-4]|[8-9]|7[0-9])[0-9]{7}$/;
    return phoneRegex.test(phone.replace(/-/g, ''));
}

// Утилиты
function formatCurrency(amount) {
    return new Intl.NumberFormat('he-IL', { 
        style: 'currency', 
        currency: 'ILS' 
    }).format(amount);
}

function generateReceiptNumber() {
    const lastNumber = parseInt(localStorage.getItem('currentReceiptNumber') || '0');
    const newNumber = lastNumber + 1;
    localStorage.setItem('currentReceiptNumber', newNumber.toString());
    return newNumber;
}

// Автосохранение
function setupAutoSave() {
    let saveTimer;
    
    return function(data, callback, delay = 1000) {
        clearTimeout(saveTimer);
        saveTimer = setTimeout(() => {
            callback(data);
        }, delay);
    };
}

const autoSave = setupAutoSave();
