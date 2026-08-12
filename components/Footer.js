export default function Footer() {
  const showPolicyGen = process.env.NEXT_PUBLIC_SHOW_POLICY_GEN === '1';
  return (
    <footer className="footer">
      <div className="footer-links">
        <a href="/privacy">Политика конфиденциальности</a>
        <a href="/offer">Публичная оферта</a>
        {showPolicyGen && <a href="/policy-generator">Генератор политики</a>}
        <a href="mailto:hello@sait-checkup.ru">hello@sait-checkup.ru</a>
      </div>
      <div className="footer-disclaimer">
        Результаты проверки формируются автоматически с помощью ИИ и являются предварительной оценкой
        возможных рисков. Они не заменяют консультацию юриста — для окончательных выводов подтвердите
        их у профильного специалиста.
      </div>
      <div className="footer-fineprint">
        © СайтЧекап · Самозанятая Фомина Ю. В. · ИНН 745011006640 ·{' '}
        <a href="https://t.me/juliafomina_web" target="_blank" rel="noopener noreferrer">
          Разработка сайта — @juliafomina_web
        </a>
      </div>
    </footer>
  );
}
