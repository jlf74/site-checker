import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const CHECKS = [
  {
    id: "spelling",
    label: "Орфография и пунктуация",
    icon: "✍",
    color: "#7FFFD4",
    prompt: `Ты — профессиональный редактор русского языка. Проанализируй текст сайта и найди:
1. Орфографические ошибки
2. Пунктуационные ошибки  
3. Стилистические ошибки
4. Опечатки

Для каждой ошибки укажи: цитату с ошибкой → как должно быть → пояснение.
Если ошибок нет — напиши об этом.
Отвечай структурированно, на русском языке. Начни с краткого резюме (1-2 предложения).`,
  },
  {
    id: "152fz",
    label: "152-ФЗ (персональные данные)",
    icon: "🔒",
    color: "#FFB347",
    prompt: `Ты — юрист, специализирующийся на российском законодательстве о персональных данных (152-ФЗ). Проверь сайт:

1. Есть ли политика конфиденциальности и ссылка на неё
2. Есть ли согласие на обработку персональных данных во всех формах
3. Указан ли оператор персональных данных
4. Корректно ли указаны цели обработки данных
5. Есть ли информация о cookies

Для каждого пункта: статус (✅ ок / ⚠️ замечание / ❌ нарушение) + пояснение.
Начни с общего вывода о соответствии 152-ФЗ.`,
  },
  {
    id: "advertising",
    label: "Закон о рекламе",
    icon: "📢",
    color: "#FF6B9D",
    prompt: `Ты — юрист по рекламному праву РФ. Проверь текст сайта на соответствие ФЗ "О рекламе" (№38-ФЗ):

1. Запрещённые превосходные степени без доказательств: "лучший", "№1", "единственный", "самый"
2. Гарантии результата там, где их нельзя гарантировать
3. Некорректное сравнение с конкурентами
4. Использование слова "бесплатно" с скрытыми условиями
5. Маркировка рекламы (если есть рекламные блоки)
6. Медицинские/финансовые заявления без оговорок

Для каждого нарушения: цитата → статья закона → что нужно изменить.
Начни с общего резюме.`,
  },
  {
    id: "education",
    label: "Закон об образовании",
    icon: "🎓",
    color: "#A8E6CF",
    prompt: `Ты — юрист, специализирующийся на образовательном праве РФ (273-ФЗ "Об образовании"). Проверь сайт:

1. Есть ли лицензия на образовательную деятельность (или оговорка что это не образование, а информационные услуги)
2. Корректно ли описаны образовательные продукты (курсы, тренинги, обучение)
3. Есть ли информация об организации-исполнителе
4. Соответствие требованиям к описанию программ
5. Наличие документов об образовании/квалификации преподавателей (если указаны)

Для каждого пункта: статус + пояснение + рекомендация.
Начни с вывода: нужна ли лицензия и есть ли критичные нарушения.`,
  },
  {
    id: "seo",
    label: "SEO-базис",
    icon: "🔍",
    color: "#C9B1FF",
    prompt: `Ты — SEO-специалист. Проанализируй контент сайта с точки зрения базовой SEO-оптимизации:

1. Структура заголовков (H1, H2, H3) — есть ли, правильно ли используются
2. Качество текстов — уникальность формулировок, ключевые слова
3. Призывы к действию (CTA) — есть ли, насколько убедительны
4. Структура и логика страницы
5. Есть ли дублирующийся контент
6. Читабельность и объём текстов

Оцени каждый пункт по шкале 1-10 и дай конкретные рекомендации.
Начни с общей оценки SEO-потенциала страницы.`,
  },
  {
    id: "ux",
    label: "UX-копирайтинг",
    icon: "💬",
    color: "#FFD93D",
    prompt: `Ты — UX-копирайтер и эксперт по конверсии. Оцени тексты сайта:

1. Заголовки — цепляют ли, понятна ли выгода
2. Описания услуг/продуктов — конкретные ли, убедительные ли
3. CTA-кнопки и призывы — насколько мотивируют к действию
4. Доверие — есть ли социальные доказательства, гарантии
5. Тон и голос бренда — последователен ли стиль
6. Возражения — отрабатываются ли страхи и сомнения клиента

Для каждого пункта: что хорошо / что можно улучшить / конкретный пример переформулировки.
Начни с общего впечатления от сайта как покупателя.`,
  },
];

function extractText(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll("script, style, noscript, header, footer, nav").forEach((el) => el.remove());
  const text = tmp.innerText || tmp.textContent || "";
  return text.replace(/\s+/g, " ").trim().slice(0, 8000);
}

async function fetchSiteContent(url) {
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const err = new Error(data.error || "proxy failed");
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (!data.content) throw new Error("empty response");
  return extractText(data.content);
}

async function runCheck(checkId, siteText) {
  const check = CHECKS.find((c) => c.id === checkId);
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: check.prompt,
      messages: [
        {
          role: "user",
          content: `Вот текст сайта для проверки:\n\n${siteText}`,
        },
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || data.error || `API error ${response.status}`);
  }
  return data.choices?.[0]?.message?.content || "Не удалось получить результат";
}

function getChildText(children) {
  return [children].flat().map((c) => (typeof c === "string" ? c : "")).join("");
}

const markdownComponents = {
  p({ children }) {
    const text = getChildText(children);
    if (text.startsWith("Цитата:")) return <p className="label-quote">{children}</p>;
    if (text.startsWith("Статья закона:")) return <p className="label-law">{children}</p>;
    if (text.startsWith("Рекомендация:")) return <p className="label-rec">{children}</p>;
    return <p>{children}</p>;
  },
};

export default function SiteChecker() {
  const [url, setUrl] = useState("");
  const [manualText, setManualText] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [selectedChecks, setSelectedChecks] = useState(["spelling", "152fz"]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState({});
  const [fetchError, setFetchError] = useState("");
  const [globalLoading, setGlobalLoading] = useState(false);
  const [activeResult, setActiveResult] = useState(null);
  const [fetchedOk, setFetchedOk] = useState(false);
  const manualTextareaRef = useRef(null);

  useEffect(() => {
    if (showManual && manualTextareaRef.current) {
      manualTextareaRef.current.focus();
    }
  }, [showManual]);

  const toggleCheck = (id) => {
    setSelectedChecks((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleRun = async () => {
    if (!url && !manualText) return;
    setFetchError("");
    setResults({});
    setActiveResult(null);
    setFetchedOk(false);

    let text = "";

    if (showManual && manualText.trim().length > 50) {
      text = manualText.trim();
    } else {
      setGlobalLoading(true);
      try {
        text = await fetchSiteContent(url);
        setFetchedOk(true);
      } catch (e) {
        const s = e.status;
        if (s === 504) setFetchError("timeout");
        else if (s === 502) setFetchError("blocked");
        else if (s === 415) setFetchError("not_html");
        else setFetchError("fail");
        setGlobalLoading(false);
        setShowManual(true);
        return;
      }
      setGlobalLoading(false);
    }

    const loadingState = {};
    selectedChecks.forEach((id) => (loadingState[id] = true));
    setLoading(loadingState);

    await Promise.all(
      selectedChecks.map(async (id) => {
        try {
          const result = await runCheck(id, text);
          setResults((prev) => ({ ...prev, [id]: result }));
          setActiveResult((cur) => cur || id);
        } catch (e) {
          setResults((prev) => ({ ...prev, [id]: "Ошибка при выполнении проверки." }));
        }
        setLoading((prev) => ({ ...prev, [id]: false }));
      })
    );
  };

  const doneChecks = selectedChecks.filter((id) => results[id]);
  const hasResults = doneChecks.length > 0;
  const isRunning = globalLoading || Object.values(loading).some(Boolean);

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      fontFamily: "'Inter', sans-serif",
      color: "#e8e8e0",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e1e2e",
        padding: "28px 40px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        background: "#0d0d14",
      }}>
        <div style={{
          width: 36, height: 36,
          background: "linear-gradient(135deg, #7FFFD4, #C9B1FF)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 18,
        }}>⚡</div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.5px", color: "#f0f0e8" }}>
            SiteAudit
          </div>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: "2px", textTransform: "uppercase" }}>
            Проверка сайтов с AI
          </div>
        </div>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 85px)" }}>
        {/* Left panel */}
        <div style={{
          width: 340,
          flexShrink: 0,
          borderRight: "1px solid #1e1e2e",
          padding: "32px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}>
          {/* URL input */}
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>
              URL сайта
            </div>
            <input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setFetchError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleRun()}
              placeholder="https://example.ru"
              style={{
                width: "100%",
                background: "#0d0d14",
                border: "1px solid #2a2a3e",
                borderRadius: 8,
                padding: "12px 14px",
                color: "#e8e8e0",
                fontSize: 13,
                outline: "none",
                boxSizing: "border-box",
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#7FFFD4"}
              onBlur={(e) => e.target.style.borderColor = "#2a2a3e"}
            />
            {fetchError && (
              <div style={{
                marginTop: 10, padding: "10px 12px",
                background: "#1a1010", border: "1px solid #FF6B6B44",
                borderRadius: 8, fontSize: 12, color: "#FF9999", lineHeight: 1.6,
              }}>
                {{
                  timeout:  "Сайт не отвечает с наших серверов. Скопируйте текст страницы вручную и вставьте ниже.",
                  blocked:  "Сайт блокирует автоматические запросы. Скопируйте текст страницы вручную и вставьте ниже.",
                  not_html: "Это не HTML-страница (PDF, изображение и т.д.).",
                  fail:     "Не удалось загрузить сайт. Попробуйте вставить текст вручную.",
                }[fetchError] ?? "Не удалось загрузить сайт. Попробуйте вставить текст вручную."}
              </div>
            )}
            {fetchedOk && (
              <div style={{ marginTop: 6, fontSize: 11, color: "#7FFFD4" }}>✓ Текст загружен</div>
            )}
          </div>

          {/* Manual text */}
          {showManual && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: "#7FFFD4", letterSpacing: "2px", textTransform: "uppercase" }}>
                  Текст вручную
                </div>
                <span
                  style={{ fontSize: 11, color: "#555", cursor: "pointer" }}
                  onClick={() => { setShowManual(false); setManualText(""); setFetchError(""); }}
                >✕</span>
              </div>
              <textarea
                ref={manualTextareaRef}
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Скопируйте и вставьте сюда текст страницы сайта..."
                rows={7}
                style={{
                  width: "100%", background: "#0d0d14", border: "1px solid #7FFFD444",
                  borderRadius: 8, padding: "10px 12px", color: "#e8e8e0",
                  fontSize: 12, outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit", resize: "vertical", lineHeight: 1.6,
                }}
                onFocus={(e) => e.target.style.borderColor = "#7FFFD4"}
                onBlur={(e) => e.target.style.borderColor = "#7FFFD444"}
              />
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                {manualText.length} симв.
              </div>
            </div>
          )}

          {!showManual && fetchError !== "auto_fail" && (
            <div
              style={{ fontSize: 11, color: "#444", cursor: "pointer" }}
              onClick={() => setShowManual(true)}
            >
              + Вставить текст вручную
            </div>
          )}

          {/* Checks */}
          <div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 12 }}>
              Проверки
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {CHECKS.map((check) => {
                const isSelected = selectedChecks.includes(check.id);
                const isDone = !!results[check.id];
                const isLoading = loading[check.id];
                return (
                  <div
                    key={check.id}
                    onClick={() => {
                      toggleCheck(check.id);
                      if (isDone) setActiveResult(check.id);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: `1px solid ${isSelected ? check.color + "44" : "#1e1e2e"}`,
                      background: isSelected ? check.color + "0a" : "transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                  >
                    <div style={{
                      width: 20, height: 20,
                      border: `1.5px solid ${isSelected ? check.color : "#333"}`,
                      borderRadius: 5,
                      background: isSelected ? check.color + "22" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      fontSize: 11,
                      color: check.color,
                    }}>
                      {isSelected && "✓"}
                    </div>
                    <span style={{ fontSize: 15, color: isSelected ? "#f0f0e8" : "#888" }}>
                      {check.icon} {check.label}
                    </span>
                    {isLoading && (
                      <div style={{
                        marginLeft: "auto",
                        width: 14, height: 14,
                        border: `2px solid ${check.color}33`,
                        borderTop: `2px solid ${check.color}`,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        flexShrink: 0,
                      }} />
                    )}
                    {isDone && !isLoading && (
                      <div style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: check.color,
                        flexShrink: 0,
                      }}>✓</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Run button */}
          <button
            onClick={handleRun}
            disabled={(!url && !manualText) || selectedChecks.length === 0 || isRunning}
            style={{
              width: "100%",
              padding: "14px",
              background: (url || manualText) && selectedChecks.length > 0 && !isRunning
                ? "linear-gradient(135deg, #7FFFD4, #C9B1FF)"
                : "#1a1a2a",
              border: "none",
              borderRadius: 8,
              color: (url || manualText) && selectedChecks.length > 0 && !isRunning ? "#0a0a0f" : "#444",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "1px",
              textTransform: "uppercase",
              cursor: (url || manualText) && selectedChecks.length > 0 && !isRunning ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            {globalLoading ? "Загружаю сайт..." :
             isRunning ? "Анализирую..." :
             "Запустить проверку"}
          </button>

          {/* Stats */}
          {hasResults && (
            <div style={{
              padding: "14px",
              background: "#0d0d14",
              borderRadius: 8,
              border: "1px solid #1e1e2e",
            }}>
              <div style={{ fontSize: 11, color: "#555", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 10 }}>
                Прогресс
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: "#7FFFD4" }}>
                {doneChecks.length}/{selectedChecks.length}
              </div>
              <div style={{ fontSize: 12, color: "#666" }}>проверок завершено</div>
            </div>
          )}
        </div>

        {/* Right panel - results */}
        <div style={{ flex: 1, padding: "32px 40px", overflow: "auto" }}>
          {!hasResults && !Object.values(loading).some(Boolean) && !globalLoading && (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "60vh",
              gap: 16,
              opacity: 0.4,
            }}>
              <div style={{ fontSize: 64 }}>⚡</div>
              <div style={{ fontSize: 16, color: "#888" }}>Введите URL и запустите проверку</div>
            </div>
          )}

          {(hasResults || Object.values(loading).some(Boolean)) && (
            <div>
              {/* Tabs */}
              {hasResults && (
                <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
                  {doneChecks.map((id) => {
                    const check = CHECKS.find((c) => c.id === id);
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveResult(id)}
                        style={{
                          padding: "8px 14px",
                          borderRadius: 6,
                          border: `1px solid ${activeResult === id ? check.color : "#2a2a3e"}`,
                          background: activeResult === id ? check.color + "15" : "transparent",
                          color: activeResult === id ? check.color : "#666",
                          fontSize: 12,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          transition: "all 0.15s",
                        }}
                      >
                        {check.icon} {check.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Active result */}
              {activeResult && results[activeResult] && (
                <div style={{
                  background: "#0d0d14",
                  border: `1px solid ${CHECKS.find(c => c.id === activeResult)?.color}22`,
                  borderRadius: 12,
                  padding: "32px",
                }}>
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                    paddingBottom: 20,
                    borderBottom: "1px solid #1e1e2e",
                  }}>
                    <span style={{ fontSize: 20 }}>{CHECKS.find(c => c.id === activeResult)?.icon}</span>
                    <span style={{
                      fontSize: 15,
                      fontWeight: 600,
                      color: CHECKS.find(c => c.id === activeResult)?.color,
                    }}>
                      {CHECKS.find(c => c.id === activeResult)?.label}
                    </span>
                  </div>
                  <div className="markdown-result">
                    <ReactMarkdown components={markdownComponents}>{results[activeResult]}</ReactMarkdown>
                  </div>
                </div>
              )}

              {/* Loading states */}
              {selectedChecks
                .filter((id) => loading[id])
                .map((id) => {
                  const check = CHECKS.find((c) => c.id === id);
                  return (
                    <div key={id} style={{
                      background: "#0d0d14",
                      border: `1px solid ${check.color}22`,
                      borderRadius: 12,
                      padding: "28px",
                      marginTop: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 14,
                    }}>
                      <div style={{
                        width: 18, height: 18,
                        border: `2px solid ${check.color}33`,
                        borderTop: `2px solid ${check.color}`,
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 13, color: "#666" }}>
                        {check.icon} Выполняю проверку: {check.label}...
                      </span>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #0a0a0f; }
        ::-webkit-scrollbar-thumb { background: #2a2a3e; border-radius: 3px; }
      `}</style>
    </div>
  );
}
