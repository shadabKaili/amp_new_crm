import { sendMail, type SmtpConfig } from './smtp.ts';

export function getSmtpConfig(): SmtpConfig {
  const host = Deno.env.get('SMTP_HOST');
  const port = Deno.env.get('SMTP_PORT');
  const user = Deno.env.get('SMTP_USER');
  const pass = Deno.env.get('SMTP_PASS');
  const from = Deno.env.get('SMTP_FROM');

  if (!host || !port || !user || !pass || !from) {
    throw new Error('Missing SMTP environment variables.');
  }

  return {
    host,
    port: Number.parseInt(port, 10),
    user,
    pass,
    secure: Deno.env.get('SMTP_SECURE') === 'true',
    from,
  };
}

export function getSiteUrl(request?: Request): string {
  const origin = request?.headers.get('origin');
  const envUrl = Deno.env.get('SITE_URL') ?? Deno.env.get('NEXT_PUBLIC_SITE_URL');
  return origin || envUrl || 'http://localhost:3000';
}

function normalizeName(name: string): string {
  return name.trim() || 'there';
}

export async function sendWelcomeEmail(input: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = 'Welcome to AMP CRM';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Your AMP CRM account is ready.',
    '',
    `Sign in here: ${input.loginUrl}`,
    '',
    'If you did not request this account, please contact an AMP administrator.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Your AMP CRM account is ready.</p>
      <p>
        <a href="${input.loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
          Sign in to AMP CRM
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${input.loginUrl}">${input.loginUrl}</a></p>
      <p>If you did not request this account, please contact an AMP administrator.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendVolunteerReadyEmail(input: {
  to: string;
  name: string;
  actionLink: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = 'Your AMP volunteer account is ready';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Your AMP volunteer account has been approved.',
    '',
    'Use the secure link below to set your password and sign in:',
    input.actionLink,
    '',
    'If you were not expecting this email, you can ignore it.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Your AMP volunteer account has been approved.</p>
      <p>
        <a href="${input.actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
          Set your password
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${input.actionLink}">${input.actionLink}</a></p>
      <p>If you were not expecting this email, you can ignore it.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendReferralApprovedEmail(input: {
  to: string;
  name: string;
  loginUrl: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = 'Your AMP referral was approved';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Your AMP referral has been approved and your member account is ready.',
    '',
    `Set your password and sign in here: ${input.loginUrl}`,
    '',
    'If you were not expecting this email, you can ignore it.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Your AMP referral has been approved and your member account is ready.</p>
      <p>
        <a href="${input.loginUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">
          Set your password
        </a>
      </p>
      <p>If the button does not work, copy and paste this link into your browser:</p>
      <p><a href="${input.loginUrl}">${input.loginUrl}</a></p>
      <p>If you were not expecting this email, you can ignore it.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendVolunteerRejectedEmail(input: {
  to: string;
  name: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = 'Update on your AMP volunteer application';
  const text = [
    `Hi ${greetingName},`,
    '',
    'Thank you for your interest in volunteering with AMP.',
    'At this time we are unable to move forward with your application.',
    '',
    'We appreciate your time and support.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Thank you for your interest in volunteering with AMP.</p>
      <p>At this time we are unable to move forward with your application.</p>
      <p>We appreciate your time and support.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendDonationReceiptEmail(input: {
  to: string;
  name: string;
  amount: number;
  purpose?: string | null;
  receiptNumber?: string | null;
}) {
  const greetingName = normalizeName(input.name);
  const subject = 'Your AMP donation receipt';
  const amount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(input.amount);
  const purposeLine = input.purpose ? `Purpose: ${input.purpose}` : 'Purpose: General contribution';
  const receiptLine = input.receiptNumber ? `Receipt number: ${input.receiptNumber}` : null;

  const text = [
    `Hi ${greetingName},`,
    '',
    'Thank you for your donation to AMP.',
    `Amount: ${amount}`,
    purposeLine,
    receiptLine,
    '',
    'We appreciate your support.',
  ].filter(Boolean).join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Thank you for your donation to AMP.</p>
      <p><strong>Amount:</strong> ${amount}</p>
      <p><strong>${purposeLine}</strong></p>
      ${receiptLine ? `<p><strong>${receiptLine}</strong></p>` : ''}
      <p>We appreciate your support.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendTaskAssignmentEmail(input: {
  to: string;
  name: string;
  taskTitle: string;
  taskStatus?: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = `New AMP task assigned: ${input.taskTitle}`;
  const statusLine = input.taskStatus ? `Status: ${input.taskStatus}` : 'Status: pending';
  const text = [
    `Hi ${greetingName},`,
    '',
    `A new task has been assigned to you: ${input.taskTitle}.`,
    statusLine,
    '',
    'Please sign in to AMP CRM to review the task details.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>A new task has been assigned to you: <strong>${input.taskTitle}</strong>.</p>
      <p><strong>${statusLine}</strong></p>
      <p>Please sign in to AMP CRM to review the task details.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendOnboardingReminderEmail(input: {
  to: string;
  name: string;
  volunteerName: string;
  volunteerEmail?: string | null;
  volunteerPhone?: string | null;
  availability?: string | null;
  motivation?: string | null;
  actionLink?: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = `New volunteer assigned to you: ${input.volunteerName}`;
  const lines = [
    `Hi ${greetingName},`,
    '',
    `A new volunteer application has been assigned to you: ${input.volunteerName}.`,
    input.volunteerEmail ? `Email: ${input.volunteerEmail}` : null,
    input.volunteerPhone ? `Phone: ${input.volunteerPhone}` : null,
    input.availability ? `Availability: ${input.availability}` : null,
    input.motivation ? `Motivation: ${input.motivation}` : null,
    '',
    'Please review the application in AMP CRM and take the next action.',
    input.actionLink ? `Open AMP CRM: ${input.actionLink}` : null,
  ].filter(Boolean) as string[];
  const text = lines.join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>A new volunteer application has been assigned to you: <strong>${input.volunteerName}</strong>.</p>
      ${input.volunteerEmail ? `<p><strong>Email:</strong> ${input.volunteerEmail}</p>` : ''}
      ${input.volunteerPhone ? `<p><strong>Phone:</strong> ${input.volunteerPhone}</p>` : ''}
      ${input.availability ? `<p><strong>Availability:</strong> ${input.availability}</p>` : ''}
      ${input.motivation ? `<p><strong>Motivation:</strong> ${input.motivation}</p>` : ''}
      <p>Please review the application in AMP CRM and take the next action.</p>
      ${input.actionLink ? `<p><a href="${input.actionLink}" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:8px;">Open AMP CRM</a></p>` : ''}
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}

export async function sendReferralEmail(input: {
  to: string;
  name: string;
  referredName: string;
  status?: string;
}) {
  const greetingName = normalizeName(input.name);
  const subject = input.status === 'approved'
    ? 'Your AMP referral has been approved'
    : 'Your AMP referral was received';
  const statusLine = input.status === 'approved'
    ? 'Your referral is now approved.'
    : 'We have received your referral and it is awaiting review.';

  const text = [
    `Hi ${greetingName},`,
    '',
    `Referral update for ${input.referredName}.`,
    statusLine,
    '',
    'Thank you for helping AMP grow its community.',
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
      <p>Hi ${greetingName},</p>
      <p>Referral update for <strong>${input.referredName}</strong>.</p>
      <p>${statusLine}</p>
      <p>Thank you for helping AMP grow its community.</p>
    </div>
  `;

  await sendMail(getSmtpConfig(), {
    to: input.to,
    subject,
    text,
    html,
  });
}
