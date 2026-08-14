// Картинка для ссылки в мессенджерах и соцсетях. Next генерирует её сам,
// поэтому отдельного файла-макета держать не нужно: правится кодом, не в редакторе.
//
// Шрифты лежат в репозитории (assets/fonts/, лицензия OFL). Почему именно так:
// генератор не понимает woff2 и не переваривает вариативный ttf из Google Fonts
// (падает с «Cannot read properties of undefined»), поэтому взяты нарезки Onest
// в формате woff — отдельно кириллица, отдельно латиница с цифрами. Все четыре
// файла вместе весят ~50 КБ. Тянуть шрифт из интернета в момент сборки нельзя:
// боевой сервер в Москве, Google оттуда может быть недоступен.

import { ImageResponse } from 'next/og';
import { readFile } from 'fs/promises';
import path from 'path';

export const alt = 'СайтЧекап — проверка сайта на 152-ФЗ, рекламу и образование';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const font = (file) => readFile(path.join(process.cwd(), 'assets', 'fonts', file));

export default async function Image() {
  const [cyr400, cyr700, lat400, lat700] = await Promise.all([
    font('Onest-cyr-400.woff'),
    font('Onest-cyr-700.woff'),
    font('Onest-latin-400.woff'),
    font('Onest-latin-700.woff'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          padding: '68px 72px',
          fontFamily: 'Onest',
        }}
      >
        {/* Логотип */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="26" height="26" viewBox="0 0 100 100">
              <ellipse cx="50" cy="50" rx="42" ry="30" fill="#FFFFFF" />
              <circle cx="50" cy="50" r="15" fill="#16233B" />
              <circle cx="56" cy="44" r="5" fill="#FFFFFF" />
            </svg>
          </div>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#16233B' }}>СайтЧекап</div>
        </div>

        {/* Заголовок с маскотом — одной строкой по центру, подпись под ними.
            Маскот выровнен по заголовку, а не по всему блоку с подписью:
            иначе он визуально проваливается вниз. */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
            <div
              style={{
                flex: 1,
                fontSize: 62,
                fontWeight: 700,
                // Заголовок набран плотно: воздух между строками здесь только мешает,
                // в ленте превью показывается мелко и должно читаться одним куском.
                lineHeight: 0.98,
                color: '#16233B',
                letterSpacing: '-0.02em',
              }}
            >
              Проверьте свой сайт раньше, чем получите штраф
            </div>

            {/* Маскот-глазастик — тот же, что на сайте */}
            <svg width="250" height="250" viewBox="0 0 100 100">
              <circle cx="50" cy="52" r="34" fill="#2563EB" />
              <ellipse cx="50" cy="48" rx="19" ry="16" fill="#FFFFFF" />
              <circle cx="50" cy="50" r="8" fill="#16233B" />
              <circle cx="53" cy="47" r="2.5" fill="#FFFFFF" />
              <path d="M42 72 Q50 77 58 72" stroke="#FFFFFF" strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="30" cy="60" r="4" fill="#7FA3F2" opacity="0.7" />
              <circle cx="70" cy="60" r="4" fill="#7FA3F2" opacity="0.7" />
            </svg>
          </div>

          {/* Строка должна умещаться в одну: иначе последнее слово повисает
              отдельной строкой и превью выглядит неопрятно. */}
          <div style={{ fontSize: 28, color: '#5B6B84', marginTop: 26 }}>
            152-ФЗ · реклама · образование · орфография
          </div>
        </div>

        {/* Нижняя строка */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 5, background: '#1D9E75' }} />
            <div style={{ fontSize: 26, color: '#5B6B84' }}>Бесплатно, за 3 минуты</div>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: '#2563EB' }}>sait-checkup.ru</div>
        </div>
      </div>
    ),
    {
      ...size,
      // Кириллица и латиница — разные файлы; генератор сам берёт нужный под глиф.
      fonts: [
        { name: 'Onest', data: cyr400, weight: 400, style: 'normal' },
        { name: 'Onest', data: lat400, weight: 400, style: 'normal' },
        { name: 'Onest', data: cyr700, weight: 700, style: 'normal' },
        { name: 'Onest', data: lat700, weight: 700, style: 'normal' },
      ],
    }
  );
}
