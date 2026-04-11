import { corsHeaders } from '../_shared/cors.ts';
import { createServiceClient } from '../_shared/client.ts';
import { sendDonationReceiptEmail } from '../_shared/email.ts';
import { json } from '../_shared/json.ts';
import type { DonationPayload } from '../_shared/types.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const payload = (await request.json()) as DonationPayload;
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from('donations')
      .insert({
        member_id: payload.memberId,
        amount: payload.amount,
        payment_mode: payload.paymentMethod,
        reference_no: payload.receiptNumber ?? null,
        purpose: payload.purpose ?? null,
        notes: payload.notes ?? null,
      })
      .select('id, member_id, amount, payment_mode, reference_no, purpose, notes, created_at')
      .single();

    if (error) throw error;

    const { data: member } = await supabase.from('members').select('full_name').eq('id', payload.memberId).single();

    const { data: memberContact } = await supabase
      .from('members')
      .select('full_name, email')
      .eq('id', payload.memberId)
      .single();

    if (memberContact?.email) {
      await sendDonationReceiptEmail({
        to: memberContact.email,
        name: memberContact.full_name ?? member?.full_name ?? 'Supporter',
        amount: Number(data.amount),
        purpose: data.purpose ?? null,
        receiptNumber: data.reference_no ?? null,
      });
    }

    return json({
      id: String(data.id),
      memberId: data.member_id,
      memberName: member?.full_name ?? 'Unknown',
      amount: Number(data.amount),
      date: data.created_at,
      paymentMethod: data.payment_mode,
      purpose: data.purpose,
      receiptNumber: data.reference_no,
      notes: data.notes,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 });
  }
});
