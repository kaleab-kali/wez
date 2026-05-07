import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class ListAuditEventsDto {
	@ApiProperty({ required: false, description: "Exact action name, for example placement.finalized" })
	@IsOptional()
	@IsString()
	action?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	actorId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	actorRole?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	targetType?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	targetId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	stationId?: string;

	@ApiProperty({ required: false, description: "Created at lower bound" })
	@IsOptional()
	@IsDateString()
	from?: string;

	@ApiProperty({ required: false, description: "Created at upper bound" })
	@IsOptional()
	@IsDateString()
	to?: string;

	@ApiProperty({ required: false, default: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	page?: number;

	@ApiProperty({ required: false, default: 25 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Type(() => Number)
	limit?: number;
}
