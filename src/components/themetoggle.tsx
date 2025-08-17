import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const [dark, setDark] = useState(
    () => localStorage.getItem('ns_theme') === 'dark'
  );

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add('dark');
      localStorage.setItem('ns_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('ns_theme', 'light');
    }
  }, [dark]);

  return (
    <button className="btn" onClick={() => setDark(d => !d)}>
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  );
}
