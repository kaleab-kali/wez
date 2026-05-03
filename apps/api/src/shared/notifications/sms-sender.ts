// Phase 1B placeholder. Phase 1G replaces with Afromessage adapter behind INotificationSender.
// Logs OTP to console in dev so the developer can paste it into the verify form without an SMS gateway.

const log = (...args: unknown[]) => {
	const ts = new Date().toISOString();
	console.log(`[sms-sender ${ts}]`, ...args);
};

export const sendSms = async (to: string, body: string): Promise<void> => {
	if (process.env.NODE_ENV === "production") {
		// Real adapter (Afromessage) lands in Phase 1G.
		log(`PRODUCTION SMS NOT YET WIRED — would send to ${to}: ${body}`);
		return;
	}
	log(`SMS to ${to}: ${body}`);
};
