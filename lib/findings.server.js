// Разбор и нормализация ответа модели — общий код для боевого роута и прогонов
// сравнения моделей (benchmarks/). Лежит отдельно, чтобы сравнение считало
// находки ровно теми же правилами, что и продакшен: иначе цифры несопоставимы.

export function parseModelJson(text) {
  let s = text.trim();
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) s = fence[1].trim();
  const start = s.indexOf('{');
  const end = s.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('В ответе модели нет JSON');
  return JSON.parse(s.slice(start, end + 1));
}

// Поле со штрафом показывается в отчёте как есть, поэтому обрубок вида
// «...60 000–100 000 ₽ (ч. 1 ст.» недопустим. Промпт просит короткую верхнюю
// границу, но модель иногда пишет развёрнуто — приводим к «до N ₽» сами.
export function shortFine(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (s.length <= 24) return s;
  // Берём наибольшую сумму из строки и показываем её как верхнюю границу.
  const amounts = s.match(/\d[\d\s   ]*\d|\d/g) || [];
  const max = Math.max(...amounts.map((a) => Number(a.replace(/[^\d]/g, '')) || 0), 0);
  return max > 0 ? `до ${max.toLocaleString('ru-RU')} ₽` : null;
}

export function normalizeFindings(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && typeof f.title === 'string')
    .map((f) => ({
      severity: ['critical', 'warning', 'ok'].includes(f.severity) ? f.severity : 'warning',
      title: String(f.title).slice(0, 200),
      quote: f.quote ? String(f.quote).slice(0, 500) : null,
      law: f.law ? String(f.law).slice(0, 100) : null,
      fine: shortFine(f.fine),
      fineMax: Number.isFinite(f.fineMax) && f.fineMax > 0 ? Math.min(f.fineMax, 20000000) : null,
      fix: f.fix ? String(f.fix).slice(0, 1000) : null,
    }))
    .slice(0, 12);
}
