(function initHomePageModule() {
    if (window.HomePage) {
        return;
    }

    const DEFAULT_POPULAR_PROFILES = window.SiteStatistics?.DEFAULT_POPULAR_PROFILES || [
        { personId: '15', kind: 'person' },
        { personId: '1', kind: 'person' },
        { personId: '2', kind: 'person' },
        { personId: '3', kind: 'person' },
    ];

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function defaultProfileImageUrl() {
        try {
            if (window.App?.resolveSiteUrl) {
                return window.App.resolveSiteUrl('assets/default-profile-photo.svg');
            }
        } catch (e) {
            // ignore
        }

        return '/assets/default-profile-photo.svg';
    }

    function resolvePeopleDbUrl(dbPath = '') {
        if (window.App?.resolvePeopleDbUrl) {
            return window.App.resolvePeopleDbUrl(dbPath);
        }

        const cleanPath = String(dbPath || '').replace(/^\//, '');
        return new URL(`data/Genepedia-Database/people/${cleanPath}`, window.location.href).href;
    }

    function resolveSearchPageUrl(query = '') {
        if (window.SiteStatistics?.resolveSearchPageUrl) {
            return window.SiteStatistics.resolveSearchPageUrl(query);
        }

        const trimmed = String(query || '').trim();
        const base = window.App?.resolveSiteUrl
            ? window.App.resolveSiteUrl('pages/search.html')
            : '../pages/search.html';
        const url = new URL(base, window.location.href);
        if (trimmed) {
            url.searchParams.set('q', trimmed);
        }
        return url.href;
    }

    function formatSearchChipLabel(query) {
        const trimmed = String(query || '').trim();
        if (!trimmed) {
            return '';
        }

        return trimmed.replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function renderPopularSearchChip(search) {
        const query = String(search?.query || '').trim();
        if (!query) {
            return '';
        }

        const label = String(search?.label || '').trim() || formatSearchChipLabel(query);
        return `<a href="${escapeHtml(resolveSearchPageUrl(query))}" class="site-chip">${escapeHtml(label)}</a>`;
    }

    function normalizeProfileKind(kind) {
        return String(kind || '').trim().toLowerCase() === 'pet' ? 'pet' : 'person';
    }

    async function fetchPersonRecord(personId, kind = 'person') {
        const id = String(personId || '').trim();
        if (!id) {
            return null;
        }

        const cacheKey = `${normalizeProfileKind(kind)}:${id}`;
        window.__homePagePersonRecordCache = window.__homePagePersonRecordCache || new Map();
        if (window.__homePagePersonRecordCache.has(cacheKey)) {
            return window.__homePagePersonRecordCache.get(cacheKey);
        }

        const promise = (async () => {
            try {
                const bucket = Math.floor((Math.max(1, Number(id.replace(/[^0-9]/g, '')) || 1) - 1) / 1000);
                const collection = normalizeProfileKind(kind) === 'pet' ? 'pets' : 'people';
                const basePath = collection === 'pets'
                    ? `../../data/Genepedia-Database/pets/persons/${bucket}/${id}.json`
                    : `persons/${bucket}/${id}.json`;
                const url = collection === 'pets'
                    ? new URL(basePath, window.location.href).href
                    : resolvePeopleDbUrl(basePath);
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) {
                    return null;
                }

                return await response.json();
            } catch (error) {
                return null;
            }
        })();

        window.__homePagePersonRecordCache.set(cacheKey, promise);
        return promise;
    }

    function formatLifespan(record, registryEntry) {
        const birthYear = String(
            record?.events?.birth?.year
            || registryEntry?.birthYear
            || '',
        ).trim();
        const deathYear = String(
            record?.events?.death?.year
            || registryEntry?.deathYear
            || '',
        ).trim();

        if (birthYear && deathYear) {
            return `${birthYear}\u2013${deathYear}`;
        }

        if (birthYear) {
            return `b. ${birthYear}`;
        }

        if (deathYear) {
            return `d. ${deathYear}`;
        }

        return '';
    }

    function buildProfileSummary(record) {
        const occupation = String(record?.occupation || '').trim();
        if (occupation) {
            return occupation;
        }

        const residence = String(record?.lastResidence || '').trim();
        if (residence) {
            return residence;
        }

        const birthPlace = String(record?.events?.birth?.place || '').trim();
        if (birthPlace) {
            return `Born in ${birthPlace}`;
        }

        return 'Explore this profile on Genepedia.';
    }

    async function loadRegistryEntry(personId, kind = 'person') {
        const id = String(personId || '').trim();
        if (!id) {
            return null;
        }

        try {
            if (normalizeProfileKind(kind) === 'pet') {
                const url = window.App?.resolveSiteUrl
                    ? window.App.resolveSiteUrl('pages/pets/pets.json')
                    : new URL('../pets/pets.json', window.location.href).href;
                const response = await fetch(url, { cache: 'no-store' });
                if (!response.ok) {
                    return null;
                }

                const data = await response.json();
                const pets = Array.isArray(data?.pets) ? data.pets : [];
                return pets.find((pet) => String(pet?.id) === id) || null;
            }

            if (window.PeopleRegistry?.loadPeopleRegistry) {
                const people = await window.PeopleRegistry.loadPeopleRegistry();
                return people.find((person) => String(person?.id) === id) || null;
            }
        } catch (error) {
            // ignore
        }

        return null;
    }

    function renderProfileTileSkeleton(personId, kind = 'person') {
        return `
            <article class="card home-page__tile home-page__profile-tile" data-person-id="${escapeHtml(personId)}" data-profile-kind="${escapeHtml(normalizeProfileKind(kind))}" aria-busy="true">
                <div class="home-page__profile-tile-skeleton">
                    <span class="home-page__profile-photo home-page__profile-photo--placeholder" aria-hidden="true"></span>
                    <span class="home-page__profile-body">
                        <span class="home-page__tile-title">Loading profile…</span>
                        <span class="home-page__tile-text">Please wait</span>
                    </span>
                </div>
            </article>
        `;
    }

    async function hydrateProfileTile(tile) {
        const personId = String(tile.dataset.personId || '').trim();
        const kind = normalizeProfileKind(tile.dataset.profileKind);
        if (!personId) {
            return;
        }

        tile.setAttribute('aria-busy', 'true');

        try {
            const [card, record, registryEntry] = await Promise.all([
                window.App?.loadPersonCard ? window.App.loadPersonCard(personId) : null,
                fetchPersonRecord(personId, kind),
                loadRegistryEntry(personId, kind),
            ]);

            const name = String(
                card?.name
                || record?.names?.display
                || registryEntry?.displayName
                || [registryEntry?.firstName, registryEntry?.lastName].filter(Boolean).join(' ')
                || `Profile ${personId}`,
            ).trim();
            const profileUrl = String(
                card?.profileUrl
                || (window.PeopleRegistry?.resolvePersonProfileUrl
                    ? window.PeopleRegistry.resolvePersonProfileUrl(personId, kind)
                    : (window.App?.resolveProfileUrl
                        ? window.App.resolveProfileUrl(personId, kind, 'profile.html')
                        : '')),
            ).trim();
            const defaultPhoto = defaultProfileImageUrl();
            const photoUrl = String(card?.photoUrl || '').trim() || defaultPhoto;
            const summary = buildProfileSummary(record);
            const meta = formatLifespan(record, registryEntry);

            tile.innerHTML = `
                <a class="home-page__profile-tile-link" href="${escapeHtml(profileUrl || '#')}">
                    <span class="home-page__profile-photo" aria-hidden="true">
                        <img src="${escapeHtml(photoUrl)}" alt="" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${escapeHtml(defaultPhoto)}';">
                    </span>
                    <span class="home-page__profile-body">
                        <span class="home-page__tile-title home-page__profile-name">${escapeHtml(name)}</span>
                        ${meta ? `<span class="home-page__profile-meta">${escapeHtml(meta)}</span>` : ''}
                        <span class="home-page__tile-text home-page__profile-summary">${escapeHtml(summary)}</span>
                    </span>
                </a>
            `;
        } catch (error) {
            tile.innerHTML = `
                <div class="home-page__profile-body">
                    <span class="home-page__tile-title">Profile ${escapeHtml(personId)}</span>
                    <span class="home-page__tile-text">Could not load profile details.</span>
                </div>
            `;
        } finally {
            tile.removeAttribute('aria-busy');
        }
    }

    async function fetchPopularProfiles(limit = 4) {
        if (window.SiteStatistics?.fetchPopularProfiles) {
            return window.SiteStatistics.fetchPopularProfiles(limit);
        }

        return DEFAULT_POPULAR_PROFILES.slice(0, limit);
    }

    async function fetchPopularSearches(limit = 6) {
        if (window.SiteStatistics?.fetchPopularSearches) {
            return window.SiteStatistics.fetchPopularSearches(limit);
        }

        return (window.SiteStatistics?.DEFAULT_POPULAR_SEARCHES || [
            { query: 'mandela', label: 'Mandela' },
            { query: 'smith', label: 'Smith' },
            { query: 'census 2026', label: 'Census 2026' },
        ]).slice(0, limit);
    }

    async function initPopularSearches() {
        const chips = document.getElementById('home-popular-searches');
        if (!chips) {
            return;
        }

        const searches = await fetchPopularSearches(6);
        chips.innerHTML = searches.map((search) => renderPopularSearchChip(search)).join('');
    }

    async function initPopularProfiles() {
        const grid = document.getElementById('home-popular-profiles');
        if (!grid) {
            return;
        }

        const profiles = await fetchPopularProfiles(4);
        grid.innerHTML = profiles.map((profile) => renderProfileTileSkeleton(profile.personId, profile.kind)).join('');
        grid.querySelectorAll('.home-page__profile-tile[data-person-id]').forEach((tile) => {
            void hydrateProfileTile(tile);
        });
    }

    function initHomePage() {
        void initPopularProfiles();
        void initPopularSearches();
    }

    window.HomePage = {
        initHomePage,
        initPopularProfiles,
        initPopularSearches,
        hydrateProfileTile,
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHomePage, { once: true });
    } else {
        initHomePage();
    }
})();
