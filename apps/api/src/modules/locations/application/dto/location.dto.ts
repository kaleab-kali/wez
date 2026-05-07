import { ApiProperty, PartialType } from "@nestjs/swagger";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Length, Min } from "class-validator";

export const LOCATION_KINDS = ["admin_area", "sub_area", "locality"] as const;
export const LOCATION_TYPES = [
	"city_administration",
	"region",
	"subcity",
	"zone",
	"woreda",
	"kebele",
	"custom",
] as const;

export class CreateLocationDto {
	@ApiProperty({ example: "aa-bole-w03" })
	@IsString()
	@Length(2, 80)
	code!: string;

	@ApiProperty({ enum: LOCATION_KINDS })
	@IsEnum(LOCATION_KINDS)
	kind!: (typeof LOCATION_KINDS)[number];

	@ApiProperty({ enum: LOCATION_TYPES })
	@IsEnum(LOCATION_TYPES)
	type!: (typeof LOCATION_TYPES)[number];

	@ApiProperty({ example: "Woreda 03" })
	@IsString()
	@Length(2, 120)
	nameEn!: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@Length(2, 120)
	nameAm?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsUUID()
	parentId?: string;

	@ApiProperty({ required: false, default: 0 })
	@IsOptional()
	@IsInt()
	@Min(0)
	sortOrder?: number;
}

export class UpdateLocationDto extends PartialType(CreateLocationDto) {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	active?: boolean;
}
