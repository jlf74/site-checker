// Страница 404. До этого показывалась стандартная страница Next — без шапки,
// без подвала и без единого следа бренда: человек по битой ссылке попадал
// как будто на чужой сайт.

import Mascot from '../components/Mascot';

export const metadata = {
  title: 'Страница не найдена — СайтЧекап',
};

export default function NotFound() {
  return (
    <main className="container" style={{ padding: '90px 24px 120px', textAlign: 'center' }}>
      <Mascot mood="alert" size={96} style={{ margin: '0 auto 22px' }} />
      <h1 style={{ fontSize: 27, marginBottom: 10 }}>Такой страницы нет</h1>
      <p style={{ color: 'var(--c-muted)', maxWidth: 420, margin: '0 auto 28px' }}>
        Возможно, ссылка устарела или в адресе опечатка. Сам сайт при этом работает —
        проверить свой можно прямо сейчас.
      </p>
      <a className="btn btn-primary" href="/#url-input" style={{ textDecoration: 'none', display: 'inline-block' }}>
        Проверить сайт бесплатно
      </a>
      <p className="hint" style={{ marginTop: 22 }}>
        Или посмотрите <a href="/report-example">пример готового отчёта</a>.
      </p>
    </main>
  );
}
