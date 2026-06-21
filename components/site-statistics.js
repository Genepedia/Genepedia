(function initSiteStatisticsModule() {
    if (window.SiteStatistics) {
        return;
    }

    const DEFAULT_POPULAR_PROFILES = [
        { personId: '15', kind: 'person' },
        { personId: '1', kind: 'person' },
        { personId: '2', kind: 'person' },
        { personId: '3', kind: 'person' },
    ];

    const DEFAULT_POPULAR_SEARCHES = [
        { query: 'mandela', label: 'Mandela' },
        { query: 'smith', label: 'Smith' },
        { query: 'census 2026', label: 'Census 2026' },
    ];

    const STATISTICS_WINDOWS = ['24h', '3d', '7d', '30d', '60d', '90d', '6m', '1y', 'all'];
    const STATISTICS_LEADERBOARD_LIMIT = 24;

    function resolveStatisticsDbUrl(dbPath = '') {
        if (window.App?.resolveStatisticsDbUrl) {
            return window.App.resolveStatisticsDbUrl(dbPath);
        }

        const cleanPath = String(dbPath || '').replace(/^\//, '');
        return new URL(`data/Genepedia-Database/statistics/${cleanPath}`, window.location.href).href;
    }

    function resolveGitHubApiUrl(fileName) {
        const apiBase = String(
            window.App?.getGitHubApiBase?.()
            || window.App?.GitHubApiBase
            || '',
        ).trim().replace(/\/+$/, '');

        if (!apiBase) {
            return '';
        }

        return new URL(fileName, `${apiBase}/`).href;
    }

    function gitHubFetchInit(init) {
        return window.App?.getGitHubFetchInit?.(init) || { credentials: 'include', ...(init || {}) };
    }

    function normalizeProfileKind(kind) {
        return String(kind || '').trim().toLowerCase() === 'pet' ? 'pet' : 'person';
    }

    function normalizePopularProfiles(payloadProfiles, limit = 4) {
        const seen = new Set();
        const profiles = (Array.isArray(payloadProfiles) ? payloadProfiles : [])
            .map((entry) => ({
                personId: String(entry?.person_id || entry?.personId || '').trim(),
                kind: normalizeProfileKind(entry?.kind),
                views: Number(entry?.views || 0),
            }))
            .filter((entry) => {
                if (!entry.personId) {
                    return false;
                }
                const key = `${entry.kind}:${entry.personId}`;
                if (seen.has(key)) {
                    return false;
                }
                seen.add(key);
                return true;
            })
            .slice(0, limit);

        return profiles.length ? profiles : DEFAULT_POPULAR_PROFILES.slice(0, limit);
    }

    function normalizePopularSearches(payloadSearches, limit = 8) {
        const searches = (Array.isArray(payloadSearches) ? payloadSearches : [])
            .map((entry) => {
                const query = String(entry?.query || '').trim();
                if (!query) {
                    return null;
                }

                return {
                    query,
                    label: String(entry?.label || entry?.query || '').trim() || query,
                    count: Number(entry?.count || 0),
                };
            })
            .filter(Boolean)
            .slice(0, limit);

        return searches.length ? searches : DEFAULT_POPULAR_SEARCHES.slice(0, limit);
    }

    function parseProfilesFromStaticStore(data, limit = 4) {
        if (data?.profiles && typeof data.profiles === 'object') {
            const profiles = Object.entries(data.profiles)
                .map(([key, entry]) => {
                    const [kind, personId] = String(key).split(':', 2);
                    return {
                        kind: normalizeProfileKind(kind),
                        personId: String(personId || '').trim(),
                        views: Number(entry?.views ?? entry) || 0,
                    };
                })
                .filter((entry) => entry.personId)
                .sort((a, b) => b.views - a.views || a.personId.localeCompare(b.personId));

            if (profiles.length) {
                return profiles.slice(0, limit);
            }
        }

        const views = data?.views && typeof data.views === 'object' ? data.views : {};
        const legacyProfiles = Object.entries(views)
            .map(([key, count]) => {
                const [kind, personId] = String(key).split(':', 2);
                return {
                    kind: normalizeProfileKind(kind),
                    personId: String(personId || '').trim(),
                    views: Number(count) || 0,
                };
            })
            .filter((entry) => entry.personId)
            .sort((a, b) => b.views - a.views || a.personId.localeCompare(b.personId));

        return legacyProfiles.length ? legacyProfiles.slice(0, limit) : DEFAULT_POPULAR_PROFILES.slice(0, limit);
    }

    function parseSearchesFromStaticStore(data, limit = 8) {
        const queries = data?.queries && typeof data.queries === 'object' ? data.queries : {};
        const searches = Object.entries(queries)
            .map(([query, entry]) => ({
                query: String(query).trim(),
                label: String(query).trim(),
                count: Number(entry?.count ?? entry) || 0,
            }))
            .filter((entry) => entry.query)
            .sort((a, b) => b.count - a.count || a.query.localeCompare(b.query));

        if (searches.length) {
            return searches.slice(0, limit);
        }

        const popular = Array.isArray(data?.popularSearches) ? data.popularSearches : [];
        if (popular.length) {
            return normalizePopularSearches(popular, limit);
        }

        return DEFAULT_POPULAR_SEARCHES.slice(0, limit);
    }

    async function fetchStatisticsMetric(metric, limit, window = 'all') {
        const apiUrl = resolveGitHubApiUrl('github-statistics.php');
        if (!apiUrl) {
            return null;
        }

        try {
            const url = new URL(apiUrl);
            url.searchParams.set('metric', metric);
            url.searchParams.set('limit', String(limit));
            if (window && window !== 'all') {
                url.searchParams.set('window', window);
            }
            const response = await fetch(url.href, gitHubFetchInit());
            if (!response.ok) {
                return null;
            }

            const payload = await response.json();
            return payload?.ok ? payload : null;
        } catch (error) {
            return null;
        }
    }

    function readLeaderboardFromStatic(data, type, window, limit) {
        const boards = data?.[type] && typeof data[type] === 'object' ? data[type] : null;
        const entries = boards?.[window];
        if (!Array.isArray(entries) || !entries.length) {
            return null;
        }

        return type === 'profiles'
            ? normalizePopularProfiles(entries, limit)
            : normalizePopularSearches(entries, limit);
    }

    async function fetchLeaderboards() {
        const apiPayload = await fetchStatisticsMetric('leaderboards', STATISTICS_LEADERBOARD_LIMIT);
        if (apiPayload?.leaderboards) {
            return apiPayload.leaderboards;
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('leaderboards.json'), { cache: 'no-store' });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            // ignore
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('summary.json'), { cache: 'no-store' });
            if (response.ok) {
                const summary = await response.json();
                if (summary?.leaderboards) {
                    return summary.leaderboards;
                }
            }
        } catch (error) {
            // ignore
        }

        return null;
    }

    async function fetchPopularProfiles(limit = 4, window = 'all') {
        const apiPayload = await fetchStatisticsMetric('popular_profiles', limit, window);
        if (apiPayload?.profiles) {
            return normalizePopularProfiles(apiPayload.profiles, limit);
        }

        if (window !== 'all') {
            try {
                const leaderboards = await fetchLeaderboards();
                const fromBoard = readLeaderboardFromStatic(leaderboards, 'profiles', window, limit);
                if (fromBoard?.length) {
                    return fromBoard;
                }
            } catch (error) {
                // ignore
            }
        }

        const legacyUrl = resolveGitHubApiUrl('github-profile-views.php');
        if (legacyUrl) {
            try {
                const url = new URL(legacyUrl);
                url.searchParams.set('limit', String(limit));
                if (window && window !== 'all') {
                    url.searchParams.set('window', window);
                }
                const response = await fetch(url.href, gitHubFetchInit());
                if (response.ok) {
                    const payload = await response.json();
                    if (payload?.ok && payload.profiles) {
                        return normalizePopularProfiles(payload.profiles, limit);
                    }
                }
            } catch (error) {
                // fall through
            }
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('profile-views.json'), { cache: 'no-store' });
            if (response.ok) {
                return parseProfilesFromStaticStore(await response.json(), limit);
            }
        } catch (error) {
            // ignore
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('summary.json'), { cache: 'no-store' });
            if (response.ok) {
                const summary = await response.json();
                if (summary?.leaderboards?.profiles?.[window]) {
                    return normalizePopularProfiles(summary.leaderboards.profiles[window], limit);
                }
                if (window === 'all' && summary?.popularProfiles) {
                    return normalizePopularProfiles(summary.popularProfiles, limit);
                }
            }
        } catch (error) {
            // ignore
        }

        return DEFAULT_POPULAR_PROFILES.slice(0, limit);
    }

    async function fetchPopularSearches(limit = 8, window = 'all') {
        const apiPayload = await fetchStatisticsMetric('popular_searches', limit, window);
        if (apiPayload?.searches) {
            return normalizePopularSearches(apiPayload.searches, limit);
        }

        if (window !== 'all') {
            try {
                const leaderboards = await fetchLeaderboards();
                const fromBoard = readLeaderboardFromStatic(leaderboards, 'searches', window, limit);
                if (fromBoard?.length) {
                    return fromBoard;
                }
            } catch (error) {
                // ignore
            }
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('search-queries.json'), { cache: 'no-store' });
            if (response.ok) {
                return parseSearchesFromStaticStore(await response.json(), limit);
            }
        } catch (error) {
            // ignore
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('summary.json'), { cache: 'no-store' });
            if (response.ok) {
                const summary = await response.json();
                if (summary?.leaderboards?.searches?.[window]) {
                    return normalizePopularSearches(summary.leaderboards.searches[window], limit);
                }
                if (window === 'all' && summary?.popularSearches) {
                    return normalizePopularSearches(summary.popularSearches, limit);
                }
            }
        } catch (error) {
            // ignore
        }

        return DEFAULT_POPULAR_SEARCHES.slice(0, limit);
    }

    async function fetchSummary() {
        const apiPayload = await fetchStatisticsMetric('summary', 8);
        if (apiPayload?.summary) {
            return apiPayload.summary;
        }

        try {
            const response = await fetch(resolveStatisticsDbUrl('summary.json'), { cache: 'no-store' });
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            // ignore
        }

        return null;
    }

    async function postStatisticsEvent(body) {
        const apiUrl = resolveGitHubApiUrl('github-statistics.php')
            || resolveGitHubApiUrl('github-profile-views.php');
        if (!apiUrl) {
            return false;
        }

        try {
            const response = await fetch(apiUrl, gitHubFetchInit({
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }));
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    function shouldRecordSessionEvent(sessionKey) {
        try {
            if (sessionStorage.getItem(sessionKey)) {
                return false;
            }
            sessionStorage.setItem(sessionKey, '1');
            return true;
        } catch (error) {
            return true;
        }
    }

    function clearSessionEvent(sessionKey) {
        try {
            sessionStorage.removeItem(sessionKey);
        } catch (error) {
            // ignore
        }
    }

    async function recordProfileView(personId, kind = 'person') {
        const id = String(personId || '').trim();
        if (!id) {
            return;
        }

        const normalizedKind = normalizeProfileKind(kind);
        const sessionKey = `profile-view:${normalizedKind}:${id}`;
        if (!shouldRecordSessionEvent(sessionKey)) {
            return;
        }

        const ok = await postStatisticsEvent({
            event: 'profile_view',
            person_id: id,
            kind: normalizedKind,
        });

        if (!ok) {
            clearSessionEvent(sessionKey);
        }
    }

    async function recordSearchQuery(query, resultCount = 0) {
        const normalized = String(query || '').trim().replace(/\s+/g, ' ');
        if (!normalized) {
            return;
        }

        const sessionKey = `search-query:${normalized.toLowerCase()}`;
        if (!shouldRecordSessionEvent(sessionKey)) {
            return;
        }

        const ok = await postStatisticsEvent({
            event: 'search',
            query: normalized,
            result_count: Math.max(0, Number(resultCount) || 0),
        });

        if (!ok) {
            clearSessionEvent(sessionKey);
        }
    }

    window.SiteStatistics = {
        STATISTICS_WINDOWS,
        DEFAULT_POPULAR_PROFILES,
        DEFAULT_POPULAR_SEARCHES,
        fetchPopularProfiles,
        fetchPopularSearches,
        fetchLeaderboards,
        fetchSummary,
        recordProfileView,
        recordSearchQuery,
        normalizePopularProfiles,
        normalizePopularSearches,
        resolveSearchPageUrl(query = '') {
            if (window.AppSearch?.resolveSearchPageUrl) {
                return window.AppSearch.resolveSearchPageUrl(query);
            }

            const trimmed = String(query || '').trim();
            const base = window.App?.resolveSiteUrl
                ? window.App.resolveSiteUrl('pages/search.html')
                : 'pages/search.html';
            const url = new URL(base, window.location.href);
            if (trimmed) {
                url.searchParams.set('q', trimmed);
            }
            return url.href;
        },
    };
})();
