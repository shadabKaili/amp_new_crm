import { PaginatedResponse, Referral } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpcList } from '@/lib/supabase/rpc';
import { ReferralWriteInput, ReferralsListParams } from '@/lib/types/contracts';

interface ReferralRow {
    id: number | string;
    referrer_member_id?: string | null;
    referrer_name?: string | null;
    referred_name?: string | null;
    referred_email?: string | null;
    referred_phone?: string | null;
    status?: string | null;
    points_earned?: number | null;
    joined_member_id?: string | null;
    created_at?: string | null;
    updated_at?: string | null;
}

export async function fetchReferralsPage(filters: ReferralsListParams = {}): Promise<PaginatedResponse<Referral>> {
    const response = await invokeRpcList<ReferralRow>('rpc_get_referrals', {
        p_status: filters.status || null,
        p_referrer_member_id: filters.referrerId || null,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((referral) => ({
            id: String(referral.id ?? ''),
            referrerId: referral.referrer_member_id || '',
            referrerName: referral.referrer_name || 'Unknown',
            referredName: referral.referred_name || '',
            referredEmail: referral.referred_email || '',
            referredPhone: referral.referred_phone || '',
            status: (referral.status || 'pending') as Referral['status'],
            pointsEarned: referral.points_earned || 0,
            joinedMemberId: referral.joined_member_id || undefined,
            isConverted: Boolean(referral.joined_member_id),
            createdAt: new Date(referral.created_at || new Date()),
            updatedAt: new Date(referral.updated_at || referral.created_at || new Date()),
        })),
    };
}

export async function fetchReferrals(filters?: ReferralsListParams): Promise<Referral[]> {
    const page = await fetchReferralsPage(filters);
    return page.data;
}

export async function createReferral(data: ReferralWriteInput): Promise<Referral> {
    return invokeFunction<Referral, ReferralWriteInput>('fn_upsert_referral', {
        referrerId: data.referrerId,
        referredName: data.referredName,
        referredEmail: data.referredEmail,
        referredPhone: data.referredPhone,
        status: data.status,
    });
}
