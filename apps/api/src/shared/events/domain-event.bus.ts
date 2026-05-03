import { Global, Injectable, Module } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

export interface DomainEvent {
	eventName: string;
	organizationId: string;
	occurredAt: Date;
	payload: Record<string, unknown>;
}

type DomainEventInput = Omit<DomainEvent, "occurredAt"> & { occurredAt?: Date };

@Injectable()
export class DomainEventBus {
	constructor(private readonly eventEmitter: EventEmitter2) {}

	emit(event: DomainEventInput): void {
		const fullEvent: DomainEvent = { ...event, occurredAt: event.occurredAt || new Date() };
		this.eventEmitter.emit(fullEvent.eventName, fullEvent);
	}
}

@Global()
@Module({
	providers: [DomainEventBus],
	exports: [DomainEventBus],
})
export class DomainEventBusModule {}
