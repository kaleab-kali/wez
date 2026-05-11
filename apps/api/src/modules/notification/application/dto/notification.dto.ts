import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import { NOTIFICATION_CHANNELS } from "../../domain/entities/notification.entity";

export class ListNotificationsDto {
	@ApiProperty({ required: false })
	@IsOptional()
	@IsBoolean()
	@Transform(({ value }) => value === true || value === "true")
	unreadOnly?: boolean;

	@ApiProperty({ required: false, default: 20 })
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	@Transform(({ value }) => Number(value))
	limit?: number;
}

export class UpdateNotificationPreferenceDto {
	@ApiProperty({ example: "general" })
	@IsString()
	category!: string;

	@ApiProperty({ enum: NOTIFICATION_CHANNELS })
	@IsEnum(NOTIFICATION_CHANNELS)
	channel!: (typeof NOTIFICATION_CHANNELS)[number];

	@ApiProperty({ example: true })
	@IsBoolean()
	enabled!: boolean;
}
