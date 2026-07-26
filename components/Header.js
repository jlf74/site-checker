'use client';

import { useEffect, useState } from 'react';
import Icon from './Icon';

export default function Header() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  const close = () => setOpen(false);

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
          <button
            className="login-link"
            onClick={() => alert('Личный кабинет появится вместе с оплатой — на следующем этапе.')}
          >
            <Icon name="user" size={15} />Войти
          </button>
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
              onClick={() => {
                close();
                alert('Личный кабинет появится вместе с оплатой — на следующем этапе.');
              }}
            >
              <Icon name="user" size={15} />Войти
            </button>
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
