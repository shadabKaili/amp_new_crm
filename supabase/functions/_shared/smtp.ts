export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure?: boolean;
  from: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  from?: string;
}

type SmtpSocket = Deno.TcpConn | Deno.TlsConn;

interface SmtpResponse {
  code: number;
  lines: string[];
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function createError(message: string): Error {
  return new Error(`SMTP error: ${message}`);
}

function encodeAuthPlain(user: string, pass: string): string {
  return btoa(`\0${user}\0${pass}`);
}

function dotStuff(content: string): string {
  return content
    .split('\r\n')
    .map((line) => (line.startsWith('.') ? `.${line}` : line))
    .join('\r\n');
}

function formatAddress(address: string): string {
  if (address.includes('<')) {
    return address;
  }

  return `<${address}>`;
}

function parseResponseCode(line: string): number {
  const code = Number.parseInt(line.slice(0, 3), 10);
  if (Number.isNaN(code)) {
    throw createError(`invalid response line "${line}"`);
  }

  return code;
}

class SmtpSession {
  private buffer = '';

  constructor(private readonly socket: SmtpSocket) {}

  async send(command: string): Promise<void> {
    await this.socket.write(textEncoder.encode(`${command}\r\n`));
  }

  async sendRaw(payload: string): Promise<void> {
    await this.socket.write(textEncoder.encode(payload));
  }

  async readResponse(): Promise<SmtpResponse> {
    const lines: string[] = [];

    while (true) {
      const line = await this.readLine();
      if (line === null) {
        throw createError('connection closed unexpectedly');
      }

      lines.push(line);

      if (/^\d{3} /.test(line)) {
        return {
          code: parseResponseCode(line),
          lines,
        };
      }
    }
  }

  close() {
    this.socket.close();
  }

  private async readLine(): Promise<string | null> {
    while (true) {
      const newlineIndex = this.buffer.indexOf('\n');
      if (newlineIndex !== -1) {
        const rawLine = this.buffer.slice(0, newlineIndex).replace(/\r$/, '');
        this.buffer = this.buffer.slice(newlineIndex + 1);
        if (!rawLine) {
          continue;
        }

        return rawLine;
      }

      const chunk = new Uint8Array(1024);
      const bytesRead = await this.socket.read(chunk);
      if (bytesRead === null) {
        if (this.buffer.length === 0) {
          return null;
        }

        const line = this.buffer.replace(/\r$/, '');
        this.buffer = '';
        return line;
      }

      this.buffer += textDecoder.decode(chunk.subarray(0, bytesRead));
    }
  }
}

async function connect(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
  if (secure) {
    return await Deno.connectTls({ hostname: host, port });
  }

  return await Deno.connect({ hostname: host, port });
}

async function upgradeToTls(socket: Deno.TcpConn, host: string): Promise<Deno.TlsConn> {
  return await Deno.startTls(socket, { hostname: host });
}

function buildMimeMessage(message: MailMessage, from: string): string {
  const boundary = `amp-crm-${crypto.randomUUID()}`;
  const headers = [
    `From: ${from}`,
    `To: ${message.to}`,
    `Subject: ${message.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    message.replyTo ? `Reply-To: ${message.replyTo}` : null,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    message.text.trimEnd(),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    (message.html ?? message.text).trimEnd(),
    '',
    `--${boundary}--`,
    '',
  ].filter((line) => line !== null);

  return dotStuff(headers.join('\r\n'));
}

async function sendCommand(session: SmtpSession, command: string, expectedCodes: number[]): Promise<SmtpResponse> {
  await session.send(command);
  const response = await session.readResponse();

  if (!expectedCodes.includes(response.code)) {
    throw createError(`command "${command}" failed with ${response.code}: ${response.lines.join(' | ')}`);
  }

  return response;
}

export async function sendMail(config: SmtpConfig, message: MailMessage): Promise<void> {
  let socket = await connect(config.host, config.port, Boolean(config.secure));
  let session = new SmtpSession(socket);

  try {
    const greeting = await session.readResponse();
    if (greeting.code !== 220) {
      throw createError(`unexpected greeting: ${greeting.lines.join(' | ')}`);
    }

    const ehlo = await sendCommand(session, 'EHLO localhost', [250]);

    if (!config.secure && ehlo.lines.some((line) => line.toUpperCase().includes('STARTTLS'))) {
      await sendCommand(session, 'STARTTLS', [220]);
      socket = await upgradeToTls(socket as Deno.TcpConn, config.host);
      session = new SmtpSession(socket);
      const tlsEhlo = await sendCommand(session, 'EHLO localhost', [250]);
      if (!tlsEhlo.lines.length) {
        throw createError('EHLO failed after STARTTLS');
      }

      return sendMailOverConnectedSession(session, config, message);
    }

    if (!config.secure) {
      throw createError('server does not support STARTTLS');
    }

    return sendMailOverConnectedSession(session, config, message);
  } finally {
    session.close();
  }
}

async function sendMailOverConnectedSession(session: SmtpSession, config: SmtpConfig, message: MailMessage): Promise<void> {
  await sendCommand(session, `AUTH PLAIN ${encodeAuthPlain(config.user, config.pass)}`, [235]);
  await sendCommand(session, `MAIL FROM:${formatAddress(message.from ?? config.from)}`, [250]);
  await sendCommand(session, `RCPT TO:${formatAddress(message.to)}`, [250, 251]);
  await sendCommand(session, 'DATA', [354]);

  const payload = buildMimeMessage(message, message.from ?? config.from);
  await session.sendRaw(`${payload}\r\n.\r\n`);

  const dataResponse = await session.readResponse();
  if (dataResponse.code !== 250) {
    throw createError(`message was rejected: ${dataResponse.lines.join(' | ')}`);
  }

  await sendCommand(session, 'QUIT', [221]);
}
