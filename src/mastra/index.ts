import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { conversationAgent } from './agents/conversation-agent';
import { planningAgent } from './agents/planning-agent';
// import { okrGenerationWorkflow } from './workflows/okr-generation-workflow';

/**
 * Mastra用のデータベースURL構築
 * Mastra自体は内部状態管理にLibSQLを使用し、
 * アプリケーションデータは別途Drizzle ORM + PostgreSQLを使用
 */
function buildMastraStorageUrl(): string {
  // 本番環境では PostgreSQL の DATABASE_URL を構築する場合
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.DB_USER &&
    process.env.DB_PASS &&
    process.env.DB_NAME
  ) {
    // ただし、Mastraは LibSQL を期待しているため、
    // 本番環境でも LibSQL ファイルを使用することを推奨
    return 'file:./mastra.db';
  }

  // 開発環境では常にファイルベースのLibSQLを使用
  return process.env.DATABASE_URL || 'file:./mastra.db';
}

export const mastra = new Mastra({
  agents: {
    conversationAgent,
    planningAgent,
  },
  // workflows: {
  //   okrGenerationWorkflow,
  // },
  storage: new LibSQLStore({
    url: buildMastraStorageUrl(),
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  server: {
    port: parseInt(process.env.MASTRA_PORT || '4111'),
    host: process.env.MASTRA_HOST || 'localhost',
    cors: {
      origin:
        process.env.NODE_ENV === 'production' ? ['https://*.run.app'] : '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-client-type'],
      exposeHeaders: ['Content-Length', 'X-Requested-With'],
      credentials: false,
    },
  },
});
