// Регистрация по email для увеличения лимита бесплатных проверок.
// MVP: пишем в локальный файл data/emails.txt; на этапе 2 заменяется на
// PostgreSQL с подтверждением адреса кодом.

import { appendFile, mkdir } from 'fs/promises';
import path from 'path';
import { signedCookie, BOOST_COOKIE, BOOSTED_LIMIT } from '../../../lib/quota.server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const email = (body?.email || '').trim().toLowerCase();
  const marketing = body?.marketing === true;
  if (!EMAIL_RE.test(email)) {
    return Response.json({ error: 'Похоже, в адресе опечатка — проверьте ещё раз' }, { status: 400 });
  }

  try {
    const dir = path.join(process.cwd(), 'data');
    await mkdir(dir, { recursive: true });
    // Фиксируем факт и объём согласия: рассылка — только при отдельной отметке (38-ФЗ, ст. 18)
    await appendFile(
      path.join(dir, 'emails.txt'),
      `${new Date().toISOString()}\t${email}\tmarketing:${marketing ? 'yes' : 'no'}\n`,
      'utf8'
    );
  } catch (e) {
    console.error('[subscribe] write failed:', e.message);
  }

  // Кука подписана и HttpOnly — расширенный лимит нельзя выставить себе из DevTools.
  const res = Response.json({ ok: true, limit: BOOSTED_LIMIT });
  res.headers.set('Set-Cookie', signedCookie(BOOST_COOKIE, '1', 60 * 60 * 24 * 365));
  return res;
}
