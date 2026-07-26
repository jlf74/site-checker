// Списывает одну бесплатную проверку и выдаёт токен на серию запросов к /api/check.
// GET — узнать остаток, ничего не списывая (для показа лимита в интерфейсе).

import { randomBytes } from 'crypto';
import {
  consume,
  quotaStatus,
  identify,
  issueRunToken,
  signedCookie,
  DEVICE_COOKIE,
} from '../../../lib/quota.server';

const YEAR = 60 * 60 * 24 * 365;

// Куку устройства выдаём при первом обращении: она даёт человеку его собственный
// счётчик, даже если IP общий с соседями по офису или мобильному оператору.
function withDeviceCookie(response, request) {
  if (!identify(request).device) {
    response.headers.set(
      'Set-Cookie',
      signedCookie(DEVICE_COOKIE, randomBytes(12).toString('base64url'), YEAR)
    );
  }
  return response;
}

export async function GET(request) {
  const { limit, used, remaining, boosted } = quotaStatus(request);
  return withDeviceCookie(Response.json({ limit, used, remaining, boosted }), request);
}

export async function POST(request) {
  const result = consume(request);

  if (!result.ok) {
    return withDeviceCookie(
      Response.json(
        {
          error: result.boosted
            ? 'На сегодня проверки закончились — вернитесь завтра или откройте полный отчёт.'
            : 'Бесплатная проверка на сегодня использована. Оставьте почту — станет три в день.',
          limit: result.limit,
          remaining: 0,
          boosted: result.boosted,
        },
        { status: 429 }
      ),
      request
    );
  }

  return withDeviceCookie(
    Response.json({
      runToken: issueRunToken(),
      limit: result.limit,
      remaining: result.remaining,
      boosted: result.boosted,
    }),
    request
  );
}
