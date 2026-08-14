'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

const LOGIN_NOTE = 'Личный кабинет появится вместе с оплатой — на следующем этапе.';

export default function Header() {
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  // Подсказка про кабинет закрывается по Esc и по клику мимо. Слушатель клика
  // вешаем следующим тиком: иначе он поймает тот же клик, которым её открыли.
  useEffect(() => {
    if (!notice) return;
    const onKey = (ev) => ev.key === 'Escape' && setNotice(false);
    const onClick = () => setNotice(false);
    const t = setTimeout(() => document.addEventListener('click', onClick), 0);
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('click', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [notice]);

  const close = () => {
    setOpen(false);
    setNotice(false);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a className="logo" href="/" onClick={close}>
          <span className="logo-mark"><Icon name="eye" size={17} /></span>
          <span className="logo-name">СайтЧекап</span>
        </a>
        <nav className="nav">
          <a href="/#how">Как это работает</a>
          <a href="/report-example">Пример отчёта</a>
          <a href="/#price">Стоимость</a>
        </nav>
        <div className="header-actions">
          <div className="login-wrap">
            <button
              className="login-link"
              type="button"
              aria-expanded={notice}
              onClick={(ev) => {
                ev.stopPropagation();
                setNotice((v) => !v);
              }}
            >
              <Icon name="user" size={15} />Войти
            </button>
            {notice && (
              <div className="login-note" role="status">
                {LOGIN_NOTE}
              </div>
            )}
          </div>
          <a className="btn btn-primary btn-sm" href="/#url-input" style={{ textDecoration: 'none' }}>
            Проверить бесплатно
          </a>
        </div>
        <button
          className="burger"
          type="button"
          aria-label={open ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={open}
          onClick={() => setOpen(v => !v)}
        >
          <Icon name={open ? 'close' : 'menu'} size={22} />
        </button>
      </div>

      {open && (
        <>
          <div className="mobile-nav-overlay" onClick={close} />
          <div className="mobile-nav" role="dialog" aria-modal="true">
            <a href="/#how" onClick={close}>Как это работает</a>
            <a href="/report-example" onClick={close}>Пример отчёта</a>
            <a href="/#price" onClick={close}>Стоимость</a>
            <button
              className="mobile-nav-login"
              type="button"
              aria-expanded={notice}
              onClick={(ev) => {
                ev.stopPropagation();
                setNotice((v) => !v);
              }}
            >
              <Icon name="user" size={15} />Войти
            </button>
            {notice && (
              <div className="mobile-nav-note" role="status">
                {LOGIN_NOTE}
              </div>
            )}
            <a
              className="btn btn-primary"
              href="/#url-input"
              style={{ textDecoration: 'none', textAlign: 'center' }}
              onClick={close}
            >
              Проверить бесплатно
            </a>
          </div>
        </>
      )}
    </header>
  );
}
