import { Injectable } from "@nestjs/common";

export type VirusScanResult = {
	readonly clean: boolean;
	readonly reason?: string;
};

const BLOCKED_EXTENSIONS = [".exe", ".bat", ".cmd", ".ps1", ".scr"] as const;

@Injectable()
export class VirusScanService {
	async scan(input: { readonly filename: string; readonly mimeType: string }): Promise<VirusScanResult> {
		const lowerName = input.filename.toLowerCase();
		const blocked = BLOCKED_EXTENSIONS.find((extension) => lowerName.endsWith(extension));
		if (blocked) return { clean: false, reason: `Blocked executable extension ${blocked}` };
		return { clean: true };
	}
}
