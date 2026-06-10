/*
 * Profile editor bootstrap (people/edit.html?person=<id>).
 *
 * The editor is split into two lower section tabs:
 *   1. Infobox  — a structured form (<profile-infobox-editor>) for the identity
 *      table. Relationships are tree-derived and not edited here.
 *   2. Profile page — the shared <page-editor> for the prose content of
 *      people/<id>/data/profile.html.
 *
 * The infobox <include> in profile.html is left as a locked block in the page
 * editor (inline-includes is OFF), so the two tabs never write the same file:
 * the Infobox tab owns profile-table.html, the Profile tab owns profile.html.
 */
(function () {
    const params = new URLSearchParams(window.location.search);
    const personId = (params.get('person') || '').trim();
    const isValidPersonId = /^[a-zA-Z0-9_-]{1,64}$/.test(personId);

    // Blocks offered in the Profile-page tab. The infobox is intentionally not a
    // block here — it has its own tab.
    const PROFILE_BLOCK_LIBRARY = {
        categories: [
            { id: 'profile', label: 'Profile' },
        ],
        blocks: [
            {
                id: 'profile-figure',
                category: 'profile',
                label: 'Portrait figure',
                icon: 'bi-person-square',
                description: 'Image from data/images with a caption.',
                html: '<figure class="profile-figure"><img src="images/photo.jpg" alt="Describe this image"><figcaption>Caption for this photo.</figcaption></figure>',
                transforms: [],
            },
            {
                id: 'profile-timeline',
                category: 'profile',
                label: 'Timeline',
                icon: 'bi-clock-history',
                description: 'Chronological list of life events.',
                html: '<ul class="profile-timeline"><li><b>1900</b> — Born.</li><li><b>1925</b> — Married.</li><li><b>1980</b> — Died.</li></ul>',
                transforms: ['paragraph'],
            },
            {
                id: 'profile-references',
                category: 'profile',
                label: 'References',
                icon: 'bi-journal-bookmark',
                description: 'Numbered list of sources for this profile.',
                html: '<ol class="profile-references"><li>Add a source…</li></ol>',
                transforms: ['paragraph'],
            },
        ],
        detect(el) {
            const tag = el.tagName.toLowerCase();
            if (tag === 'figure') {
                return 'profile-figure';
            }
            if (tag === 'ul' && el.classList.contains('profile-timeline')) {
                return 'profile-timeline';
            }
            if (tag === 'ol' && el.classList.contains('profile-references')) {
                return 'profile-references';
            }
            return null;
        },
    };

    // Queue the library if page-editor.js has not loaded yet; it adopts the
    // queue when it initialises.
    if (!window.PageEditorBlocks) {
        window.PageEditorBlocks = {
            __queue: [],
            registerLibrary(name, library) {
                this.__queue.push([name, library]);
            },
        };
    }
    window.PageEditorBlocks.registerLibrary('profile', PROFILE_BLOCK_LIBRARY);

    function configureEditor() {
        const editor = document.querySelector('page-editor');
        if (!editor) {
            return;
        }
        // Remove header/status elements that are not needed on the people
        // profile edit page. Doing this here keeps the change scoped to the
        // profile editor without altering the shared page-editor template.
        const countsEl = editor.querySelector('.page-editor__counts');
        if (countsEl) countsEl.remove();
        const sourceEl = editor.querySelector('.page-editor__source');
        if (sourceEl) sourceEl.remove();
        const statusEl = editor.querySelector('.page-editor__status');
        if (statusEl) statusEl.remove();
        editor.setAttribute('block-library', 'profile');
        editor.setAttribute('canvas-class', 'people-page__content');

        if (isValidPersonId) {
            // Edit only the profile prose. The infobox <include> stays a locked
            // block (inline-includes is deliberately not set), so this tab never
            // touches profile-table.html.
            editor.setAttribute('source', `people/${personId}/data/profile.html`);
            editor.setAttribute('return', `people/${personId}/profile.html`);
            editor.setAttribute('content-selector', '__fragment__');

            const assetBase = window.App?.resolveSiteUrl
                ? window.App.resolveSiteUrl(`people/${personId}/data`)
                : `../people/${personId}/data`;
            editor.setAttribute('asset-base', assetBase);

                // Replace the simple "Back to page" link with a breadcrumb on the
                // profile edit page so users see context (People → Profile).
                const backEl = editor.querySelector('.page-editor__back');
                if (backEl) {
                    const peopleIndexUrl = window.App?.resolveSiteUrl ? window.App.resolveSiteUrl('people/') : '../people/';
                    const profileUrl = window.App?.resolveSiteUrl ? window.App.resolveSiteUrl(`people/${personId}/profile.html`) : `../people/${personId}/profile.html`;
                    const titleInput = editor.querySelector('.page-editor__title-input');
                    const titleText = (titleInput && titleInput.value && titleInput.value.trim()) ? titleInput.value.trim() : 'Profile';

                    const nav = document.createElement('nav');
                    nav.className = 'page-editor__breadcrumb';
                    nav.setAttribute('aria-label', 'Breadcrumb');

                    const ol = document.createElement('ol');
                    ol.className = 'page-editor__breadcrumb-list';

                    const liHome = document.createElement('li');
                    liHome.className = 'page-editor__breadcrumb-item';
                    const aHome = document.createElement('a');
                    aHome.href = peopleIndexUrl;
                    aHome.textContent = 'People';
                    liHome.appendChild(aHome);

                    const liSep = document.createElement('li');
                    liSep.className = 'page-editor__breadcrumb-sep';
                    liSep.setAttribute('aria-hidden', 'true');
                    liSep.textContent = '›';

                    const liCurrent = document.createElement('li');
                    liCurrent.className = 'page-editor__breadcrumb-item';
                    const aCur = document.createElement('a');
                    aCur.href = profileUrl;
                    aCur.textContent = titleText;
                    liCurrent.appendChild(aCur);

                    ol.appendChild(liHome);
                    ol.appendChild(liSep);
                    ol.appendChild(liCurrent);
                    nav.appendChild(ol);

                    backEl.replaceWith(nav);
                }
        }
    }

    function configureInfobox() {
        const infobox = document.querySelector('profile-infobox-editor');
        if (infobox && isValidPersonId) {
            infobox.setAttribute('person', personId);
        }
    }

    function createSectionTabs() {
        const tabs = document.createElement('div');
        tabs.className = 'profile-edit__section-tabs page-editor__mode-tabs';
        tabs.setAttribute('role', 'tablist');
        tabs.setAttribute('aria-label', 'Profile editor sections');
        tabs.innerHTML = `
            <button type="button" class="page-editor__mode-tab profile-edit__tab is-active" data-edit-tab="infobox" role="tab" aria-selected="true">
                Infobox
            </button>
            <button type="button" class="page-editor__mode-tab profile-edit__tab" data-edit-tab="content" data-mode="page" role="tab" aria-selected="false">
                Profile page
            </button>
        `;
        return tabs;
    }

    function setupTabsForEditor(editor) {
        const toolbarRow = editor.querySelector('.page-editor__toolbar-row');
        const modeTabs = editor.querySelector('.page-editor__mode-tabs');
        const workspace = editor.querySelector('.page-editor__workspace');
        const pagePanel = editor.querySelector('[data-panel="page"]');
        const sourcePanel = editor.querySelector('[data-panel="source"]');

        if (!toolbarRow || !workspace || !pagePanel) {
            return;
        }

        // Ensure these header/status elements are removed after the editor
        // element upgrades so the change applies only to the profile edit page.
        const countsElAfter = editor.querySelector('.page-editor__counts');
        if (countsElAfter) countsElAfter.remove();
        const sourceElAfter = editor.querySelector('.page-editor__source');
        if (sourceElAfter) sourceElAfter.remove();
        const statusElAfter = editor.querySelector('.page-editor__status');
        if (statusElAfter) statusElAfter.remove();

        const sectionTabs = createSectionTabs();
        if (modeTabs) {
            modeTabs.replaceWith(sectionTabs);
        } else {
            toolbarRow.prepend(sectionTabs);
        }

        

        const infoboxPanel = document.createElement('div');
        infoboxPanel.className = 'page-editor__panel profile-edit__infobox-panel';
        infoboxPanel.dataset.editPanel = 'infobox';
        infoboxPanel.hidden = true;

        const infobox = document.createElement('profile-infobox-editor');
        if (isValidPersonId) {
            infobox.setAttribute('person', personId);
        }
        infoboxPanel.append(infobox);
        workspace.prepend(infoboxPanel);

        // Ensure the header shows a breadcrumb (People → Profile) instead of
        // a single "Back to page" button. Run here after the editor upgrades
        // so the header markup exists.
        if (!editor.querySelector('.page-editor__breadcrumb')) {
            const backEl = editor.querySelector('.page-editor__back');
            if (backEl) {
                const peopleIndexUrl = window.App?.resolveSiteUrl ? window.App.resolveSiteUrl('people/') : '../people/';
                const profileUrl = window.App?.resolveSiteUrl ? window.App.resolveSiteUrl(`people/${personId}/profile.html`) : `../people/${personId}/profile.html`;
                const titleInput = editor.querySelector('.page-editor__title-input');
                const titleText = (titleInput && titleInput.value && titleInput.value.trim()) ? titleInput.value.trim() : 'Profile';

                const nav = document.createElement('nav');
                nav.className = 'page-editor__breadcrumb';
                nav.setAttribute('aria-label', 'Breadcrumb');

                const ol = document.createElement('ol');
                ol.className = 'page-editor__breadcrumb-list';

                const liHome = document.createElement('li');
                liHome.className = 'page-editor__breadcrumb-item';
                const aHome = document.createElement('a');
                aHome.href = peopleIndexUrl;
                aHome.textContent = 'People';
                liHome.appendChild(aHome);

                const liSep = document.createElement('li');
                liSep.className = 'page-editor__breadcrumb-sep';
                liSep.setAttribute('aria-hidden', 'true');
                liSep.textContent = '›';

                const liCurrent = document.createElement('li');
                liCurrent.className = 'page-editor__breadcrumb-item';
                const aCur = document.createElement('a');
                aCur.href = profileUrl;
                aCur.textContent = titleText;
                liCurrent.appendChild(aCur);

                ol.appendChild(liHome);
                ol.appendChild(liSep);
                ol.appendChild(liCurrent);
                nav.appendChild(ol);

                backEl.replaceWith(nav);
            }
        }

        const saveGroup = editor.querySelector('.page-editor__save-group');
        const status = editor.querySelector('.page-editor__status');
        // If present, move the save group into the toolbar row so it sits on
        // the same line as the section tabs and can be right-aligned there.
        if (saveGroup && toolbarRow && !toolbarRow.contains(saveGroup)) {
            toolbarRow.append(saveGroup);
        }
        let profileStatusText = '';
        let profileStatusType = '';
        const normalizeProfileStatus = () => {
            if (!status || !status.textContent.includes('Switch to HTML')) {
                return;
            }
            status.textContent = status.textContent
                .replace(/\s*Switch to HTML for full control\./, '')
                .trim();
        };
        const statusObserver = status ? new MutationObserver(normalizeProfileStatus) : null;
        statusObserver?.observe(status, { childList: true, characterData: true, subtree: true });
        normalizeProfileStatus();

        const activate = (name) => {
            const tabs = Array.from(sectionTabs.querySelectorAll('[data-edit-tab]'));
            tabs.forEach((tab) => {
                const isActive = tab.dataset.editTab === name;
                tab.classList.toggle('is-active', isActive);
                tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });

            const isInfobox = name === 'infobox';
            infoboxPanel.hidden = !isInfobox;
            infoboxPanel.classList.toggle('is-active', isInfobox);
            pagePanel.hidden = isInfobox;
            pagePanel.classList.toggle('is-active', !isInfobox);
            if (sourcePanel) {
                sourcePanel.hidden = true;
                sourcePanel.classList.remove('is-active');
            }
            if (!isInfobox && typeof editor.setMode === 'function') {
                void editor.setMode('page');
            }

            if (status && isInfobox) {
                profileStatusText = status.textContent || profileStatusText;
                profileStatusType = status.dataset.type || profileStatusType;
                status.textContent = '';
                status.hidden = true;
                delete status.dataset.type;
            } else if (status && !isInfobox && profileStatusText) {
                status.textContent = profileStatusText;
                status.hidden = false;
                if (profileStatusType) {
                    status.dataset.type = profileStatusType;
                }
            }

        };

        sectionTabs.querySelectorAll('[data-edit-tab]').forEach((tab) => {
            tab.addEventListener('click', (event) => {
                event.preventDefault();
                activate(tab.dataset.editTab);
            });
        });

        activate('infobox');
    }

    function setupTabs() {
        customElements.whenDefined('page-editor').then(() => {
            const editor = document.querySelector('page-editor');
            if (!editor) {
                return;
            }
            setupTabsForEditor(editor);
        });
    }

    // This script is loaded after the editor markup but before page-editor.js
    // defines the custom element, so attributes are in place when it upgrades.
    configureEditor();
    configureInfobox();
    setupTabs();
})();
