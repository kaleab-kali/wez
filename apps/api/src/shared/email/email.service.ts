import { Injectable, Logger } from "@nestjs/common";
import type { Transporter } from "nodemailer";
import * as nodemailer from "nodemailer";

interface SendEmailInput {
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	attachments?: { filename: string; content: Buffer; contentType?: string }[];
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name);
	private transporter: Transporter | null = null;

	private getTransporter(): Transporter {
		if (this.transporter) return this.transporter;
		const host = process.env.SMTP_HOST;
		const port = Number(process.env.SMTP_PORT ?? 587);
		const user = process.env.SMTP_USER;
		const pass = process.env.SMTP_PASS;
		if (host && user && pass) {
			this.transporter = nodemailer.createTransport({
				host,
				port,
				secure: port === 465,
				auth: { user, pass },
			});
		} else {
			// JSON transport for dev — logs instead of sending
			this.transporter = nodemailer.createTransport({ jsonTransport: true });
			this.logger.warn("SMTP not configured. Using JSON transport (dev mode).");
		}
		return this.transporter;
	}

	async send(input: SendEmailInput): Promise<{ messageId?: string; response?: unknown }> {
		const from = process.env.SMTP_FROM ?? "noreply@wez.local";
		const t = this.getTransporter();
		const info = await t.sendMail({
			from,
			to: Array.isArray(input.to) ? input.to.join(",") : input.to,
			subject: input.subject,
			text: input.text,
			html: input.html,
			attachments: input.attachments,
		});
		this.logger.log(`Email sent to ${input.to}: ${info.messageId ?? "(no id)"}`);
		return { messageId: info.messageId, response: info.response };
	}
}
