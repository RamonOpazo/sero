import { z } from 'zod';

const docSchema = z.object({
  slug: z.string(),
  title: z.string(),
  content: z.string(),
});

type Doc = z.infer<typeof docSchema>;

let docs: Doc[] | null = null;

async function fetchDocs(): Promise<Doc[]> {
  if (docs) {
    return docs;
  }

  const modules = import.meta.glob('/public/docs/*.md', { query: '?raw', import: 'default' });
  const promises = Object.entries(modules).map(async ([path, resolver]) => {
    const slug = path.split('/').pop()?.replace('.md', '');
    if (!slug) {
      return null;
    }
    const content = (await resolver()) as string;
    const title = content.match(/^#\s+(.*)/m)?.[1] || slug;
    return { slug, title, content };
  });

  const resolvedDocs = await Promise.all(promises);
  docs = resolvedDocs.filter((doc): doc is Doc => doc !== null);
  return docs;
}

export async function getDocs(): Promise<Doc[]> {
  return await fetchDocs();
}

export async function getDoc(slug: string): Promise<Doc | undefined> {
  const docs = await fetchDocs();
  if (slug === 'index') {
    return docs.find(doc => doc.slug === 'whats-sero');
  }
  return docs.find(doc => doc.slug === slug);
}

export async function docExists(slug: string): Promise<boolean> {
  const doc = await getDoc(slug);
  return !!doc;
}

export async function getDocTitle(slug: string): Promise<string> {
  const doc = await getDoc(slug);
  return doc?.title || 'Documentation';
}

export async function loadMarkdownDoc(slug: string): Promise<string> {
  const doc = await getDoc(slug);
  if (!doc) {
    throw new Error(`Documentation page not found: ${slug}`);
  }
  return doc.content;
}