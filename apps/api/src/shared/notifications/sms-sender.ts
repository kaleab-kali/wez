import { Logger } from "@nestjs/common";

const logger = new Logger("SmsSender");

export const sendSms = async (to: string, body: string): Promise<void> => {
	const provider = process.env.SMS_PROVIDER ?? "disabled";
	if (provider !== "disabled") {
		logger.warn(`SMS provider ${provider} is configured but direct OTP delivery is disabled; would send to ${to}.`);
		return;
	}
	logger.log(`disabled:sms would send to ${to}: ${body}`);
};
