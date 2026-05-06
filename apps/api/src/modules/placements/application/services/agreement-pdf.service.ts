import { existsSync } from "node:fs";
import { Injectable } from "@nestjs/common";

import PDFDocument = require("pdfkit");

const PDF_MARGIN = 48;
const FONT_SIZE_TITLE = 18;
const FONT_SIZE_SECTION = 12;
const FONT_SIZE_BODY = 10;
const CURRENCY_DIVISOR = 100n;
const AMHARIC_FONT_NAME = "amharic";
const AMHARIC_FONT_CANDIDATES = [
	process.env.AGREEMENT_AMHARIC_FONT_PATH,
	"C:\\Windows\\Fonts\\nyala.ttf",
	"/usr/share/fonts/truetype/noto/NotoSansEthiopic-Regular.ttf",
	"/usr/share/fonts/truetype/abyssinica/AbyssinicaSIL-Regular.ttf",
] as const;

export type AgreementPdfPayload = {
	placementId: string;
	workerName: string;
	workerPhone: string;
	employerName: string;
	employerPhone: string;
	roleName: string;
	stationName: string;
	startDate: Date;
	salaryCents: bigint;
	commissionCents: bigint;
	paymentMethod: string;
	paymentReference: string;
	finalizedBy: string;
};

const money = (cents: bigint): string => `${(cents / CURRENCY_DIVISOR).toLocaleString()} ETB`;

const addKeyValue = (doc: PDFKit.PDFDocument, label: string, value: string) => {
	doc.font("Helvetica-Bold").text(label, { continued: true });
	doc.font("Helvetica").text(` ${value}`);
};

const getAmharicFontPath = (): string | null => {
	for (const candidate of AMHARIC_FONT_CANDIDATES) {
		if (candidate && existsSync(candidate)) return candidate;
	}
	return null;
};

const addAmharicText = (doc: PDFKit.PDFDocument, value: string, hasAmharicFont: boolean) => {
	if (hasAmharicFont) {
		doc.font(AMHARIC_FONT_NAME).text(value);
		return;
	}
	doc.font("Helvetica-Oblique").text("Amharic copy requires AGREEMENT_AMHARIC_FONT_PATH to point at an Ethiopic font.");
};

@Injectable()
export class AgreementPdfService {
	async generate(payload: AgreementPdfPayload): Promise<Buffer> {
		const doc = new PDFDocument({ margin: PDF_MARGIN, size: "A4", info: { Title: "Wez Placement Agreement" } });
		const amharicFontPath = getAmharicFontPath();
		const hasAmharicFont = Boolean(amharicFontPath);
		const chunks: Buffer[] = [];

		if (amharicFontPath) {
			doc.registerFont(AMHARIC_FONT_NAME, amharicFontPath);
		}
		doc.on("data", (chunk: Buffer) => chunks.push(chunk));
		const done = new Promise<Buffer>((resolve) => {
			doc.on("end", () => resolve(Buffer.concat(chunks)));
		});

		doc.font("Helvetica-Bold").fontSize(FONT_SIZE_TITLE).text("Wez Placement Agreement", { align: "center" });
		doc.fontSize(FONT_SIZE_SECTION);
		if (hasAmharicFont) {
			doc.font(AMHARIC_FONT_NAME).text("የዌዝ የሥራ ምደባ ስምምነት", { align: "center" });
		}
		doc.moveDown();

		doc.fontSize(FONT_SIZE_SECTION).font("Helvetica-Bold").text("Placement details");
		if (hasAmharicFont) {
			doc.font(AMHARIC_FONT_NAME).text("የምደባ መረጃ");
		}
		doc.moveDown(0.5);
		doc.fontSize(FONT_SIZE_BODY);
		addKeyValue(doc, "Placement ID:", payload.placementId);
		addKeyValue(doc, "Worker:", `${payload.workerName} (${payload.workerPhone})`);
		addKeyValue(doc, "Employer:", `${payload.employerName} (${payload.employerPhone})`);
		addKeyValue(doc, "Role:", payload.roleName);
		addKeyValue(doc, "Station:", payload.stationName);
		addKeyValue(doc, "Start date:", payload.startDate.toISOString().slice(0, 10));
		addKeyValue(doc, "Salary:", money(payload.salaryCents));
		addKeyValue(doc, "Commission:", money(payload.commissionCents));
		addKeyValue(doc, "Payment:", `${payload.paymentMethod.toUpperCase()} ${payload.paymentReference}`);
		addKeyValue(doc, "Finalized by:", payload.finalizedBy);

		doc.moveDown();
		doc.fontSize(FONT_SIZE_SECTION).font("Helvetica-Bold").text("Terms");
		if (hasAmharicFont) {
			doc.font(AMHARIC_FONT_NAME).text("ውሎች");
		}
		doc.moveDown(0.5);
		doc.fontSize(FONT_SIZE_BODY).font("Helvetica");
		doc.text("1. The employer confirms the worker, role, salary, and start date recorded above.");
		doc.text("2. Wez commission is system-calculated from the active role catalog and is not negotiated at the desk.");
		doc.text("3. Placement is active only after payment is received and verified by the station agent.");
		doc.text("4. Complaints may be filed at any Wez station. Serious complaints may be referred to compliance.");
		doc.text("5. Workers are not charged placement fees by Wez.");
		doc.moveDown();
		addAmharicText(doc, "1. አሠሪው ከላይ የተመዘገበውን ሠራተኛ፣ የሥራ ዓይነት፣ ደመወዝ እና የመጀመሪያ ቀን ያረጋግጣል።", hasAmharicFont);
		addAmharicText(doc, "2. የዌዝ ኮሚሽን በስርዓቱ ከሚተዳደረው የሚና ካታሎግ ይሰላል።", hasAmharicFont);
		addAmharicText(doc, "3. ምደባው ክፍያ ተቀብሎ ከተረጋገጠ በኋላ ብቻ ንቁ ይሆናል።", hasAmharicFont);

		doc.moveDown(2);
		doc.font("Helvetica-Bold").text("Signatures");
		if (hasAmharicFont) {
			doc.font(AMHARIC_FONT_NAME).text("ፊርማ");
		}
		doc.moveDown();
		doc.font("Helvetica").text("Worker signature or thumbprint: ________________________________");
		doc.moveDown();
		doc.text("Employer signature: __________________________________________");
		doc.moveDown();
		doc.text("Agent witness signature: ______________________________________");

		doc.end();
		return done;
	}
}
