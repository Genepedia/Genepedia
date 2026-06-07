(function () {
  const PEOPLE_JSON_PATH = 'people/people.json';
  let peopleRegistryPromise = null;

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

    const peopleDirectoryMatch = pathname.match(/^(.*\/)people\/[^/]+\//);
    if (peopleDirectoryMatch) {
      return normalizeSiteRootPrefix(peopleDirectoryMatch[1]);
    }

    if (pathname.includes('/pages/')) {
      return '../';
    }

    return '';
  }

  function resolvePeopleJsonUrl() {
    return new URL(PEOPLE_JSON_PATH, new URL(getSiteRootPrefix(), window.location.href)).href;
  }

  function resolvePersonProfileUrl(personId) {
    return new URL(`people/${personId}/profile.html`, new URL(getSiteRootPrefix(), window.location.href)).href;
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
