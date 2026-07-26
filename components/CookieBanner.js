'use client';

import { useEffect, useState } from 'react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('checkup_cookie_ok')) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Уведомление об использовании cookie">
      <span>
        Мы используем cookie, чтобы сервис работал корректно. Продолжая, вы соглашаетесь с{' '}
        <a href="/privacy">политикой конфиденциальности</a>.
      </span>
      <button
        className="btn btn-primary btn-sm"
        onClick={() => {
          localStorage.setItem('checkup_cookie_ok', '1');
          setVisible(false);
        }}
      >
        Понятно
      </button>
    </div>
  );
}
