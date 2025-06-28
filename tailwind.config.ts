import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // 朝焼けグラデーション（メインテーマ）
        primary: {
          dawn: '#1a1f3a', // 夜明け前の深い紺
          sunrise: '#ff6b6b', // 朝焼けのオレンジレッド
          daylight: '#ffd93d', // 昇る太陽の黄金色
          sky: '#6bcf7f', // 明るい空の青緑
        },
        // アクセントカラー
        accent: {
          purple: '#a78bfa', // 夢と創造性
          pink: '#f472b6', // エネルギーと情熱
          teal: '#2dd4bf', // 成長と可能性
        },
        // ニュートラル（現代的なグレー）
        neutral: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
      },
      backgroundImage: {
        // グラデーション背景
        'gradient-dawn':
          'linear-gradient(135deg, #1a1f3a 0%, #ff6b6b 50%, #ffd93d 100%)',
        'gradient-sunrise':
          'linear-gradient(135deg, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%)',
        'gradient-daylight':
          'linear-gradient(135deg, #ffd93d 0%, #6bcf7f 50%, #a78bfa 100%)',
        'gradient-progress':
          'linear-gradient(90deg, #ff6b6b 0%, #ffd93d 50%, #6bcf7f 100%)',
        'gradient-hero':
          'linear-gradient(135deg, #1a1f3a 0%, #ff6b6b 25%, #ffd93d 50%, #6bcf7f 75%, #a78bfa 100%)',
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
        shimmer: 'shimmer 2s linear infinite',
        celebration: 'celebration 0.6s ease-in-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          from: { boxShadow: '0 0 20px rgba(255, 107, 107, 0.3)' },
          to: { boxShadow: '0 0 30px rgba(255, 107, 107, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        celebration: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      boxShadow: {
        glass: '0 8px 32px rgba(31, 38, 135, 0.37)',
        elevation: '0 4px 20px rgba(0, 0, 0, 0.1)',
        'glow-primary': '0 0 20px rgba(255, 107, 107, 0.3)',
        'glow-accent': '0 0 20px rgba(167, 139, 250, 0.3)',
      },
      backdropFilter: {
        glass: 'blur(10px)',
      },
    },
  },
  plugins: [],
};
export default config;
