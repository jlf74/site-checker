// Регистрация по email для увеличения лимита бесплатных проверок.
// MVP: пишем в локальный файл data/emails.txt; на этапе 2 заменяется на Supabase
// с подтверждением кодом и реальным учётом лимитов.

import { appendFile, mkdir } from 'fs/promises';
import path from 'path';

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

  const res = Response.json({ ok: true });
  res.headers.set(
    'Set-Cookie',
    `checkup_boost=1; Path=/; Max-Age=${60 * 60 * 24 * 365}; SameSite=Lax`
  );
  return res;
}
