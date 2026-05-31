'use strict';

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('setup.html') });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== 'quick-capture') return;

  const { workerUrl, authToken } = await chrome.storage.sync.get(['workerUrl', 'authToken']);

  if (!workerUrl || !authToken) {
    flashBadge('!', '#B0503C');
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url || tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://') || tab.url.startsWith('about:')) {
    flashBadge('!', '#B0503C');
    return;
  }

  let selection = '';
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => window.getSelection().toString().trim(),
    });
    selection = result?.result || '';
  } catch {
    // Restricted page — proceed without selection
  }

  const parts = [`${tab.title || 'Untitled'}\n${tab.url}`];
  if (selection) parts.push(`Highlighted: "${selection}"`);
  const content = parts.join('\n\n');

  // Show pending state on badge
  chrome.action.setBadgeText({ text: '…' });
  chrome.action.setBadgeBackgroundColor({ color: '#B26641' });

  try {
    const res = await fetch(`${workerUrl.replace(/\/$/, '')}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ content, source: 'extension' }),
    });

    const data = await res.json();

    if (!data.ok && data.duplicate) {
      flashBadge('~', '#8A4E2F');
      notify(tab.id, 'Already in your brain', `"${tab.title}" was captured before (${data.score}% match).`, 'warning');
    } else if (data.ok) {
      const action = data.action;
      const msg = action === 'merged'
        ? 'Merged with an existing memory.'
        : action === 'replaced'
        ? 'Updated an existing memory.'
        : `"${tab.title}" saved to your second brain.`;
      flashBadge('✓', '#5B8A6B');
      notify(tab.id, 'Captured!', msg, 'success');
    } else {
      flashBadge('!', '#B0503C');
      notify(tab.id, 'Capture failed', data.error || 'Something went wrong.', 'error');
    }
  } catch {
    flashBadge('!', '#B0503C');
    notify(tab.id, 'Capture failed', 'Could not reach your worker.', 'error');
  }
});

function flashBadge(text, color) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
}

function notify(tabId, title, message, type = 'success') {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (title, message, type) => {
      document.getElementById('__sb-toast__')?.remove();

      const accent = type === 'success' ? '#5B8A6B' : type === 'warning' ? '#B26641' : '#B0503C';

      const toast = document.createElement('div');
      toast.id = '__sb-toast__';
      toast.style.cssText = [
        'position:fixed',
        'top:24px',
        'right:24px',
        'z-index:2147483647',
        'background:#1a1a1a',
        'border:none',
        `border-left:3px solid ${accent}`,
        'border-radius:10px',
        'padding:11px 15px',
        'box-shadow:0 4px 16px rgba(0,0,0,0.3)',
        "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
        'font-size:13px',
        'color:#ffffff',
        'max-width:280px',
        'min-width:180px',
        'opacity:0',
        'transform:translateY(-10px)',
        'transition:opacity 0.2s ease,transform 0.2s ease',
        'pointer-events:none',
        '-webkit-font-smoothing:antialiased',
      ].join(';');

      const t = document.createElement('div');
      t.style.cssText = 'font-weight:600;margin-bottom:3px';
      t.textContent = title;

      const m = document.createElement('div');
      m.style.cssText = 'color:rgba(255,255,255,0.65);font-size:12px;line-height:1.45';
      m.textContent = message;

      toast.append(t, m);
      document.body.appendChild(toast);

      requestAnimationFrame(() => requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
      }));

      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-10px)';
        setTimeout(() => toast.remove(), 250);
      }, 3500);
    },
    args: [title, message, type],
  }).catch(() => {
    // Restricted page (chrome://) — badge feedback is the only signal
  });
}
