/* Simple notifications renderer for the Notifications page */
(function () {
  const FILTER_TABS = ['messages', 'mentions', 'matches', 'requests'];
  const REQUEST_SUBTABS = ['all', 'profile', 'page', 'maintainer'];

  const sampleNotifications = [
    { id: 'n1', type: 'message', text: 'You have a new message from Alice.', time: '2 minutes ago' },
    { id: 'n2', type: 'mention', text: 'Bob mentioned you in a comment.', time: '1 hour ago' },
    { id: 'n3', type: 'match', text: 'A possible match was found for John Smith.', time: 'Yesterday' },
    // Requests now include a subtype so the UI can show sub-tabs (profile, page, maintainer)
    { id: 'n4', type: 'request', subtype: 'profile', text: 'Edit request submitted for profile #42.', time: '3 days ago' }
  ];

  function iconFor(type) {
    switch (type) {
      case 'message': return 'bi bi-envelope';
      case 'mention': return 'bi bi-at';
      case 'match': return 'bi bi-people';
      case 'request': return 'bi bi-pencil-square';
      default: return 'bi bi-bell';
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function createNotificationNode(n) {
    const item = document.createElement('div');
    item.className = 'notification-item';
    item.tabIndex = 0;
    item.innerHTML = `
      <div class="notification-item__icon"><i class="${iconFor(n.type)}" aria-hidden="true"></i></div>
      <div class="notification-item__body">
        <div class="notification-item__text">${escapeHtml(n.text)}</div>
        <div class="notification-item__meta">${escapeHtml(n.time)}</div>
      </div>
    `;
    item.addEventListener('click', () => {
      // For now, just alert the notification; this can be replaced with real navigation.
      alert(n.text);
    });
    return item;
  }

  function getSelectedFilter() {
    const currentHash = (window.location.hash || '').replace(/^#/, '');
    const base = currentHash.split('/')[0];
    return FILTER_TABS.includes(base) ? base : 'messages';
  }

  function getRequestSubtype() {
    const parts = (window.location.hash || '').replace(/^#/, '').split('/');
    if (parts[0] !== 'requests') {
      return 'all';
    }
    const subtype = (parts[1] || 'all').toLowerCase();
    return REQUEST_SUBTABS.includes(subtype) ? subtype : 'all';
  }

  function buildNotificationsHash(filter, subtype = 'all') {
    if (filter === 'requests' && subtype && subtype !== 'all') {
      return `#requests/${subtype}`;
    }
    return `#${filter}`;
  }

  function navigateNotifications(filter, subtype = 'all') {
    const nextHash = buildNotificationsHash(filter, subtype);
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
      return;
    }

    const container = document.getElementById('notifications-list');
    if (container) {
      renderNotifications(container, filter);
    }
  }

  function computeRequestCounts() {
    return sampleNotifications.reduce((acc, item) => {
      if (item.type !== 'request') return acc;
      acc.total = (acc.total || 0) + 1;
      const subtype = item.subtype || 'profile';
      acc[subtype] = (acc[subtype] || 0) + 1;
      return acc;
    }, {});
  }

  function renderRequestSubtabs(container, activeSubtype) {
    const counts = computeRequestCounts();
    const subTabs = document.createElement('div');
    subTabs.className = 'notifications-subtabs';
    subTabs.innerHTML = `
      <nav class="notifications-subtabs__nav" aria-label="Request types">
        <a href="#requests" data-sub="all"${activeSubtype === 'all' ? ' class="is-selected" aria-current="page"' : ''}>All (${counts.total || 0})</a>
        <a href="#requests/profile" data-sub="profile"${activeSubtype === 'profile' ? ' class="is-selected" aria-current="page"' : ''}>Profile Edits (${counts.profile || 0})</a>
        <a href="#requests/page" data-sub="page"${activeSubtype === 'page' ? ' class="is-selected" aria-current="page"' : ''}>Page Edits (${counts.page || 0})</a>
        <a href="#requests/maintainer" data-sub="maintainer"${activeSubtype === 'maintainer' ? ' class="is-selected" aria-current="page"' : ''}>Maintainer Requests (${counts.maintainer || 0})</a>
      </nav>
    `;
    container.appendChild(subTabs);
  }

  function renderNotifications(container, filterName) {
    if (!container) return;
    container.innerHTML = '';

    if (!sampleNotifications.length) {
      container.textContent = 'No notifications.';
      return;
    }

    const selected = filterName || getSelectedFilter();
    const map = { messages: 'message', mentions: 'mention', matches: 'match', requests: 'request' };
    const targetType = map[selected];
    const subtype = selected === 'requests' ? getRequestSubtype() : null;

    if (selected === 'requests') {
      renderRequestSubtabs(container, subtype || 'all');
    }

    const visible = sampleNotifications.filter((n) => {
      if (n.type !== targetType) return false;
      if (targetType === 'request' && subtype && subtype !== 'all') {
        return String(n.subtype || 'profile').toLowerCase() === String(subtype).toLowerCase();
      }
      return true;
    });

    if (!visible.length) {
      const empty = document.createElement('p');
      empty.className = 'notifications-empty';
      empty.textContent = 'No notifications in this category.';
      container.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'notifications-list';
    visible.forEach((n) => list.appendChild(createNotificationNode(n)));
    container.appendChild(list);
  }

  // Compute and expose counts so other components (toolbar) can show badges.
  function computeCounts() {
    const counts = { messages: 0, mentions: 0, matches: 0, requests: 0 };
    const sub = {};
    sampleNotifications.forEach((n) => {
      if (n.type === 'message') counts.messages++;
      else if (n.type === 'mention') counts.mentions++;
      else if (n.type === 'match') counts.matches++;
      else if (n.type === 'request') {
        counts.requests++;
        const s = n.subtype || 'profile';
        sub[s] = (sub[s] || 0) + 1;
      }
    });
    counts.subtypes = sub;
    return counts;
  }

  function bindNotificationsPage(container) {
    const syncFromHash = () => {
      renderNotifications(container);
    };

    container.addEventListener('click', (event) => {
      const subtab = event.target.closest?.('.notifications-subtabs__nav a[data-sub]');
      if (subtab && container.contains(subtab)) {
        event.preventDefault();
        navigateNotifications('requests', subtab.dataset.sub || 'all');
        return;
      }
    });

    document.addEventListener('click', (event) => {
      const tabLink = event.target.closest?.('.people-page__tab-link[data-tab]');
      if (!tabLink) return;

      const toolbar = tabLink.closest('full-page-toolbar[variant="notifications"]');
      if (!toolbar) return;

      const tab = tabLink.dataset.tab;
      if (!FILTER_TABS.includes(tab)) return;

      event.preventDefault();
      navigateNotifications(tab);
    });

    window.addEventListener('hashchange', syncFromHash);
    syncFromHash();
  }

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    bindNotificationsPage(container);
  });

  window.AppNotifications = {
    render: renderNotifications,
    sample: sampleNotifications,
    getCounts: computeCounts,
    navigate: navigateNotifications,
  };

  // Notify other parts of the UI that notification counts are available
  try {
    const counts = computeCounts();
    document.dispatchEvent(new CustomEvent('app-notifications:loaded', { detail: { counts } }));
  } catch (e) {
    // ignore
  }
  // Minimal styles for the requests sub-tabs
  try {
    const ns = document.createElement('style');
    ns.textContent = `
      .notifications-subtabs { margin-bottom: 0.75rem; }
      .notifications-subtabs__nav { display:flex; gap:0.5rem; flex-wrap:wrap; }
      .notifications-subtabs__nav a { padding:0.35rem 0.6rem; text-decoration:none; color:var(--color-base,#202122); border-radius:0.25rem; background:transparent; cursor:pointer; }
      .notifications-subtabs__nav a.is-selected { background: rgba(51,102,204,0.08); font-weight:600; }
      .notifications-empty { margin: 0; color: var(--color-subtle, #54595d); }
      body.theme-dark .notifications-subtabs__nav a { color: var(--color-base, #eaecf0); }
      body.theme-dark .notifications-subtabs__nav a.is-selected { background: rgba(107, 158, 255, 0.16); }
    `;
    document.head.appendChild(ns);
  } catch (e) {
    // ignore styling errors in exotic environments
  }
})();
