import { api } from '@/lib/axios';
import { AsyncResultWrapper, type Result } from '@/lib/result';

export interface AiCatalogProvider { name: string; models: string[] }
export interface AiCatalog { providers: AiCatalogProvider[] }

export const AiAPI = {
  async health(): Promise<Result<{ ok: boolean }, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get('/ai/health') as Promise<Result<{ ok: boolean }, unknown>>)
      .toResult();
  },
  async catalog(): Promise<Result<AiCatalog, unknown>> {
    return AsyncResultWrapper
      .from(api.safe.get('/ai/catalog') as Promise<Result<AiCatalog, unknown>>)
      .toResult();
  },
};
