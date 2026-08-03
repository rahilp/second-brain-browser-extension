export default defineBackground(() => {
  // MV3 (Chrome) exposes browser.action; MV2 (Firefox) exposes browser.browserAction
  const action = browser.action ?? browser.browserAction;

  browser.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
      browser.tabs.create({ url: browser.runtime.getURL('/setup.html') });
    }
  });

  browser.commands.onCommand.addListener(async (command) => {
    if (command !== 'quick-capture') return;

    const { workerUrl, authToken } = await browser.storage.sync.get(['workerUrl', 'authToken']);

    if (!workerUrl || !authToken) {
      flashBadge('!', '#b42318');
      return;
    }

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url || isRestrictedUrl(tab.url)) {
      flashBadge('!', '#b42318');
      return;
    }

    let selection = '';
    try {
      const [result] = await browser.scripting.executeScript({
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
    action.setBadgeText({ text: '…' });
    action.setBadgeBackgroundColor({ color: '#fd540a' });

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
        flashBadge('~', '#a15c00');
        notify(tab.id, 'Already in your brain', `"${tab.title}" was captured before (${data.score}% match).`, 'warning');
      } else if (data.ok) {
        const msg = data.action === 'merged'
          ? 'Merged with an existing memory.'
          : data.action === 'replaced'
          ? 'Updated an existing memory.'
          : `"${tab.title}" saved to your second brain.`;
        flashBadge('✓', '#18794e');
        notify(tab.id, 'Captured!', msg, 'success');
      } else {
        flashBadge('!', '#b42318');
        notify(tab.id, 'Capture failed', data.error || 'Something went wrong.', 'error');
      }
    } catch {
      flashBadge('!', '#b42318');
      notify(tab.id, 'Capture failed', 'Could not reach your worker.', 'error');
    }
  });

  function isRestrictedUrl(url) {
    return ['chrome://', 'chrome-extension://', 'edge://', 'about:', 'moz-extension://']
      .some(prefix => url.startsWith(prefix));
  }

  function flashBadge(text, color) {
    action.setBadgeText({ text });
    action.setBadgeBackgroundColor({ color });
    setTimeout(() => action.setBadgeText({ text: '' }), 2000);
  }

  function notify(tabId, title, message, type = 'success') {
    browser.scripting.executeScript({
      target: { tabId },
      func: (title, message, type) => {
        document.getElementById('__sb-toast__')?.remove();

        const accent = type === 'success' ? '#18794e' : type === 'warning' ? '#ff8a3d' : '#b42318';

        const toast = document.createElement('div');
        toast.id = '__sb-toast__';
        toast.style.cssText = [
          'position:fixed',
          'top:24px',
          'right:24px',
          'z-index:2147483647',
          'background:#161616',
          'border:none',
          `border-left:3px solid ${accent}`,
          'border-radius:13px',
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
        m.style.cssText = 'color:#c9c5c1;font-size:12px;line-height:1.45';
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
      // Restricted page (chrome://, about:) — badge feedback is the only signal
    });
  }
});
