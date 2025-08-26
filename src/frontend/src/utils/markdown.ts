import { z } from 'zod';
import fm from 'front-matter';

const docSchema = z.object({
  slug: z.string(),
  title: z.string(),
  date: z.string().optional(),
  path: z.string(),
  content: z.string(),
});

type Doc = z.infer<typeof docSchema>;

let docs: Doc[] | null = null;

async function fetchDocs(): Promise<Doc[]> {
  if (docs) {
    return docs;
  }

  const modules = import.meta.glob('/docs/*.md', { query: '?raw', import: 'default' });
  const promises = Object.entries(modules).map(async ([path, resolver]) => {
    const rawContent = (await resolver()) as string;
    const { attributes, body } = fm(rawContent);
    const slug = path.split('/').pop()?.replace('.md', '');

    if (!slug) {
      return null;
    }

    const docData = {
      slug,
      title: (attributes as Record<string, string>).title || slug,
      date: (attributes as Record<string, string>).date,
      path: (attributes as Record<string, string>).path || `./${slug}`,
      content: body as string,
    };

    const validation = docSchema.safeParse(docData);
    if (validation.success) {
      return validation.data;
    }
    console.error(`Invalid doc: ${slug}`, validation.error);
    return null;
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
    return docs.find(doc => doc.path === './');
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
