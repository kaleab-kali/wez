import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import {
	GOVERNMENT_REPORT_FORMATS,
	GOVERNMENT_REPORT_STATUSES,
	GOVERNMENT_REPORT_TYPES,
	type GovernmentReportFormat,
	type GovernmentReportStatus,
	type GovernmentReportType,
} from "../../domain/entities/government-report.entity";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FILING_REFERENCE_MAX_LENGTH = 120;

export class ListGovernmentReportsDto {
	@ApiProperty({ enum: GOVERNMENT_REPORT_TYPES, required: false })
	@IsOptional()
	@IsEnum(GOVERNMENT_REPORT_TYPES)
	type?: GovernmentReportType;

	@ApiProperty({ enum: GOVERNMENT_REPORT_STATUSES, required: false })
	@IsOptional()
	@IsEnum(GOVERNMENT_REPORT_STATUSES)
	status?: GovernmentReportStatus;

	@ApiProperty({ example: "2026-05-01", required: false })
	@IsOptional()
	@IsDateString()
	periodStart?: string;

	@ApiProperty({ example: "2026-05-31", required: false })
	@IsOptional()
	@IsDateString()
	periodEnd?: string;

	@ApiProperty({ example: DEFAULT_PAGE, required: false })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number = DEFAULT_PAGE;

	@ApiProperty({ example: DEFAULT_LIMIT, required: false })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(MAX_LIMIT)
	limit?: number = DEFAULT_LIMIT;
}

export class GovernmentReportPeriodDto {
	@ApiProperty({ example: "2026-05-01" })
	@IsDateString()
	periodStart!: string;

	@ApiProperty({ example: "2026-05-31" })
	@IsDateString()
	periodEnd!: string;
}

export class GenerateGovernmentReportDto extends GovernmentReportPeriodDto {
	@ApiProperty({ enum: GOVERNMENT_REPORT_TYPES, example: "erca_monthly" })
	@IsEnum(GOVERNMENT_REPORT_TYPES)
	type!: GovernmentReportType;

	@ApiProperty({ enum: GOVERNMENT_REPORT_FORMATS, example: "csv", required: false })
	@IsOptional()
	@IsEnum(GOVERNMENT_REPORT_FORMATS)
	format?: GovernmentReportFormat = "csv";
}

export class MarkGovernmentReportFiledDto {
	@ApiProperty({ example: "MOR-2026-05-001" })
	@IsString()
	@MaxLength(FILING_REFERENCE_MAX_LENGTH)
	filedReference!: string;
}
