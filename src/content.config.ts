import { defineCollection } from 'astro:content';
import { z } from 'zod';
import { glob } from 'astro/loaders';

const baseSchema = z.object({
  title: z.string(),
  date: z.coerce.date(),
  updated: z.coerce.date().optional(),
  type: z.string(),
  tags: z.array(z.string()).default([]),
  summary: z.string(),
  related: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
});

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: baseSchema,
});

const library = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/library' }),
  schema: baseSchema.extend({
    creator: z.string(),
    rating: z.number().min(0).max(5),
    status: z.enum(['想读', '在读', '读过', '想看', '看过', '在听', '听过']),
  }),
});

const life = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/life' }),
  schema: baseSchema.extend({
    mediaType: z.enum(['照片', '展览', '声音', '文字']),
    mediaUrl: z.string().optional(),
    alt: z.string().optional(),
  }),
});

const news = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
  schema: baseSchema.extend({
    sourceUrl: z.url(),
    sourceDate: z.coerce.date(),
  }),
});

export const collections = { articles, library, life, news };
