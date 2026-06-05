/* Simple notifications renderer for the Notifications page */
(function () {
  const sampleNotifications = [
    { id: 'n1', type: 'message', text: 'You have a new message from Alice.', time: '2 minutes ago' },
    { id: 'n2', type: 'mention', text: 'Bob mentioned you in a comment.', time: '1 hour ago' },
    { id: 'n3', type: 'match', text: 'A possible match was found for John Smith.', time: 'Yesterday' },
    { id: 'n4', type: 'edit', text: 'Edit request submitted for profile #42.', time: '3 days ago' }
  ];

  function iconFor(type) {
    switch (type) {
      case 'message': return 'bi bi-envelope';
      case 'mention': return 'bi bi-at';
      case 'match': return 'bi bi-people';
      case 'edit': return 'bi bi-pencil-square';
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
    const allowed = ['messages', 'mentions', 'matches', 'edits'];
    return allowed.includes(currentHash) ? currentHash : 'messages';
  }

  function renderNotifications(container, filterName) {
    if (!container) return;
    container.innerHTML = '';

    if (!sampleNotifications.length) {
      container.textContent = 'No notifications.';
      return;
    }

    const selected = filterName || getSelectedFilter();
    const map = { messages: 'message', mentions: 'mention', matches: 'match', edits: 'edit' };
    const targetType = map[selected];
    const visible = sampleNotifications.filter((n) => n.type === targetType);

    if (!visible.length) {
      container.textContent = 'No notifications in this category.';
      return;
    }

    const list = document.createElement('div');
    list.className = 'notifications-list';
    visible.forEach((n) => list.appendChild(createNotificationNode(n)));
    container.appendChild(list);
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
  };
})();
