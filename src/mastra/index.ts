import { Mastra } from '@mastra/core';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { conversationAgent } from './agents/conversation-agent';
import { planningAgent } from './agents/planning-agent';
import { okrGenerationWorkflowSimple } from './workflows/okr-generation-workflow-simple';

export const mastra = new Mastra({
  agents: {
    conversationAgent,
    planningAgent,
  },
  workflows: {
    okrGenerationWorkflow: okrGenerationWorkflowSimple,
  },
  storage: new LibSQLStore({
    url: process.env.DATABASE_URL || 'file:./mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  }),
  server: {
    port: 4111,
    host: 'localhost',
    cors: {
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'x-mastra-client-type'],
      exposeHeaders: ['Content-Length', 'X-Requested-With'],
      credentials: false,
    },
  },
});
