import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Connector, IpAddressTypes } from '@google-cloud/cloud-sql-connector';
import pg from 'pg';
import { config } from 'dotenv';

/**
 * 環境変数を取得します。変数が設定されていない場合はエラーをスローします。
 * @param key - 取得する環境変数のキー
 * @returns 環境変数の値
 */
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (\!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

// 環境変数読み込み
config({ path: '.env.local' });

let pool: pg.Pool;
let connector: Connector  < /dev/null |  undefined;

// 本番環境（Cloud Run）では VPC 経由で直接接続
// 開発環境では Cloud SQL Connector を使用
const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = process.env.K_SERVICE \!== undefined;

console.log('🔍 Database connection mode:', {
  isProduction,
  isCloudRun,
  nodeEnv: process.env.NODE_ENV,
  kService: process.env.K_SERVICE
});

if (isProduction && isCloudRun) {
  // Cloud Run環境: VPC経由で直接接続
  console.log('📡 Using VPC direct connection for Cloud Run');
  
  pool = new pg.Pool({
    user: getEnv('DB_USER'),
    password: getEnv('DB_PASS'),
    database: getEnv('DB_NAME'),
    // Cloud RunからCloud SQLのプライベートIPに直接接続
    // Terraformで設定されるCloud SQLのプライベートIPを使用
    host: process.env.DB_HOST || '10.0.0.0', // フォールバック用デフォルト
    port: 5432,
    max: 5, // Cloud Run用に接続数を増加
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    ssl: false, // VPC内なのでSSL不要
  });
} else {
  // 開発環境またはローカル環境: Cloud SQL Connectorを使用
  console.log('🔌 Using Cloud SQL Connector for development');
  
  try {
    connector = new Connector();

    const clientOpts = await connector.getOptions({
      instanceConnectionName: getEnv('CLOUD_SQL_CONNECTION_NAME'),
      ipType: (process.env.IP_TYPE as IpAddressTypes) || IpAddressTypes.PUBLIC,
    });

    pool = new pg.Pool({
      ...clientOpts,
      user: getEnv('DB_USER'),
      password: getEnv('DB_PASS'),
      database: getEnv('DB_NAME'),
      max: 2, // 開発環境用に制限
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  } catch (error) {
    console.error('❌ Failed to initialize Cloud SQL Connector:', error);
    throw error;
  }
}

// Drizzle ORM インスタンス
export const db = drizzle(pool);

// 接続テスト関数
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connection successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

// アプリケーションがシャットダウンする際のリソースクリーンアップ
// Next.jsのようなサーバーレス環境では必ずしも必要ではありませんが、
// 長時間稼働するサーバーアプリケーションでは重要です。
const cleanup = async () => {
  console.log('🧹 Cleaning up database connections...');
  try {
    await pool.end();
    if (connector) {
      connector.close();
    }
    console.log('✅ Database cleanup completed');
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
};

// シャットダウンシグナルのハンドリング
process.on('beforeExit', cleanup);
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('SIGUSR1', cleanup);
process.on('SIGUSR2', cleanup);

// Next.js Hot Reload対応
if (process.env.NODE_ENV === 'development') {
  if ((module as any).hot) {
    (module as any).hot.dispose(cleanup);
  }
}
