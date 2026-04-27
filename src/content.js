let translationMappings = [];
let isTranslationEnabled = true;
let activeTranslations = {};

const REGEX_TRANSLATIONS = [
    { pattern: /(\d+) months? ago/i, replacement: '$1달 전' },
    { pattern: /a month ago/i, replacement: '1달 전' },
    { pattern: /(\d+) years? ago/i, replacement: '$1년 전' },
    { pattern: /a year ago/i, replacement: '1년 전' },
    { pattern: /(\d+) days? ago/i, replacement: '$1일 전' },
    { pattern: /a day ago/i, replacement: '하루 전' },
    { pattern: /yesterday/i, replacement: '어제' },
    { pattern: /(\d+) hours? ago/i, replacement: '$1시간 전' },
    { pattern: /(1|an) hour ago/i, replacement: '1시간 전' },
    { pattern: /(\d+) minutes? ago/i, replacement: '$1분 전' },
    { pattern: /(a|1) minute ago/i, replacement: '1분 전' },
    { pattern: /(\d+) seconds? ago/i, replacement: '$1초 전' },
    { pattern: /a few seconds ago/i, replacement: '몇 초 전' },
    { pattern: /just now/i, replacement: '방금' },
    { pattern: /in (\d+) days?/i, replacement: '$1일 후' },
    { pattern: /in a day/i, replacement: '하루 후' },
    { pattern: /^Rating:\s*([\d,.]+)/i, replacement: '레이팅: $1' },
    { pattern: /^Attended:\s*([\d,]+)/i, replacement: '참가 횟수: $1' },
    { pattern: /^Avg\. score:\s*([\d,.]+)/i, replacement: '평균 점수: $1' },
    { pattern: /^(\d+)\s+of\s+(\d+)$/i, replacement: '$1 / $2' },
    { pattern: /^Runtime:\s*(.+)$/i, replacement: '실행시간: $1' },
    { pattern: /^Memory:\s*(.+)$/i, replacement: '메모리: $1' },
    { pattern: /^([\d.]+)%\s*of\s*solutions\s*used\s*(.+)\s*of\s*runtime$/i, replacement: '$1%의 솔루션이 $2의 실행 시간을 기록했습니다' },
    { pattern: /^([\d.]+)%\s*of\s*solutions\s*used\s*(.+)\s*of\s*memory$/i, replacement: '$1%의 솔루션이 $2의 메모리를 사용했습니다' },
    { pattern: /^Show (\d+) Repl(?:y|ies)$/i, replacement: '답글 $1개 보기' },
    {
        pattern: /^submitted at\s+([a-zA-Z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})(?:\s+(\d{2}:\d{2}))?$/i,
        replacement: (match, month, day, year, time) => {
            const m = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 }[month.toLowerCase().substring(0, 3)];
            if (!m) return match;
            return time ? `${year}년 ${m}월 ${day}일 ${time}에 제출됨` : `${year}년 ${m}월 ${day}일에 제출됨`;
        }
    },
    {
        pattern: /^([a-zA-Z]{3,})\s+(\d{1,2})(?:st|nd|rd|th)?,\s+(\d{4})(?:\s+(\d{2}:\d{2}))?$/i,
        replacement: (match, month, day, year, time) => {
            const m = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 }[month.toLowerCase().substring(0, 3)];
            if (!m) return match;
            return time ? `${year}년 ${m}월 ${day}일 ${time}` : `${year}년 ${m}월 ${day}일`;
        }
    },
    {
        pattern: /([a-zA-Z]{3}),\s+([a-zA-Z]{3,})\s+(\d{1,2}),\s+(?:(\d{4}),\s+)?(\d{1,2}:\d{2})\s+GMT\s*([+-]\d{2}:\d{2})?/i,
        replacement: (match, dayOfWeek, month, day, yearInMatch, time, gmtOffset) => {
            const months = { 'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12 };
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            const year = yearInMatch || new Date().getFullYear();

            let offsetHours = 0;
            if (gmtOffset) {
                const sign = gmtOffset.startsWith('+') ? 1 : -1;
                offsetHours = sign * parseInt(gmtOffset.substring(1, 3), 10);
            }

            const date = new Date(`${month} ${day}, ${year} ${time} UTC`);
            date.setUTCHours(date.getUTCHours() - offsetHours + 9);

            const m = months[month.toLowerCase().substring(0, 3)];
            const d = date.getUTCDate();
            const dow = days[date.getUTCDay()];
            const hh = String(date.getUTCHours()).padStart(2, '0');
            const mm = String(date.getUTCMinutes()).padStart(2, '0');

            const yearPart = yearInMatch ? `${date.getUTCFullYear()}년 ` : '';
            return `${yearPart}${m}월 ${d}일 (${dow}) ${hh}:${mm}`;
        }
    },
    { pattern: /^(\d{1,2})\/(\d{4})$/, replacement: '$2년 $1월' },
    { pattern: /^Solved\s+([\d,]+)\s+problems?$/i, replacement: '$1문제 해결' },
    { pattern: /^(\d+)\s+Levels?$/i, replacement: '$1 단계' },
    { pattern: /^A verification code has (?:been )?sent to (.+?)\.?$/i, replacement: '인증 코드가 $1로 전송되었습니다.' },
    { pattern: /^(\d+)\s+Selected$/i, replacement: '$1개 선택됨' }
];

chrome.storage.local.get(['translationEnabled'], (result) => {
    if (result.translationEnabled === false) {
        isTranslationEnabled = false;
        return;
    }

    fetch(chrome.runtime.getURL('src/translations.json'))
        .then(response => response.json())
        .then(data => {
            translationMappings = data;
            updateActiveTranslations();
        })
        .catch(err => console.error('번역 파일을 불러오는데 실패했습니다.', err));
});

function updateActiveTranslations() {
    if (!isTranslationEnabled) return;
    const currentPath = window.location.pathname;

    activeTranslations = {};
    for (const mapping of translationMappings) {
        const isMatch = Array.isArray(mapping.urlPattern)
            ? mapping.urlPattern.some(p => currentPath.startsWith(p) || p === "/")
            : currentPath.startsWith(mapping.urlPattern) || mapping.urlPattern === "/";

        if (isMatch) {
            Object.assign(activeTranslations, mapping.translations);
        }
    }

    if (Object.keys(activeTranslations).length > 0) {
        translateNode(document.body);
    }
}

function shouldSkipNode(node) {
    const SKIP_SELECTORS = ['pre', 'code', '.monaco-editor', '.ace_editor', '[contenteditable="true"]'];
    const parent = node.parentElement;
    if (parent && SKIP_SELECTORS.some(selector => parent.closest(selector))) return true;
    if (node.tagName && ['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG'].includes(node.tagName)) return true;
    return false;
}

function handleRegexTranslations(text) {
    let newText = text;

    const timeLeftMatch = newText.match(/^(\d+|[\d:]+)\s+days?\s+left$/i);
    const solvedMatch = newText.match(/^(\d+(?:\/\d+)?)\s+Solved$/i);
    const beatsMatch = newText.match(/^Beats\s+([\d.]+)%$/i);

    if (timeLeftMatch) {
        newText = /^\d+$/.test(timeLeftMatch[1]) ? `${timeLeftMatch[1]}일 남음` : `${timeLeftMatch[1]} 남음`;
    } else if (/^left$/i.test(newText)) {
        newText = "남음";
    } else if (solvedMatch) {
        newText = `${solvedMatch[1]} 문제 해결`;
    } else if (beatsMatch) {
        const percentage = parseFloat(beatsMatch[1]);
        if (!isNaN(percentage)) newText = `상위 ${(100 - percentage).toFixed(2)}%`;
    }

    for (const { pattern, replacement } of REGEX_TRANSLATIONS) {
        if (pattern.test(newText)) {
            newText = newText.replace(pattern, replacement);
            break;
        }
    }
    return newText;
}

function translateTextNode(node) {
    const originalText = node.nodeValue.trim();
    if (originalText.length === 0) return;

    if (originalText.toLowerCase() === 's') {
        const prev = node.previousSibling;
        if (prev && /[가-힣]$/.test(prev.textContent.trim())) {
            node.nodeValue = node.nodeValue.replace(/s/i, '');
            return;
        }
    }

    if (originalText.toLowerCase() === 'of') {
        const prev = node.previousSibling;
        const next = node.nextSibling;
        if (prev && next && /^\d+$/.test(prev.textContent.trim()) && /^\d+$/.test(next.textContent.trim())) {
            node.nodeValue = node.nodeValue.replace(/of/i, '/');
            return;
        }
    }

    let translatedText = handleRegexTranslations(originalText);

    if (translatedText === originalText && activeTranslations[originalText]) {
        if (originalText === "Premium") {
            if (!isLikelyLogo(node)) translatedText = activeTranslations[originalText];
        } else if (!node.parentElement?.hasAttribute('data-keep-original-text')) {
            translatedText = activeTranslations[originalText];
        }
    }

    if (translatedText !== originalText) {
        node.nodeValue = node.nodeValue.replace(originalText, translatedText);
    }
}

function isLikelyLogo(node) {
    let p = node.parentElement;
    let depth = 0;
    while (p && p.tagName !== 'BODY' && depth < 6) {
        if (p.tagName === 'A' && (p.getAttribute('href') === '/' || p.getAttribute('href') === '/problemset/')) return true;
        if (p.tagName === 'NAV' || p.tagName === 'HEADER' || p.className?.toString().toLowerCase().includes('nav')) return true;
        if (p.querySelector('img[alt*="LeetCode"], img[aria-label*="LeetCode"], svg[aria-label*="LeetCode"]')) return true;
        p = p.parentElement;
        depth++;
    }
    return false;
}

function translateElementAttributes(element) {
    const attrs = ['placeholder', 'title', 'data-title', 'data-tooltip', 'aria-label'];
    attrs.forEach(attr => {
        if (element.hasAttribute(attr)) {
            const val = element.getAttribute(attr).trim();
            if (val === "Premium" && (attr === "aria-label" || attr === "title")) return;
            if (attr === 'placeholder' && element.hasAttribute('data-keep-original-placeholder')) return;
            if (activeTranslations[val]) element.setAttribute(attr, activeTranslations[val]);
        }
    });
}

function handleSpecialUIPatterns(element) {
    const text = element.textContent.trim();

    if (text === "Ask Leet" && !hasChildWithSameText(element, "Ask Leet")) {
        const span = element.querySelector('span');
        if (span && span.textContent.trim() === "Leet") {
            const clone = span.cloneNode(true);
            element.textContent = '';
            element.appendChild(clone);
            element.appendChild(document.createTextNode('에게 질문하기'));
        } else {
            element.textContent = activeTranslations["Ask Leet"] || "Leet에게 질문하기";
        }
        return true;
    }

    if (handleBannerTranslations(element, text)) return true;

    return false;
}

function hasChildWithSameText(element, text) {
    for (const child of element.childNodes) {
        if (child.nodeType === 1 && child.textContent.trim() === text) return true;
    }
    return false;
}

function handleBannerTranslations(element, text) {
    // Terms of service
    if (text.startsWith("By continuing, you agree to") && text.length < 150) {
        const links = element.querySelectorAll('a');
        if (links.length >= 2) {
            const terms = links[0].cloneNode(true); terms.textContent = "이용 약관";
            const privacy = links[1].cloneNode(true); privacy.textContent = "개인정보 처리 방침";
            element.textContent = "계속 진행하면 ";
            element.appendChild(terms); element.appendChild(document.createTextNode(" 및 "));
            element.appendChild(privacy); element.appendChild(document.createTextNode("에 "));
            element.appendChild(document.createElement('br'));
            element.appendChild(document.createTextNode("동의하는 것으로 간주됩니다."));
            return true;
        }
    }

    if (text.startsWith("Added to ") && text.length < 100) {
        const link = element.querySelector('a');
        if (link) {
            const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
            let node;
            while ((node = walker.nextNode())) {
                if (node.nodeValue.includes("Added to")) {
                    node.nodeValue = node.nodeValue.replace(/Added to\s*/i, "");
                }
            }

            link.parentNode.insertBefore(document.createTextNode(" 에 추가 완료!"), link.nextSibling);
            return true;
        }
    }

    if (text.startsWith("Removed from ") && text.length < 100) {
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeValue.includes("Removed from")) {
                node.nodeValue = node.nodeValue.replace(/Removed from\s*/i, "");
            }
        }
        element.appendChild(document.createTextNode("에서 삭제 완료!"));
        return true;
    }

    const bannerConfigs = [
        {
            key: "Please verify your email",
            check: "to unlock all features",
            prefix: "LeetCode의 모든 기능과 서비스를 이용하려면 ",
            link: "이메일 인증",
            suffix: "을 완료해 주세요."
        },
        {
            key: "Please verify your primary email",
            check: "to activate your account first",
            prefix: "계정을 활성화하려면 먼저 ",
            link: "기본 이메일 인증",
            suffix: "을 완료해 주세요."
        },
        {
            key: "You are submitting too frequently",
            check: "shorter wait times",
            prefix: "제출이 너무 빈번합니다. 잠시 후 다시 시도하시거나 대기 시간을 줄이려면 ",
            link: "프리미엄",
            suffix: "을 구독해 주세요."
        }
    ];

    for (const config of bannerConfigs) {
        if (text.includes(config.key) && text.includes(config.check) && text.length < 200) {
            const link = element.querySelector('a');
            if (link) {
                const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
                let node;
                while ((node = walker.nextNode())) {
                    if (node.nodeValue.includes("Please") || node.nodeValue.includes("submitting")) node.nodeValue = config.prefix;
                    else if (node.nodeValue.includes("to unlock") || node.nodeValue.includes("to activate") || node.nodeValue.includes("wait times")) node.nodeValue = config.suffix;
                }
                link.textContent = config.link;
                return true;
            }
        }
    }
    return false;
}

function translateNode(node) {
    if (!isTranslationEnabled || Object.keys(activeTranslations).length === 0) return;

    if (node.nodeType === 3) {
        if (!shouldSkipNode(node)) translateTextNode(node);
    } else if (node.nodeType === 1) {
        if (shouldSkipNode(node)) return;

        if (node.textContent.includes("Quit the study plan by typing")) {
            const input = node.querySelector('input');
            if (input?.hasAttribute('placeholder')) {
                input.setAttribute('data-keep-original-placeholder', 'true');
                const title = input.getAttribute('placeholder');
                const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
                let n; while ((n = walker.nextNode())) {
                    if (n.nodeValue.trim() === title) n.parentElement?.setAttribute('data-keep-original-text', 'true');
                }
            }
        }

        translateElementAttributes(node);
        if (!handleSpecialUIPatterns(node)) {
            for (const child of node.childNodes) translateNode(child);
        }
    }
}

let debounceTimer = null;
const observer = new MutationObserver((mutations) => {
    mutations.forEach(m => {
        m.addedNodes.forEach(node => {
            if ((node.nodeType === 1 || node.nodeType === 3) && isTranslationEnabled) translateNode(node);
        });
    });

    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (isTranslationEnabled) translateNode(document.body);
    }, 150);
});

observer.observe(document.body, { childList: true, subtree: true, characterData: true });

let lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== lastUrl) {
        lastUrl = location.href;
        updateActiveTranslations();
    }
}).observe(document, { subtree: true, childList: true });