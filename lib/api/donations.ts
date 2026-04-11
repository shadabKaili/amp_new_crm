import { Donation, PaginatedResponse } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpcList } from '@/lib/supabase/rpc';
import { DonationWriteInput, DonationsListParams } from '@/lib/types/contracts';

interface DonationRow {
    id: number | string;
    member_id?: string | null;
    full_name?: string | null;
    amount?: number | string | null;
    created_at?: string | null;
    payment_mode?: string | null;
    purpose?: string | null;
    reference_no?: string | null;
    notes?: string | null;
}

export async function fetchDonationsPage(filters: DonationsListParams): Promise<PaginatedResponse<Donation>> {
    const response = await invokeRpcList<DonationRow>('rpc_get_donations', {
        p_member_id: filters.memberId || null,
        p_from: filters.from,
        p_to: filters.to,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((donation) => ({
            id: String(donation.id ?? ''),
            memberId: donation.member_id || '',
            memberName: donation.full_name || 'Unknown',
            amount: Number(donation.amount || 0),
            date: new Date(donation.created_at || new Date()),
            paymentMethod: (donation.payment_mode || 'online') as Donation['paymentMethod'],
            purpose: donation.purpose || undefined,
            receiptNumber: donation.reference_no || undefined,
            notes: donation.notes || undefined,
        })),
    };
}

export async function fetchDonations(filters: DonationsListParams): Promise<Donation[]> {
    const page = await fetchDonationsPage(filters);
    return page.data;
}

export async function createDonation(data: Omit<Donation, 'id'>): Promise<Donation> {
    return invokeFunction<Donation, DonationWriteInput>('fn_create_donation', {
        memberId: data.memberId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        receiptNumber: data.receiptNumber,
        purpose: data.purpose,
        notes: data.notes,
    });
}
