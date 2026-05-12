import { Injectable, Logger } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { getSession, type WezSession } from "#shared/auth/session";

export type NotificationPrincipalKind = WezSession["kind"];

const notificationRoom = (kind: NotificationPrincipalKind, userId: string) => `${kind}:${userId}`;

@WebSocketGateway({ namespace: "notifications", cors: { origin: true, credentials: true } })
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server!: Server;
	private readonly logger = new Logger(NotificationGateway.name);

	async handleConnection(client: Socket) {
		const session = await getSession({ headers: client.handshake.headers });
		if (!session) {
			this.logger.warn(`socket ${client.id} disconnected: missing authenticated session`);
			client.disconnect(true);
			return;
		}
		const room = notificationRoom(session.kind, session.user.id);
		client.join(room);
		this.logger.log(`socket ${client.id} joined ${room}`);
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`socket ${client.id} disconnected`);
	}

	emitToPrincipal(kind: NotificationPrincipalKind, userId: string, payload: unknown) {
		if (!this.server) return;
		this.server.to(notificationRoom(kind, userId)).emit("notification", payload);
	}

	emitBadgeCount(kind: NotificationPrincipalKind, userId: string, unread: number) {
		if (!this.server) return;
		this.server.to(notificationRoom(kind, userId)).emit("badge", { unread });
	}
}
