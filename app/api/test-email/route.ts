import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/email/smtp";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const to = searchParams.get('to') || 'operations2@zillion.io';

    try {
        await sendMail({
            host: process.env.SMTP_HOST || 'smtp.zeptomail.in',
            port: Number(process.env.SMTP_PORT || 587),
            user: process.env.SMTP_USER || '',
            pass: process.env.SMTP_PASS || '',
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM || 'noreply@ampindia.org'
        }, {
            to,
            subject: 'Test Email from AMP CRM',
            text: 'This is a test email sent from the AMP CRM application.',
            html: '<p>This is a test email sent from the <strong>AMP CRM</strong> application.</p>'
        });
        return NextResponse.json({ success: true, message: `Email sent successfully to ${to}` });
    } catch (error: any) {
        console.error('Email sending failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
