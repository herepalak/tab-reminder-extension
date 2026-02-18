// background.js - Service Worker

// Listen for alarms (reminders)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith('tab_reminder_')) return;

  const url = alarm.name.replace('tab_reminder_', '');
  const data = await chrome.storage.local.get('tabReasons');
  const reasons = data.tabReasons || {};
  const entry = reasons[url];

  if (!entry) return;

  // Show notification
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: '🧠 Tab Reminder!',
    message: `You opened "${new URL(url).hostname}" for: "${entry.reason}"`,
    priority: 2,
    buttons: [{ title: 'Open Tab' }, { title: 'Dismiss' }],
  });

  // Clear reminder time so it doesn't repeat
  reasons[url].reminderAt = null;
  await chrome.storage.local.set({ tabReasons: reasons });
});

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notifId, btnIndex) => {
  if (btnIndex === 0) {
    // "Open Tab" clicked - find or create the tab
    chrome.notifications.getAll(async (notifications) => {
      chrome.notifications.clear(notifId);
    });
  }
});

// When a new tab is created, try to match it to a saved reason
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete' || !tab.url) return;
  if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) return;

  const data = await chrome.storage.local.get('tabReasons');
  const reasons = data.tabReasons || {};
  const entry = reasons[tab.url];

  if (entry) {
    // Update the badge to show this tab has a reason saved
    chrome.action.setBadgeText({ tabId, text: '✓' });
    chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366f1' });
  } else {
    chrome.action.setBadgeText({ tabId, text: '' });
  }
});
