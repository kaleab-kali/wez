export const ATTACHMENT_STATUSES = ["pending", "scanning", "clean", "infected", "deleted"] as const;
export const ATTACHMENT_OWNER_TYPES = [
	"worker",
	"employer",
	"placement",
	"complaint",
	"ticket",
	"course",
	"government_report",
	"temp",
] as const;

export type AttachmentStatus = (typeof ATTACHMENT_STATUSES)[number];
export type AttachmentOwnerType = (typeof ATTACHMENT_OWNER_TYPES)[number];
