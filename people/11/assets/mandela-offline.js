(() => {
    const htmlElement = document.documentElement;
    const sharedHeader = document.querySelector('full-header');
    const hasSharedHeader = Boolean(sharedHeader);
    const persistentSidebarMinWidth = 1120;
    const appearanceControlsMarkup = `<div data-offline-appearance-controls="true"><div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-custom-font-size vector-menu" id="skin-client-prefs-vector-feature-custom-font-size"><div class="vector-menu-heading">Text</div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div><form><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-0" type="radio" value="0" data-vector-setting="font-size"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-0"><span class="cdx-label__label__text">Small</span></label></div><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-1" type="radio" value="1" data-vector-setting="font-size"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-1"><span class="cdx-label__label__text">Standard</span></label></div><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-vector-feature-custom-font-size-group" id="skin-client-pref-vector-feature-custom-font-size-value-2" type="radio" value="2" data-vector-setting="font-size"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-custom-font-size-value-2"><span class="cdx-label__label__text">Large</span></label></div></form></div></li></ul></div></div><div class="mw-portlet mw-portlet-skin-client-prefs-vector-feature-limited-width vector-menu" id="skin-client-prefs-vector-feature-limited-width"><div class="vector-menu-heading">Width</div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div><form><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-vector-feature-limited-width-group" id="skin-client-pref-vector-feature-limited-width-value-1" type="radio" value="1" data-vector-setting="width"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-limited-width-value-1"><span class="cdx-label__label__text">Standard</span></label></div><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-vector-feature-limited-width-group" id="skin-client-pref-vector-feature-limited-width-value-0" type="radio" value="0" data-vector-setting="width"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-vector-feature-limited-width-value-0"><span class="cdx-label__label__text">Wide</span></label></div></form></div></li></ul></div></div><div class="mw-portlet mw-portlet-skin-client-prefs-skin-theme vector-menu" id="skin-client-prefs-skin-theme"><div class="vector-menu-heading">Color</div><div class="vector-menu-content"><ul class="vector-menu-content-list"><li class="mw-list-item mw-list-item-js"><div><form><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-os" type="radio" value="os" data-vector-setting="theme"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-os"><span class="cdx-label__label__text">Automatic</span></label></div><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-day" type="radio" value="day" data-vector-setting="theme"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-day"><span class="cdx-label__label__text">Light</span></label></div><div class="cdx-radio"><input class="cdx-radio__input" name="skin-client-pref-skin-theme-group" id="skin-client-pref-skin-theme-value-night" type="radio" value="night" data-vector-setting="theme"><span class="cdx-radio__icon"></span><label class="cdx-label cdx-radio__label" for="skin-client-pref-skin-theme-value-night"><span class="cdx-label__label__text">Dark</span></label></div></form></div></li></ul></div></div></div>`;

    htmlElement.classList.remove('client-nojs');
    htmlElement.classList.add('client-js');

    // Normalize appearance heading text: use "Theme" instead of "Color".
    function normalizeAppearanceHeading() {
        document.querySelectorAll('.vector-menu-heading').forEach((el) => {
            if (el && el.textContent && el.textContent.trim() === 'Color') {
                el.textContent = 'Theme';
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', normalizeAppearanceHeading, { once: true });
    } else {
        normalizeAppearanceHeading();
    }

    function forceWideLayout() {
        htmlElement.classList.remove('vector-feature-limited-width-clientpref-1');
        htmlElement.classList.add('vector-feature-limited-width-clientpref-0', 'vector-feature-limited-width-content-enabled');
    }

    forceWideLayout();

    const offlineStyles = document.createElement('style');
    offlineStyles.textContent = `
        .vector-dropdown .vector-dropdown-checkbox:focus{outline:0}
        .vector-dropdown .vector-dropdown-checkbox:focus+.vector-dropdown-label{box-shadow:none;outline:0}
        .vector-appearance fieldset{border:0;margin:0;padding:0}
        .vector-appearance .skin-client-pref-exclusion-notice{display:none}
        #vector-main-menu-toc-container{padding-top:0;border-top:0}
        #vector-toc-pinned-container{background:transparent !important}
        #vector-main-menu-pinned-container > #vector-main-menu-toc-container{margin-top:0.5rem}
        #vector-main-menu-toc-container .vector-toc-landmark{display:block;width:100%;margin:0;padding:0}
        #vector-main-menu-toc-container .vector-pinned-container{width:100%;margin:0;padding:0;background:transparent !important}
        #vector-main-menu-toc-container .vector-toc,
        #vector-main-menu-toc-container .vector-toc .vector-toc-contents,
        #vector-main-menu-toc-container .vector-toc .vector-toc-list{width:100% !important;min-width:0;max-width:none;margin:0;padding:0;box-sizing:border-box;list-style:none}
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header{margin-left:0;padding-bottom:0.375rem;margin-bottom:0.375rem;align-items:center}
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header-actions{flex-wrap:nowrap}
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header-unpinned .vector-pinnable-header-pin-button,
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header-pinned .vector-pinnable-header-unpin-button{display:inline-flex}
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header-pinned .vector-pinnable-header-pin-button,
        #vector-main-menu-toc-container .vector-toc .vector-pinnable-header-unpinned .vector-pinnable-header-unpin-button{display:none}
        #vector-main-menu-toc-container .vector-toc .vector-toc-list-item{position:relative;margin:0 0 0.1rem 0;padding-left:0;list-style:none}
        #vector-main-menu-toc-container .vector-toc .vector-toc-list-item+.vector-toc-list-item{margin-top:0}
        #vector-main-menu-toc-container .vector-toc .vector-toc-link{display:flex;align-items:flex-start;gap:0;width:100%;padding:0.375rem 0;color:var(--vector-text) !important;word-break:normal;overflow-wrap:anywhere;line-height:normal;background:transparent;box-sizing:border-box}
        #vector-main-menu-toc-container .vector-toc .vector-toc-text{display:block;flex:1 1 auto;padding:0;width:auto !important}
        #vector-main-menu-toc-container .vector-toc .vector-toc-level-1>.vector-toc-list,
        #vector-main-menu-toc-container .vector-toc .vector-toc-level-2{padding-left:0.75rem}
        #vector-main-menu-toc-container .vector-toc .vector-toc-toggle{display:none;left:0;top:0.45rem}
        #vector-main-menu-toc-container .vector-toc .vector-toc-list-item-active>.vector-toc-link,
        #vector-main-menu-toc-container .vector-toc .vector-toc-level-1-active>.vector-toc-link{color:var(--vector-text) !important;font-weight:inherit}
        #vector-main-menu-toc-container .vector-toc .vector-toc-list-item-active>.vector-toc-link .vector-toc-text,
        #vector-main-menu-toc-container .vector-toc .vector-toc-level-1-active>.vector-toc-link .vector-toc-text{width:auto !important}
    `;
    document.head.appendChild(offlineStyles);

    const pinnableFeatures = {
        'page-tools-pinned': {
            elementId: 'vector-page-tools',
            pinnedContainerId: 'vector-page-tools-pinned-container',
            unpinnedContainerId: 'vector-page-tools-unpinned-container',
            checkboxId: 'vector-page-tools-dropdown-checkbox',
            enabledClass: 'vector-feature-page-tools-pinned-enabled',
            disabledClass: 'vector-feature-page-tools-pinned-disabled'
        },
        'toc-pinned': {
            elementId: 'mw-panel-toc',
            pinnedContainerId: 'vector-toc-sidebar-host',
            unpinnedContainerId: 'vector-page-titlebar-toc-unpinned-container',
            checkboxId: 'vector-page-titlebar-toc-checkbox',
            enabledClass: 'vector-feature-toc-pinned-clientpref-1',
            disabledClass: 'vector-feature-toc-pinned-clientpref-0'
        }
    };

    if (!hasSharedHeader) {
        Object.assign(pinnableFeatures, {
            'main-menu-pinned': {
                elementId: 'vector-main-menu',
                pinnedContainerId: 'vector-main-menu-pinned-container',
                unpinnedContainerId: 'vector-main-menu-unpinned-container',
                checkboxId: 'vector-main-menu-dropdown-checkbox',
                enabledClass: 'vector-feature-main-menu-pinned-enabled',
                disabledClass: 'vector-feature-main-menu-pinned-disabled'
            },
            'appearance-pinned': {
                elementId: 'vector-appearance',
                pinnedContainerId: 'vector-appearance-pinned-container',
                unpinnedContainerId: 'vector-appearance-unpinned-container',
                checkboxId: 'vector-appearance-dropdown-checkbox',
                enabledClass: 'vector-feature-appearance-pinned-clientpref-1',
                disabledClass: 'vector-feature-appearance-pinned-clientpref-0'
            }
        });
    }

    function ensureTocSidebarHost() {
        if (hasSharedHeader) {
            const mainMenuPinnedContainer = document.getElementById('vector-main-menu-pinned-container');
            if (mainMenuPinnedContainer) {
                let host = document.getElementById('vector-main-menu-toc-container');
                if (!host) {
                    host = document.createElement('div');
                    host.id = 'vector-main-menu-toc-container';
                    host.className = 'vector-main-menu-toc-container';

                    const mainMenu = mainMenuPinnedContainer.querySelector('#vector-main-menu');
                    if (mainMenu?.nextSibling) {
                        mainMenuPinnedContainer.insertBefore(host, mainMenu.nextSibling);
                    } else {
                        mainMenuPinnedContainer.appendChild(host);
                    }
                }

                pinnableFeatures['toc-pinned'].pinnedContainerId = host.id;
                return;
            }
        }

        const toc = document.getElementById('mw-panel-toc');
        let host = document.querySelector('.vector-column-start > .vector-sticky-pinned-container');

        if (!host && toc && toc.parentElement) {
            host = toc.parentElement;
        }

        if (host && !host.id) {
            host.id = 'vector-toc-sidebar-host';
        }

        if (host) {
            pinnableFeatures['toc-pinned'].pinnedContainerId = host.id;
        }
    }

    function normalizeTocHeadingText(value) {
        return String(value || '')
            .replace(/\[\s*edit\s*\]/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function collectTocEntries() {
        const headingWrappers = [...document.querySelectorAll('#mw-content-text .mw-heading2, #mw-content-text .mw-heading3')];
        const seenIds = new Set();
        const entries = [];
        let currentSection = null;
        let sectionIndex = 0;
        let subsectionIndex = 0;

        headingWrappers.forEach((wrapper) => {
            const heading = wrapper.querySelector('h2[id], h3[id]');
            if (!heading || seenIds.has(heading.id)) {
                return;
            }

            const text = normalizeTocHeadingText(heading.textContent);
            if (!text || text === 'Contents') {
                return;
            }

            seenIds.add(heading.id);

            if (wrapper.classList.contains('mw-heading2')) {
                sectionIndex += 1;
                subsectionIndex = 0;
                currentSection = {
                    id: heading.id,
                    text,
                    level: 1,
                    number: String(sectionIndex),
                    children: []
                };
                entries.push(currentSection);
                return;
            }

            if (!currentSection) {
                return;
            }

            subsectionIndex += 1;
            currentSection.children.push({
                id: heading.id,
                text,
                level: 2,
                number: `${sectionIndex}.${subsectionIndex}`,
                children: []
            });
        });

        return entries;
    }

    function buildTocText(number, text) {
        const content = document.createElement('div');
        content.className = 'vector-toc-text';

        if (number) {
            const numberNode = document.createElement('span');
            numberNode.className = 'vector-toc-numb';
            numberNode.textContent = number;
            content.appendChild(numberNode);
        }

        const textNode = document.createElement('span');
        textNode.textContent = text;
        content.appendChild(textNode);

        return content;
    }

    function buildTocListItem(entry) {
        const item = document.createElement('li');
        item.id = `toc-${entry.id}`;
        item.className = `vector-toc-list-item vector-toc-level-${entry.level}`;

        const link = document.createElement('a');
        link.className = 'vector-toc-link';
        link.href = `#${entry.id}`;
        link.appendChild(buildTocText(entry.number, entry.text));

        // Wrap the link and the toggle in a header container so the toggle
        // can be positioned relative to the link (not the full li height).
        const header = document.createElement('div');
        header.className = 'vector-toc-entry';
        header.appendChild(link);

        if (entry.children.length > 0) {
            // Default to collapsed state: do not add the 'expanded' class here.
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'cdx-button cdx-button--weight-quiet cdx-button--icon-only vector-toc-toggle';
            toggle.setAttribute('aria-controls', `toc-${entry.id}-sublist`);
            // Start collapsed by default
            toggle.setAttribute('aria-expanded', 'false');

            const icon = document.createElement('span');
            icon.className = 'vector-icon bi bi-chevron-down';
            icon.setAttribute('aria-hidden', 'true');
            toggle.appendChild(icon);

            const label = document.createElement('span');
            label.textContent = `Toggle ${entry.text} subsection`;
            toggle.appendChild(label);

            header.appendChild(toggle);

            const subList = document.createElement('ul');
            subList.id = `toc-${entry.id}-sublist`;
            subList.className = 'vector-toc-list';
            entry.children.forEach((child) => {
                subList.appendChild(buildTocListItem(child));
            });

            item.appendChild(header);
            item.appendChild(subList);
        } else {
            item.appendChild(header);
        }

        return item;
    }

    function rebuildTocFromContent() {
        const tocList = document.getElementById('mw-panel-toc-list');
        if (!tocList) {
            return;
        }

        const entries = collectTocEntries();
        if (entries.length === 0) {
            return;
        }

        const nextList = document.createElement('ul');
        nextList.className = 'vector-toc-contents';
        nextList.id = 'mw-panel-toc-list';

        const topItem = document.createElement('li');
        topItem.id = 'toc-mw-content-text';
        topItem.className = 'vector-toc-list-item vector-toc-level-1';

        const topLink = document.createElement('a');
        topLink.className = 'vector-toc-link';
        topLink.href = '#firstHeading';
        topLink.appendChild(buildTocText('', '(Top)'));
        topItem.appendChild(topLink);
        nextList.appendChild(topItem);

        entries.forEach((entry) => {
            nextList.appendChild(buildTocListItem(entry));
        });

        tocList.replaceWith(nextList);
    }

    function normalizeTocHeaderLayout() {
        const header = document.querySelector('#vector-toc .vector-pinnable-header');
        if (!header) {
            return;
        }

        const existingLabel = header.querySelector('.vector-pinnable-header-label');
        if (existingLabel && existingLabel.tagName !== 'DIV') {
            const replacementLabel = document.createElement('div');
            replacementLabel.className = existingLabel.className;
            replacementLabel.textContent = existingLabel.textContent;
            existingLabel.replaceWith(replacementLabel);
        }

        let actions = header.querySelector('.vector-pinnable-header-actions');
        if (!actions) {
            actions = document.createElement('div');
            actions.className = 'vector-pinnable-header-actions';

            header.querySelectorAll('.vector-pinnable-header-toggle-button').forEach((button) => {
                actions.appendChild(button);
            });

            header.appendChild(actions);
        }
    }

    function updateFeatureClasses(feature, pinned) {
        if (!feature.enabledClass || !feature.disabledClass) {
            return;
        }

        htmlElement.classList.toggle(feature.enabledClass, pinned);
        htmlElement.classList.toggle(feature.disabledClass, !pinned);
    }

    function updatePinnableHeader(element, pinned) {
        if (!element) {
            return;
        }

        element.querySelectorAll('.vector-pinnable-header').forEach((header) => {
            header.classList.toggle('vector-pinnable-header-pinned', pinned);
            header.classList.toggle('vector-pinnable-header-unpinned', !pinned);
        });
    }

    function movePinnableElement(elementId, targetId, pinned) {
        const element = document.getElementById(elementId);
        const target = document.getElementById(targetId);

        if (!element || !target || element.parentElement === target) {
            updatePinnableHeader(element, pinned);
            return;
        }

        target.appendChild(element);
        updatePinnableHeader(element, pinned);
    }

    function setPinnableFeature(featureName, pinned) {
        const feature = pinnableFeatures[featureName];

        if (!feature) {
            return;
        }

        const shouldPin = shouldPinFeature(featureName, pinned);

        updateFeatureClasses(feature, shouldPin);
        movePinnableElement(
            feature.elementId,
            shouldPin ? feature.pinnedContainerId : feature.unpinnedContainerId,
            shouldPin
        );

        const checkbox = document.getElementById(feature.checkboxId);
        if (checkbox) {
            checkbox.checked = false;
        }
    }

    function getPinnableFeatureName(button) {
        const header = button.closest('.vector-pinnable-header');
        return header ? header.getAttribute('data-feature-name') : '';
    }

    function shouldUsePersistentSidebars() {
        return window.innerWidth >= persistentSidebarMinWidth;
    }

    function shouldPinFeature(featureName, requestedPinned) {
        if (featureName === 'toc-pinned' || featureName === 'page-tools-pinned') {
            return shouldUsePersistentSidebars();
        }

        return Boolean(requestedPinned);
    }

    function ensureInitialPinnableLocations() {
        Object.entries(pinnableFeatures).forEach(([featureName, feature]) => {
            const pinned = feature.enabledClass
                ? htmlElement.classList.contains(feature.enabledClass)
                : false;

            const shouldPin = shouldPinFeature(featureName, pinned);

            updateFeatureClasses(feature, shouldPin);

            movePinnableElement(
                feature.elementId,
                shouldPin ? feature.pinnedContainerId : feature.unpinnedContainerId,
                shouldPin
            );
        });
    }

    function ensureAppearanceControls() {
        if (hasSharedHeader) {
            return;
        }

        const appearance = document.getElementById('vector-appearance');

        if (!appearance || appearance.querySelector('[data-offline-appearance-controls]')) {
            return;
        }

        appearance.insertAdjacentHTML('beforeend', appearanceControlsMarkup);
        appearance.querySelector('.mw-portlet-skin-client-prefs-vector-feature-limited-width')?.remove();

        syncAppearanceControls();
    }

    function replaceClassByPrefix(prefix, nextClass) {
        [...htmlElement.classList].forEach((className) => {
            if (className.startsWith(prefix)) {
                htmlElement.classList.remove(className);
            }
        });
        htmlElement.classList.add(nextClass);
    }

    function getCurrentFontSize() {
        if (htmlElement.classList.contains('vector-feature-custom-font-size-clientpref-0')) {
            return '0';
        }
        if (htmlElement.classList.contains('vector-feature-custom-font-size-clientpref-2')) {
            return '2';
        }
        return '1';
    }

    function getCurrentWidth() {
        return htmlElement.classList.contains('vector-feature-limited-width-clientpref-1')
            ? '1'
            : '0';
    }

    function getCurrentTheme() {
        if (htmlElement.classList.contains('skin-theme-clientpref-os')) {
            return 'os';
        }
        if (htmlElement.classList.contains('skin-theme-clientpref-day')) {
            return 'day';
        }
        return 'night';
    }

    function syncAppearanceControls() {
        const settings = {
            'font-size': getCurrentFontSize(),
            theme: getCurrentTheme()
        };

        document.querySelectorAll('[data-offline-appearance-controls] [data-vector-setting]').forEach((input) => {
            input.checked = input.value === settings[input.getAttribute('data-vector-setting')];
        });
    }

    function applyAppearanceSetting(input) {
        const setting = input.getAttribute('data-vector-setting');
        const value = input.value;

        if (setting === 'width') {
            forceWideLayout();
            syncAppearanceControls();
            return;
        }

        if (setting === 'font-size') {
            replaceClassByPrefix('vector-feature-custom-font-size-clientpref-', `vector-feature-custom-font-size-clientpref-${value}`);
        }

        if (setting === 'theme') {
            replaceClassByPrefix('skin-theme-clientpref-', `skin-theme-clientpref-${value}`);
        }

        syncAppearanceControls();
    }

    ensureTocSidebarHost();
    rebuildTocFromContent();
    normalizeTocHeaderLayout();
    ensureAppearanceControls();
    ensureInitialPinnableLocations();

    function closeOtherDropdowns(activeCheckbox) {
        document.querySelectorAll('.vector-dropdown-checkbox').forEach((checkbox) => {
            if (checkbox !== activeCheckbox) {
                checkbox.checked = false;
            }
        });
    }

    document.querySelectorAll('.vector-dropdown-checkbox').forEach((checkbox) => {
        checkbox.addEventListener('change', () => {
            if (checkbox.checked) {
                closeOtherDropdowns(checkbox);
            }
        });
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element) || !event.target.closest('.vector-dropdown')) {
            closeOtherDropdowns(null);
        }
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const tocToggle = event.target.closest('#mw-panel-toc .vector-toc-toggle');
        if (!tocToggle) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const listItem = tocToggle.closest('.vector-toc-level-1');
        if (!listItem) {
            return;
        }

        const isExpanded = listItem.classList.toggle('vector-toc-list-item-expanded');
        tocToggle.setAttribute('aria-expanded', String(isExpanded));
    });

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element)) {
            return;
        }

        const pinButton = event.target.closest('.vector-pinnable-header-pin-button');
        const unpinButton = event.target.closest('.vector-pinnable-header-unpin-button');

        if (!pinButton && !unpinButton) {
            return;
        }

        if (hasSharedHeader && (pinButton || unpinButton).closest('full-header')) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        setPinnableFeature(getPinnableFeatureName(pinButton || unpinButton), Boolean(pinButton));
    });

    document.addEventListener('change', (event) => {
        if (!(event.target instanceof HTMLInputElement) || !event.target.matches('[data-vector-setting]')) {
            return;
        }

        if (hasSharedHeader && event.target.closest('full-header')) {
            return;
        }

        if (event.target.closest('[data-offline-appearance-controls]')) {
            applyAppearanceSetting(event.target);
        }
    });

    document.querySelectorAll('form[action="#"]').forEach((form) => {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
        });
    });

    window.addEventListener('resize', ensureInitialPinnableLocations);

    document.querySelectorAll('.mw-collapsible').forEach((section, index) => {
        if (section.querySelector('.mw-collapsible-toggle')) {
            return;
        }

        const header = section.querySelector('caption, th, h2, h3, h4, .navbox-title');
        if (!header) {
            return;
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'mw-collapsible-toggle';
        toggle.setAttribute('aria-expanded', String(!section.classList.contains('mw-collapsed')));
        toggle.textContent = section.classList.contains('mw-collapsed') ? 'show' : 'hide';
        header.appendChild(toggle);

        function setCollapsed(isCollapsed) {
            section.classList.toggle('mw-collapsed', isCollapsed);
            toggle.textContent = isCollapsed ? 'show' : 'hide';
            toggle.setAttribute('aria-expanded', String(!isCollapsed));
            section.querySelectorAll('tbody > tr, .mw-collapsible-content').forEach((child, childIndex) => {
                if (header.contains(child)) {
                    return;
                }
                if (childIndex === 0 && child.contains(header)) {
                    return;
                }
                child.style.display = isCollapsed ? 'none' : '';
            });
        }

        toggle.addEventListener('click', () => {
            setCollapsed(!section.classList.contains('mw-collapsed'));
        });

        if (section.classList.contains('mw-collapsed')) {
            setCollapsed(true);
        }

        section.dataset.offlineCollapsibleIndex = String(index);
    });
})();
