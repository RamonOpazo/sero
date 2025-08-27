import { z } from 'zod';
import axios from 'axios';

// --- Schemas and Types ---

// Metadata for a single doc, from the manifest
const docMetaSchema = z.object({
  slug: z.string(),
  title: z.string().optional(), // Title is now optional in the manifest
  next: z.string().nullable().optional(),
});

// The structure of manifest.json
const manifestSchema = z.object({
  indexSlug: z.string(),
  docs: z.array(docMetaSchema),
});

type DocMeta = z.infer<typeof docMetaSchema>;
type Manifest = z.infer<typeof manifestSchema>;

// The final, combined Doc object. Title is non-optional here.
export interface Doc extends DocMeta {
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
  const validation = manifestSchema.safeParse(data);
  if (!validation.success) {
    console.error("Invalid docs manifest:", validation.error);
    throw new Error("Failed to load a valid docs manifest.");
  }
  manifestCache.current = validation.data;
  return validation.data;
}

/**
 * Fetches a single markdown file, determines its title, and uses its raw content.
 */
async function fetchAndParseDoc(meta: DocMeta, indexSlug: string): Promise<Doc | undefined> {
    const slug = meta.slug;
    if (docCache.has(slug)) {
        return docCache.get(slug);
    }

    const url = `/docs/${slug}.md`;
    try {
        const { data: rawContent } = await axios.get(url);

        // --- Title Logic ---
        const title = (() => {
          const h1Match = rawContent.match(/^# (.*)/m); // 2. Check for H1 in content
          if (!meta.title && !h1Match) return "Untitled!"
          return meta.title || h1Match[0]
        })();

        const doc: Doc = {
            ...meta,
            title, // The resolved title
            content: rawContent, // The entire file is the content
            is_index: slug === indexSlug,
        };

        docCache.set(slug, doc);
        return doc;
    } catch (e) {
        console.error(`Failed to fetch or parse doc: ${slug}`, e);
        return undefined;
    }
}

/**
 * Gets a list of all documentation pages, ordered as they appear in the manifest.
 */
export async function getDocs(): Promise<Doc[]> {
  const manifest = await manifestCache.current ?? await fetchManifest();
  const results = await Promise.all(
    manifest.docs.map(meta => fetchAndParseDoc(meta, manifest.indexSlug))
  );
  return results.filter((d): d is Doc => !!d);
}

/**
 * Gets a single documentation page by its slug.
 * Handles 'index' as a special case.
 */
export async function getDoc(slug: string): Promise<Doc | undefined> {
  const manifest = await manifestCache.current ?? await fetchManifest();
  const effectiveSlug = slug === 'index' ? manifest.indexSlug : slug;

  const meta = manifest.docs.find(d => d.slug === effectiveSlug);
  if (!meta) {
    return undefined;
  }

  return fetchAndParseDoc(meta, manifest.indexSlug);
}

// --- Utility Functions ---

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
