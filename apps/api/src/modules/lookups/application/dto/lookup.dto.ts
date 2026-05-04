import { ApiProperty, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsInt, IsOptional, IsString, Length, Matches, Min } from "class-validator";

export class CreateLookupDto {
	@ApiProperty({ example: "languages" })
	@IsString()
	@Matches(/^[a-z][a-z0-9_]{1,49}$/, { message: "kind must be lower_snake_case" })
	kind!: string;

	@ApiProperty({ example: "am" })
	@IsString()
	@Length(1, 50)
	value!: string;

	@ApiProperty({ example: "Amharic" })
	@IsString()
	@Length(1, 100)
	labelEn!: string;

	@ApiProperty({ example: "አማርኛ", required: false })
	@IsOptional()
	@IsString()
	@Length(0, 100)
	labelAm?: string;

	@ApiProperty({ example: 0, required: false })
	@IsOptional()
	@IsInt()
	@Min(0)
	@Type(() => Number)
	sortOrder?: number;
}

export class UpdateLookupDto extends PartialType(CreateLookupDto) {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	archived?: boolean;
}
