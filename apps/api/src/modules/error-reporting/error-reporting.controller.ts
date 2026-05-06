import { Body, Controller, Post } from "@nestjs/common";
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AllowAnonymous } from "@thallesp/nestjs-better-auth";
import { PinoLogger } from "nestjs-pino";
import { CreateErrorReportDto } from "./dto/create-error-report.dto";

@ApiTags("Error Reporting")
@AllowAnonymous()
@Controller("error-reports")
export class ErrorReportingController {
	constructor(private readonly logger: PinoLogger) {
		this.logger.setContext(ErrorReportingController.name);
	}

	@Post()
	@ApiOperation({ summary: "Report a frontend error" })
	@ApiBody({ type: CreateErrorReportDto })
	@ApiResponse({ status: 201, description: "Error report received" })
	create(@Body() dto: CreateErrorReportDto) {
		this.logger.warn(
			{
				source: "frontend",
				errorMessage: dto.message,
				stack: dto.stack,
				componentStack: dto.componentStack,
				pageUrl: dto.url,
				userAgent: dto.userAgent,
				context: dto.context,
			},
			`Frontend error: ${dto.message}`,
		);

		return { data: { received: true } };
	}
}
