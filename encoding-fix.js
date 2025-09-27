// Radical encoding fix for Hebrew text
class HebrewFixer {
    constructor() {
        this.encodingMap = {
            '×¢': 'ע', '×': 'מ', '×': 'ו', '×ª': 'ת', '×ª': 'ת',
            '×': 'י', '×': 'ה', '×': 'ב', '×': 'א', '×': 'ה',
            '×': 'ל', '×': 'כ', '×': 'ך', '×': 'ן', '×': 'ם',
            '×¤': 'פ', '×¤': 'ף', '×¦': 'צ', '×¦': 'ץ', '×©': 'ש',
            '×': 'ד', '×': 'ג', '×': 'ב', '×': 'א', '×': 'ל'
        };
        
        this.reverseMap = {
            'ע': '×¢', 'מ': '×', 'ו': '×', 'ת': '×ª', 'י': '×',
            'ה': '×', 'ב': '×', 'א': '×', 'ל': '×', 'כ': '×',
            'ך': '×', 'ן': '×', 'ם': '×', 'פ': '×¤', 'ף': '×¤',
            'צ': '×¦', 'ץ': '×¦', 'ש': '×©', 'ד': '×', 'ג': '×'
        };
    }

    fixText(text) {
        if (!text) return text;
        
        let fixed = text;
        
        // Fix common encoding issues
        fixed = fixed.replace(/Ã|Â|Á|À|Ä/g, '');
        fixed = fixed.replace(/ã|â|á|à|ä/g, '');
        fixed = fixed.replace(/´|`|‘|’|ʼ/g, "'");
        fixed = fixed.replace(/″|„|“|”/g, '"');
        
        // Fix Hebrew characters
        for (const [wrong, correct] of Object.entries(this.encodingMap)) {
            fixed = fixed.replace(new RegExp(wrong, 'g'), correct);
        }
        
        return fixed;
    }

    encodeForStorage(text) {
        if (!text) return text;
        
        let encoded = text;
        for (const [correct, wrong] of Object.entries(this.reverseMap)) {
            encoded = encoded.replace(new RegExp(correct, 'g'), wrong);
        }
        
        return encoded;
    }

    decodeFromStorage(text) {
        return this.fixText(text);
    }

    fixPageText() {
        // Fix all text nodes on the page
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        let node;
        while (node = walker.nextNode()) {
            if (node.textContent.match(/×||||Ã|Â/)) {
                node.textContent = this.fixText(node.textContent);
            }
        }

        // Fix input values
        document.querySelectorAll('input, textarea').forEach(el => {
            if (el.value && el.value.match(/×||||Ã|Â/)) {
                el.value = this.fixText(el.value);
            }
        });

        // Fix all HTML content
        document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, div, td, th, li').forEach(el => {
            if (el.innerHTML && el.innerHTML.match(/×||||Ã|Â/)) {
                el.innerHTML = this.fixText(el.innerHTML);
            }
        });
    }
}

// Create global instance
window.hebrewFixer = new HebrewFixer();

// Auto-fix on page load
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.hebrewFixer.fixPageText();
    }, 100);
});

// Fix text function for other scripts
window.fixHebrewText = function(text) {
    return window.hebrewFixer.fixText(text);
};
