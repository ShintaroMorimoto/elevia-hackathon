#!/usr/bin/env node

/**
 * Cloud Run環境でデータベースマイグレーションを実行するスクリプト
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数読み込み
config({ path: '.env.local' });

/**
 * 環境変数を取得します。変数が設定されていない場合はエラーをスローします。
 */
const getEnv = (key) => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

// 環境判定
const isProduction = process.env.NODE_ENV === 'production';
const isCloudRun = process.env.K_SERVICE !== undefined;

console.log('🔧 Migration script starting...');
console.log('Environment:', {
  isProduction,
  isCloudRun,
  nodeEnv: process.env.NODE_ENV,
  kService: process.env.K_SERVICE,
});

let pool;

try {
  if (isProduction && isCloudRun) {
    // Cloud Run環境: VPC経由で直接接続
    console.log('📡 Connecting via VPC direct connection (Cloud Run)');
    
    pool = new pg.Pool({
      user: getEnv('DB_USER'),
      password: getEnv('DB_PASS'),
      database: getEnv('DB_NAME'),
      host: process.env.DB_HOST || '10.0.0.0', // Private IP range
      port: 5432,
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });
  } else {
    // ローカル環境での実行
    console.log('🏠 Connecting to local database');
    
    pool = new pg.Pool({
      user: getEnv('DB_USER'),
      password: getEnv('DB_PASS'),
      database: getEnv('DB_NAME'),
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT || '5432'),
      max: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: false,
    });
  }

  // Drizzle ORM インスタンス
  const db = drizzle(pool);

  // 接続テスト
  console.log('🔍 Testing database connection...');
  const client = await pool.connect();
  const result = await client.query('SELECT NOW() as current_time, version() as pg_version');
  client.release();
  
  console.log('✅ Database connection successful!');
  console.log('Current time:', result.rows[0].current_time);
  console.log('PostgreSQL version:', result.rows[0].pg_version);

  // マイグレーション実行
  console.log('🚀 Starting database migration...');
  
  const migrationsFolder = path.join(__dirname, '..', 'drizzle');
  console.log('Migrations folder:', migrationsFolder);
  
  await migrate(db, { migrationsFolder });
  
  console.log('✅ Migration completed successfully!');
  
  // テーブル確認
  console.log('🔍 Verifying created tables...');
  const tablesResult = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `);
  
  console.log('📋 Created tables:');
  tablesResult.rows.forEach(row => {
    console.log(`  - ${row.table_name}`);
  });
  
  // NextAuth用テーブルの存在確認
  const nextAuthTables = ['users', 'accounts', 'sessions', 'verification_tokens'];
  const existingTables = tablesResult.rows.map(row => row.table_name);
  
  console.log('🔒 NextAuth tables status:');
  nextAuthTables.forEach(tableName => {
    const exists = existingTables.includes(tableName);
    console.log(`  - ${tableName}: ${exists ? '✅ Created' : '❌ Missing'}`);
  });
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
} finally {
  if (pool) {
    console.log('🧹 Cleaning up database connection...');
    await pool.end();
  }
}

console.log('🎉 Migration script completed!');