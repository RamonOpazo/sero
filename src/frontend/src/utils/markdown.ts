import { z } from 'zod';
import axios from 'axios';

// --- Schemas and Types ---
const docMetaSchema = z.object({
  slug: z.string(),
  title: z.string().optional(),
  next: z.string().nullable().optional(),
});

const manifestSchema = z.object({
  indexSlug: z.string(),
  docs: z.array(docMetaSchema),
});

type Manifest = z.infer<typeof manifestSchema>;

export interface Doc extends z.infer<typeof docMetaSchema> {
  title: string;
  content: string;
  is_index: boolean;
}

// --- Caching ---
const manifestCache: { current: Manifest | null } = { current: null };
const docCache = new Map<string, Doc>();

// --- Core Functions ---

/**
 * Fetches and validates the docs manifest.
 */
async function fetchManifest(): Promise<Manifest> {
  if (manifestCache.current) {
    return manifestCache.current;
  }
  const url = '/docs/manifest.json';
  const { data } = await axios.get(url);
  const manifest = manifestSchema.parse(data); // .parse throws on error
  manifestCache.current = manifest;
  return manifest;
}

/**
 * Gets a single documentation page by its slug, fetching and parsing if not cached.
 * Handles 'index' as a special case.
 */
export async function getDoc(slug: string): Promise<Doc | undefined> {
  const manifest = await fetchManifest();
  const effectiveSlug = slug === 'index' ? manifest.indexSlug : slug;

  if (docCache.has(effectiveSlug)) {
    return docCache.get(effectiveSlug);
  }

  const meta = manifest.docs.find(d => d.slug === effectiveSlug);
  if (!meta) return undefined;

  try {
    const { data: rawContent } = await axios.get(`/docs/${effectiveSlug}.md`);

    const h1Match = rawContent.match(/^# (.*)/m);
    const title = meta.title ?? (h1Match?.[1] || "Untitled!");

    const doc: Doc = {
      ...meta,
      title,
      content: rawContent,
      is_index: effectiveSlug === manifest.indexSlug,
    };

    docCache.set(effectiveSlug, doc);
    return doc;
  } catch (e) {
    console.error(`Failed to fetch or parse doc: ${effectiveSlug}`, e);
    return undefined;
  }
}

/**
 * Gets a list of all documentation pages, ordered as they appear in the manifest.
 */
export async function getDocs(): Promise<Doc[]> {
  const manifest = await fetchManifest();
  const results = await Promise.all(
    manifest.docs.map(meta => getDoc(meta.slug))
  );
  return results.filter((d): d is Doc => !!d);
}

// --- Utility Functions ---

export async function docExists(slug: string): Promise<boolean> {
  const manifest = await fetchManifest();
  const effectiveSlug = slug === 'index' ? manifest.indexSlug : slug;
  return manifest.docs.some(d => d.slug === effectiveSlug);
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