import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type {
	ComplaintPartyType,
	ComplaintResolutionTag,
	ComplaintSeverity,
	ComplaintStatus,
} from "../../domain/entities/complaint.entity";

export const COMPLAINT_PARTY_TYPES = ["worker", "employer"] as const;
export const COMPLAINT_SEVERITIES = ["low", "medium", "high"] as const;
export const COMPLAINT_STATUSES = ["open", "mediating", "closed", "referred_external"] as const;
export const COMPLAINT_RESOLUTION_TAGS = ["amicable", "partial", "failed"] as const;

export class CreateComplaintDto {
	@ApiProperty({ enum: COMPLAINT_PARTY_TYPES })
	@IsEnum(COMPLAINT_PARTY_TYPES)
	filedByType!: ComplaintPartyType;

	@ApiProperty({ required: false, description: "Required for staff intake. Customers resolve this from session." })
	@IsOptional()
	@IsString()
	filedById?: string;

	@ApiProperty({ enum: COMPLAINT_PARTY_TYPES })
	@IsEnum(COMPLAINT_PARTY_TYPES)
	againstType!: ComplaintPartyType;

	@ApiProperty()
	@IsString()
	againstId!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	placementId?: string;

	@ApiProperty({ required: false, description: "Required for staff intake; online complaints derive from placement." })
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ description: "Complaint category lookup value" })
	@IsString()
	type!: string;

	@ApiProperty({ enum: COMPLAINT_SEVERITIES })
	@IsEnum(COMPLAINT_SEVERITIES)
	severity!: ComplaintSeverity;

	@ApiProperty()
	@IsString()
	@MinLength(10)
	description!: string;
}

export class ListComplaintsDto {
	@ApiProperty({ required: false, enum: COMPLAINT_STATUSES })
	@IsOptional()
	@IsEnum(COMPLAINT_STATUSES)
	status?: ComplaintStatus;

	@ApiProperty({ required: false, enum: COMPLAINT_SEVERITIES })
	@IsOptional()
	@IsEnum(COMPLAINT_SEVERITIES)
	severity?: ComplaintSeverity;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ required: false, enum: COMPLAINT_PARTY_TYPES })
	@IsOptional()
	@IsEnum(COMPLAINT_PARTY_TYPES)
	filedByType?: ComplaintPartyType;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	filedById?: string;

	@ApiProperty({ required: false, enum: COMPLAINT_PARTY_TYPES })
	@IsOptional()
	@IsEnum(COMPLAINT_PARTY_TYPES)
	againstType?: ComplaintPartyType;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	againstId?: string;

	@ApiProperty({ required: false, default: 1 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	page?: number;

	@ApiProperty({ required: false, default: 20, maximum: 100 })
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(100)
	limit?: number;
}

export class CloseComplaintDto {
	@ApiProperty()
	@IsString()
	@MinLength(5)
	resolution!: string;

	@ApiProperty({ enum: COMPLAINT_RESOLUTION_TAGS })
	@IsEnum(COMPLAINT_RESOLUTION_TAGS)
	resolutionTag!: ComplaintResolutionTag;
}

export class ReferComplaintExternalDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	externalCaseId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	resolution?: string;
}
