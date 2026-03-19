import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/storage/database/shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.COZE_SUPABASE_URL || process.env.DATABASE_URL || '',
  },
  verbose: true,
  strict: true,
});
