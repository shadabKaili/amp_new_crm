import net from 'node:net';
import tls from 'node:tls';

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

type SmtpSocket = net.Socket | tls.TLSSocket;

interface SmtpResponse {
    code: number;
    lines: string[];
}

function createError(message: string): Error {
    return new Error(`SMTP error: ${message}`);
}

function encodeAuthPlain(user: string, pass: string): string {
    return Buffer.from(`\0${user}\0${pass}`, 'utf8').toString('base64');
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

function readResponse(socket: SmtpSocket): Promise<SmtpResponse> {
    return new Promise((resolve, reject) => {
        let buffer = '';
        const lines: string[] = [];

        const cleanup = () => {
            socket.off('data', handleData);
            socket.off('error', handleError);
            socket.off('close', handleClose);
        };

        const finish = (line: string) => {
            const code = parseResponseCode(line);
            cleanup();
            resolve({ code, lines });
        };

        const handleData = (chunk: Buffer | string) => {
            buffer += chunk.toString();

            while (true) {
                const newlineIndex = buffer.indexOf('\n');
                if (newlineIndex === -1) {
                    return;
                }

                const rawLine = buffer.slice(0, newlineIndex).replace(/\r$/, '');
                buffer = buffer.slice(newlineIndex + 1);

                if (!rawLine) {
                    continue;
                }

                lines.push(rawLine);

                if (/^\d{3} /.test(rawLine)) {
                    finish(rawLine);
                    return;
                }
            }
        };

        const handleError = (error: Error) => {
            cleanup();
            reject(error);
        };

        const handleClose = () => {
            cleanup();
            reject(createError('connection closed unexpectedly'));
        };

        socket.on('data', handleData);
        socket.once('error', handleError);
        socket.once('close', handleClose);
    });
}

async function sendCommand(socket: SmtpSocket, command: string, expectedCodes: number[]): Promise<SmtpResponse> {
    socket.write(`${command}\r\n`);
    const response = await readResponse(socket);

    if (!expectedCodes.includes(response.code)) {
        throw createError(`command "${command}" failed with ${response.code}: ${response.lines.join(' | ')}`);
    }

    return response;
}

async function connect(host: string, port: number, secure: boolean): Promise<SmtpSocket> {
    if (secure) {
        const socket = tls.connect({ host, port, servername: host });
        await new Promise<void>((resolve, reject) => {
            socket.once('secureConnect', () => resolve());
            socket.once('error', reject);
        });
        return socket;
    }

    const socket = net.createConnection({ host, port });
    await new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('error', reject);
    });
    return socket;
}

async function upgradeToTls(socket: net.Socket, host: string): Promise<tls.TLSSocket> {
    const secureSocket = tls.connect({
        socket,
        servername: host,
    });

    await new Promise<void>((resolve, reject) => {
        secureSocket.once('secureConnect', () => resolve());
        secureSocket.once('error', reject);
    });

    return secureSocket;
}

function buildMimeMessage(message: MailMessage, from: string): string {
    const boundary = `amp-crm-${crypto.randomUUID()}`;
    const subject = message.subject;
    const textPart = message.text.trimEnd();
    const htmlPart = (message.html ?? '').trimEnd();
    const headers = [
        `From: ${from}`,
        `To: ${message.to}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        message.replyTo ? `Reply-To: ${message.replyTo}` : null,
        '',
        `--${boundary}`,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        textPart,
        '',
        `--${boundary}`,
        'Content-Type: text/html; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        '',
        htmlPart || textPart,
        '',
        `--${boundary}--`,
        '',
    ].filter((line) => line !== null);

    return dotStuff(headers.join('\r\n'));
}

export async function sendMail(config: SmtpConfig, message: MailMessage): Promise<void> {
    let socket = await connect(config.host, config.port, Boolean(config.secure));

    try {
        const greeting = await readResponse(socket);
        if (greeting.code !== 220) {
            throw createError(`unexpected greeting: ${greeting.lines.join(' | ')}`);
        }

        const ehlo = await sendCommand(socket, 'EHLO localhost', [250]);

        if (!config.secure && ehlo.lines.some((line) => line.toUpperCase().includes('STARTTLS'))) {
            await sendCommand(socket, 'STARTTLS', [220]);
            socket = await upgradeToTls(socket as net.Socket, config.host);
            socket.setEncoding('utf8');
            const tlsEhlo = await sendCommand(socket, 'EHLO localhost', [250]);
            if (!tlsEhlo.lines.length) {
                throw createError('EHLO failed after STARTTLS');
            }

            return await sendMailOverConnectedSocket(socket, config, message);
        }

        if (!config.secure) {
            throw createError('server does not support STARTTLS');
        }

        return await sendMailOverConnectedSocket(socket, config, message);
    } finally {
        if (!socket.destroyed) {
            socket.end();
        }
    }
}

async function sendMailOverConnectedSocket(socket: SmtpSocket, config: SmtpConfig, message: MailMessage): Promise<void> {
    socket.setEncoding('utf8');

    await sendCommand(socket, `AUTH PLAIN ${encodeAuthPlain(config.user, config.pass)}`, [235]);
    await sendCommand(socket, `MAIL FROM:${formatAddress(message.from ?? config.from)}`, [250]);
    await sendCommand(socket, `RCPT TO:${formatAddress(message.to)}`, [250, 251]);
    await sendCommand(socket, 'DATA', [354]);

    const payload = buildMimeMessage(message, message.from ?? config.from);
    socket.write(`${payload}\r\n.\r\n`);

    const dataResponse = await readResponse(socket);
    if (dataResponse.code !== 250) {
        throw createError(`message was rejected: ${dataResponse.lines.join(' | ')}`);
    }

    await sendCommand(socket, 'QUIT', [221]);
}
