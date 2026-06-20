(function () {
  const PEOPLE_JSON_PATH = 'pages/people/people.json';
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
    // Compute the "../" hops from the current document's directory back to the
    // site root. Works for any depth, including the profile routes
    // /pages/people/<id>/ and /pages/pets/<id>/ (three directories deep).
    const dir = pathname.replace(/[^/]*$/, '');
    const depth = dir.split('/').filter(Boolean).length;
    return normalizeSiteRootPrefix(depth ? '../'.repeat(depth) : '');
  }

  function resolvePeopleJsonUrl() {
    return resolveSiteUrl(PEOPLE_JSON_PATH);
  }

  function resolvePersonProfileUrl(personId, kind = 'person') {
    // Always link directly to the profile's index.html (not the directory route)
    // so navigation goes straight to the .html file on every protocol/host.
    const base = kind === 'pet' ? 'pages/pets' : 'pages/people';
    return resolveSiteUrl(`${base}/${personId}/index.html`);
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
