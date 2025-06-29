import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({ path: '.env.local' });

// 必要な環境変数の検証
const requiredEnvVars = ['DB_USER', 'DB_PASS', 'DB_NAME'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  throw new Error(
    `Required environment variables are missing: ${missingVars.join(', ')}\n` +
    'Please ensure these are set in your .env.local file.\n' +
    'For Cloud SQL setup, also set CLOUD_SQL_CONNECTION_NAME.'
  );
}

// Cloud SQL Proxy経由での接続を想定（開発環境用）
// Cloud SQL Proxyは通常 127.0.0.1:5432 でリッスンします
export default defineConfig({
  out: './drizzle',
  schema: './lib/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    host: process.env.DB_HOST || '127.0.0.1', // Cloud SQL Proxy使用時は127.0.0.1
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER!,
    password: process.env.DB_PASS!,
    database: process.env.DB_NAME!,
    ssl: process.env.DB_SSL === 'true', // 環境に応じてSSLを切り替え
  },
  verbose: process.env.NODE_ENV === 'development', // 開発時はログを出力
  strict: true, // スキーマの厳密チェック
});
