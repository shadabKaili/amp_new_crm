export interface MemberNoteRow {
    id: number;
    member_id: string;
    note: string;
    created_by: string | null;
    created_at: string;
}

export interface MemberCallRow {
    id: number;
    member_id: string;
    call_at: string;
    reason: string;
    outcome: string | null;
    notes: string | null;
    created_by: string | null;
    created_at: string;
}

export interface MemberMessageRow {
    id: number;
    member_id: string;
    channel: 'whatsapp' | 'email' | 'sms' | 'call';
    direction: 'sent' | 'received';
    message: string;
    sent_at: string;
    created_by: string | null;
    created_at: string;
}

export interface MemberBlacklistRow {
    id: number;
    member_id: string;
    reason: string;
    is_active: boolean;
    blacklisted_at: string;
    removed_at: string | null;
    created_by: string | null;
    created_at: string;
}

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || fallback);
    }

    return data as T;
}

export async function fetchMemberNotes(memberId: string): Promise<MemberNoteRow[]> {
    const response = await fetch(`/api/members/${memberId}/notes`);
    const data = await parseResponse<{ data: MemberNoteRow[] }>(response, 'Unable to load remarks.');
    return data.data ?? [];
}

export async function createMemberNote(memberId: string, note: string): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/notes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
    });

    return parseResponse<{ message: string }>(response, 'Unable to save remark.');
}

export async function fetchMemberCalls(memberId: string): Promise<MemberCallRow[]> {
    const response = await fetch(`/api/members/${memberId}/calls`);
    const data = await parseResponse<{ data: MemberCallRow[] }>(response, 'Unable to load call history.');
    return data.data ?? [];
}

export async function createMemberCall(
    memberId: string,
    payload: Pick<MemberCallRow, 'call_at' | 'reason' | 'outcome' | 'notes'>,
): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/calls`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            callAt: payload.call_at,
            reason: payload.reason,
            outcome: payload.outcome,
            notes: payload.notes,
        }),
    });

    return parseResponse<{ message: string }>(response, 'Unable to save call history.');
}

export async function fetchMemberMessages(memberId: string): Promise<MemberMessageRow[]> {
    const response = await fetch(`/api/members/${memberId}/messages`);
    const data = await parseResponse<{ data: MemberMessageRow[] }>(response, 'Unable to load messages.');
    return data.data ?? [];
}

export async function createMemberMessage(
    memberId: string,
    payload: Pick<MemberMessageRow, 'channel' | 'direction' | 'message' | 'sent_at'>,
): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/messages`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            channel: payload.channel,
            direction: payload.direction,
            message: payload.message,
            sentAt: payload.sent_at,
        }),
    });

    return parseResponse<{ message: string }>(response, 'Unable to save message history.');
}

export async function fetchMemberBlacklist(memberId: string): Promise<MemberBlacklistRow | null> {
    const response = await fetch(`/api/members/${memberId}/blacklist`);
    const data = await parseResponse<{ data: MemberBlacklistRow | null }>(response, 'Unable to load blacklist state.');
    return data.data ?? null;
}

export async function blacklistMember(memberId: string, reason: string): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/blacklist`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
    });

    return parseResponse<{ message: string }>(response, 'Unable to blacklist member.');
}

export async function unblacklistMember(memberId: string): Promise<{ message: string }> {
    const response = await fetch(`/api/members/${memberId}/blacklist`, {
        method: 'DELETE',
    });

    return parseResponse<{ message: string }>(response, 'Unable to remove blacklist.');
}
