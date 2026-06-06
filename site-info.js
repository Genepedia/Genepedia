(function () {
    const BRANDING_SOURCE_NAME = 'Genepedia';
    const BRAND_TOKEN = '{{APP_NAME}}';

    const existing = (typeof window !== 'undefined') ? window.App : null;
    const app = (existing && typeof existing === 'object') ? existing : {};

    const DEFAULTS = {
        Name: BRANDING_SOURCE_NAME,
        Version: '1.0.0',
        ReleaseDate: '2026-07-01',
        Description: `${BRANDING_SOURCE_NAME} is a home for family stories, a place to discover, document, and share your family history.`,
    };

    const textTemplates = new WeakMap();
    const attributeTemplates = new WeakMap();
    const titleTemplates = new WeakMap();

    function markAppReady() {
        try {
            document.documentElement.setAttribute('data-app-ready', 'true');
        } catch (e) {
            // ignore
        }
    }

    function normalizeName(value) {
        return (typeof value === 'string') ? value.trim() : '';
    }

    function getAppName() {
        const name = (app && typeof app.Name === 'string') ? app.Name.trim() : '';
        return name || BRANDING_SOURCE_NAME;
    }

    function replaceBrandTokens(value, nextName) {
        if (typeof value !== 'string') {
            return value;
        }

        return value.split(BRAND_TOKEN).join(nextName);
    }

    function getTextTemplate(node) {
        if (textTemplates.has(node)) {
            return textTemplates.get(node);
        }

        const raw = node?.nodeValue;
        if (typeof raw === 'string' && raw.includes(BRAND_TOKEN)) {
            textTemplates.set(node, raw);
            return raw;
        }

        return null;
    }

    function getAttributeTemplate(el, attr) {
        let templates = attributeTemplates.get(el);
        if (!templates) {
            templates = {};
            attributeTemplates.set(el, templates);
        }

        if (typeof templates[attr] === 'string') {
            return templates[attr];
        }

        const raw = el.getAttribute && el.getAttribute(attr);
        if (typeof raw === 'string' && raw.includes(BRAND_TOKEN)) {
            templates[attr] = raw;
            return raw;
        }

        return null;
    }

    function shouldSkipTextNode(textNode) {
        const parent = textNode && textNode.parentNode;
        if (!parent || !parent.nodeName) {
            return false;
        }

        const tag = String(parent.nodeName).toLowerCase();
        return tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'textarea';
    }

    function applyBranding(root) {
        const nextName = getAppName();
        const target = root || document;

        try {
            if ((!root || target === document) && typeof document !== 'undefined') {
                const sourceTitle = titleTemplates.get(document)
                    || (typeof document.title === 'string' && document.title.includes(BRAND_TOKEN) ? document.title : null);

                if (sourceTitle) {
                    titleTemplates.set(document, sourceTitle);
                    document.title = replaceBrandTokens(sourceTitle, nextName);
                }
            }
        } catch (e) {
            // ignore
        }

        try {
            const showText = (typeof NodeFilter !== 'undefined' && NodeFilter.SHOW_TEXT) ? NodeFilter.SHOW_TEXT : 4;
            const walkerHost = (target && typeof target.createTreeWalker === 'function')
                ? target
                : (target && target.ownerDocument && typeof target.ownerDocument.createTreeWalker === 'function')
                    ? target.ownerDocument
                    : document;

            const walker = walkerHost.createTreeWalker(target, showText);
            let node = walker.nextNode();
            while (node) {
                if (!shouldSkipTextNode(node)) {
                    const template = getTextTemplate(node);
                    if (template) {
                        const nextValue = replaceBrandTokens(template, nextName);
                        if (nextValue !== node.nodeValue) {
                            node.nodeValue = nextValue;
                        }
                    }
                }
                node = walker.nextNode();
            }
        } catch (e) {
            // ignore
        }

        try {
            const hasQsa = target && typeof target.querySelectorAll === 'function';
            if (hasQsa) {
                const attributeNames = ['title', 'aria-label', 'placeholder', 'alt', 'content', 'value'];
                target.querySelectorAll('*').forEach((el) => {
                    attributeNames.forEach((attr) => {
                        const template = getAttributeTemplate(el, attr);
                        if (!template) return;

                        const nextValue = replaceBrandTokens(template, nextName);
                        if (el.getAttribute(attr) !== nextValue) {
                            el.setAttribute(attr, nextValue);
                        }
                    });
                });
            }
        } catch (e) {
            // ignore
        }

        return nextName;
    }

    function dispatchNameChange(nextName) {
        try {
            if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
                return;
            }

            const event = (typeof CustomEvent !== 'undefined')
                ? new CustomEvent('app:namechange', { detail: { name: nextName } })
                : new Event('app:namechange');

            window.dispatchEvent(event);
        } catch (e) {
            // ignore
        }
    }

    if (!normalizeName(app.Name)) {
        app.Name = DEFAULTS.Name;
    }
    if (!normalizeName(app.Version)) {
        app.Version = DEFAULTS.Version;
    }
    if (!normalizeName(app.ReleaseDate)) {
        app.ReleaseDate = DEFAULTS.ReleaseDate;
    }
    if (!normalizeName(app.Description)) {
        app.Description = DEFAULTS.Description;
    }

    app.getName = getAppName;
    app.applyBranding = applyBranding;
    app.BrandToken = BRAND_TOKEN;

    try {
        const initialName = getAppName();
        let internalName = initialName;

        Object.defineProperty(app, 'Name', {
            enumerable: true,
            configurable: true,
            get() {
                return internalName;
            },
            set(value) {
                const nextName = normalizeName(value) || BRANDING_SOURCE_NAME;
                if (nextName === internalName) {
                    return;
                }

                internalName = nextName;

                try {
                    if (typeof document !== 'undefined') {
                        applyBranding(document);
                    }
                } catch (e) {
                    // ignore
                }

                dispatchNameChange(internalName);
            },
        });
    } catch (e) {
        // ignore
    }

    if (typeof window !== 'undefined') {
        window.App = app;
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                try {
                    applyBranding(document);
                } catch (e) {
                    // ignore
                } finally {
                    markAppReady();
                }
            }, { once: true });

            window.addEventListener('load', markAppReady, { once: true });
        } else {
            try {
                applyBranding(document);
            } catch (e) {
                // ignore
            } finally {
                markAppReady();
            }
        }
    }
})();