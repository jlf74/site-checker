// Загружает страницу по URL и возвращает очищенный текст для проверки
// + технический анализ HTML (https, трекеры, политика, формы) — бесплатный слой без ИИ.

const MAX_TEXT_LENGTH = 12000;

function analyzeHtml(html, finalUrl) {
  const trackers = [];
  if (/mc\.yandex\.(ru|com)/i.test(html)) trackers.push('Яндекс.Метрика');
  if (/googletagmanager\.com|google-analytics\.com|gtag\(/i.test(html)) trackers.push('Google Analytics');
  if (/connect\.facebook\.net|fbq\(/i.test(html)) trackers.push('Meta Pixel');
  if (/vk\.com\/js\/api\/openapi|VK\.Retargeting/i.test(html)) trackers.push('VK Пиксель');
  if (/static\.tildacdn|tilda\.ws/i.test(html)) trackers.push('Tilda');

  const privacyLink =
    /href="[^"]*(privacy|policy|politika|konfidenc|personal[-_]?dan)[^"]*"/i.test(html) ||
    /политик[а-я]*\s+конфиденциальности/i.test(html);

  return {
    https: finalUrl.startsWith('https:'),
    privacyLink,
    formsCount: (html.match(/<form/gi) || []).length,
    trackers,
    cookieMention: /cookie|куки/i.test(html),
  };
}

function buildTechNote(tech) {
  return (
    `\n\n[Техническая справка от сканера (факты из HTML-кода, учитывай их в выводах): ` +
    `протокол — ${tech.https ? 'https' : 'HTTP без шифрования'}; ` +
    `ссылка на политику конфиденциальности в коде ${tech.privacyLink ? 'НАЙДЕНА (не считай её отсутствие нарушением)' : 'НЕ найдена'}; ` +
    `форм на странице: ${tech.formsCount}; ` +
    `счётчики и пиксели: ${tech.trackers.length ? tech.trackers.join(', ') : 'не найдены'}; ` +
    `упоминание cookie в коде: ${tech.cookieMention ? 'есть' : 'нет'}.]`
  );
}

function extractText(html) {
  let s = html;
  s = s.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  s = s.replace(/<style[\s\S]*?<\/style>/gi, ' ');
  s = s.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
  s = s.replace(/<svg[\s\S]*?<\/svg>/gi, ' ');
  s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  // Переносы для блочных элементов, чтобы текст не слипался
  s = s.replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, '\n');
  s = s.replace(/<br\s*\/?>/gi, '\n');
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
  s = s.replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
  return s.slice(0, MAX_TEXT_LENGTH);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  let url = searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'URL is required' }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return Response.json({ error: 'Некорректный URL' }, { status: 400 });
  }
  // Не даём проксировать внутренние адреса
  const host = parsed.hostname;
  if (
    host === 'localhost' ||
    /^127\.|^10\.|^192\.168\.|^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    return Response.json({ error: 'Недопустимый адрес' }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return Response.json({ error: `Сайт вернул ${response.status}` }, { status: 502 });
    }

    const contentType = response.headers.get('content-type') || '';
    if (
      !contentType.includes('text/html') &&
      !contentType.includes('text/plain') &&
      !contentType.includes('xml')
    ) {
      return Response.json({ error: 'Неподдерживаемый тип контента' }, { status: 415 });
    }

    const html = await response.text();
    const text = extractText(html);

    if (text.length < 200) {
      return Response.json(
        { error: 'На странице слишком мало текста — возможно, сайт собирается скриптами' },
        { status: 422 }
      );
    }

    const tech = analyzeHtml(html, response.url || parsed.toString());
    return Response.json({ text, url: parsed.toString(), tech, techNote: buildTechNote(tech) });
  } catch (error) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      return Response.json({ error: 'Сайт не ответил за 10 секунд' }, { status: 504 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}
