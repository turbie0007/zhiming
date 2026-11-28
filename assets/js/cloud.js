// 雲端會員與命例同步客戶端：以純 fetch 呼叫 Supabase GoTrue／PostgREST，
// 不引入 SDK，維持靜態 ES modules 與離線原則（未 opted-in 或原生版完全不載入網路）。
import { CLOUD_CONFIG } from './cloud-config.js?v=20261154';
import { isNative } from './native.js?v=20261154';

const SESSION_KEY = 'zhiming.cloud.session.v1';

export function cloudEnabled() {
  return !isNative() && Boolean(CLOUD_CONFIG.supabaseUrl && CLOUD_CONFIG.supabaseAnonKey);
}

export function membershipActive(membership, now = Date.now()) {
  if (!membership || membership.status !== 'active') return false;
  const end = Date.parse(membership.current_period_end || '');
  return Number.isFinite(end) && end > now;
}

function loadSession() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return parsed && parsed.access_token ? parsed : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // storage may be unavailable
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage may be unavailable
  }
}

export function currentSession() {
  return loadSession();
}

export function currentUser() {
  return loadSession()?.user || null;
}

// Magic link 以 implicit flow 回到本站，hash 帶 access_token；開機時擷取並清除。
export function captureRedirectSession() {
  if (!cloudEnabled()) return false;
  const hash = location.hash;
  if (!hash.includes('access_token=')) return false;
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken) return false;
  const expiresIn = Number(params.get('expires_in') || 3600);
  saveSession({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Date.now() + expiresIn * 1000,
    user: null,
  });
  history.replaceState({}, '', location.pathname + location.search);
  return true;
}

async function refreshSession() {
  const session = loadSession();
  if (!session?.refresh_token) return null;
  const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CLOUD_CONFIG.supabaseAnonKey },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const data = await res.json();
  const next = {
    access_token: data.access_token,
    refresh_token: data.refresh_token || session.refresh_token,
    expires_at: Date.now() + (Number(data.expires_in) || 3600) * 1000,
    user: data.user || session.user,
  };
  saveSession(next);
  return next;
}

async function ensureSession() {
  let session = loadSession();
  if (!session) return null;
  if (session.expires_at && session.expires_at - Date.now() < 60_000) {
    session = await refreshSession();
  }
  return session;
}

// implicit flow 的 hash 只帶 token、不帶 user；首次以 /auth/v1/user 補齊。
async function ensureUser() {
  const session = await ensureSession();
  if (!session) return null;
  if (session.user) return session.user;
  const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/user`, {
    headers: { apikey: CLOUD_CONFIG.supabaseAnonKey, Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return null;
  const user = await res.json();
  saveSession({ ...session, user });
  return user;
}

async function authedRequest(path, { method = 'GET', body, prefer } = {}) {
  let session = await ensureSession();
  if (!session) throw new Error('未登入');
  const headers = {
    'Content-Type': 'application/json',
    apikey: CLOUD_CONFIG.supabaseAnonKey,
    Authorization: `Bearer ${session.access_token}`,
  };
  if (prefer) headers.Prefer = prefer;
  let res = await fetch(`${CLOUD_CONFIG.supabaseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (res.status === 401) {
    session = await refreshSession();
    if (!session) throw new Error('登入已過期，請重新登入');
    headers.Authorization = `Bearer ${session.access_token}`;
    res = await fetch(`${CLOUD_CONFIG.supabaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  }
  if (!res.ok) {
    let message = `雲端請求失敗（${res.status}）`;
    try {
      const err = await res.json();
      message = err.msg || err.message || err.error_description || message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res;
}

export async function signInWithEmail(email, redirectTo) {
  const res = await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: CLOUD_CONFIG.supabaseAnonKey },
    body: JSON.stringify({ email, create_user: true, options: { email_redirect_to: redirectTo } }),
  });
  if (!res.ok) {
    let message = '寄送登入連結失敗';
    try {
      const err = await res.json();
      message = err.msg || err.message || message;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return true;
}

export async function signOut() {
  const session = loadSession();
  if (session) {
    try {
      await fetch(`${CLOUD_CONFIG.supabaseUrl}/auth/v1/logout`, {
        method: 'POST',
        headers: { apikey: CLOUD_CONFIG.supabaseAnonKey, Authorization: `Bearer ${session.access_token}` },
      });
    } catch {
      // best-effort server logout; local session still cleared
    }
  }
  clearSession();
}

export async function invokeBilling(name) {
  const res = await authedRequest(`/functions/v1/${name}`, { method: 'POST' });
  return res.json();
}

export async function fetchMembership() {
  const user = await ensureUser();
  if (!user) return null;
  const res = await authedRequest(`/rest/v1/memberships?select=*&user_id=eq.${encodeURIComponent(user.id)}`);
  const rows = await res.json();
  return rows[0] || null;
}

export async function pullRecords(sinceISO) {
  const user = await ensureUser();
  if (!user) return [];
  let path = `/rest/v1/cloud_records?select=*&user_id=eq.${encodeURIComponent(user.id)}&order=updated_at.asc`;
  if (sinceISO) path += `&updated_at=gt.${encodeURIComponent(sinceISO)}`;
  const res = await authedRequest(path);
  return res.json();
}

export async function pushRecords(rows) {
  if (!rows.length) return true;
  const user = await ensureUser();
  if (!user) throw new Error('未登入');
  await authedRequest('/rest/v1/cloud_records?on_conflict=user_id,record_id', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: rows.map((row) => ({ ...row, user_id: user.id })),
  });
  return true;
}

// 純函數：本機與雲端以 updatedAt（fallback createdAt）last-write-wins 合併。
// 回傳合併後本機清單與需上傳的列（不含 user_id，由 pushRecords 補）。
export function mergeRecords(local, remote) {
  const localTime = (r) => Date.parse(r.updatedAt || r.createdAt || '') || 0;
  const remoteTime = (row) => Date.parse(row.updated_at || '') || 0;
  const byId = new Map(local.map((r) => [r.id, r]));
  for (const row of remote) {
    const mine = byId.get(row.record_id);
    if (row.deleted) {
      if (mine && localTime(mine) <= remoteTime(row)) byId.delete(row.record_id);
      continue;
    }
    if (!mine || remoteTime(row) > localTime(mine)) {
      byId.set(row.record_id, { ...row.payload, id: row.record_id });
    }
  }
  const remoteById = new Map(remote.map((row) => [row.record_id, row]));
  const toPush = [];
  for (const [id, rec] of byId) {
    const row = remoteById.get(id);
    if (!row || localTime(rec) > remoteTime(row)) {
      toPush.push({
        record_id: id,
        payload: rec,
        updated_at: new Date(localTime(rec)).toISOString(),
        deleted: false,
      });
    }
  }
  return { merged: [...byId.values()], toPush };
}