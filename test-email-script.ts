import { sendMail } from './lib/email/smtp';
import * as fs from 'fs';

function loadEnv() {
    const env = fs.readFileSync('.env.local', 'utf-8');
    env.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            process.env[match[1]] = match[2].trim();
        }
    });
}
loadEnv();

async function run() {
    try {
        let pass = process.env.SMTP_PASS || '';
        if (pass.startsWith('"') && pass.endsWith('"')) {
            pass = pass.slice(1, -1);
        }
        console.log("Using SMTP_USER:", process.env.SMTP_USER);
        await sendMail({
            host: process.env.SMTP_HOST || 'smtp.zeptomail.in',
            port: Number(process.env.SMTP_PORT || 587),
            user: process.env.SMTP_USER || '',
            pass: pass,
            secure: process.env.SMTP_SECURE === 'true',
            from: process.env.SMTP_FROM || 'noreply@ampindia.org'
        }, {
            to: 'operations2@zillion.io',
            subject: 'Test Email from AMP CRM via Script',
            text: 'This is a test email sent from the AMP CRM application via test script.',
            html: '<p>This is a test email sent from the <strong>AMP CRM</strong> application via test script.</p>'
        });
        console.log('Email sent successfully');
    } catch (error) {
        console.error('Email sending failed:', error);
    }
}

run();
