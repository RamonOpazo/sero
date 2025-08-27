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

// Cache individual docs by slug
const docCache = new Map<string, Doc>();

// Known public docs for navigation (served from /docs/*.md)
const KNOWN_DOC_SLUGS = [
  'whats-sero',
  'getting-started',
  'project-management',
  'redaction-workflow',
  'security',
  'api-reference',
] as const;


function parseDoc(slug: string, raw: string): Doc | null {
  try {
    const { attributes, body } = fm(raw);
    const attrs = (attributes as Record<string, unknown>) || {};

    // Normalize date to string (front-matter may parse as Date)
    const rawDate = attrs.date as unknown;
    const date = typeof rawDate === 'string'
      ? rawDate
      : rawDate instanceof Date
        ? rawDate.toISOString()
        : undefined;

    const computedPath = (
      (attrs as Record<string, string>).path ?? (slug === 'index' ? './' : `./${slug}`)
    );

    const docData = {
      slug,
      title: (attrs as Record<string, string>).title || slug,
      date,
      path: computedPath,
      content: body as string,
    };

    const validation = docSchema.safeParse(docData);
    if (!validation.success) {
      console.error(`Invalid doc: ${slug}`, validation.error);
      return null;
    }
    return validation.data;
  } catch (e) {
    console.error(`Failed to parse markdown for ${slug}:`, e);
    return null;
  }
}

async function fetchDocBySlug(slug: string): Promise<Doc | undefined> {
  if (docCache.has(slug)) return docCache.get(slug);

  // Docs are served from the public directory at /docs
  const url = `/docs/${slug}.md`;
  const res = await fetch(url);
  if (!res.ok) return undefined;
  const raw = await res.text();
  const parsed = parseDoc(slug, raw);
  if (!parsed) return undefined;
  docCache.set(slug, parsed);
  return parsed;
}

export async function getDocs(): Promise<Doc[]> {
  // Best-effort: probe known slugs and return those that exist
  const results = await Promise.all(
    KNOWN_DOC_SLUGS.map(async (s) => fetchDocBySlug(s).catch(() => undefined)),
  );
  return results.filter((d): d is Doc => !!d);
}

export async function getDoc(slug: string): Promise<Doc | undefined> {
  if (slug === 'index') {
    // Try conventional index first
    const indexDoc = await fetchDocBySlug('index');
    if (indexDoc) return indexDoc;
    // Fallback: the designated index page is the one whose path is './'
    // Probe known docs and pick the first with path './'
    const docs = await getDocs();
    const home = docs.find((d) => d.path === './');
    return home ?? undefined;
  }
  return await fetchDocBySlug(slug);
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
