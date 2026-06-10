(function () {
    const BRANDING_SOURCE_NAME = 'Genepedia';
    const BRAND_TOKEN = '{{APP_NAME}}';

    const existing = (typeof window !== 'undefined') ? window.App : null;
    const app = (existing && typeof existing === 'object') ? existing : {};

    const SITE_INFO_SCRIPT_URL = (typeof document !== 'undefined' && document.currentScript?.src)
        ? document.currentScript.src
        : '';

    const DEFAULTS = {
        Name: BRANDING_SOURCE_NAME,
        Version: '1.0.0',
        ReleaseDate: '2026-07-01',
        Description: `${BRANDING_SOURCE_NAME} is a home for family stories, a place to discover, document, and share your family history.`,
        GitHubApiBase: 'https://api.shaunroselt.com/genepedia',
        Slogan: 'Free Geneology Encyclopedia',
        PageEditPath: 'pages/edit.html',
    };

    function getSiteBaseUrl() {
        if (SITE_INFO_SCRIPT_URL) {
            return new URL('./', SITE_INFO_SCRIPT_URL);
        }

        return new URL('/', window.location.href);
    }

    function resolveSiteUrl(relativePath) {
        const cleanPath = String(relativePath || '').replace(/^\//, '');
        try {
            return new URL(cleanPath, getSiteBaseUrl()).href;
        } catch (e) {
            return cleanPath;
        }
    }

    function normalizeSitePath(path) {
        return String(path || '').replace(/\\/g, '/').replace(/^\//, '').trim();
    }

    function resolvePageEditUrl(sourcePath, returnPath, options) {
        const cleanSource = normalizeSitePath(sourcePath);
        const cleanReturn = normalizeSitePath(returnPath || cleanSource);
        const editPath = normalizeSitePath(app.PageEditPath || DEFAULTS.PageEditPath || 'pages/edit.html');
        const url = new URL(editPath, getSiteBaseUrl());
        url.searchParams.set('source', cleanSource);
        if (cleanReturn) {
            url.searchParams.set('return', cleanReturn);
        }
        const contentSelector = String(options?.contentSelector || '').trim();
        if (contentSelector) {
            url.searchParams.set('content-selector', contentSelector);
        }
        return url.href;
    }

    function getSlogan() {
        const slogan = (typeof app.Slogan === 'string') ? app.Slogan.trim() : '';
        return slogan || DEFAULTS.Slogan;
    }

    let peopleRegistryScriptPromise = null;

    function ensurePeopleRegistryScript() {
        if (window.PeopleRegistry) {
            return Promise.resolve();
        }

        if (peopleRegistryScriptPromise) {
            return peopleRegistryScriptPromise;
        }

        const existingScript = document.querySelector('script[src*="people-registry.js"]');
        if (existingScript) {
            peopleRegistryScriptPromise = new Promise((resolve, reject) => {
                existingScript.addEventListener('load', resolve, { once: true });
                existingScript.addEventListener('error', reject, { once: true });
            });
            return peopleRegistryScriptPromise;
        }

        peopleRegistryScriptPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = resolveSiteUrl('lib/people-registry.js');
            script.defer = true;
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', reject, { once: true });
            document.head.append(script);
        });

        return peopleRegistryScriptPromise;
    }

    async function navigateToRandomProfile() {
        try {
            await ensurePeopleRegistryScript();
        } catch (error) {
            console.warn('Random profile navigation failed: could not load people registry.', error);
            return;
        }

        const people = await window.PeopleRegistry.loadPeopleRegistry();
        const candidates = people
            .map((person) => String(person?.id || '').trim())
            .filter(Boolean);

        if (!candidates.length) {
            console.warn('Random profile navigation failed: people.json did not contain any profiles.');
            return;
        }

        const currentProfileMatch = window.location.pathname.match(/\/people\/([^/]+)\/profile\.html$/);
        const currentProfileId = currentProfileMatch?.[1] || null;

        let pool = candidates.filter((id) => id !== currentProfileId);
        if (!pool.length) {
            pool = candidates;
        }

        const chosenId = pool[Math.floor(Math.random() * pool.length)];
        window.location.assign(window.PeopleRegistry.resolvePersonProfileUrl(chosenId));
    }

    async function navigateToNewTree() {
        try {
            await ensurePeopleRegistryScript();
        } catch (error) {
            console.warn('New tree navigation failed: could not load people registry.', error);
            return;
        }

        const people = await window.PeopleRegistry.loadPeopleRegistry();
        const numericIds = people
            .map((person) => Number.parseInt(String(person?.id || ''), 10))
            .filter((id) => Number.isFinite(id));
        const nextId = numericIds.length ? Math.max(...numericIds) + 1 : 1;
        window.location.assign(resolveSiteUrl(`people/edit.html?person=${nextId}`));
    }

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

    function normalizeApiBase(value) {
        const rawValue = (typeof value === 'string') ? value.trim() : '';
        if (!rawValue) {
            return '';
        }

        try {
            return new URL(rawValue, window.location.href).href.replace(/\/+$/, '');
        } catch (e) {
            return rawValue.replace(/\/+$/, '');
        }
    }

    function getAppName() {
        const name = (app && typeof app.Name === 'string') ? app.Name.trim() : '';
        return name || BRANDING_SOURCE_NAME;
    }

    function getGitHubApiBase() {
        return normalizeApiBase(app?.GitHubApiBase) || DEFAULTS.GitHubApiBase;
    }

    const GITHUB_ACCESS_TOKEN_KEY = 'app-header-github-token';

    function getGitHubAccessToken() {
        try {
            return String(localStorage.getItem(GITHUB_ACCESS_TOKEN_KEY) || '').trim();
        } catch (e) {
            return '';
        }
    }

    function setGitHubAccessToken(token) {
        try {
            const next = String(token || '').trim();
            if (next) {
                localStorage.setItem(GITHUB_ACCESS_TOKEN_KEY, next);
            } else {
                localStorage.removeItem(GITHUB_ACCESS_TOKEN_KEY);
            }
        } catch (e) {
            // ignore
        }
    }

    function getGitHubFetchInit(init) {
        const options = init && typeof init === 'object' ? { ...init } : {};
        const headers = new Headers(options.headers || {});
        if (!headers.has('Accept')) {
            headers.set('Accept', 'application/json');
        }

        const token = getGitHubAccessToken();
        if (token && !headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
        }

        options.headers = headers;
        if (options.credentials === undefined) {
            options.credentials = 'include';
        }

        return options;
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
                const titleEl = document.querySelector('title');
                const sourceTitle = titleTemplates.get(document)
                    || titleEl?.getAttribute('data-brand-template')
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
    if (!normalizeApiBase(app.GitHubApiBase)) {
        app.GitHubApiBase = DEFAULTS.GitHubApiBase;
    }

    if (!normalizeName(app.Slogan)) {
        app.Slogan = DEFAULTS.Slogan;
    }

    app.getName = getAppName;
    app.getGitHubApiBase = getGitHubApiBase;
    app.getGitHubAccessToken = getGitHubAccessToken;
    app.setGitHubAccessToken = setGitHubAccessToken;
    app.getGitHubFetchInit = getGitHubFetchInit;
    app.getSlogan = getSlogan;
    app.resolveSiteUrl = resolveSiteUrl;
    app.resolvePageEditUrl = resolvePageEditUrl;
    app.navigateToRandomProfile = navigateToRandomProfile;
    app.navigateToNewTree = navigateToNewTree;
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

    try {
        const initialGitHubApiBase = getGitHubApiBase();
        let internalGitHubApiBase = initialGitHubApiBase;

        Object.defineProperty(app, 'GitHubApiBase', {
            enumerable: true,
            configurable: true,
            get() {
                return internalGitHubApiBase;
            },
            set(value) {
                const nextGitHubApiBase = normalizeApiBase(value) || DEFAULTS.GitHubApiBase;
                if (nextGitHubApiBase === internalGitHubApiBase) {
                    return;
                }

                internalGitHubApiBase = nextGitHubApiBase;
            },
        });
    } catch (e) {
        app.GitHubApiBase = getGitHubApiBase();
    }

    if (typeof window !== 'undefined') {
        window.App = app;
    }

    if (typeof document !== 'undefined') {
        if (document.readyState === 'loading') {
            try {
                applyBranding(document);
            } catch (e) {
                // ignore
            }

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