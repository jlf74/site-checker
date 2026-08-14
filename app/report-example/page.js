'use client';

import { useState } from 'react';
import Finding from '../../components/Finding';
import { EXAMPLE_REPORT as EXAMPLE } from '../../lib/example-report';


export default function ReportExamplePage() {
  const [expanded, setExpanded] = useState({ 0: true });
  const problems = EXAMPLE.findings.filter((f) => f.severity !== 'ok');
  const okItems = EXAMPLE.findings.filter((f) => f.severity === 'ok');
  const criticalCount = problems.filter((f) => f.severity === 'critical').length;

  return (
    <main className="container" style={{ paddingTop: 32, paddingBottom: 48 }}>
      <div className="example-banner">
        Это пример полного отчёта — такой вы получите после оплаты.{' '}
        <a href="/#url-input">Проверить свой сайт бесплатно →</a>
      </div>

      <section className="verdict" style={{ marginTop: 28 }}>
        <div className="verdict-head">
          <svg width="84" height="84" viewBox="0 0 72 72" role="img" aria-label={`Оценка ${EXAMPLE.score} из 100`}>
            <circle cx="36" cy="36" r="29" fill="none" stroke="var(--c-ring-track)" strokeWidth="7" />
            <circle
              cx="36" cy="36" r="29" fill="none"
              stroke="var(--c-ring)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${(EXAMPLE.score / 100) * 182} 182`} transform="rotate(-90 36 36)"
            />
            <text x="36" y="35" textAnchor="middle" fontSize="17" fontWeight="700" fill="var(--c-ink)"
              fontFamily="var(--font-manrope), Manrope, sans-serif">{EXAMPLE.score}</text>
            <text x="36" y="49" textAnchor="middle" fontSize="9" fill="var(--c-muted)">из 100</text>
          </svg>
          <div>
            <h1 className="verdict-title" style={{ fontSize: 20 }}>{EXAMPLE.verdict}</h1>
            <div className="verdict-sub">{EXAMPLE.url} · пример отчёта · 4 проверки</div>
            <div className="severity-chips">
              <span className="sev-chip critical">{criticalCount} критичных</span>
              <span className="sev-chip warning">{problems.length - criticalCount} замечаний</span>
              <span className="sev-chip ok">{okItems.length} в порядке</span>
            </div>
            <div className="risk-line">
              Суммарный риск штрафов: <b>до {EXAMPLE.risk.toLocaleString('ru-RU')} ₽</b>
            </div>
          </div>
        </div>

        {problems.map((f, i) => (
          <Finding
            key={i}
            finding={f}
            expanded={!!expanded[i]}
            onToggle={() => setExpanded((p) => ({ ...p, [i]: !p[i] }))}
          />
        ))}
        {okItems.map((f, i) => (
          <Finding key={`ok-${i}`} finding={f} expanded={false} />
        ))}

        <div className="paywall" style={{ marginTop: 24 }}>
          <div>
            <div className="paywall-title">Хотите такой отчёт по своему сайту?</div>
            <div className="paywall-features">
              Экспресс-проверка бесплатна и не требует регистрации — полный отчёт со всеми
              исправлениями стоит 990 ₽.
            </div>
          </div>
          <div className="paywall-cta">
            <a className="btn btn-primary" href="/#url-input" style={{ textDecoration: 'none', display: 'inline-block' }}>
              Проверить свой сайт
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
