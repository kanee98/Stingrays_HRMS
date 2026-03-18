import { THEME_COOKIE } from '../lib/session';

const themeScript = `
(() => {
  const cookieMatch = document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]+)/);
  const savedTheme = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const nextTheme = savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : (prefersDark ? 'dark' : 'light');
  document.documentElement.dataset.theme = nextTheme;
  document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  document.documentElement.style.colorScheme = nextTheme;
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
