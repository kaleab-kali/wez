import "dotenv/config";
import { randomUUID } from "node:crypto";
import { Logger } from "@nestjs/common";
import { hashPassword } from "better-auth/crypto";
import { adminAuth } from "../src/modules/admin/auth/admin-auth.config";
import { prisma } from "../src/shared/database/prisma-instance";

const logger = new Logger("BootstrapAdmin");

const SUPER_ADMIN_ROLE = "super_admin" as const;
const GLOBAL_SCOPE_TYPE = "global" as const;
const CREDENTIAL_PROVIDER_ID = "credential" as const;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

const getRequiredEnv = (key: string) => {
	const value = process.env[key]?.trim();
	if (!value) {
		throw new Error(`${key} must be set`);
	}
	return value;
};

const getSuperAdminConfig = () => {
	const email = getRequiredEnv("SUPER_ADMIN_EMAIL").toLowerCase();
	const password = getRequiredEnv("SUPER_ADMIN_PASSWORD");
	const name = process.env.SUPER_ADMIN_NAME?.trim() || "Wez Demo Admin";

	if (password.length < MIN_ADMIN_PASSWORD_LENGTH) {
		throw new Error(`SUPER_ADMIN_PASSWORD must be at least ${MIN_ADMIN_PASSWORD_LENGTH} characters`);
	}

	return { email, password, name };
};

const findOrCreateSuperAdmin = async (config: ReturnType<typeof getSuperAdminConfig>) => {
	const existingAdmin = await prisma.adminUser.findUnique({
		where: { email: config.email },
		select: { id: true },
	});

	if (existingAdmin) {
		await prisma.adminUser.update({
			where: { id: existingAdmin.id },
			data: {
				name: config.name,
				role: SUPER_ADMIN_ROLE,
				active: true,
			},
		});
		return { adminUserId: existingAdmin.id, userCreated: false };
	}

	const { user } = await adminAuth.api.signUpEmail({
		body: {
			name: config.name,
			email: config.email,
			password: config.password,
		},
	});

	await prisma.adminUser.update({
		where: { id: user.id },
		data: {
			role: SUPER_ADMIN_ROLE,
			active: true,
		},
	});

	return { adminUserId: user.id, userCreated: true };
};

const ensureCredentialPassword = async (adminUserId: string, password: string) => {
	const passwordHash = await hashPassword(password);
	const updatedAccounts = await prisma.adminAccount.updateMany({
		where: {
			userId: adminUserId,
			providerId: CREDENTIAL_PROVIDER_ID,
		},
		data: {
			accountId: adminUserId,
			password: passwordHash,
		},
	});

	if (updatedAccounts.count > 0) {
		return "updated" as const;
	}

	await prisma.adminAccount.create({
		data: {
			id: randomUUID(),
			accountId: adminUserId,
			providerId: CREDENTIAL_PROVIDER_ID,
			userId: adminUserId,
			password: passwordHash,
		},
	});

	return "created" as const;
};

const ensureSuperAdminAssignment = async (adminUserId: string) => {
	const existingAssignment = await prisma.staffRoleAssignment.findFirst({
		where: {
			adminUserId,
			role: SUPER_ADMIN_ROLE,
			scopeType: GLOBAL_SCOPE_TYPE,
			scopeId: null,
			active: true,
			revokedAt: null,
		},
		select: { id: true },
	});

	if (existingAssignment) {
		return "present" as const;
	}

	await prisma.staffRoleAssignment.create({
		data: {
			adminUserId,
			role: SUPER_ADMIN_ROLE,
			scopeType: GLOBAL_SCOPE_TYPE,
		},
	});

	return "created" as const;
};

const bootstrapAdmin = async () => {
	const config = getSuperAdminConfig();
	const admin = await findOrCreateSuperAdmin(config);
	const credentialStatus = await ensureCredentialPassword(admin.adminUserId, config.password);
	const assignmentStatus = await ensureSuperAdminAssignment(admin.adminUserId);

	logger.log(
		`Super admin ready: ${config.email}; user=${admin.userCreated ? "created" : "updated"}; credential=${credentialStatus}; roleAssignment=${assignmentStatus}`,
	);
};

bootstrapAdmin()
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Bootstrap failed: ${message}`);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
