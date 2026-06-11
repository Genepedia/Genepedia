/* Simple notifications renderer for the Notifications page */
(function () {
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
    const allowed = ['messages', 'mentions', 'matches', 'requests'];
    return allowed.includes(base) ? base : 'messages';
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

    // For requests, support optional subtype in the hash (e.g. #requests/profile)
    let subtype = null;
    if (selected === 'requests') {
      const parts = (window.location.hash || '').replace(/^#/, '').split('/');
      subtype = parts[1] || 'all';
    }

    const visible = sampleNotifications.filter((n) => {
      if (n.type !== targetType) return false;
      if (targetType === 'request' && subtype && subtype !== 'all') {
        return String(n.subtype || 'profile').toLowerCase() === String(subtype).toLowerCase();
      }
      return true;
    });

    if (!visible.length) {
      container.textContent = 'No notifications in this category.';
      return;
    }

    // If we're rendering Requests, show sub-tabs for request types
    if (selected === 'requests') {
      const counts = sampleNotifications.reduce((acc, it) => {
        if (it.type !== 'request') return acc;
        acc.total = (acc.total || 0) + 1;
        const s = it.subtype || 'profile';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      const subTabs = document.createElement('div');
      subTabs.className = 'notifications-subtabs';
      subTabs.innerHTML = `
        <nav class="notifications-subtabs__nav" aria-label="Request types">
          <a href="#requests" data-sub="all" class="is-selected">All (${counts.total || 0})</a>
          <a href="#requests/profile" data-sub="profile">Profile Edits (${counts.profile || 0})</a>
          <a href="#requests/page" data-sub="page">Page Edits (${counts.page || 0})</a>
          <a href="#requests/maintainer" data-sub="maintainer">Maintainer Requests (${counts.maintainer || 0})</a>
        </nav>
      `;
      container.appendChild(subTabs);
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

  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('notifications-list');
    if (!container) return;
    renderNotifications(container);
    window.addEventListener('hashchange', () => renderNotifications(container));
  });

  window.AppNotifications = {
    render: renderNotifications,
    sample: sampleNotifications,
    getCounts: computeCounts
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
      .notifications-subtabs__nav a { padding:0.35rem 0.6rem; text-decoration:none; color:var(--color-base,#202122); border-radius:0.25rem; background:transparent; }
      .notifications-subtabs__nav a.is-selected { background: rgba(51,102,204,0.08); font-weight:600; }
    `;
    document.head.appendChild(ns);
  } catch (e) {
    // ignore styling errors in exotic environments
  }
})();
