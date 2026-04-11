import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendMail } from '@/lib/email/smtp';

export const runtime = 'nodejs';

function getString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function getRequiredEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing ${name} environment variable.`);
    }

    return value;
}

export async function POST(request: Request) {
    try {
        const body = (await request.json()) as { email?: unknown };
        const email = getString(body.email);

        if (!email || !email.includes('@')) {
            return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
        }

        const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
        const redirectTo = new URL('/auth/reset-password', origin).toString();

        const { data, error } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email,
            options: {
                redirectTo,
            },
        });

        if (error) {
            throw error;
        }

        const smtpConfig = {
            host: getRequiredEnv('SMTP_HOST'),
            port: Number.parseInt(getRequiredEnv('SMTP_PORT'), 10),
            user: getRequiredEnv('SMTP_USER'),
            pass: getRequiredEnv('SMTP_PASS'),
            secure: getRequiredEnv('SMTP_SECURE') === 'true',
            from: getRequiredEnv('SMTP_FROM'),
        };

        const actionLink = data.properties.action_link;
        const subject = 'Reset your AMP CRM password';
        const text = [
            'We received a request to reset your AMP CRM password.',
            '',
            'Use the link below to set a new password:',
            actionLink,
            '',
            'If you did not request this reset, you can ignore this email.',
        ].join('\n');

        const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
              <p>We received a request to reset your AMP CRM password.</p>
              <p>
                <a href="${actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
                  Reset password
                </a>
              </p>
              <p>If the button does not work, copy and paste this link into your browser:</p>
              <p><a href="${actionLink}">${actionLink}</a></p>
              <p>If you did not request this reset, you can ignore this email.</p>
            </div>
        `;

        await sendMail(smtpConfig, {
            to: email,
            subject,
            text,
            html,
        });

        return NextResponse.json({
            message: 'Password reset email sent.',
        });
    } catch (error) {
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Failed to send password reset email.',
            },
            { status: 500 },
        );
    }
}
