import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Length, Max, Min } from "class-validator";

export class CreateJobDto {
	@ApiProperty()
	@IsString()
	@Length(1, 100)
	roleId!: string;

	@ApiProperty()
	@IsString()
	@Length(2, 200)
	title!: string;

	@ApiProperty()
	@IsString()
	@Length(2, 5000)
	description!: string;

	@ApiProperty({ description: "Min salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMinCents!: number;

	@ApiProperty({ description: "Max salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMaxCents!: number;

	@ApiProperty()
	@IsString()
	@Length(2, 50)
	location!: string;

	// Optional: agent posting on behalf of an employer must supply employerId.
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;
}

export class UpdateJobDto extends PartialType(CreateJobDto) {
	@ApiProperty({ enum: ["open", "closed", "filled"], required: false })
	@IsOptional()
	@IsEnum(["open", "closed", "filled"] as const)
	status?: "open" | "closed" | "filled";
}

export class ListJobsDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	q?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	roleId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	location?: string;

	@ApiProperty({ required: false, enum: ["open", "closed", "filled"] })
	@IsOptional()
	@IsEnum(["open", "closed", "filled"] as const)
	status?: "open" | "closed" | "filled";

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	employerId?: string;

	@ApiProperty({ required: false, default: 1 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Type(() => Number)
	page?: number;

	@ApiProperty({ required: false, default: 20 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Type(() => Number)
	limit?: number;
}
