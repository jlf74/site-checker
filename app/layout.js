import { Manrope, Onest } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner';

// Пара шрифтов (выбрана 13.08.2026 на витрине /font-lab):
// Onest — заголовки, вердикт, заголовки находок и кнопки; Manrope — весь текст.
const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

const onest = Onest({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '700'],
  variable: '--font-onest',
  display: 'swap',
});

const TITLE = 'СайтЧекап — проверьте свой сайт раньше, чем получите штраф';
const DESCRIPTION =
  'Проверка сайта на соответствие 152-ФЗ, законам о рекламе и об образовании. Плюс орфография, SEO и тексты. Бесплатно, за 3 минуты.';

export const metadata = {
  // От этого адреса строится ссылка на og-картинку. Без него Next подставит
  // тот хост, с которого пришёл запрос, и в теге может оказаться localhost —
  // тогда Telegram картинку не заберёт. Домен можно переопределить переменной
  // NEXT_PUBLIC_SITE_URL, пока сайт живёт на техническом адресе Timeweb.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://sait-checkup.ru'),
  title: TITLE,
  description: DESCRIPTION,
  // Без этого блока ссылка на сайт в Telegram и мессенджерах разворачивается пустой
  // карточкой. Картинку добавить отдельно — см. ROADMAP, этап 1.
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    type: 'website',
    locale: 'ru_RU',
    siteName: 'СайтЧекап',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={`${manrope.variable} ${onest.variable}`}>
        <Header />
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
