(() => {
    const THEME_KEY = 'genepedia-theme';
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');

    const readStoredTheme = () => {
        try {
            return localStorage.getItem(THEME_KEY);
        } catch {
            return null;
        }
    };

    const applyTheme = (theme) => {
        document.body.classList.toggle('theme-dark', theme === 'dark');
        document.querySelectorAll('.theme-toggle-input').forEach((checkbox) => {
            checkbox.checked = theme === 'dark';
        });
        document.querySelectorAll('.theme-switch .theme-switch-label').forEach((label) => {
            label.textContent = theme === 'dark' ? 'Dark' : 'Light';
        });
    };

    const getPreferredTheme = () => {
        const storedTheme = readStoredTheme();
        if (storedTheme === 'dark' || storedTheme === 'light') {
            return storedTheme;
        }

        return prefersDarkMode.matches ? 'dark' : 'light';
    };

    const initializeTheme = () => {
        applyTheme(getPreferredTheme());
    };

    if (document.body) {
        initializeTheme();
    } else {
        document.addEventListener('DOMContentLoaded', initializeTheme, { once: true });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.theme-toggle-input').forEach((toggle) => {
            toggle.addEventListener('change', ({ currentTarget }) => {
                const theme = currentTarget.checked ? 'dark' : 'light';
                try {
                    localStorage.setItem(THEME_KEY, theme);
                } catch {
                    return applyTheme(theme);
                }
                applyTheme(theme);
            });
        });
    }, { once: true });
})();

/* App store "Coming Soon" modal and click interception */
(() => {
    let previousActiveElement = null;

    const closeModal = (modal) => {
        modal.classList.remove('open');
        if (modal._keyHandler) {
            document.removeEventListener('keydown', modal._keyHandler);
        }
        previousActiveElement?.focus();
        previousActiveElement = null;
    };

    const createComingSoonModal = () => {
        const existingModal = document.getElementById('genepedia-coming-soon-modal');
        if (existingModal) {
            return existingModal;
        }

        const modal = document.createElement('div');
        modal.id = 'genepedia-coming-soon-modal';
        modal.className = 'genepedia-modal';
        modal.innerHTML = `
            <div class="genepedia-modal-backdrop" tabindex="-1"></div>
            <div class="genepedia-modal-dialog" role="dialog" aria-modal="true" aria-labelledby="genepedia-modal-title">
                <div class="genepedia-modal-body">
                    <h2 id="genepedia-modal-title">Coming soon</h2>
                    <p id="genepedia-modal-message"></p>
                    <div class="genepedia-modal-actions">
                        <button type="button" class="genepedia-modal-close">Close</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('.genepedia-modal-close').addEventListener('click', () => {
            closeModal(modal);
        });
        modal.querySelector('.genepedia-modal-backdrop').addEventListener('click', () => {
            closeModal(modal);
        });
        modal.close = () => {
            closeModal(modal);
        };

        return modal;
    };

    const showComingSoon = (platform) => {
        const modal = createComingSoonModal();
        const appName = window.App?.Name || 'Genepedia';
        modal.querySelector('#genepedia-modal-message').textContent =
            `The ${appName} app is coming soon to the ${platform}. We're actively building it - check back soon for release details.`;
        previousActiveElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        modal.classList.add('open');
        modal.querySelector('.genepedia-modal-close').focus();

        const keyHandler = ({ key }) => {
            if (key === 'Escape') {
                modal.close();
            }
        };

        modal._keyHandler = keyHandler;
        document.addEventListener('keydown', keyHandler);
    };

    const appStorePlatforms = [
        ['.app-badge-android', 'Google Play'],
        ['.app-badge-ios', 'Apple App Store'],
        ['.app-badge-microsoft', 'Microsoft Store'],
        ['.app-badge-steam', 'Steam']
    ];

    document.addEventListener('click', (event) => {
        const anchor = event.target.closest('a');
        if (!anchor) {
            return;
        }

        const matchedPlatform = appStorePlatforms.find(([selector]) => anchor.closest(selector));
        if (!matchedPlatform) {
            return;
        }

        event.preventDefault();
        showComingSoon(matchedPlatform[1]);
    });
})();

