import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min, MinLength } from "class-validator";
import type { TicketCategory, TicketPriority, TicketStatus } from "../../domain/entities/ticket.entity";

export const TICKET_CATEGORIES = [
	"system_issue",
	"policy_question",
	"compliance_concern",
	"finance_issue",
	"training_request",
	"hr_issue",
	"other",
] as const;
export const TICKET_PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed", "escalated_higher"] as const;

export class CreateTicketDto {
	@ApiProperty({ enum: TICKET_CATEGORIES })
	@IsEnum(TICKET_CATEGORIES)
	category!: TicketCategory;

	@ApiProperty()
	@IsString()
	@MinLength(5)
	title!: string;

	@ApiProperty()
	@IsString()
	@MinLength(10)
	description!: string;

	@ApiProperty({ enum: TICKET_PRIORITIES })
	@IsEnum(TICKET_PRIORITIES)
	priority!: TicketPriority;
}

export class ListTicketsDto {
	@ApiProperty({ required: false, enum: TICKET_STATUSES })
	@IsOptional()
	@IsEnum(TICKET_STATUSES)
	status?: TicketStatus;

	@ApiProperty({ required: false, enum: TICKET_PRIORITIES })
	@IsOptional()
	@IsEnum(TICKET_PRIORITIES)
	priority?: TicketPriority;

	@ApiProperty({ required: false, enum: TICKET_CATEGORIES })
	@IsOptional()
	@IsEnum(TICKET_CATEGORIES)
	category?: TicketCategory;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	assignedToId?: string;

	@ApiProperty({ required: false })
	@IsOptional()
	@IsString()
	raisedById?: string;

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

export class AssignTicketDto {
	@ApiProperty()
	@IsString()
	assignedToId!: string;
}

export class ResolveTicketDto {
	@ApiProperty()
	@IsString()
	@MinLength(5)
	resolution!: string;
}
