import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateErrorReportDto {
	@ApiProperty({ example: "Cannot read properties of undefined" })
	@IsString()
	@MaxLength(2000)
	message: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(10000)
	stack?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(5000)
	componentStack?: string;

	@ApiProperty({ example: "http://localhost:5180/properties" })
	@IsString()
	@MaxLength(2000)
	url: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	userAgent?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	timestamp?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	@MaxLength(500)
	context?: string;
}
