import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as path from 'node:path';

/**
 * 環境変数を取得します。変数が設定されていない場合はエラーをスローします。
 */
const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`${key} environment variable not set`);
  }
  return value;
};

export async function POST(request: NextRequest) {
  // セキュリティ: 本番環境でのみ実行を許可
  const isProduction = process.env.NODE_ENV === 'production';
  const isCloudRun = process.env.K_SERVICE !== undefined;

  if (!isProduction || !isCloudRun) {
    return NextResponse.json(
      {
        error:
          'Migration endpoint is only available in production Cloud Run environment',
      },
      { status: 403 },
    );
  }

  // 認証チェック（簡易的な認証）
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.MIGRATION_TOKEN || 'migrate-secret-token';

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let pool: pg.Pool | null = null;

  try {
    console.log('🔧 Starting database migration via API...');

    // Cloud Run環境: VPC経由で直接接続
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

    // 接続テスト
    console.log('🔍 Testing database connection...');
    const client = await pool.connect();
    const result = await client.query(
      'SELECT NOW() as current_time, version() as pg_version',
    );
    client.release();

    console.log('✅ Database connection successful!');

    const connectionInfo = {
      currentTime: result.rows[0].current_time,
      pgVersion: result.rows[0].pg_version,
    };

    // Drizzle ORM インスタンス
    const db = drizzle(pool);

    // マイグレーション実行
    console.log('🚀 Starting database migration...');

    const migrationsFolder = path.join(process.cwd(), 'drizzle');
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

    const tables = tablesResult.rows.map((row) => row.table_name);
    console.log('📋 Created tables:', tables);

    // NextAuth用テーブルの存在確認
    const nextAuthTables = [
      'users',
      'accounts',
      'sessions',
      'verification_tokens',
    ];
    const nextAuthStatus = nextAuthTables.map((tableName) => ({
      table: tableName,
      exists: tables.includes(tableName),
    }));

    console.log('🔒 NextAuth tables verification completed');

    return NextResponse.json({
      success: true,
      message: 'Database migration completed successfully',
      connectionInfo,
      tables,
      nextAuthTables: nextAuthStatus,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  } finally {
    if (pool) {
      console.log('🧹 Cleaning up database connection...');
      await pool.end();
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Migration API endpoint',
    note: 'Use POST request with proper authorization to run migrations',
  });
}
