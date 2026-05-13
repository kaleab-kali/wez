export const NOTIFICATION_CHANNELS = ["sms", "email", "in_app"] as const;
export const NOTIFICATION_STATUSES = ["pending", "sent", "failed", "retry"] as const;

export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export const TRANSACTIONAL_NOTIFICATION_CATEGORIES = [
	"auth",
	"hire_request",
	"placement",
	"complaint",
	"ticket",
	"referral",
] as const;

export const NOTIFICATION_CATEGORIES = [
	...TRANSACTIONAL_NOTIFICATION_CATEGORIES,
	"training",
	"report",
	"general",
] as const;

export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export const isNotificationChannel = (value: string): value is NotificationChannel =>
	(NOTIFICATION_CHANNELS as readonly string[]).includes(value);

export const isTransactionalCategory = (category: string): boolean =>
	(TRANSACTIONAL_NOTIFICATION_CATEGORIES as readonly string[]).includes(category);

export const categoryFromTemplateKey = (templateKey: string): NotificationCategory => {
	if (templateKey.startsWith("hire_request.")) return "hire_request";
	const [prefix] = templateKey.split(".");
	if ((NOTIFICATION_CATEGORIES as readonly string[]).includes(prefix)) return prefix as NotificationCategory;
	return "general";
};
