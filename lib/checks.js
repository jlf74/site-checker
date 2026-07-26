// Каталог проверок СайтЧекап — безопасная для клиента часть.
// Два блока: юридическая проверка (главный товар) и тексты (бонус).
// Тексты промптов лежат в lib/prompts.server.js и на клиент не попадают:
// этот файл импортирует app/page.js ('use client'), то есть весь его
// экспорт уезжает в бандл браузера.

export const CHECKS = [
  {
    id: '152fz',
    label: '152-ФЗ',
    fullLabel: 'Персональные данные (152-ФЗ)',
    group: 'legal',
    defaultOn: true,
  },
  {
    id: 'advertising',
    label: 'Реклама',
    fullLabel: 'Закон о рекламе (38-ФЗ)',
    group: 'legal',
    defaultOn: true,
  },
  {
    id: 'education',
    label: 'Образование',
    fullLabel: 'Закон об образовании (273-ФЗ)',
    group: 'legal',
    defaultOn: true,
  },
  {
    id: 'spelling',
    label: 'Опечатки',
    fullLabel: 'Опечатки и ошибки',
    group: 'text',
    defaultOn: false,
  },
  {
    id: 'ux',
    label: 'Продающие тексты',
    fullLabel: 'Убедительность текстов',
    group: 'text',
    defaultOn: false,
  },
  {
    id: 'seo',
    label: 'SEO',
    fullLabel: 'SEO-базис',
    group: 'text',
    defaultOn: false,
  },
];

export const CHECK_GROUPS = [
  { id: 'legal', label: 'Юридическая проверка' },
  { id: 'text', label: 'Бонусом: тексты' },
];

export function getCheck(id) {
  return CHECKS.find((c) => c.id === id) || null;
}

// Оценка сайта 0–100 по совокупности находок всех выполненных проверок.
export function computeScore(allFindings) {
  let score = 100;
  for (const f of allFindings) {
    if (f.severity === 'critical') score -= 12;
    else if (f.severity === 'warning') score -= 4;
  }
  return Math.max(5, Math.min(98, score));
}

// Суммарный риск штрафов в рублях по найденным нарушениям.
export function computeRisk(allFindings) {
  return allFindings
    .filter((f) => f.severity !== 'ok' && typeof f.fineMax === 'number' && f.fineMax > 0)
    .reduce((sum, f) => sum + f.fineMax, 0);
}

export function verdictForScore(score, criticalCount) {
  if (criticalCount > 0 && score < 50) return 'У сайта серьёзные проблемы — риск штрафов реальный';
  if (criticalCount > 0) return 'Сайт неплох, но есть риски, которые лучше убрать';
  if (score >= 85) return 'Отличный результат — серьёзных проблем не нашли';
  return 'Хороший сайт, но есть что поправить';
}
