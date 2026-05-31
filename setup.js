'use strict';

const $ = id => document.getElementById(id);

function showStatus(type, message) {
  const el = $('status');
  el.className = `status ${type}`;
  el.textContent = message;
  el.classList.remove('hidden');
}

function setLoading(loading) {
  const btn = $('btn-connect');
  const label = $('btn-label');
  const spinner = $('btn-spinner');
  btn.disabled = loading;
  label.textContent = loading ? 'Connecting…' : 'Connect';
  spinner.classList.toggle('hidden', !loading);
}

document.addEventListener('DOMContentLoaded', async () => {
  // Pre-fill saved settings if reconfiguring
  const { workerUrl, authToken } = await chrome.storage.sync.get(['workerUrl', 'authToken']);
  if (workerUrl) $('worker-url').value = workerUrl;
  if (authToken) $('auth-token').value = authToken;

  // Token visibility toggle
  $('btn-toggle-token').addEventListener('click', () => {
    const input = $('auth-token');
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    $('icon-show').classList.toggle('hidden', isHidden);
    $('icon-hide').classList.toggle('hidden', !isHidden);
  });

  // Connect
  $('btn-connect').addEventListener('click', handleConnect);
  $('auth-token').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleConnect();
  });

  // Close tab after success
  $('btn-close').addEventListener('click', () => window.close());
});

async function handleConnect() {
  const rawUrl = $('worker-url').value.trim().replace(/\/$/, '');
  const token = $('auth-token').value.trim();

  if (!rawUrl) {
    showStatus('error', 'Please enter your Worker URL.');
    $('worker-url').focus();
    return;
  }

  if (!rawUrl.startsWith('https://') && !rawUrl.startsWith('http://')) {
    showStatus('error', 'Worker URL must start with https://');
    $('worker-url').focus();
    return;
  }

  if (!token) {
    showStatus('error', 'Please enter your Auth Token.');
    $('auth-token').focus();
    return;
  }

  setLoading(true);
  $('status').classList.add('hidden');

  try {
    const res = await fetch(`${rawUrl}/count`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (res.status === 401) {
      showStatus('error', 'Auth failed — double-check your token.');
      return;
    }

    if (!res.ok) {
      showStatus('error', `Worker returned ${res.status}. Check your URL.`);
      return;
    }

    const data = await res.json();
    const count = typeof data.count === 'number' ? data.count : null;

    // Save settings
    await chrome.storage.sync.set({ workerUrl: rawUrl, authToken: token });

    // Show success
    $('form-section').classList.add('hidden');
    if (count !== null) {
      $('success-count').textContent = `Your brain has ${count.toLocaleString()} memor${count === 1 ? 'y' : 'ies'} stored.`;
    } else {
      $('success-count').classList.add('hidden');
    }
    $('success-section').classList.remove('hidden');

  } catch {
    showStatus('error', 'Could not connect. Check your URL and try again.');
  } finally {
    setLoading(false);
  }
}
