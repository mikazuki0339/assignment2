import { getCollection, type CollectionEntry } from 'astro:content';
import { withBase } from './paths';

export type AnyEntry =
  | CollectionEntry<'articles'>
  | CollectionEntry<'library'>
  | CollectionEntry<'life'>
  | CollectionEntry<'news'>;

export const collectionMeta = {
  articles: { label: '文章与见闻', path: 'articles/', index: '01' },
  library: { label: '书影音', path: 'library/', index: '02' },
  life: { label: '生活素材', path: 'life/', index: '03' },
  news: { label: '新闻记录', path: 'news/', index: '04' },
} as const;

export type CollectionName = keyof typeof collectionMeta;

export async function getPublished<T extends CollectionName>(collection: T) {
  const entries = await getCollection(collection, ({ data }) => !data.draft);
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getAllContent(): Promise<AnyEntry[]> {
  const groups = await Promise.all([
    getPublished('articles'),
    getPublished('library'),
    getPublished('life'),
    getPublished('news'),
  ]);
  return groups.flat().sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export function entryUrl(entry: AnyEntry): string {
  return withBase(`${collectionMeta[entry.collection].path}${entry.id}/`);
}

export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '.');
}

export function entryKey(entry: AnyEntry): string {
  return `${entry.collection}/${entry.id}`;
}

export function findRelated(entry: AnyEntry, all: AnyEntry[]): AnyEntry[] {
  const explicit = entry.data.related
    .map((key) => all.find((candidate) => entryKey(candidate) === key))
    .filter((candidate): candidate is AnyEntry => Boolean(candidate));
  if (explicit.length) return explicit.slice(0, 3);
  return all
    .filter((candidate) => entryKey(candidate) !== entryKey(entry))
    .map((candidate) => ({
      candidate,
      score: candidate.data.tags.filter((tag) => entry.data.tags.includes(tag)).length,
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ candidate }) => candidate);
}
