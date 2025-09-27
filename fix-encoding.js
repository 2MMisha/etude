// Функция для корректного отображения текста
function fixHebrewText(text) {
    if (!text) return text;
    
    // Убираем лишние символы и исправляем кодировку
    return text
        .replace(/×/g, '')
        .replace(//g, "'")
        .replace(//g, '"')
        .replace(//g, '"')
        .normalize('NFC');
}

// Функция для правильного отображения смешанного текста
function displayMixedText(hebrewText, englishText) {
    return `${hebrewText} - <span dir="ltr" style="display: inline-block;">${englishText}</span>`;
}

// Автоматическое исправление всех текстовых полей
function fixAllTextFields() {
    // Исправляем текст на странице
    document.querySelectorAll('h1, h2, h3, p, span, div').forEach(element => {
        if (element.innerText.includes('×') || element.innerText.includes('')) {
            element.innerHTML = fixHebrewText(element.innerHTML);
        }
    });
    
    // Исправляем значения input и textarea
    document.querySelectorAll('input, textarea').forEach(element => {
        if (element.value.includes('×') || element.value.includes('')) {
            element.value = fixHebrewText(element.value);
        }
    });
}

// Запускаем при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(fixAllTextFields, 100);
});

// Также исправляем при изменении контента
new MutationObserver(fixAllTextFields).observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});
