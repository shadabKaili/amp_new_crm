import { supabase } from '@/lib/supabase/client';

export async function invokeFunction<TResponse, TBody extends object>(
    fn: string,
    body: TBody,
): Promise<TResponse> {
    const { data, error } = await supabase.functions.invoke(fn, {
        body,
    });

    if (error) {
        throw new Error(error.message);
    }

    return data as TResponse;
}
