(function () {
  const PEOPLE_JSON_PATH = 'people/people.json';
  let peopleRegistryPromise = null;

  function resolveSiteUrl(path) {
    const cleanPath = String(path || '').replace(/^\/+/, '');
    if (typeof window.App?.resolveSiteUrl === 'function') {
      return window.App.resolveSiteUrl(cleanPath);
    }

    return new URL(cleanPath, new URL(getSiteRootPrefix(), window.location.href)).href;
  }

  function normalizeSiteRootPrefix(prefix) {
    if (!prefix || prefix === '/') {
      return '';
    }

    return prefix;
  }

  function getSiteRootPrefix() {
    const pathname = window.location.pathname.replace(/\\/g, '/');
    const nestedProfileMatch = pathname.match(/^(.*\/)people\/[^/]+\/[^/]+$/);
    if (nestedProfileMatch) {
      return normalizeSiteRootPrefix(nestedProfileMatch[1]);
    }

    if (/\/people\/$/.test(pathname) || /\/people\/[^/]+$/.test(pathname)) {
      return '../';
    }

    if (pathname.includes('/pages/')) {
      return '../';
    }

    return '';
  }

  function resolvePeopleJsonUrl() {
    return resolveSiteUrl(PEOPLE_JSON_PATH);
  }

  function resolvePersonProfileUrl(personId) {
    return resolveSiteUrl(`people/${personId}/profile.html`);
  }

  async function loadPeopleRegistry({ refresh = false } = {}) {
    if (peopleRegistryPromise && !refresh) {
      return peopleRegistryPromise;
    }

    peopleRegistryPromise = fetch(resolvePeopleJsonUrl(), { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to load people registry: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => (Array.isArray(data?.people) ? data.people : []))
      .catch((error) => {
        console.error(error);
        return [];
      });

    return peopleRegistryPromise;
  }

  window.PeopleRegistry = {
    getSiteRootPrefix,
    loadPeopleRegistry,
    resolvePeopleJsonUrl,
    resolvePersonProfileUrl,
  };
})();
