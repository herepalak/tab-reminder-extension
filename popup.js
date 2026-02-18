// popup.js

let currentTab = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tab;

  const urlEl = document.getElementById('currentUrl');
  urlEl.textContent = tab.url;
  urlEl.title = tab.url;

  // Load existing reason for this tab if saved
  const data = await chrome.storage.local.get('tabReasons');
  const reasons = data.tabReasons || {};

  if (reasons[tab.url]) {
    document.getElementById('reasonInput').value = reasons[tab.url].reason || '';
  }

  renderList(reasons);

  // Save button
  document.getElementById('saveBtn').addEventListener('click', async () => {
    const reason = document.getElementById('reasonInput').value.trim();
    if (!reason) {
      document.getElementById('reasonInput').placeholder = '⚠️ Please enter a reason first!';
      return;
    }

    const reminderMinutes = parseInt(document.getElementById('reminderTime').value);

    const data = await chrome.storage.local.get('tabReasons');
    const reasons = data.tabReasons || {};

    const entry = {
      reason,
      url: tab.url,
      title: tab.title || tab.url,
      savedAt: Date.now(),
      reminderAt: reminderMinutes > 0 ? Date.now() + reminderMinutes * 60 * 1000 : null,
    };

    reasons[tab.url] = entry;
    await chrome.storage.local.set({ tabReasons: reasons });

    // Set alarm if reminder chosen
    if (reminderMinutes > 0) {
      chrome.alarms.create(`tab_reminder_${tab.url}`, {
        delayInMinutes: reminderMinutes,
      });
    }

    // Show saved message
    const msg = document.getElementById('savedMsg');
    msg.style.display = 'block';
    setTimeout(() => (msg.style.display = 'none'), 2000);

    renderList(reasons);
  });
});

function renderList(reasons) {
  const list = document.getElementById('tabsList');
  const entries = Object.values(reasons);

  if (entries.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span>🗂️</span>
        No saved tabs yet.<br>Start by saving a reason above!
      </div>`;
    return;
  }

  // Sort newest first
  entries.sort((a, b) => b.savedAt - a.savedAt);

  list.innerHTML = entries.map(entry => {
    const domain = (() => {
      try { return new URL(entry.url).hostname; } catch { return entry.url; }
    })();
    const reminderText = entry.reminderAt
      ? `⏰ Reminder: ${new Date(entry.reminderAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : '';

    return `
      <div class="tab-item" data-url="${escHtml(entry.url)}">
        <div class="tab-item-info">
          <div class="tab-item-title" title="${escHtml(entry.url)}">${escHtml(domain)}</div>
          <div class="tab-item-reason">${escHtml(entry.reason)}</div>
          ${reminderText ? `<div class="tab-item-reminder">${reminderText}</div>` : ''}
        </div>
        <button class="btn-delete" data-url="${escHtml(entry.url)}" title="Delete">✕</button>
      </div>
    `;
  }).join('');

  // Delete buttons
  list.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const url = e.currentTarget.dataset.url;
      const data = await chrome.storage.local.get('tabReasons');
      const reasons = data.tabReasons || {};
      delete reasons[url];
      await chrome.storage.local.set({ tabReasons: reasons });
      chrome.alarms.clear(`tab_reminder_${url}`);
      renderList(reasons);
    });
  });
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
