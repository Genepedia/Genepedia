(function () {
    const BRANDING_SOURCE_NAME = 'Genepedia';
    const brandingNames = new Set([BRANDING_SOURCE_NAME]);

    const existing = (typeof window !== 'undefined') ? window.App : null;
    const app = (existing && typeof existing === 'object') ? existing : {};

    const DEFAULTS = {
        Name: BRANDING_SOURCE_NAME,
        Version: '1.0.0',
        ReleaseDate: '2026-07-01',
        Description: 'Genepedia is a home for family stories, a place to discover, document, and share your family history.',
    };

    function normalizeName(value) {
        return (typeof value === 'string') ? value.trim() : '';
    }

    function rememberBrandName(name) {
        const normalized = normalizeName(name);
        if (normalized) {
            brandingNames.add(normalized);
        }
    }

    // Apply defaults (without clobbering a pre-configured window.App).
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

    // Seed branding replacements from the initial name.
    rememberBrandName(app.Name);

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

    function getAppName() {
        const name = (app && typeof app.Name === 'string') ? app.Name.trim() : '';
        return name || BRANDING_SOURCE_NAME;
    }

    function replaceBrandingInString(value, nextName) {
        if (typeof value !== 'string') {
            return value;
        }

        let updated = value;
        for (const previousName of brandingNames) {
            if (previousName && previousName !== nextName) {
                updated = updated.split(previousName).join(nextName);
            }
        }

        return updated;
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
        rememberBrandName(nextName);
        const target = root || document;

        // Update document.title (common case) only when targeting the live document.
        try {
            if (!root || target === document) {
                if (typeof document !== 'undefined' && document.title) {
                    document.title = replaceBrandingInString(document.title, nextName);
                }
            }
        } catch (e) {
            // ignore
        }

        // Replace text nodes.
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
                    const nextValue = replaceBrandingInString(node.nodeValue, nextName);
                    if (nextValue !== node.nodeValue) {
                        node.nodeValue = nextValue;
                    }
                }
                node = walker.nextNode();
            }
        } catch (e) {
            // ignore
        }

        // Replace common attributes.
        try {
            const hasQsa = target && typeof target.querySelectorAll === 'function';
            if (hasQsa) {
                const attributeNames = ['title', 'aria-label', 'placeholder', 'alt'];
                target.querySelectorAll('*').forEach((el) => {
                    attributeNames.forEach((attr) => {
                        const raw = el.getAttribute && el.getAttribute(attr);
                        if (!raw) return;
                        const nextValue = replaceBrandingInString(raw, nextName);
                        if (nextValue !== raw) {
                            el.setAttribute(attr, nextValue);
                        }
                    });
                });

                target.querySelectorAll('meta[content]').forEach((meta) => {
                    const metaKey = String(meta.getAttribute('property') || meta.getAttribute('name') || '').toLowerCase();
                    if (metaKey.includes('image')) {
                        return;
                    }

                    const raw = meta.getAttribute('content');
                    if (!raw) return;
                    const nextValue = replaceBrandingInString(raw, nextName);
                    if (nextValue !== raw) {
                        meta.setAttribute('content', nextValue);
                    }
                });
            }
        } catch (e) {
            // ignore
        }

        return nextName;
    }

    app.applyBranding = applyBranding;

    // Make App.Name reactive: changing it rebrands the current document.
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

                rememberBrandName(internalName);
                internalName = nextName;
                rememberBrandName(internalName);

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
                }
            }, { once: true });
        } else {
            try {
                applyBranding(document);
            } catch (e) {
                // ignore
            }
        }
    }
})();