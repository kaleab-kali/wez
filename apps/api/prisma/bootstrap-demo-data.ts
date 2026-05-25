import "dotenv/config";
import { Logger } from "@nestjs/common";
import { adminAuth } from "#modules/admin/auth/admin-auth.config";
import { prisma } from "#shared/database/prisma-instance";
import { EMPLOYER_SEEDS, LOOKUP_SEEDS, NOTIFICATION_TEMPLATE_SEEDS, ROLE_SEEDS, STAFF_SEEDS } from "./demo-data-seeds";
import { CURATED_WORKERS } from "./demo-worker-seeds";
import { seedLocationHierarchy } from "./seed-locations";
import { buildCoverageWorkers, type CoverageWorkerLocality, type SeedWorkerInput } from "./seed-worker-coverage";

const logger = new Logger("BootstrapDemoData");

const GLOBAL_SCOPE_TYPE = "global" as const;
const SUPER_ADMIN_ROLE = "super_admin" as const;

const requiredEnv = (key: string) => {
	const value = process.env[key]?.trim();
	if (!value) {
		throw new Error(`${key} must be set`);
	}
	return value;
};

const compactSubAreaName = (name: string) =>
	name
		.replace(/\s+(Subcity|Zone|City Administration)$/u, "")
		.replace(/\s+/g, " ")
		.trim();

const buildStationName = (locality: { readonly nameEn: string }, parentName?: string) => {
	const parent = parentName ? compactSubAreaName(parentName) : "Local";
	const localityName = locality.nameEn.replace(/\s+/g, " ").trim();
	return `${parent} ${localityName} Station`;
};

const mustGet = <T>(map: ReadonlyMap<string, T>, key: string): T => {
	const value = map.get(key);
	if (!value) {
		throw new Error(`Missing demo seed value for ${key}`);
	}
	return value;
};

const ensureAdminUser = async (seed: {
	readonly email: string;
	readonly name: string;
	readonly role: string;
	readonly password: string;
}) => {
	const existing = await prisma.adminUser.findUnique({ where: { email: seed.email }, select: { id: true } });
	if (existing) {
		await prisma.adminUser.update({
			where: { id: existing.id },
			data: { name: seed.name, role: seed.role, active: true },
		});
		return existing.id;
	}

	const { user } = await adminAuth.api.signUpEmail({
		body: { name: seed.name, email: seed.email, password: seed.password },
	});
	await prisma.adminUser.update({ where: { id: user.id }, data: { role: seed.role, active: true } });
	return user.id;
};

const ensureRoleAssignment = async (input: {
	readonly adminUserId: string;
	readonly role: string;
	readonly scopeType: string;
	readonly scopeId?: string;
	readonly assignedById?: string;
}) => {
	const existing = await prisma.staffRoleAssignment.findFirst({
		where: {
			adminUserId: input.adminUserId,
			role: input.role,
			scopeType: input.scopeType,
			scopeId: input.scopeId ?? null,
			active: true,
			revokedAt: null,
		},
		select: { id: true },
	});
	if (existing) return existing.id;

	const created = await prisma.staffRoleAssignment.create({
		data: {
			adminUserId: input.adminUserId,
			role: input.role,
			scopeType: input.scopeType,
			scopeId: input.scopeId,
			assignedById: input.assignedById,
		},
	});
	return created.id;
};

const ensureStation = async (input: {
	readonly localityId: string;
	readonly name: string;
	readonly woreda: string;
	readonly address: string;
	readonly supervisorUserId: string;
}) => {
	const existing = await prisma.station.findFirst({ where: { localityId: input.localityId }, select: { id: true } });
	if (existing) {
		return prisma.station.update({
			where: { id: existing.id },
			data: {
				active: true,
				name: input.name,
				woreda: input.woreda,
				address: input.address,
				supervisorUserId: input.supervisorUserId,
			},
		});
	}

	return prisma.station.create({
		data: {
			name: input.name,
			woreda: input.woreda,
			address: input.address,
			phone: "+251115000001",
			localityId: input.localityId,
			supervisorUserId: input.supervisorUserId,
		},
	});
};

const ensureAgentAssignment = async (agentId: string, stationId: string) => {
	const existing = await prisma.agentAssignment.findFirst({
		where: { userId: agentId, stationId },
		select: { id: true },
	});
	if (existing) {
		await prisma.agentAssignment.update({ where: { id: existing.id }, data: { active: true, removedAt: null } });
		return existing.id;
	}

	const created = await prisma.agentAssignment.create({ data: { userId: agentId, stationId } });
	return created.id;
};

const bootstrapCatalog = async () => {
	for (const role of ROLE_SEEDS) {
		await prisma.role.upsert({ where: { id: role.id }, update: { ...role, active: true }, create: role });
	}
	for (const lookup of LOOKUP_SEEDS) {
		await prisma.lookup.upsert({
			where: { kind_value: { kind: lookup.kind, value: lookup.value } },
			update: { ...lookup, archived: false },
			create: lookup,
		});
	}
	for (const template of NOTIFICATION_TEMPLATE_SEEDS) {
		await prisma.notificationTemplate.upsert({
			where: { key: template.key },
			update: { ...template, active: true },
			create: template,
		});
	}
};

const bootstrapStaff = async () => {
	const superAdminEmail = requiredEnv("SUPER_ADMIN_EMAIL").toLowerCase();
	const superAdmin = await prisma.adminUser.findUnique({ where: { email: superAdminEmail }, select: { id: true } });
	if (!superAdmin) {
		throw new Error(`Run render:bootstrap-admin before demo data; missing ${superAdminEmail}`);
	}

	const staffEntries = await Promise.all(
		STAFF_SEEDS.map(async (seed) => [seed.key, await ensureAdminUser(seed)] as const),
	);
	const staffByKey = new Map<string, string>([["superAdmin", superAdmin.id], ...staffEntries]);
	await ensureRoleAssignment({ adminUserId: superAdmin.id, role: SUPER_ADMIN_ROLE, scopeType: GLOBAL_SCOPE_TYPE });

	for (const seed of STAFF_SEEDS) {
		await ensureRoleAssignment({
			adminUserId: mustGet(staffByKey, seed.key),
			role: seed.role,
			scopeType: GLOBAL_SCOPE_TYPE,
			assignedById: superAdmin.id,
		});
	}

	await ensureRoleAssignment({
		adminUserId: mustGet(staffByKey, "hrFinance"),
		role: "finance_manager",
		scopeType: GLOBAL_SCOPE_TYPE,
		assignedById: superAdmin.id,
	});
	return staffByKey;
};

const bootstrapStations = async (staffByKey: ReadonlyMap<string, string>) => {
	const locationSeed = await seedLocationHierarchy(prisma);
	const supervisorId = mustGet(staffByKey, "supervisor");
	const agentIds = [mustGet(staffByKey, "agentBole"), mustGet(staffByKey, "agentMegenagna")] as const;
	const subAreaNameById = new Map(locationSeed.subAreas.map((subArea) => [subArea.id, subArea.nameEn]));
	const stationsByLocalityCode = new Map<string, { readonly id: string; readonly name: string }>();

	for (const [index, locality] of locationSeed.localities.entries()) {
		const parentName = locality.parentId ? subAreaNameById.get(locality.parentId) : undefined;
		const station = await ensureStation({
			localityId: locality.id,
			name: buildStationName(locality, parentName),
			woreda: locality.code,
			address: `${parentName ?? "Local area"}, ${locality.nameEn}`,
			supervisorUserId: supervisorId,
		});
		const agentId = agentIds[index % agentIds.length];
		await ensureAgentAssignment(agentId, station.id);
		await ensureRoleAssignment({
			adminUserId: agentId,
			role: "agent",
			scopeType: "station",
			scopeId: station.id,
			assignedById: supervisorId,
		});
		stationsByLocalityCode.set(locality.code, station);
	}

	for (const subArea of locationSeed.subAreas) {
		await ensureRoleAssignment({
			adminUserId: supervisorId,
			role: "station_supervisor",
			scopeType: "sub_area",
			scopeId: subArea.id,
			assignedById: mustGet(staffByKey, "opsManager"),
		});
	}

	return { locationSeed, stationsByLocalityCode };
};

const bootstrapEmployers = async (staffByKey: ReadonlyMap<string, string>) => {
	const employersByKey = new Map<string, { readonly id: string }>();
	for (const employer of EMPLOYER_SEEDS) {
		const existing = await prisma.employer.findFirst({ where: { phone: employer.phone }, select: { id: true } });
		const result =
			existing ??
			(await prisma.employer.create({
				data: {
					type: employer.type,
					name: employer.name,
					contactName: employer.contactName,
					phone: employer.phone,
					email: "email" in employer ? employer.email : undefined,
					area: employer.area,
					tin: "tin" in employer ? employer.tin : undefined,
					businessLicense: "businessLicense" in employer ? employer.businessLicense : undefined,
					businessCategory: "businessCategory" in employer ? employer.businessCategory : undefined,
					fayda: "fayda" in employer ? employer.fayda : undefined,
					registeredByAgentId: mustGet(
						staffByKey,
						employer.key === "familyRestaurant" || employer.key === "dawitHousehold" ? "agentMegenagna" : "agentBole",
					),
					businessLicenseExpiresAt: employer.type === "business" ? new Date("2028-12-31") : undefined,
					businessAddress: employer.type === "business" ? `${employer.area} area` : undefined,
				},
				select: { id: true },
			}));
		employersByKey.set(employer.key, result);
	}
	return employersByKey;
};

const buildCuratedWorkers = (
	staffByKey: ReadonlyMap<string, string>,
	stationsByLocalityCode: ReadonlyMap<string, { readonly id: string }>,
): readonly SeedWorkerInput[] =>
	CURATED_WORKERS.map((worker) => ({
		...worker,
		agentId: mustGet(staffByKey, worker.agentKey),
		stationId: mustGet(stationsByLocalityCode, worker.stationCode).id,
	}));

const bootstrapWorkers = async (input: {
	readonly staffByKey: ReadonlyMap<string, string>;
	readonly locationSeed: Awaited<ReturnType<typeof seedLocationHierarchy>>;
	readonly stationsByLocalityCode: ReadonlyMap<string, { readonly id: string }>;
}) => {
	const subAreaNameById = new Map(input.locationSeed.subAreas.map((subArea) => [subArea.id, subArea.nameEn]));
	const coverageLocalities: readonly CoverageWorkerLocality[] = input.locationSeed.localities.map(
		(locality, index) => ({
			localityCode: locality.code,
			localityName: locality.nameEn,
			parentName: locality.parentId ? (subAreaNameById.get(locality.parentId) ?? "Local area") : "Local area",
			stationId: mustGet(input.stationsByLocalityCode, locality.code).id,
			agentId: index % 2 === 0 ? mustGet(input.staffByKey, "agentBole") : mustGet(input.staffByKey, "agentMegenagna"),
		}),
	);
	const workers = [
		...buildCuratedWorkers(input.staffByKey, input.stationsByLocalityCode),
		...buildCoverageWorkers({ localities: coverageLocalities, startIndex: CURATED_WORKERS.length }),
	];
	const workerByFayda = new Map<string, { readonly id: string }>();

	for (const worker of workers) {
		const existing = await prisma.worker.findUnique({ where: { fayda: worker.fayda }, select: { id: true } });
		const created =
			existing ??
			(await prisma.worker.create({
				data: {
					fullName: worker.fullName,
					fayda: worker.fayda,
					phone: worker.phone,
					gender: worker.gender,
					area: worker.area,
					bio: worker.bio,
					languages: [...worker.languages],
					experienceYears: worker.experienceYears,
					tier: worker.tier,
					hasHealthCard: worker.hasHealthCard,
					hasPoliceClearance: worker.hasPoliceClearance,
					registeredByAgentId: worker.agentId,
					registeredAtStationId: worker.stationId,
					ratingAverage: worker.ratingAverage,
					placementsCount: worker.ratingAverage ? 2 : 0,
				},
				select: { id: true },
			}));
		for (const roleId of worker.roles) {
			await prisma.workerRole.upsert({
				where: { workerId_roleId: { workerId: created.id, roleId } },
				update: {},
				create: { workerId: created.id, roleId },
			});
		}
		workerByFayda.set(worker.fayda, created);
	}

	return workerByFayda;
};

const bootstrapJobsAndRequests = async (input: {
	readonly employersByKey: ReadonlyMap<string, { readonly id: string }>;
	readonly workerByFayda: ReadonlyMap<string, { readonly id: string }>;
	readonly stationsByLocalityCode: ReadonlyMap<string, { readonly id: string }>;
}) => {
	const jobInputs = [
		{
			key: "barista",
			employerKey: "sunriseCafe",
			roleId: "barista",
			title: "Morning barista",
			description: "Cafe barista for espresso drinks and counter service.",
			salaryMinCents: 450_000n,
			salaryMaxCents: 700_000n,
			location: "bole",
		},
		{
			key: "waiter",
			employerKey: "familyRestaurant",
			roleId: "waiter",
			title: "Restaurant waiter",
			description: "Table service for lunch and dinner shifts.",
			salaryMinCents: 350_000n,
			salaryMaxCents: 650_000n,
			location: "megenagna",
		},
		{
			key: "nanny",
			employerKey: "asterHousehold",
			roleId: "nanny",
			title: "Household nanny",
			description: "Childcare support for a family in Kazanchis.",
			salaryMinCents: 300_000n,
			salaryMaxCents: 650_000n,
			location: "kazanchis",
		},
	] as const;
	const jobsByKey = new Map<string, { readonly id: string }>();

	for (const job of jobInputs) {
		const employerId = mustGet(input.employersByKey, job.employerKey).id;
		const existing = await prisma.job.findFirst({ where: { employerId, title: job.title }, select: { id: true } });
		const result =
			existing ??
			(await prisma.job.create({
				data: {
					employerId,
					roleId: job.roleId,
					title: job.title,
					description: job.description,
					salaryMinCents: job.salaryMinCents,
					salaryMaxCents: job.salaryMaxCents,
					location: job.location,
				},
				select: { id: true },
			}));
		jobsByKey.set(job.key, result);
	}

	const expiresAt = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
	const requests = [
		{
			employerKey: "sunriseCafe",
			workerFayda: "F-9012-3456-QR",
			roleId: "barista",
			jobKey: "barista",
			stationCode: "aa-yeka-w08",
			proposedSalaryCents: 600_000n,
		},
		{
			employerKey: "familyRestaurant",
			workerFayda: "F-4567-8901-GH",
			roleId: "guard",
			jobKey: "waiter",
			stationCode: "aa-yeka-w08",
			proposedSalaryCents: 500_000n,
		},
		{
			employerKey: "asterHousehold",
			workerFayda: "F-5678-9012-IJ",
			roleId: "nanny",
			jobKey: "nanny",
			stationCode: "aa-bole-w03",
			proposedSalaryCents: 550_000n,
		},
	] as const;

	for (const request of requests) {
		const employerId = mustGet(input.employersByKey, request.employerKey).id;
		const workerId = mustGet(input.workerByFayda, request.workerFayda).id;
		const jobId = mustGet(jobsByKey, request.jobKey).id;
		const existing = await prisma.hireRequest.findFirst({
			where: { employerId, workerId, roleId: request.roleId, jobId },
			select: { id: true },
		});
		if (!existing) {
			await prisma.hireRequest.create({
				data: {
					employerId,
					workerId,
					roleId: request.roleId,
					jobId,
					proposedSalaryCents: request.proposedSalaryCents,
					stationId: mustGet(input.stationsByLocalityCode, request.stationCode).id,
					status: "awaiting_visit",
					channel: "in_person",
					note: "Demo hire request created by safe Render bootstrap.",
					expiresAt,
				},
			});
		}
	}
};

const bootstrapDemoData = async () => {
	await bootstrapCatalog();
	const staffByKey = await bootstrapStaff();
	const { locationSeed, stationsByLocalityCode } = await bootstrapStations(staffByKey);
	const employersByKey = await bootstrapEmployers(staffByKey);
	const workerByFayda = await bootstrapWorkers({ staffByKey, locationSeed, stationsByLocalityCode });
	await bootstrapJobsAndRequests({ employersByKey, workerByFayda, stationsByLocalityCode });

	logger.log(
		`Demo data ready: roles=${ROLE_SEEDS.length}; locations=${locationSeed.localities.length}; workers=${workerByFayda.size}`,
	);
};

bootstrapDemoData()
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		logger.error(`Demo data bootstrap failed: ${message}`);
		process.exitCode = 1;
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
