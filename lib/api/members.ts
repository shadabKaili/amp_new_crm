import { Member, PaginatedResponse } from '@/lib/types';
import { invokeFunction } from '@/lib/supabase/functions';
import { invokeRpc, invokeRpcList } from '@/lib/supabase/rpc';
import { MemberWriteInput, MembersListParams } from '@/lib/types/contracts';
import { DbMember, DbMemberScore, DbMemberStatus, mapDbMemberToMember } from '@/lib/types/supabase';

interface MemberRow {
    id: string;
    amp_id?: string | null;
    full_name?: string | null;
    email?: string | null;
    phone?: string | null;
    city?: string | null;
    state?: string | null;
    created_at?: string | null;
    status?: string | null;
    total_score?: number | null;
    type?: string | null;
}

interface MemberDetailRpc {
    member?: DbMember | null;
    status?: DbMemberStatus | null;
    score?: DbMemberScore | null;
}

export async function fetchMembersPage(filters: MembersListParams = {}): Promise<PaginatedResponse<Member>> {
    const response = await invokeRpcList<MemberRow>('rpc_get_members', {
        p_search: filters.search || null,
        p_status: filters.status || null,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
    });

    return {
        ...response,
        data: response.data.map((member) => ({
            id: member.id,
            ampId: member.amp_id || '',
            name: member.full_name || '',
            firstName: member.full_name?.split(' ')[0] || '',
            lastName: member.full_name?.split(' ').slice(1).join(' ') || '',
            email: member.email || '',
            phone: member.phone || '',
            city: member.city || '',
            state: member.state || '',
            status: (member.status || 'active') as Member['status'],
            type: (member.type || 'member') as Member['type'],
            score: member.total_score || 0,
            joinedAt: new Date(member.created_at || new Date()),
        })),
    };
}

export async function fetchMembers(filters?: MembersListParams & { type?: string }): Promise<Member[]> {
    const page = await fetchMembersPage(filters);

    if (filters?.type) {
        return page.data.filter((member) => member.type === filters.type);
    }

    return page.data;
}

export async function fetchMemberById(id: string): Promise<Member | null> {
    const data = await invokeRpc<MemberDetailRpc>('rpc_get_member_detail', { p_member_id: id });

    if (!data?.member) {
        return null;
    }

    return mapDbMemberToMember(
        data.member as DbMember,
        data.status as DbMemberStatus,
        data.score as DbMemberScore,
    );
}

export async function createMember(data: Omit<Member, 'id' | 'ampId' | 'joinedAt'>): Promise<Member> {
    return invokeFunction<Member, MemberWriteInput>('fn_upsert_member', {
        firstName: data.firstName ?? data.name.split(' ')[0] ?? '',
        lastName: data.lastName ?? data.name.split(' ').slice(1).join(' ') ?? '',
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        status: data.status,
    });
}

export async function updateMember(id: string, data: Partial<Member>): Promise<Member> {
    return invokeFunction<Member, MemberWriteInput>('fn_upsert_member', {
        memberId: id,
        firstName: data.firstName ?? data.name?.split(' ')[0] ?? '',
        lastName: data.lastName ?? data.name?.split(' ').slice(1).join(' ') ?? '',
        email: data.email,
        phone: data.phone,
        city: data.city,
        state: data.state,
        status: data.status,
    });
}

export async function addMemberNote(memberId: string, note: string): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Unable to add member note.');
    }

    return data as { message: string };
}

export async function deleteMember(memberId: string): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}`, {
        method: 'DELETE',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || 'Unable to delete member.');
    }

    return data as { message: string };
}
