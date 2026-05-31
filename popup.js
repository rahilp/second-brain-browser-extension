'use strict';

const $ = id => document.getElementById(id);

const isMac = navigator.platform.toUpperCase().includes('MAC');

function applyModifierKeys() {
  document.querySelectorAll('.kbd-modifier').forEach(el => {
    if (isMac) {
      el.textContent = '⌥';
      el.title = 'Option';
    } else {
      el.textContent = 'Alt';
    }
  });
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

function showStatus(type, message) {
  const el = $('status');
  el.className = `status ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function buildContent(title, url, selection, note) {
  const parts = [`${title}\n${url}`];
  if (selection) parts.push(`Highlighted: "${selection}"`);
  if (note) parts.push(note);
  return parts.join('\n\n');
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

document.addEventListener('DOMContentLoaded', async () => {
  applyModifierKeys();

  // 1. Load settings
  const { workerUrl, authToken } = await chrome.storage.sync.get(['workerUrl', 'authToken']);

  if (!workerUrl || !authToken) {
    showView('view-not-configured');
    $('btn-open-setup').addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
      window.close();
    });
    return;
  }

  // 2. Get active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    showView('view-capture');
    $('page-title').textContent = 'This page cannot be captured';
    $('page-url').textContent = tab?.url || '';
    $('btn-capture').disabled = true;
    $('btn-capture-label').textContent = 'Not available';
    setupSettingsButton();
    return;
  }

  // 3. Try to get selected text
  let selection = '';
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim(),
    });
    selection = result?.result || '';
  } catch {
    // Restricted page — selection unavailable
  }

  // 4. Populate UI
  $('page-title').textContent = truncate(tab.title || 'Untitled', 80);
  $('page-url').textContent = truncate(tab.url, 60);

  if (selection) {
    $('selection-text').textContent = truncate(selection, 160);
    $('selection-badge').classList.remove('hidden');
  }

  showView('view-capture');
  setupSettingsButton();

  // 5. Capture
  $('btn-capture').addEventListener('click', async () => {
    const note = $('note').value.trim();
    const content = buildContent(tab.title || 'Untitled', tab.url, selection, note);

    const btn = $('btn-capture');
    const label = $('btn-capture-label');
    btn.disabled = true;
    label.textContent = 'Saving…';
    $('status').classList.add('hidden');

    try {
      const res = await fetch(`${workerUrl.replace(/\/$/, '')}/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ content, source: 'extension' }),
      });

      if (!res.ok && res.status === 401) {
        showStatus('error', 'Auth failed — check your token in settings.');
        return;
      }

      const data = await res.json();

      if (!data.ok && data.duplicate) {
        showStatus('warning', `Already in your brain (${data.score}% match)`);
      } else if (data.ok) {
        const action = data.action;
        const msg = action === 'merged'
          ? 'Merged with an existing memory.'
          : action === 'replaced'
          ? 'Updated an existing memory.'
          : 'Captured!';
        showStatus('success', msg);
        setTimeout(() => window.close(), 1400);
      } else {
        showStatus('error', data.error || 'Something went wrong.');
      }
    } catch {
      showStatus('error', 'Could not reach your worker. Check your URL in settings.');
    } finally {
      btn.disabled = false;
      label.textContent = 'Capture';
    }
  });
});

function setupSettingsButton() {
  $('btn-settings').addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
    window.close();
  });
}
