'use client';

import { useEffect, useRef, useState } from 'react';
import { CHECKS, computeScore, computeRisk, verdictForScore } from '../lib/checks';
import Icon from '../components/Icon';
import Finding from '../components/Finding';
import Mascot from '../components/Mascot';

const SEV_ORDER = { critical: 0, warning: 1, ok: 2 };

function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const PROGRESS_LABELS = {
  fetch: 'Читаю ваш сайт…',
  tech: 'Проверяю техническую часть…',
  '152fz': 'Проверяю формы по 152-ФЗ…',
  advertising: 'Ищу рискованные обещания в текстах…',
  spelling: 'Вычитываю орфографию и пунктуацию…',
  education: 'Проверяю по закону об образовании…',
  seo: 'Смотрю на страницу глазами поисковика…',
  ux: 'Оцениваю тексты глазами покупателя…',
  score: 'Считаю оценку…',
};

function ScoreRing({ score }) {
  const r = 29;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <svg width="84" height="84" viewBox="0 0 72 72" role="img" aria-label={`Оценка ${score} из 100`}>
      <circle cx="36" cy="36" r={r} fill="none" stroke="var(--c-ring-track)" strokeWidth="7" />
      <circle
        cx="36" cy="36" r={r} fill="none"
        stroke="var(--c-ring)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${filled} ${c}`} transform="rotate(-90 36 36)"
      />
      <text x="36" y="35" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--c-ink)"
        fontFamily="var(--font-manrope), Manrope, sans-serif">{score}</text>
      <text x="36" y="49" textAnchor="middle" fontSize="9" fill="var(--c-muted)">из 100</text>
    </svg>
  );
}

// Технические находки строятся из HTML-анализа прокси — бесплатно, без ИИ.
function buildTechFindings(tech) {
  if (!tech) return [];
  const findings = [];
  if (tech.https === false) {
    findings.push({
      severity: 'critical',
      title: 'Сайт работает без https — данные форм передаются в открытом виде',
      quote: null,
      law: '152-ФЗ, ст. 19',
      fine: null,
      fineMax: null,
      fix: 'Подключите SSL-сертификат у хостинга — у большинства он бесплатный (Let’s Encrypt) и включается в пару кликов.',
    });
  } else if (tech.https === true) {
    findings.push({ severity: 'ok', title: 'Соединение защищено (https)', quote: null, law: null, fine: null, fineMax: null, fix: null });
  }
  if (tech.trackers?.includes('Google Analytics')) {
    findings.push({
      severity: 'warning',
      title: 'Google Analytics передаёт данные посетителей за рубеж',
      quote: null,
      law: '152-ФЗ, ст. 12',
      fine: 'до 1 000 000 ₽',
      fineMax: 1000000,
      fix: 'Замените на Яндекс.Метрику — либо оформите трансграничную передачу: пункт в политике и уведомление в Роскомнадзор.',
    });
  }
  if (tech.trackers?.includes('Meta Pixel')) {
    findings.push({
      severity: 'warning',
      title: 'Пиксель Meta передаёт данные посетителей за рубеж',
      quote: null,
      law: '152-ФЗ, ст. 12',
      fine: 'до 1 000 000 ₽',
      fineMax: 1000000,
      fix: 'Уберите пиксель или оформите трансграничную передачу данных (пункт в политике + уведомление в Роскомнадзор).',
    });
  }
  if (tech.trackers?.includes('Яндекс.Метрика') && !tech.cookieMention) {
    findings.push({
      severity: 'warning',
      title: 'Стоит Яндекс.Метрика, но уведомления про cookie не найдено',
      quote: null,
      law: '152-ФЗ, ст. 9',
      fine: null,
      fineMax: null,
      fix: 'Добавьте баннер «Мы используем cookie» со ссылкой на политику конфиденциальности.',
    });
  }
  if (tech.privacyLink) {
    findings.push({ severity: 'ok', title: 'Ссылка на политику конфиденциальности найдена в коде', quote: null, law: null, fine: null, fineMax: null, fix: null });
  }
  return findings;
}

function EmailBoost({ onDone }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [state, setState] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  async function submit() {
    if (state === 'sending') return;
    setState('sending');
    setError('');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, marketing }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Не получилось, попробуйте ещё раз');
      setState('done');
      onDone?.();
    } catch (e) {
      setState('error');
      setError(e.message);
    }
  }

  if (state === 'done') {
    return (
      <div className="limit-box">
        <Icon name="check" size={16} style={{ color: 'var(--c-ring)' }} />
        Готово! Теперь у вас 3 бесплатные проверки в день.
      </div>
    );
  }

  return (
    <div className="limit-box">
      {open ? (
        <div className="email-form">
          <input
            className="url-input"
            type="email"
            placeholder="ваша@почта.ru"
            value={email}
            autoFocus
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button className="btn btn-primary" onClick={submit} disabled={!agree || state === 'sending'}>
            {state === 'sending' ? 'Секунду…' : 'Получить'}
          </button>
          {error && <div className="email-error">{error}</div>}
          <label className="consent-check">
            <input
              type="checkbox"
              checked={agree}
              onChange={(e) => setAgree(e.target.checked)}
            />
            <span>
              Даю <a href="/consent">согласие на обработку персональных данных</a> —{' '}
              <a href="/privacy">политика конфиденциальности</a>
            </span>
          </label>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
            />
            <span>Хочу получать письма о новых инструментах сервиса (необязательно)</span>
          </label>
        </div>
      ) : (
        <>
          <span>Нужно проверять больше сайтов?</span>
          <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
            +2 бесплатные проверки в день
          </button>
        </>
      )}
    </div>
  );
}

// Результат бесплатной проверки живёт ТОЛЬКО в браузере: час, потом стирается сам.
// На сервер не пишем ничего — хранить чужие отчёты мы не хотим (docs/SPEC.md).
// Это не обход лимита: счётчик серверный, здесь только показ уже полученного результата.
// Cookie для этого не годится — в неё влезает 4 КБ, а отчёт весит 15-30 КБ.
const CACHE_KEY = 'checkup:last-result';
const CACHE_TTL_MS = 60 * 60 * 1000;

export default function Home() {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [selected, setSelected] = useState(CHECKS.filter((c) => c.defaultOn).map((c) => c.id));
  const [phase, setPhase] = useState('idle'); // idle | running | done
  const [progress, setProgress] = useState({});
  const [results, setResults] = useState({});
  const [fetchError, setFetchError] = useState('');
  const [checkedUrl, setCheckedUrl] = useState('');
  const [expanded, setExpanded] = useState({});
  const [devFull, setDevFull] = useState(false);
  const [quota, setQuota] = useState(null); // { limit, remaining, boosted }
  const [limitMsg, setLimitMsg] = useState('');
  const resultsRef = useRef(null);
  const manualRef = useRef(null);
  // Момент первого сохранения. При восстановлении переносим его как есть, иначе
  // каждое открытие страницы продлевало бы час заново и результат жил бы вечно.
  const savedAtRef = useRef(null);

  const devUnlockAvailable = process.env.NEXT_PUBLIC_DEV_UNLOCK === '1';

  const refreshQuota = () =>
    fetch('/api/quota')
      .then((r) => r.json())
      .then((d) => { setQuota(d); if (d.remaining > 0) setLimitMsg(''); })
      .catch(() => {});

  useEffect(() => { refreshQuota(); }, []);

  // Восстанавливаем прошлый результат, если ему меньше часа.
  useEffect(() => {
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
    } catch {
      saved = null;
    }
    if (!saved || !saved.results || Date.now() - saved.savedAt > CACHE_TTL_MS) {
      try { localStorage.removeItem(CACHE_KEY); } catch {}
      return;
    }
    savedAtRef.current = saved.savedAt;
    setResults(saved.results);
    setCheckedUrl(saved.checkedUrl || '');
    setPhase('done');
  }, []);

  // Сохраняем готовый результат. Демо-заглушки не сохраняем: они не настоящие.
  useEffect(() => {
    if (phase !== 'done' || Object.keys(results).length === 0) return;
    if (Object.values(results).some((r) => r.mock)) return;
    const savedAt = savedAtRef.current || Date.now();
    savedAtRef.current = savedAt;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt, checkedUrl, results }));
    } catch {}
  }, [phase, results, checkedUrl]);

  useEffect(() => {
    if (showManual && manualRef.current) manualRef.current.focus();
  }, [showManual]);

  useEffect(() => {
    if (phase === 'done' && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [phase]);

  const toggleCheck = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const canRun = (url.trim() || manualText.trim().length > 100) && selected.length > 0 && phase !== 'running';

  async function handleRun() {
    if (!canRun) return;
    // Ранняя проверка остатка, чтобы не гонять человека через загрузку сайта впустую.
    if (quota && quota.remaining <= 0) {
      setLimitMsg(
        quota.boosted
          ? 'На сегодня проверки закончились — вернитесь завтра или откройте полный отчёт.'
          : 'Бесплатная проверка на сегодня использована. Оставьте почту — станет три в день.'
      );
      return;
    }
    setFetchError('');
    setLimitMsg('');
    setResults({});
    setExpanded({});
    savedAtRef.current = null; // новая проверка — новый час хранения
    setPhase('running');
    setProgress({ fetch: 'active' });

    let text = '';
    let techResult = null;
    if (showManual && manualText.trim().length > 100) {
      text = manualText.trim();
      setCheckedUrl('вставленный текст');
      setProgress({ fetch: 'done' });
    } else {
      try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(url.trim())}`);
        const data = await res.json();
        if (!res.ok) throw Object.assign(new Error(data.error || 'fail'), { status: res.status });
        text = data.text + (data.techNote || '');
        techResult = { findings: buildTechFindings(data.tech) };
        setCheckedUrl(data.url.replace(/^https?:\/\//, '').replace(/\/$/, ''));
        setProgress({ fetch: 'done' });
      } catch (e) {
        const messages = {
          504: 'Сайт не отвечает. Вставьте текст страницы вручную — проверим его.',
          502: 'Ваш сайт не пускает роботов — бывает. Вставьте текст страницы вручную, проверим его.',
          415: 'По этой ссылке не HTML-страница. Дайте ссылку на страницу сайта или вставьте текст вручную.',
          422: e.message,
        };
        setFetchError(messages[e.status] || 'Не удалось загрузить сайт. Попробуйте вставить текст вручную.');
        setShowManual(true);
        setPhase('idle');
        return;
      }
    }

    // Лимит списываем только когда текст уже есть: если сайт не открылся,
    // бесплатная проверка не должна сгорать.
    let runToken;
    try {
      const res = await fetch('/api/quota', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setQuota({ limit: data.limit, remaining: 0, boosted: data.boosted });
        setLimitMsg(data.error);
        setPhase('idle');
        setProgress({});
        return;
      }
      runToken = data.runToken;
      setQuota({ limit: data.limit, remaining: data.remaining, boosted: data.boosted });
    } catch {
      setFetchError('Сервис недоступен, попробуйте через минуту.');
      setPhase('idle');
      setProgress({});
      return;
    }

    const nextProgress = { fetch: 'done' };
    if (techResult) {
      nextProgress.tech = 'done';
      setResults((prev) => ({ ...prev, tech: techResult }));
    }
    selected.forEach((id) => (nextProgress[id] = 'active'));
    setProgress(nextProgress);

    await Promise.all(
      selected.map(async (id) => {
        try {
          const res = await fetch('/api/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ checkId: id, siteText: text, runToken }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          setResults((prev) => ({ ...prev, [id]: data }));
        } catch {
          setResults((prev) => ({ ...prev, [id]: { summary: '', findings: [], failed: true } }));
        }
        setProgress((prev) => ({ ...prev, [id]: 'done' }));
      })
    );

    setPhase('done');
  }

  // Сводим находки всех проверок в один отсортированный список
  const allFindings = Object.entries(results)
    .flatMap(([checkId, r]) => (r.findings || []).map((f) => ({ ...f, checkId })))
    .sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity]);

  const problems = allFindings.filter((f) => f.severity !== 'ok');
  const okItems = allFindings.filter((f) => f.severity === 'ok');
  const criticalCount = allFindings.filter((f) => f.severity === 'critical').length;
  const warningCount = allFindings.filter((f) => f.severity === 'warning').length;
  const score = computeScore(allFindings);
  const risk = computeRisk(allFindings);
  const isMock = Object.values(results).some((r) => r.mock);
  // Упавшая проверка не должна выглядеть как «здесь всё чисто»: находок нет,
  // а значит computeScore ничего не вычтет и оценка окажется завышенной.
  // Поэтому называем сломавшиеся проверки прямо и предупреждаем про оценку.
  const failedChecks = Object.entries(results)
    .filter(([, r]) => r.failed)
    .map(([id]) => CHECKS.find((c) => c.id === id)?.fullLabel || id);
  const failedCount = failedChecks.length;
  // При упавшей проверке нельзя обещать, что всё хорошо: мы просто не смотрели.
  const verdict =
    failedCount > 0 && criticalCount === 0
      ? 'Проверка выполнена не полностью — выводы предварительные'
      : verdictForScore(score, criticalCount);

  const scrollToPaywall = () =>
    document.querySelector('.paywall')?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <main id="top">
        <section className="hero">
          {phase !== 'running' && (
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
              <Mascot mood="idle" size={76} />
            </div>
          )}
          <span className="hero-badge">
            <Icon name="alertTriangle" size={14} />
            Форма без согласия на обработку данных — штраф до 300 000 ₽
          </span>
          <h1>Проверьте свой сайт раньше, чем получите штраф</h1>
          <p className="hero-sub">
            Проверка сайта на соответствие 152-ФЗ, законам о рекламе и об образовании.
            Бесплатно, за 3 минуты.
          </p>

          <div className="check-form">
            <input
              id="url-input"
              className="url-input"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFetchError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder="https://ваш-сайт.ru"
              autoComplete="off"
            />
            <button className="btn btn-primary" disabled={!canRun} onClick={handleRun}>
              {phase === 'running' ? 'Проверяю…' : 'Проверить сайт'}
            </button>
          </div>

          {fetchError && (
            <div className="error-box" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Mascot mood="alert" size={44} />
              <span>{fetchError}</span>
            </div>
          )}

          {limitMsg && (
            <>
              <div className="error-box" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Mascot mood="alert" size={44} />
                <span>{limitMsg}</span>
              </div>
              {!quota?.boosted && <EmailBoost onDone={refreshQuota} />}
            </>
          )}

          {showManual && (
            <div className="manual-block">
              <textarea
                ref={manualRef}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Скопируйте и вставьте сюда текст страницы сайта…"
                rows={7}
              />
              <div className="hint" style={{ textAlign: 'left', marginTop: 4 }}>
                {manualText.trim().length > 0 && manualText.trim().length <= 100
                  ? 'Нужно минимум 100 знаков'
                  : `${manualText.length} знаков`}
              </div>
            </div>
          )}

          <div className="chips" style={{ maxWidth: 660, margin: '0 auto' }}>
            {CHECKS.map((c) => {
              const on = selected.includes(c.id);
              return (
                <button key={c.id} className={`chip ${on ? 'on' : ''}`} onClick={() => toggleCheck(c.id)} title={c.fullLabel}>
                  {on && <Icon name="check" size={13} />}
                  {c.label}
                </button>
              );
            })}
          </div>
          <p className="hint">
            Бесплатно: оценка сайта и главная проблема с решением. Без регистрации.
            {quota && quota.remaining > 0 && (
              <>
                {' · '}
                {quota.remaining === quota.limit
                  ? `${quota.limit} ${plural(quota.limit, 'проверка', 'проверки', 'проверок')} в день`
                  : `осталось ${quota.remaining} из ${quota.limit} на сегодня`}
              </>
            )}
            {!showManual && (
              <>
                {' · '}
                <a href="#top" onClick={(e) => { e.preventDefault(); setShowManual(true); }} style={{ color: 'var(--c-faint)' }}>
                  вставить текст вручную
                </a>
              </>
            )}
          </p>

          {phase === 'running' ? (
            <div className="progress-card" style={{ marginTop: 36, display: 'flex', gap: 20, alignItems: 'center' }}>
              <Mascot mood="reading" size={64} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {Object.entries(progress).map(([key, state]) => (
                  <div key={key} className={`progress-line ${state === 'done' ? 'done' : ''}`}>
                    {state === 'done'
                      ? <Icon name="check" size={15} style={{ color: 'var(--c-ring)' }} />
                      : <span className="spinner" />}
                    {PROGRESS_LABELS[key] || key}
                  </div>
                ))}
              </div>
            </div>
          ) : phase === 'idle' ? (
            <div className="fear-cards">
              <div className="fear-card">
                <b>до 300 000 ₽</b>
                <span>за форму без согласия на обработку данных</span>
              </div>
              <div className="fear-card">
                <b>до 500 000 ₽</b>
                <span>за «лучший» и «№1» без доказательств</span>
              </div>
              <div className="fear-card positive">
                <b>3 минуты</b>
                <span>и вы знаете все слабые места сайта</span>
              </div>
            </div>
          ) : (
            <div style={{ height: 40 }} />
          )}
        </section>

        {phase === 'done' && (
          <section className="verdict" ref={resultsRef}>
            <div className="verdict-head">
              <ScoreRing score={score} />
              <div>
                <h2 className="verdict-title">{verdict}</h2>
                <div className="verdict-sub">
                  {checkedUrl} · {problems.length > 0
                    ? `нашли ${problems.length} ${plural(problems.length, 'проблему', 'проблемы', 'проблем')} в ${Object.keys(results).length} ${plural(Object.keys(results).length, 'проверке', 'проверках', 'проверках')}`
                    : 'серьёзных проблем не нашли'}
                  {failedCount > 0 &&
                    ` · ${failedCount} ${plural(failedCount, 'проверка не выполнилась', 'проверки не выполнились', 'проверок не выполнились')}`}
                </div>
                <div className="severity-chips">
                  {criticalCount > 0 && <span className="sev-chip critical">{criticalCount} критичных</span>}
                  {warningCount > 0 && <span className="sev-chip warning">{warningCount} замечаний</span>}
                  {okItems.length > 0 && <span className="sev-chip ok">{okItems.length} в порядке</span>}
                </div>
                {risk > 0 && (
                  <div className="risk-line">
                    Суммарный риск штрафов: <b>до {risk.toLocaleString('ru-RU')} ₽</b>
                  </div>
                )}
              </div>
              <span className="verdict-mascot">
                <Mascot mood={criticalCount > 0 ? 'alert' : 'happy'} size={72} />
              </span>
            </div>

            {isMock && (
              <div className="error-box" style={{ maxWidth: 'none', margin: '0 0 14px' }}>
                Демо-режим: ключ Claude API не настроен, показаны примерные данные.
              </div>
            )}

            {failedCount > 0 && (
              <div className="error-box" style={{ maxWidth: 'none', margin: '0 0 14px' }}>
                Не удалось выполнить {failedCount === 1 ? 'проверку' : 'проверки'}:{' '}
                <b>{failedChecks.join(', ')}</b>. Оценка и список находок неполные — по{' '}
                {failedCount === 1 ? 'этому направлению' : 'этим направлениям'} мы ничего не
                проверили. Запустите проверку ещё раз.
              </div>
            )}

            {devFull ? (
              <>
                {[...problems, ...okItems].map((f, i) => (
                  <Finding
                    key={i}
                    finding={f}
                    expanded={!!expanded[i]}
                    onToggle={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
                  />
                ))}
              </>
            ) : (
              <>
                {problems.map((f, i) => (
                  <Finding
                    key={i}
                    finding={f}
                    locked={i > 0}
                    expanded={i === 0}
                    onToggle={i > 0 ? scrollToPaywall : undefined}
                  />
                ))}

                {problems.length > 0 && (
                  <div className="paywall">
                    <div>
                      <div className="paywall-title">
                        Как исправить все {problems.length} {plural(problems.length, 'проблему', 'проблемы', 'проблем')} — в полном отчёте
                      </div>
                      <div className="paywall-features">
                        <div><Icon name="check" size={13} style={{ color: 'var(--c-primary-dark)', position: 'relative', top: 3 }} />Каждая находка: цитата, риск и готовое исправление</div>
                        <div><Icon name="check" size={13} style={{ color: 'var(--c-primary-dark)', position: 'relative', top: 3 }} />Постоянная ссылка — можно отправить подрядчику</div>
                        <div><Icon name="check" size={13} style={{ color: 'var(--c-primary-dark)', position: 'relative', top: 3 }} />Бесплатная перепроверка после исправлений — месяц</div>
                      </div>
                    </div>
                    <div className="paywall-cta">
                      <button
                        className="btn btn-primary"
                        onClick={() => alert('Оплата через Продамус подключается на следующем этапе разработки.')}
                      >
                        {risk > 0 ? `Убрать риски — 990 ₽` : 'Открыть отчёт — 990 ₽'}
                      </button>
                      <div className="paywall-note">Подробный отчёт в PDF-формате сразу после оплаты</div>
                    </div>
                  </div>
                )}

                {okItems.map((f, i) => (
                  <Finding key={`ok-${i}`} finding={f} expanded={false} onToggle={undefined} locked={false} />
                ))}

                <EmailBoost onDone={refreshQuota} />
              </>
            )}

            {devUnlockAvailable && (
              <p className="hint">
                <a href="#top" onClick={(e) => { e.preventDefault(); setDevFull(!devFull); }} style={{ color: 'var(--c-faint)' }}>
                  {devFull ? '← вернуть бесплатный вид' : 'режим разработчика: показать полный отчёт'}
                </a>
              </p>
            )}
          </section>
        )}

        <section className="section" id="how">
          <h2>Как это работает</h2>
          <div className="steps">
            <div className="step">
              <b><span className="step-num">1</span>Вставьте адрес сайта</b>
              <p>Мы прочитаем страницу так же, как её видит посетитель — и проверяющий.</p>
            </div>
            <div className="step">
              <b><span className="step-num">2</span>ИИ проверяет по 6 направлениям</b>
              <p>Законы (152-ФЗ, реклама, образование), орфография, SEO и убедительность текстов.</p>
            </div>
            <div className="step">
              <b><span className="step-num">3</span>Получите вердикт</b>
              <p>Бесплатно — оценка и главная проблема. Полный отчёт с исправлениями — 990 ₽.</p>
            </div>
          </div>
        </section>

        <section className="section" id="price">
          <h2>Стоимость</h2>
          <div className="steps">
            <div className="step">
              <b>Без регистрации — бесплатно</b>
              <p style={{ margin: '8px 0 0' }}>Оценка сайта, риск штрафов, список всех находок и самая серьёзная проблема с решением. 1 проверка в день.</p>
            </div>
            <div className="step">
              <b>С почтой — бесплатно</b>
              <p style={{ margin: '8px 0 0' }}>То же самое, но 3 проверки в день. Просто оставьте почту — пришлём туда результаты.</p>
            </div>
            <div className="step">
              <b>Полный отчёт — 990 ₽</b>
              <p style={{ margin: '8px 0 0' }}>Все находки с цитатами и исправлениями, ссылка на отчёт, PDF и бесплатная перепроверка — месяц.</p>
            </div>
          </div>
        </section>
    </main>
  );
}
