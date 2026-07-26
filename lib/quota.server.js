// Учёт бесплатных проверок: 1 в день анонимно, 3 в день после того, как
// пользователь оставил почту. Обещание с лендинга («1 проверка в день» /
// «3 проверки в день») должно быть настоящим, а не декоративным.
//
// MVP-ограничение: счётчик живёт в памяти процесса, то есть обнуляется при
// перезапуске и не общий между инстансами. Для одного инстанса на Timeweb
// этого достаточно; на этапе 2 переезжает в PostgreSQL вместе с заказами.

import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

if (typeof window !== 'undefined') {
  throw new Error('lib/quota.server.js импортирован на клиенте');
}

export const FREE_LIMIT = 1;
export const BOOSTED_LIMIT = 3;

const RUN_TOKEN_TTL_MS = 10 * 60 * 1000;
const MAX_ENTRIES = 20000;

// Секрет обязан быть одинаковым во всех роутах: Next собирает каждый роут
// отдельным бандлом, поэтому случайный ключ «на инстанс» дал бы разные подписи
// в /api/quota и /api/check. В разработке подставляем фиксированную заглушку.
const DEV_SECRET = 'dev-only-insecure-secret';
let warned = false;

function secret() {
  if (process.env.CHECKUP_SECRET) return process.env.CHECKUP_SECRET;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('CHECKUP_SECRET не задан — задайте его в переменных окружения хостинга');
  }
  if (!warned) {
    warned = true;
    console.warn('[quota] CHECKUP_SECRET не задан — использую отладочный ключ (только для разработки)');
  }
  return DEV_SECRET;
}

function sign(value) {
  return createHmac('sha256', secret()).update(value).digest('base64url');
}

function verify(value, signature) {
  const expected = sign(value);
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Сутки считаем по Москве: пользователь ждёт обновления лимита в полночь по своему времени.
function today() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' });
}

// ---------- cookie ----------

function readCookies(request) {
  const raw = request.headers.get('cookie') || '';
  const out = {};
  for (const part of raw.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    out[part.slice(0, eq).trim()] = part.slice(eq + 1).trim();
  }
  return out;
}

// Подписанная кука: "<значение>.<подпись>". Без подписи её нельзя выставить руками
// из DevTools, а значит нельзя бесплатно получить расширенный лимит.
function readSigned(cookies, name) {
  const raw = cookies[name];
  if (!raw) return null;
  const dot = raw.lastIndexOf('.');
  if (dot === -1) return null;
  const value = raw.slice(0, dot);
  const signature = raw.slice(dot + 1);
  try {
    return verify(value, signature) ? value : null;
  } catch {
    return null;
  }
}

export function signedCookie(name, value, maxAgeSec) {
  return (
    `${name}=${value}.${sign(value)}; Path=/; Max-Age=${maxAgeSec}; ` +
    `HttpOnly; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
  );
}

export const DEVICE_COOKIE = 'checkup_device';
export const BOOST_COOKIE = 'checkup_boost';

// ---------- счётчик ----------

// На globalThis, а не в модульной переменной: в dev Next пересобирает модуль между
// запросами, а в проде каждый роут — отдельный бандл со своим экземпляром модуля.
// В обоих случаях обычная Map обнулялась бы и лимит не работал.
const counters = (globalThis.__checkupCounters ||= new Map());

function prune() {
  if (counters.size < MAX_ENTRIES) return;
  const day = today();
  for (const [key, entry] of counters) {
    if (entry.day !== day) counters.delete(key);
  }
}

function usage(key) {
  const entry = counters.get(key);
  if (!entry || entry.day !== today()) return 0;
  return entry.count;
}

function bump(key) {
  const day = today();
  const entry = counters.get(key);
  if (!entry || entry.day !== day) counters.set(key, { day, count: 1 });
  else entry.count += 1;
}

function clientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'local';
}

// Считаем по двум ключам сразу: очистка cookie не обнуляет счётчик по IP,
// а общий IP (офис, мобильный оператор) не блокирует того, у кого своя cookie.
export function identify(request) {
  const cookies = readCookies(request);
  const device = readSigned(cookies, DEVICE_COOKIE);
  return {
    ip: clientIp(request),
    device,
    boosted: readSigned(cookies, BOOST_COOKIE) === '1',
  };
}

export function quotaStatus(request) {
  const { ip, device, boosted } = identify(request);
  const limit = boosted ? BOOSTED_LIMIT : FREE_LIMIT;
  const used = Math.max(usage(`ip:${ip}`), device ? usage(`dev:${device}`) : 0);
  return { limit, used, remaining: Math.max(0, limit - used), boosted, ip, device };
}

// Списывает одну проверку. Возвращает { ok, ... } — при ok: false лимит уже исчерпан.
export function consume(request) {
  prune();
  const status = quotaStatus(request);
  if (status.remaining <= 0) return { ...status, ok: false };

  bump(`ip:${status.ip}`);
  if (status.device) bump(`dev:${status.device}`);

  return { ...status, ok: true, used: status.used + 1, remaining: status.remaining - 1 };
}

// ---------- токен запуска ----------

// /api/check вызывается по разу на каждую выбранную проверку, поэтому лимит
// списывается один раз в /api/quota, а сюда приходит короткоживущий токен.
// Без него роут можно было бы дёргать напрямую в обход счётчика.

export function issueRunToken() {
  const payload = `${Date.now()}.${randomBytes(9).toString('base64url')}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyRunToken(token) {
  if (typeof token !== 'string') return false;
  const dot = token.lastIndexOf('.');
  if (dot === -1) return false;
  const payload = token.slice(0, dot);
  try {
    if (!verify(payload, token.slice(dot + 1))) return false;
  } catch {
    return false;
  }
  const issued = Number(payload.split('.')[0]);
  return Number.isFinite(issued) && Date.now() - issued < RUN_TOKEN_TTL_MS;
}
