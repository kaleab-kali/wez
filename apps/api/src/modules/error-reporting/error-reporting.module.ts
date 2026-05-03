import { Module } from "@nestjs/common";
import { ErrorReportingController } from "./error-reporting.controller";

@Module({
	controllers: [ErrorReportingController],
})
export class ErrorReportingModule {}
