const bridge = () => (
  typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.() ? window.Capacitor : null
);

function call(plugin, method, options) {
  const cap = bridge();
  if (!cap) return Promise.reject(new Error('not-native'));
  const proxy = cap.Plugins?.[plugin]?.[method];
  if (typeof proxy === 'function') return proxy.call(cap.Plugins[plugin], options);
  return cap.nativePromise(plugin, method, options);
}

export function isNative() {
  return !!bridge();
}

export function haptic(style = 'LIGHT') {
  if (!bridge()) return;
  call('Haptics', 'impact', { style }).catch(() => {});
}

export async function shareNative({ title, text }) {
  if (!bridge()) return false;
  try {
    await call('Share', 'share', { title, text, dialogTitle: title });
    return true;
  } catch {
    return false;
  }
}

export async function notificationPermission() {
  if (!bridge()) return null;
  try {
    const result = await call('LocalNotifications', 'checkPermissions');
    return result?.display || null;
  } catch {
    return null;
  }
}

export async function requestNotificationPermission() {
  if (!bridge()) return false;
  try {
    const current = await call('LocalNotifications', 'checkPermissions');
    if (current?.display === 'granted') return true;
    const result = await call('LocalNotifications', 'requestPermissions');
    return result?.display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleNotifications(notifications) {
  if (!bridge()) return false;
  try {
    await call('LocalNotifications', 'schedule', { notifications });
    return true;
  } catch {
    return false;
  }
}

export async function cancelNotifications(ids) {
  if (!bridge()) return;
  try {
    await call('LocalNotifications', 'cancel', { notifications: ids.map((id) => ({ id })) });
  } catch {
    // Notification state is best-effort; a cleared schedule is harmless.
  }
}

export function syncStatusBar(dark) {
  if (!bridge()) return;
  call('StatusBar', 'setStyle', { style: dark ? 'DARK' : 'LIGHT' }).catch(() => {});
}
