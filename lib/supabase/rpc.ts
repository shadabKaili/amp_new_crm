import { supabase } from '@/lib/supabase/client';
import type { PaginatedResponse } from '@/lib/types';

function normalizeListResponse<T>(payload: unknown): PaginatedResponse<T> {
    if (!payload) {
        return { data: [], total: 0, limit: 0, offset: 0 };
    }

    if (Array.isArray(payload)) {
        return {
            data: payload as T[],
            total: payload.length,
            limit: payload.length,
            offset: 0,
        };
    }

    const record = payload as Partial<PaginatedResponse<T>> & { data?: T[] };
    return {
        data: record.data ?? [],
        total: record.total ?? record.data?.length ?? 0,
        limit: record.limit ?? record.data?.length ?? 0,
        offset: record.offset ?? 0,
    };
}

export async function invokeRpc<TResponse>(
    fn: string,
    params?: Record<string, unknown>,
): Promise<TResponse> {
    const { data, error } = await supabase.rpc(fn, params);

    if (error) {
        throw new Error(error.message);
    }

    return data as TResponse;
}

export async function invokeRpcList<TItem>(
    fn: string,
    params?: Record<string, unknown>,
): Promise<PaginatedResponse<TItem>> {
    const data = await invokeRpc<unknown>(fn, params);
    return normalizeListResponse<TItem>(data);
}
