import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { ATTACHMENT_OWNER_TYPES } from "../../domain/entities/attachment.entity";

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

export class SignPutFileDto {
	@ApiProperty({ example: "fayda-photo.jpg" })
	@IsString()
	@MaxLength(180)
	filename!: string;

	@ApiProperty({ example: "image/jpeg" })
	@IsString()
	@MaxLength(120)
	mimeType!: string;

	@ApiProperty({ example: 120000 })
	@IsInt()
	@Min(1)
	@Max(MAX_UPLOAD_BYTES)
	@Type(() => Number)
	sizeBytes!: number;

	@ApiProperty({ enum: ATTACHMENT_OWNER_TYPES, required: false })
	@IsOptional()
	@IsEnum(ATTACHMENT_OWNER_TYPES)
	ownerType?: (typeof ATTACHMENT_OWNER_TYPES)[number];

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(100)
	ownerId?: string;
}
