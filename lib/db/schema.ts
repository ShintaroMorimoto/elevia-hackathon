import { relations } from 'drizzle-orm';
import {
  boolean,
  check,
  decimal,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  date,
} from 'drizzle-orm/pg-core';

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  googleId: varchar('google_id', { length: 255 }).unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Goals table (最終目標)
export const goals = pgTable(
  'goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    dueDate: date('due_date').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, archived, paused
    progressPercentage: decimal('progress_percentage', {
      precision: 5,
      scale: 2,
    }).default('0'), // 全体進捗率
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('idx_goals_user_id').on(table.userId),
  }),
);

// Yearly OKRs table (年次OKR)
export const yearlyOkrs = pgTable(
  'yearly_okrs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    goalId: uuid('goal_id')
      .notNull()
      .references(() => goals.id, { onDelete: 'cascade' }),
    objective: text('objective').notNull(), // 年次の目標（Objective）
    targetYear: integer('target_year').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    progressPercentage: decimal('progress_percentage', {
      precision: 5,
      scale: 2,
    }).default('0'), // OKR進捗率
    aiGeneratedQualityScore: decimal('ai_generated_quality_score', {
      precision: 3,
      scale: 2,
    }), // AI品質スコア
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    goalIdIdx: index('idx_yearly_okrs_goal_id').on(table.goalId),
  }),
);

// Quarterly OKRs table (四半期OKR)
export const quarterlyOkrs = pgTable(
  'quarterly_okrs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearlyOkrId: uuid('yearly_okr_id')
      .notNull()
      .references(() => yearlyOkrs.id, { onDelete: 'cascade' }),
    objective: text('objective').notNull(), // 四半期の目標（Objective）
    targetYear: integer('target_year').notNull(),
    targetQuarter: integer('target_quarter').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    progressPercentage: decimal('progress_percentage', {
      precision: 5,
      scale: 2,
    }).default('0'), // OKR進捗率
    aiGeneratedQualityScore: decimal('ai_generated_quality_score', {
      precision: 3,
      scale: 2,
    }), // AI品質スコア
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    yearlyOkrIdIdx: index('idx_quarterly_okrs_yearly_okr_id').on(
      table.yearlyOkrId,
    ),
    quarterCheck: check('quarter_check', 'target_quarter BETWEEN 1 AND 4'),
  }),
);

// Key Results table (成果指標)
export const keyResults = pgTable(
  'key_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    yearlyOkrId: uuid('yearly_okr_id').references(() => yearlyOkrs.id, {
      onDelete: 'cascade',
    }),
    quarterlyOkrId: uuid('quarterly_okr_id').references(
      () => quarterlyOkrs.id,
      { onDelete: 'cascade' },
    ),
    description: text('description').notNull(),
    targetValue: decimal('target_value', { precision: 10, scale: 2 }).notNull(),
    currentValue: decimal('current_value', { precision: 10, scale: 2 }).default(
      '0',
    ),
    unit: varchar('unit', { length: 50 }), // %, 個, 円 など
    achievementRate: decimal('achievement_rate', {
      precision: 5,
      scale: 2,
    }).default('0'), // 達成率(0-100%)
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => ({
    yearlyOkrIdIdx: index('idx_key_results_yearly_okr_id').on(
      table.yearlyOkrId,
    ),
    quarterlyOkrIdIdx: index('idx_key_results_quarterly_okr_id').on(
      table.quarterlyOkrId,
    ),
    belongsToOkrCheck: check(
      'key_results_belongs_to_okr',
      '(yearly_okr_id IS NOT NULL AND quarterly_okr_id IS NULL) OR (yearly_okr_id IS NULL AND quarterly_okr_id IS NOT NULL)',
    ),
  }),
);

// Chat Sessions table (対話セッション管理)
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  goalId: uuid('goal_id')
    .notNull()
    .references(() => goals.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed
  aiQualityCheckStatus: varchar('ai_quality_check_status', {
    length: 20,
  }).default('pending'), // pending, completed, failed
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

// Chat Messages table (対話履歴)
export const chatMessages = pgTable(
  'chat_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => chatSessions.id, { onDelete: 'cascade' }),
    senderType: varchar('sender_type', { length: 10 }).notNull(),
    content: text('content').notNull(),
    messageOrder: integer('message_order').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    sessionIdIdx: index('idx_chat_messages_session_id').on(table.sessionId),
    senderTypeCheck: check(
      'sender_type_check',
      "sender_type IN ('user', 'ai')",
    ),
  }),
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  goals: many(goals),
}));

export const goalsRelations = relations(goals, ({ one, many }) => ({
  user: one(users, {
    fields: [goals.userId],
    references: [users.id],
  }),
  yearlyOkrs: many(yearlyOkrs),
  chatSessions: many(chatSessions),
}));

export const yearlyOkrsRelations = relations(yearlyOkrs, ({ one, many }) => ({
  goal: one(goals, {
    fields: [yearlyOkrs.goalId],
    references: [goals.id],
  }),
  quarterlyOkrs: many(quarterlyOkrs),
  keyResults: many(keyResults),
}));

export const quarterlyOkrsRelations = relations(
  quarterlyOkrs,
  ({ one, many }) => ({
    yearlyOkr: one(yearlyOkrs, {
      fields: [quarterlyOkrs.yearlyOkrId],
      references: [yearlyOkrs.id],
    }),
    keyResults: many(keyResults),
  }),
);

export const keyResultsRelations = relations(keyResults, ({ one }) => ({
  yearlyOkr: one(yearlyOkrs, {
    fields: [keyResults.yearlyOkrId],
    references: [yearlyOkrs.id],
  }),
  quarterlyOkr: one(quarterlyOkrs, {
    fields: [keyResults.quarterlyOkrId],
    references: [quarterlyOkrs.id],
  }),
}));

export const chatSessionsRelations = relations(
  chatSessions,
  ({ one, many }) => ({
    goal: one(goals, {
      fields: [chatSessions.goalId],
      references: [goals.id],
    }),
    messages: many(chatMessages),
  }),
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

// Type definitions
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type YearlyOkr = typeof yearlyOkrs.$inferSelect;
export type NewYearlyOkr = typeof yearlyOkrs.$inferInsert;

export type QuarterlyOkr = typeof quarterlyOkrs.$inferSelect;
export type NewQuarterlyOkr = typeof quarterlyOkrs.$inferInsert;

export type KeyResult = typeof keyResults.$inferSelect;
export type NewKeyResult = typeof keyResults.$inferInsert;

export type ChatSession = typeof chatSessions.$inferSelect;
export type NewChatSession = typeof chatSessions.$inferInsert;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type NewChatMessage = typeof chatMessages.$inferInsert;
