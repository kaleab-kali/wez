import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class CreateRoleDto {
	@ApiProperty({ example: "house_maid" })
	@IsString()
	@Matches(/^[a-z][a-z0-9_]{1,49}$/, { message: "id must be lower_snake_case" })
	id!: string;

	@ApiProperty({ example: "House Maid" })
	@IsString()
	@Length(2, 100)
	name!: string;

	@ApiProperty({ example: "domestic" })
	@IsString()
	@Length(2, 50)
	category!: string;

	@ApiProperty({ enum: ["flat", "percent"] })
	@IsEnum(["flat", "percent"] as const)
	commType!: "flat" | "percent";

	@ApiProperty({ example: 1500, description: "birr (flat) or percent (10 == 10%)" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	commValue!: number;

	@ApiProperty({ example: 200000, description: "Min salary in cents" })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMinCents!: number;

	@ApiProperty({ example: 600000 })
	@IsInt()
	@Min(0)
	@Type(() => Number)
	salaryMaxCents!: number;
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}
