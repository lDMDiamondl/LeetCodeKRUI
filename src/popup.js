document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('translationToggle');

  chrome.storage.local.get(['translationEnabled'], (result) => {
    toggle.checked = result.translationEnabled !== false;
  });

  toggle.addEventListener('change', async () => {
    const isEnabled = toggle.checked;
    await chrome.storage.local.set({ translationEnabled: isEnabled });

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.reload(tab.id);
    }
  });
});
