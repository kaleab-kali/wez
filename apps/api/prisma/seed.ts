import "dotenv/config";
import { adminAuth } from "../src/modules/admin/auth/admin-auth.config";
import { prisma } from "../src/shared/database/prisma-instance";

const seed = async () => {
	const adminEmail = process.env.SUPER_ADMIN_EMAIL;
	const adminPassword = process.env.SUPER_ADMIN_PASSWORD;
	const adminName = process.env.SUPER_ADMIN_NAME || "Platform Admin";

	if (!adminEmail || !adminPassword) {
		console.error("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must be set in .env");
		process.exit(1);
	}

	const opsManagerEmail = "ops@wez.local";
	const opsManagerPassword = "OpsManagerPass#1!";

	const supervisorEmail = "supervisor@wez.local";
	const supervisorPassword = "SupervisorPass#1!";

	const agentBoleEmail = "agent.bole@wez.local";
	const agentBolePassword = "AgentBolePass#1!";
	const agentMegenagnaEmail = "agent.megenagna@wez.local";
	const agentMegenagnaPassword = "AgentMegaPass#1!";

	console.log("Seeding Wez baseline...");

	console.log("Clearing existing data...");
	// Order matters for FK constraints
	await prisma.workerInterest.deleteMany();
	await prisma.referral.deleteMany();
	await prisma.placement.deleteMany();
	await prisma.hireRequest.deleteMany();
	await prisma.complaint.deleteMany();
	await prisma.ticket.deleteMany();
	await prisma.courseEnrollment.deleteMany();
	await prisma.courseBatch.deleteMany();
	await prisma.course.deleteMany();
	await prisma.instructor.deleteMany();
	await prisma.workerRole.deleteMany();
	await prisma.job.deleteMany();
	await prisma.worker.deleteMany();
	await prisma.employer.deleteMany();
	await prisma.role.deleteMany();
	await prisma.agentAssignment.deleteMany();
	await prisma.station.deleteMany();
	await prisma.lookup.deleteMany();
	await prisma.notification.deleteMany();
	await prisma.notificationPreference.deleteMany();
	await prisma.notificationTemplate.deleteMany();
	await prisma.attachment.deleteMany();
	await prisma.governmentReport.deleteMany();
	await prisma.auditEvent.deleteMany();
	await prisma.adminSession.deleteMany();
	await prisma.adminAccount.deleteMany();
	await prisma.adminVerification.deleteMany();
	await prisma.adminUser.deleteMany();
	await prisma.session.deleteMany();
	await prisma.account.deleteMany();
	await prisma.verification.deleteMany();
	await prisma.user.deleteMany();
	console.log("  cleared");

	console.log(`Creating super admin: ${adminEmail}`);
	const { user: superAdmin } = await adminAuth.api.signUpEmail({
		body: { name: adminName, email: adminEmail, password: adminPassword },
	});
	await prisma.adminUser.update({
		where: { id: superAdmin.id },
		data: { role: "super_admin" },
	});
	console.log(`  super admin id: ${superAdmin.id}`);

	console.log(`Creating ops manager: ${opsManagerEmail}`);
	const { user: opsManager } = await adminAuth.api.signUpEmail({
		body: { name: "Ops Manager", email: opsManagerEmail, password: opsManagerPassword },
	});
	await prisma.adminUser.update({
		where: { id: opsManager.id },
		data: { role: "ops_manager" },
	});

	console.log(`Creating supervisor: ${supervisorEmail}`);
	const { user: supervisor } = await adminAuth.api.signUpEmail({
		body: { name: "Bole Station Supervisor", email: supervisorEmail, password: supervisorPassword },
	});
	await prisma.adminUser.update({
		where: { id: supervisor.id },
		data: { role: "station_supervisor" },
	});

	console.log(`Creating agent (Bole): ${agentBoleEmail}`);
	const { user: agentBole } = await adminAuth.api.signUpEmail({
		body: { name: "Hanna B.", email: agentBoleEmail, password: agentBolePassword },
	});
	await prisma.adminUser.update({
		where: { id: agentBole.id },
		data: { role: "agent" },
	});

	console.log(`Creating agent (Megenagna): ${agentMegenagnaEmail}`);
	const { user: agentMegenagna } = await adminAuth.api.signUpEmail({
		body: { name: "Dawit M.", email: agentMegenagnaEmail, password: agentMegenagnaPassword },
	});
	await prisma.adminUser.update({
		where: { id: agentMegenagna.id },
		data: { role: "agent" },
	});

	console.log("Creating stations...");
	const stationBole = await prisma.station.create({
		data: {
			name: "Bole Station",
			woreda: "bole",
			address: "Bole Subcity, Woreda 03, Addis Ababa",
			phone: "+251115000001",
			supervisorUserId: supervisor.id,
		},
	});
	const stationMegenagna = await prisma.station.create({
		data: {
			name: "Megenagna Station",
			woreda: "megenagna",
			address: "Megenagna, Addis Ababa",
			phone: "+251115000002",
			supervisorUserId: supervisor.id,
		},
	});
	console.log(`  ${stationBole.id} (Bole), ${stationMegenagna.id} (Megenagna)`);

	console.log("Assigning agents...");
	await prisma.agentAssignment.create({
		data: { userId: agentBole.id, stationId: stationBole.id },
	});
	await prisma.agentAssignment.create({
		data: { userId: agentMegenagna.id, stationId: stationMegenagna.id },
	});

	console.log("Seeding starter roles catalog...");
	const roles = [
		{
			id: "house_maid",
			name: "House Maid",
			category: "domestic",
			commType: "flat",
			commValue: 1500,
			salaryMinCents: 200_000n,
			salaryMaxCents: 600_000n,
		},
		{
			id: "nanny",
			name: "Nanny",
			category: "domestic",
			commType: "flat",
			commValue: 2000,
			salaryMinCents: 250_000n,
			salaryMaxCents: 700_000n,
		},
		{
			id: "cook",
			name: "Cook",
			category: "domestic",
			commType: "flat",
			commValue: 1800,
			salaryMinCents: 300_000n,
			salaryMaxCents: 800_000n,
		},
		{
			id: "barista",
			name: "Barista",
			category: "hospitality",
			commType: "percent",
			commValue: 10,
			salaryMinCents: 350_000n,
			salaryMaxCents: 900_000n,
		},
		{
			id: "waiter",
			name: "Waiter / Waitress",
			category: "hospitality",
			commType: "percent",
			commValue: 10,
			salaryMinCents: 300_000n,
			salaryMaxCents: 800_000n,
		},
		{
			id: "cleaner",
			name: "Cleaner",
			category: "facilities",
			commType: "flat",
			commValue: 1200,
			salaryMinCents: 200_000n,
			salaryMaxCents: 500_000n,
		},
		{
			id: "guard",
			name: "Security Guard",
			category: "facilities",
			commType: "flat",
			commValue: 1500,
			salaryMinCents: 300_000n,
			salaryMaxCents: 700_000n,
		},
		{
			id: "driver",
			name: "Driver",
			category: "transport",
			commType: "percent",
			commValue: 8,
			salaryMinCents: 500_000n,
			salaryMaxCents: 1_500_000n,
		},
	];
	for (const r of roles) {
		await prisma.role.create({ data: r });
	}
	console.log(`  ${roles.length} roles`);

	console.log("Seeding lookups...");
	const lookups: Array<{
		kind: string;
		value: string;
		labelEn: string;
		labelAm: string;
		sortOrder: number;
	}> = [
		// languages
		{ kind: "languages", value: "am", labelEn: "Amharic", labelAm: "አማርኛ", sortOrder: 1 },
		{ kind: "languages", value: "en", labelEn: "English", labelAm: "እንግሊዝኛ", sortOrder: 2 },
		{ kind: "languages", value: "om", labelEn: "Oromiffa", labelAm: "ኦሮምኛ", sortOrder: 3 },
		{ kind: "languages", value: "ti", labelEn: "Tigrinya", labelAm: "ትግርኛ", sortOrder: 4 },
		{ kind: "languages", value: "ar", labelEn: "Arabic", labelAm: "ዓረብኛ", sortOrder: 5 },
		// woredas (Addis Ababa subset)
		{ kind: "woredas", value: "bole", labelEn: "Bole", labelAm: "ቦሌ", sortOrder: 1 },
		{ kind: "woredas", value: "megenagna", labelEn: "Megenagna", labelAm: "መገናኛ", sortOrder: 2 },
		{ kind: "woredas", value: "kazanchis", labelEn: "Kazanchis", labelAm: "ካዛንቺስ", sortOrder: 3 },
		{ kind: "woredas", value: "mexico", labelEn: "Mexico", labelAm: "ሜክሲኮ", sortOrder: 4 },
		{ kind: "woredas", value: "summit", labelEn: "Summit", labelAm: "ሰሚት", sortOrder: 5 },
		{ kind: "woredas", value: "kirkos", labelEn: "Kirkos", labelAm: "ቂርቆስ", sortOrder: 6 },
		{ kind: "woredas", value: "lideta", labelEn: "Lideta", labelAm: "ልደታ", sortOrder: 7 },
		{ kind: "woredas", value: "addis_ketema", labelEn: "Addis Ketema", labelAm: "አዲስ ከተማ", sortOrder: 8 },
		{ kind: "woredas", value: "gulele", labelEn: "Gulele", labelAm: "ጉለሌ", sortOrder: 9 },
		{ kind: "woredas", value: "yeka", labelEn: "Yeka", labelAm: "የካ", sortOrder: 10 },
		{ kind: "woredas", value: "akaki_kaliti", labelEn: "Akaki Kaliti", labelAm: "አቃቂ ቃሊቲ", sortOrder: 11 },
		{ kind: "woredas", value: "kolfe_keranio", labelEn: "Kolfe Keranio", labelAm: "ኮልፌ ቀራኒዮ", sortOrder: 12 },
		// religions (opt-in)
		{ kind: "religions", value: "orthodox", labelEn: "Orthodox", labelAm: "ኦርቶዶክስ", sortOrder: 1 },
		{ kind: "religions", value: "muslim", labelEn: "Muslim", labelAm: "ሙስሊም", sortOrder: 2 },
		{ kind: "religions", value: "protestant", labelEn: "Protestant", labelAm: "ፕሮቴስታንት", sortOrder: 3 },
		{ kind: "religions", value: "catholic", labelEn: "Catholic", labelAm: "ካቶሊክ", sortOrder: 4 },
		{ kind: "religions", value: "prefer_not_to_say", labelEn: "Prefer not to say", labelAm: "ላልመረጡ", sortOrder: 99 },
	];
	for (const l of lookups) {
		await prisma.lookup.create({ data: l });
	}
	console.log(`  ${lookups.length} lookups`);

	console.log("Seeding sample employers...");
	const employers = await Promise.all([
		prisma.employer.create({
			data: {
				type: "business",
				name: "Bole Sunrise Cafe",
				contactName: "Mekdes Alemu",
				phone: "+251911101001",
				email: "owner@bolesunrise.local",
				area: "bole",
				tin: "TIN-100001",
				businessLicense: "BL-BOLE-1001",
				registeredByAgentId: agentBole.id,
			},
		}),
		prisma.employer.create({
			data: {
				type: "business",
				name: "Megenagna Family Restaurant",
				contactName: "Samuel Bekele",
				phone: "+251911101002",
				email: "samuel@megenagnarest.local",
				area: "megenagna",
				tin: "TIN-100002",
				businessLicense: "BL-MEG-1002",
				registeredByAgentId: agentMegenagna.id,
			},
		}),
		prisma.employer.create({
			data: {
				type: "household",
				name: "Aster Household",
				contactName: "Aster Tesfaye",
				phone: "+251911101003",
				area: "kazanchis",
				fayda: "F-7001-1001-AA",
				registeredByAgentId: agentBole.id,
			},
		}),
		prisma.employer.create({
			data: {
				type: "household",
				name: "Dawit Household",
				contactName: "Dawit Kebede",
				phone: "+251911101004",
				area: "yeka",
				fayda: "F-7001-1002-BB",
				registeredByAgentId: agentMegenagna.id,
			},
		}),
	]);
	console.log(`  ${employers.length} employers`);

	console.log("Seeding sample workers...");
	const sampleWorkers = [
		{
			fullName: "Yonas Alemu",
			fayda: "F-2345-6789-CD",
			phone: "+251911223300",
			gender: "M",
			area: "bole",
			languages: ["am", "en"],
			experienceYears: 5,
			hasHealthCard: false,
			hasPoliceClearance: true,
			roles: ["driver"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Experienced driver, knows Addis well.",
			tier: "verified",
			ratingAverage: 4.6,
		},
		{
			fullName: "Marta Tadesse",
			fayda: "F-3456-7890-EF",
			phone: "+251911334411",
			gender: "F",
			area: "bole",
			languages: ["am"],
			experienceYears: 3,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["house_maid"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Reliable household support with recent references.",
			tier: "basic",
			ratingAverage: 4.2,
		},
		{
			fullName: "Dawit Mekonnen",
			fayda: "F-4567-8901-GH",
			phone: "+251911445522",
			gender: "M",
			area: "megenagna",
			languages: ["am", "om"],
			experienceYears: 7,
			hasHealthCard: false,
			hasPoliceClearance: true,
			roles: ["guard"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Night shift guard, ex-military.",
			tier: "verified",
			ratingAverage: 4.7,
		},
		{
			fullName: "Hanna Lemma",
			fayda: "F-5678-9012-IJ",
			phone: "+251911556633",
			gender: "F",
			area: "bole",
			languages: ["am", "en"],
			experienceYears: 4,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["nanny"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Warm with children, references available.",
			tier: "basic",
			ratingAverage: 4.4,
		},
		{
			fullName: "Tariku Bekele",
			fayda: "F-6789-0123-KL",
			phone: "+251911667744",
			gender: "M",
			area: "megenagna",
			languages: ["am", "en"],
			experienceYears: 2,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["waiter"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Fast learner for hospitality shifts.",
			tier: "basic",
			ratingAverage: 4.0,
		},
		{
			fullName: "Bethel Girma",
			fayda: "F-7890-1234-MN",
			phone: "+251911778855",
			gender: "F",
			area: "bole",
			languages: ["am", "ti"],
			experienceYears: 6,
			hasHealthCard: true,
			hasPoliceClearance: true,
			roles: ["cook"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Cooks Ethiopian and Italian meals.",
			tier: "trusted",
			ratingAverage: 4.9,
		},
		{
			fullName: "Solomon Worku",
			fayda: "F-8901-2345-OP",
			phone: "+251911889966",
			gender: "M",
			area: "kazanchis",
			languages: ["am"],
			experienceYears: 1,
			hasHealthCard: false,
			hasPoliceClearance: false,
			roles: ["cleaner"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Available for offices and compounds.",
			tier: "basic",
			ratingAverage: null,
		},
		{
			fullName: "Selam Desta",
			fayda: "F-9012-3456-QR",
			phone: "+251911990077",
			gender: "F",
			area: "megenagna",
			languages: ["am", "en"],
			experienceYears: 3,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["barista"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Latte art, espresso machine certified.",
			tier: "trained",
			ratingAverage: 4.5,
		},
		{
			fullName: "Henok Fikru",
			fayda: "F-0123-4567-ST",
			phone: "+251912001188",
			gender: "M",
			area: "mexico",
			languages: ["am", "ar"],
			experienceYears: 8,
			hasHealthCard: false,
			hasPoliceClearance: true,
			roles: ["driver"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Long-haul and delivery experience.",
			tier: "verified",
			ratingAverage: 4.3,
		},
		{
			fullName: "Tigist Kebede",
			fayda: "F-1230-4560-UV",
			phone: "+251912112299",
			gender: "F",
			area: "megenagna",
			languages: ["am"],
			experienceYears: 2,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["house_maid", "cleaner"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Flexible household and cleaning work.",
			tier: "basic",
			ratingAverage: 4.1,
		},
		{
			fullName: "Mekonnen Zeleke",
			fayda: "F-2340-5670-WX",
			phone: "+251912223300",
			gender: "M",
			area: "megenagna",
			languages: ["am", "ti"],
			experienceYears: 10,
			hasHealthCard: false,
			hasPoliceClearance: true,
			roles: ["guard"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Senior guard, day and night shifts.",
			tier: "trusted",
			ratingAverage: 4.8,
		},
		{
			fullName: "Rahel Assefa",
			fayda: "F-3450-6780-YZ",
			phone: "+251912334411",
			gender: "F",
			area: "summit",
			languages: ["am", "en"],
			experienceYears: 5,
			hasHealthCard: true,
			hasPoliceClearance: true,
			roles: ["cook", "nanny"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Experienced family cook and childcare helper.",
			tier: "trained",
			ratingAverage: 4.6,
		},
		{
			fullName: "Abel Seyoum",
			fayda: "F-4560-7890-AB",
			phone: "+251912445522",
			gender: "M",
			area: "megenagna",
			languages: ["am", "en", "om"],
			experienceYears: 3,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["waiter", "barista"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Hospitality graduate.",
			tier: "trained",
			ratingAverage: 4.4,
		},
		{
			fullName: "Genet Tola",
			fayda: "F-5670-8900-CD",
			phone: "+251912556633",
			gender: "F",
			area: "kirkos",
			languages: ["am"],
			experienceYears: 4,
			hasHealthCard: false,
			hasPoliceClearance: false,
			roles: ["cleaner"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Office and post-construction cleaning.",
			tier: "basic",
			ratingAverage: 4.0,
		},
		{
			fullName: "Mulugeta Berhanu",
			fayda: "F-6780-9010-EF",
			phone: "+251912667744",
			gender: "M",
			area: "bole",
			languages: ["am", "en"],
			experienceYears: 2,
			hasHealthCard: true,
			hasPoliceClearance: false,
			roles: ["barista", "waiter"],
			agentId: agentBole.id,
			stationId: stationBole.id,
			bio: "Cafe and restaurant floor work.",
			tier: "basic",
			ratingAverage: 4.2,
		},
		{
			fullName: "Helen Wondimu",
			fayda: "F-8900-1230-IJ",
			phone: "+251912889966",
			gender: "F",
			area: "megenagna",
			languages: ["am", "en"],
			experienceYears: 7,
			hasHealthCard: true,
			hasPoliceClearance: true,
			roles: ["nanny"],
			agentId: agentMegenagna.id,
			stationId: stationMegenagna.id,
			bio: "Strong references for childcare.",
			tier: "trusted",
			ratingAverage: 4.9,
		},
	] as const;

	const seededWorkers = [];
	for (const worker of sampleWorkers) {
		const created = await prisma.worker.create({
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
				workerRoles: { create: worker.roles.map((roleId) => ({ roleId })) },
			},
		});
		seededWorkers.push(created);
	}
	console.log(`  ${seededWorkers.length} workers`);

	console.log("Seeding sample jobs and hire requests...");
	const jobs = await Promise.all([
		prisma.job.create({
			data: {
				employerId: employers[0].id,
				roleId: "barista",
				title: "Morning barista",
				description: "Cafe barista for espresso drinks and counter service.",
				salaryMinCents: 450_000n,
				salaryMaxCents: 700_000n,
				location: "bole",
			},
		}),
		prisma.job.create({
			data: {
				employerId: employers[1].id,
				roleId: "waiter",
				title: "Restaurant waiter",
				description: "Table service for lunch and dinner shifts.",
				salaryMinCents: 350_000n,
				salaryMaxCents: 650_000n,
				location: "megenagna",
			},
		}),
		prisma.job.create({
			data: {
				employerId: employers[2].id,
				roleId: "nanny",
				title: "Household nanny",
				description: "Childcare support for a family in Kazanchis.",
				salaryMinCents: 300_000n,
				salaryMaxCents: 650_000n,
				location: "kazanchis",
			},
		}),
	]);

	await Promise.all([
		prisma.hireRequest.create({
			data: {
				employerId: employers[0].id,
				workerId: seededWorkers[7].id,
				roleId: "barista",
				jobId: jobs[0].id,
				proposedSalaryCents: 600_000n,
				stationId: stationMegenagna.id,
				status: "awaiting_visit",
				channel: "in_person",
				note: "Employer requested a trained barista for morning shift.",
				expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
			},
		}),
		prisma.hireRequest.create({
			data: {
				employerId: employers[1].id,
				workerId: seededWorkers[12].id,
				roleId: "waiter",
				jobId: jobs[1].id,
				proposedSalaryCents: 500_000n,
				stationId: stationMegenagna.id,
				status: "awaiting_visit",
				channel: "in_person",
				note: "Agent-created request after employer station visit.",
				expiresAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
			},
		}),
		prisma.hireRequest.create({
			data: {
				employerId: employers[2].id,
				workerId: seededWorkers[3].id,
				roleId: "nanny",
				jobId: jobs[2].id,
				proposedSalaryCents: 550_000n,
				stationId: stationBole.id,
				status: "cancelled",
				channel: "online",
				note: "Household changed timing after request.",
				expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
				cancelledAt: new Date(),
				cancellationReason: "Employer postponed start date.",
			},
		}),
	]);
	console.log(`  ${jobs.length} jobs, 3 hire requests`);

	console.log("Seeding notification templates...");
	const templates = [
		{
			key: "auth.otp",
			channel: "sms",
			bodyEn: "Your Wez code: {{code}}. Valid 5 minutes.",
			bodyAm: "የዌዝ ኮድዎ: {{code}}። ለ5 ደቂቃ ያገለግላል።",
		},
		{
			key: "hire_request.created.worker",
			channel: "sms",
			bodyEn:
				"{{employerName}} requested to hire you for {{roleName}} at {{salaryBirr}} ETB. Visit your station to confirm.",
			bodyAm: "{{employerName}} ለ{{role}} ስራ በ{{salary}} ብር ሊቀጥሮት ጠይቋል። ለማረጋገጥ ጣቢያዎን ይጎብኙ።",
		},
		{
			key: "hire_request.created.employer",
			channel: "email",
			subjectEn: "Wez hire request received",
			subjectAm: "Wez hire request received",
			bodyEn: "Your hire request for {{workerName}} as {{roleName}} at {{salaryBirr}} ETB was received.",
			bodyAm: "Your hire request for {{workerName}} as {{roleName}} at {{salaryBirr}} ETB was received.",
		},
		{
			key: "hire_request.created.station_agent",
			channel: "in_app",
			bodyEn: "{{employerName}} requested {{workerName}} for {{roleName}} at {{salaryBirr}} ETB.",
			bodyAm: "{{employerName}} requested {{workerName}} for {{roleName}} at {{salaryBirr}} ETB.",
		},
		{
			key: "hire_request.cancelled.worker",
			channel: "sms",
			bodyEn: "Hire request {{hireRequestId}} was cancelled. Reason: {{reason}}.",
			bodyAm: "Hire request {{hireRequestId}} was cancelled. Reason: {{reason}}.",
		},
		{
			key: "hire_request.cancelled.employer",
			channel: "in_app",
			bodyEn: "Hire request {{hireRequestId}} was cancelled. Reason: {{reason}}.",
			bodyAm: "Hire request {{hireRequestId}} was cancelled. Reason: {{reason}}.",
		},
		{
			key: "hire_request.expired.worker",
			channel: "sms",
			bodyEn: "Hire request {{hireRequestId}} expired. Contact your station for new opportunities.",
			bodyAm: "Hire request {{hireRequestId}} expired. Contact your station for new opportunities.",
		},
		{
			key: "hire_request.expired.employer",
			channel: "sms",
			bodyEn: "Hire request {{hireRequestId}} expired. You can create a new request from Wez.",
			bodyAm: "Hire request {{hireRequestId}} expired. You can create a new request from Wez.",
		},
		{
			key: "referral.created.employer",
			channel: "in_app",
			bodyEn: "Wez referred {{workerName}} for your review.",
			bodyAm: "Wez referred {{workerName}} for your review.",
		},
		{
			key: "placement.finalized.worker",
			channel: "sms",
			bodyEn: "Placement confirmed at {{employerName}}. Salary {{salary}} ETB. Welcome.",
			bodyAm: "ምደባዎ ተረጋግጧል በ{{employerName}}። ደመወዝ {{salary}} ብር። እንኳን ደህና መጡ።",
		},
	];
	for (const t of templates) {
		await prisma.notificationTemplate.create({ data: t });
	}
	console.log(`  ${templates.length} templates`);

	console.log("\n=== Seed Complete ===");
	console.log("");
	console.log("STAFF LOGIN (Wez employees) — http://localhost:5180/staff-login");
	console.log(`  super_admin:        ${adminEmail} / ${adminPassword}`);
	console.log(`  ops_manager:        ${opsManagerEmail} / ${opsManagerPassword}`);
	console.log(`  station_supervisor: ${supervisorEmail} / ${supervisorPassword}`);
	console.log(`  agent (Bole):       ${agentBoleEmail} / ${agentBolePassword}`);
	console.log(`  agent (Megenagna):  ${agentMegenagnaEmail} / ${agentMegenagnaPassword}`);
	console.log("");
	console.log("CUSTOMER APP — http://localhost:5180/login (workers via phone, employers via email)");
	console.log("  No customers seeded — sign up or have an agent register one.");
	console.log("");
	console.log("====================\n");
};

seed()
	.catch((e) => {
		console.error("Seed failed:", e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
