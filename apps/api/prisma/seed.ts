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
	await prisma.worker.deleteMany();
	await prisma.employer.deleteMany();
	await prisma.job.deleteMany();
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
		{ id: "house_maid", name: "House Maid", category: "domestic", commType: "flat", commValue: 1500, salaryMinCents: 200_000n, salaryMaxCents: 600_000n },
		{ id: "nanny", name: "Nanny", category: "domestic", commType: "flat", commValue: 2000, salaryMinCents: 250_000n, salaryMaxCents: 700_000n },
		{ id: "cook", name: "Cook", category: "domestic", commType: "flat", commValue: 1800, salaryMinCents: 300_000n, salaryMaxCents: 800_000n },
		{ id: "barista", name: "Barista", category: "hospitality", commType: "percent", commValue: 10, salaryMinCents: 350_000n, salaryMaxCents: 900_000n },
		{ id: "waiter", name: "Waiter / Waitress", category: "hospitality", commType: "percent", commValue: 10, salaryMinCents: 300_000n, salaryMaxCents: 800_000n },
		{ id: "cleaner", name: "Cleaner", category: "facilities", commType: "flat", commValue: 1200, salaryMinCents: 200_000n, salaryMaxCents: 500_000n },
		{ id: "guard", name: "Security Guard", category: "facilities", commType: "flat", commValue: 1500, salaryMinCents: 300_000n, salaryMaxCents: 700_000n },
		{ id: "driver", name: "Driver", category: "transport", commType: "percent", commValue: 8, salaryMinCents: 500_000n, salaryMaxCents: 1_500_000n },
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

	console.log("Seeding notification templates...");
	const templates = [
		{ key: "auth.otp", channel: "sms", bodyEn: "Your Wez code: {{code}}. Valid 5 minutes.", bodyAm: "የዌዝ ኮድዎ: {{code}}። ለ5 ደቂቃ ያገለግላል።" },
		{ key: "hire_request.created.worker", channel: "sms", bodyEn: "{{employerName}} requested to hire you for {{role}} at {{salary}} ETB. Visit your station to confirm.", bodyAm: "{{employerName}} ለ{{role}} ስራ በ{{salary}} ብር ሊቀጥሮት ጠይቋል። ለማረጋገጥ ጣቢያዎን ይጎብኙ።" },
		{ key: "placement.finalized.worker", channel: "sms", bodyEn: "Placement confirmed at {{employerName}}. Salary {{salary}} ETB. Welcome.", bodyAm: "ምደባዎ ተረጋግጧል በ{{employerName}}። ደመወዝ {{salary}} ብር። እንኳን ደህና መጡ።" },
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
