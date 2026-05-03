import { Injectable, Logger } from "@nestjs/common";
import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";

@WebSocketGateway({ namespace: "notifications", cors: { origin: true, credentials: true } })
@Injectable()
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
	@WebSocketServer() server!: Server;
	private readonly logger = new Logger(NotificationGateway.name);

	handleConnection(client: Socket) {
		const userId = (client.handshake.auth?.userId as string) || (client.handshake.query.userId as string);
		if (userId) {
			client.join(`user:${userId}`);
			this.logger.log(`socket ${client.id} joined user:${userId}`);
		}
	}

	handleDisconnect(client: Socket) {
		this.logger.log(`socket ${client.id} disconnected`);
	}

	emitToUser(userId: string, payload: unknown) {
		if (!this.server) return;
		this.server.to(`user:${userId}`).emit("notification", payload);
	}

	emitBadgeCount(userId: string, unread: number) {
		if (!this.server) return;
		this.server.to(`user:${userId}`).emit("badge", { unread });
	}
}
