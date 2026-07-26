// Выполняет одну проверку текста сайта через Claude API.
// Без ключа ANTHROPIC_API_KEY работает в mock-режиме, чтобы интерфейс можно было тестировать.

import { getCheck } from '../../../lib/checks';
import { getPrompt } from '../../../lib/prompts.server';

const MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-6';

const MOCK_SUMMARY =
  'Это демонстрационный результат: ключ Claude API не настроен. Добавьте ANTHROPIC_API_KEY в .env.local.';

const MOCK_RESULTS = {
  '152fz': [
    {
      severity: 'critical',
      title: 'В форме записи нет согласия на обработку персональных данных',
      quote: '«Оставьте телефон — и мы перезвоним в течение 15 минут»',
      law: '152-ФЗ, ст. 9',
      fine: 'до 300 000 ₽',
      fineMax: 300000,
      fix: 'Добавьте под форму чекбокс «Согласен на обработку персональных данных» со ссылкой на политику конфиденциальности.',
    },
    {
      severity: 'critical',
      title: 'В тексте не найдена ссылка на политику конфиденциальности',
      quote: null,
      law: '152-ФЗ, ст. 18.1',
      fine: 'до 60 000 ₽',
      fineMax: 60000,
      fix: 'Опубликуйте политику конфиденциальности и дайте ссылку на неё в подвале сайта и рядом с формами.',
    },
    { severity: 'ok', title: 'Цели сбора данных понятны из контекста форм', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
  advertising: [
    {
      severity: 'warning',
      title: '«Лучшая школа в городе» — превосходная степень без подтверждения',
      quote: '«Лучшая школа в городе»',
      law: '38-ФЗ, ст. 5',
      fine: 'до 500 000 ₽',
      fineMax: 500000,
      fix: 'Замените на проверяемое утверждение: «Школа с рейтингом 4,9 на Яндекс.Картах» — или уберите превосходную степень.',
    },
    { severity: 'ok', title: 'Обещаний гарантированного результата не найдено', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
  education: [
    {
      severity: 'warning',
      title: 'Продаются курсы, но нет оговорки об информационных услугах или лицензии',
      quote: '«Запишитесь на курс — старт каждый понедельник»',
      law: '273-ФЗ, ст. 91',
      fine: 'до 250 000 ₽',
      fineMax: 250000,
      fix: 'Добавьте в описание и оферту формулировку «информационно-консультационные услуги» либо укажите номер образовательной лицензии.',
    },
    { severity: 'ok', title: 'Обещаний «диплома государственного образца» нет', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
  spelling: [
    {
      severity: 'warning',
      title: '«В течении 15 минут» — правильно «в течение»',
      quote: '«перезвоним в течении 15 минут»',
      law: null,
      fine: null,
      fineMax: null,
      fix: 'Исправьте на «в течение 15 минут»: предлог времени всегда пишется с «е» на конце.',
    },
    { severity: 'ok', title: 'Других орфографических ошибок не найдено', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
  ux: [
    {
      severity: 'warning',
      title: 'Заголовок первого экрана не отвечает на вопрос «что я получу»',
      quote: '«Добро пожаловать на наш сайт»',
      law: null,
      fine: null,
      fineMax: null,
      fix: 'Замените на конкретную выгоду: «Подготовим ребёнка к ЕГЭ на 85+ баллов за 6 месяцев».',
    },
    { severity: 'ok', title: 'Призывы к действию присутствуют на странице', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
  seo: [
    {
      severity: 'warning',
      title: 'На странице мало текста — поисковику не за что зацепиться',
      quote: null,
      law: null,
      fine: null,
      fineMax: null,
      fix: 'Добавьте блок с описанием услуги на 500–1000 знаков с ключевыми формулировками, по которым вас ищут.',
    },
    { severity: 'ok', title: 'Тематика страницы понятна из текста', quote: null, law: null, fine: null, fineMax: null, fix: null },
  ],
};

const MOCK_FALLBACK = [
  { severity: 'warning', title: 'Демо-находка: подключите ключ API для настоящей проверки', quote: null, law: null, fine: null, fineMax: null, fix: 'Добавьте ANTHROPIC_API_KEY в .env.local.' },
  { severity: 'ok', title: 'Демо-пункт «в порядке»', quote: null, law: null, fine: null, fineMax: null, fix: null },
];

function parseModelJson(text) {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('В ответе модели нет JSON');
  return JSON.parse(s.slice(start, end + 1));
}

function normalizeFindings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f.title === 'string')
    .map((f) => ({
      severity: ['critical', 'warning', 'ok'].includes(f.severity) ? f.severity : 'warning',
      title: String(f.title).slice(0, 200),
      quote: f.quote ? String(f.quote).slice(0, 500) : null,
      law: f.law ? String(f.law).slice(0, 100) : null,
      fine: f.fine ? String(f.fine).slice(0, 60) : null,
      fineMax: Number.isFinite(f.fineMax) && f.fineMax > 0 ? Math.min(f.fineMax, 20000000) : null,
      fix: f.fix ? String(f.fix).slice(0, 1000) : null,
    }))
    .slice(0, 12);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { checkId, siteText } = body || {};
  const check = getCheck(checkId);
  const prompt = getPrompt(checkId);
  if (!check || !prompt) {
    return Response.json({ error: 'Неизвестная проверка' }, { status: 400 });
  }
  if (!siteText || typeof siteText !== 'string' || siteText.trim().length < 100) {
    return Response.json({ error: 'Слишком мало текста для проверки' }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 1500));
    return Response.json({
      checkId,
      mock: true,
      summary: MOCK_SUMMARY,
      findings: MOCK_RESULTS[checkId] || MOCK_FALLBACK,
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: prompt,
        messages: [
          {
            role: 'user',
            content: `Текст сайта для проверки:\n\n${siteText.slice(0, 15000)}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[check] Claude API error:', response.status, JSON.stringify(data));
      const message =
        response.status === 429
          ? 'Слишком много запросов, попробуйте через минуту'
          : 'Ошибка при выполнении проверки';
      return Response.json({ error: message }, { status: 502 });
    }

    const text = data.content?.map((b) => b.text || '').join('') || '';
    const parsed = parseModelJson(text);

    return Response.json({
      checkId,
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 600) : '',
      findings: normalizeFindings(parsed.findings),
    });
  } catch (error) {
    console.error('[check] error:', error.message);
    return Response.json({ error: 'Не удалось выполнить проверку' }, { status: 500 });
  }
}
