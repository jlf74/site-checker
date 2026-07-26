import { Manrope } from 'next/font/google';
import './globals.css';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CookieBanner from '../components/CookieBanner';

const manrope = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata = {
  title: 'СайтЧекап — проверьте свой сайт раньше, чем получите штраф',
  description:
    'Проверка сайта на соответствие 152-ФЗ, законам о рекламе и об образовании. Плюс орфография, SEO и тексты. Бесплатно, за 3 минуты.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body className={manrope.variable}>
        <Header />
        {children}
        <Footer />
        <CookieBanner />
      </body>
    </html>
  );
}
