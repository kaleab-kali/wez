import { ArrowRight01Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import React from "react";
import { useTranslation } from "react-i18next";
import { WezLogo } from "#components/branding/WezLogo";
import { LanguageSwitcher } from "#shared/components/LanguageSwitcher";
import { authClient } from "#shared/lib/auth-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const EMPLOYER_STEPS = [
	["landing.employerStepSearch", "landing.employerStepSearchBody"],
	["landing.employerStepRequest", "landing.employerStepRequestBody"],
	["landing.employerStepFinalize", "landing.employerStepFinalizeBody"],
] as const;

const EMPLOYER_PROMISES = [
	"landing.employerPromiseVerified",
	"landing.employerPromisePrivate",
	"landing.employerPromiseRecords",
] as const;

const HIRING_CATEGORIES = [
	"landing.categoryHousekeeping",
	"landing.categoryCleaning",
	"landing.categoryCooking",
	"landing.categoryHospitality",
	"landing.categorySecurity",
	"landing.categoryFacilities",
] as const;

const RootIndex = React.memo(() => {
	const { t } = useTranslation();
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<div className="flex min-h-dvh items-center justify-center">
				<Skeleton className="h-8 w-48" />
			</div>
		);
	}

	if (session) return <Navigate to="/app/dashboard" />;

	return (
		<div className="min-h-dvh bg-background text-foreground">
			<header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
				<div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 md:px-8">
					<Link to="/" className="flex min-h-11 items-center gap-2 text-primary">
						<WezLogo variant="mark" className="size-9" />
						<div className="leading-tight">
							<div className="text-xl font-bold tracking-tight">Wez</div>
							<div className="hidden text-xs text-muted-foreground sm:block">{t("brand.tagline")}</div>
						</div>
					</Link>

					<nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex" aria-label="Primary">
						<a href="#how-it-works" className="hover:text-foreground">
							{t("landing.navHow")}
						</a>
						<a href="#roles" className="hover:text-foreground">
							{t("landing.navRoles")}
						</a>
						<a href="#inside" className="hover:text-foreground">
							{t("landing.navInside")}
						</a>
					</nav>

					<div className="flex items-center gap-2">
						<LanguageSwitcher />
						<Button asChild variant="ghost" size="sm">
							<Link to="/login">{t("landing.signIn")}</Link>
						</Button>
						<Button asChild size="sm" className="hidden sm:inline-flex">
							<Link to="/login" search={{ as: "employer" }}>
								{t("landing.employerPrimaryCta")}
							</Link>
						</Button>
					</div>
				</div>
			</header>

			<main>
				<section className="relative isolate min-h-[calc(100dvh-73px)] overflow-hidden border-b bg-muted/20">
					<div className="absolute inset-y-12 right-[-9rem] hidden w-[58rem] rotate-[-2deg] opacity-75 lg:block">
						<EmployerWorkspaceMockup compact />
					</div>
					<div className="absolute inset-0 bg-gradient-to-r from-background via-background/96 to-background/55" />
					<div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />

					<div className="relative mx-auto flex min-h-[calc(100dvh-73px)] max-w-7xl items-center px-5 py-14 md:px-8">
						<div className="max-w-3xl space-y-8">
							<div className="space-y-4">
								<Badge variant="outline" className="rounded-4xl px-3 py-1 text-xs">
									{t("landing.heroBadge")}
								</Badge>
								<p className="text-lg font-semibold text-primary md:text-2xl" lang="am">
									የሚታመኑ ሰራተኞችን በWez ያግኙ
								</p>
								<h1 className="max-w-3xl text-balance text-5xl font-semibold leading-[0.98] tracking-tight md:text-7xl">
									{t("landing.heroTitle")}
								</h1>
								<p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground md:text-lg">
									{t("landing.heroBody")}
								</p>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<Button asChild size="lg">
									<Link to="/login" search={{ as: "employer" }}>
										{t("landing.employerPrimaryCta")}
										<HugeiconsIcon icon={ArrowRight01Icon} className="ml-2 size-4" />
									</Link>
								</Button>
								<Button asChild size="lg" variant="outline">
									<Link to="/signup">{t("landing.createAccount")}</Link>
								</Button>
							</div>

							<p className="text-sm text-muted-foreground">
								{t("landing.workerSecondary")}{" "}
								<Link to="/login" search={{ as: "worker" }} className="font-medium text-primary hover:underline">
									{t("landing.workerPrimaryCta")}
								</Link>
							</p>

							<div className="grid max-w-3xl gap-4 border-t pt-5 text-sm text-muted-foreground md:grid-cols-3">
								<HeroProof value={t("landing.factVerified")} label={t("landing.factVerifiedBody")} />
								<HeroProof value={t("landing.factStation")} label={t("landing.factStationBody")} />
								<HeroProof value={t("landing.factRecords")} label={t("landing.factRecordsBody")} />
							</div>
						</div>
					</div>
				</section>

				<section id="how-it-works" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
					<div className="grid gap-10 lg:grid-cols-[0.72fr_1.28fr]">
						<div>
							<p className="text-sm font-medium text-primary">{t("landing.employerSectionEyebrow")}</p>
							<h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
								{t("landing.employerSectionTitle")}
							</h2>
							<p className="mt-4 max-w-xl leading-7 text-muted-foreground">{t("landing.employerSectionBody")}</p>
						</div>
						<div className="divide-y rounded-4xl border bg-card shadow-sm">
							{EMPLOYER_STEPS.map(([titleKey, bodyKey], index) => (
								<div key={titleKey} className="grid gap-4 p-5 md:grid-cols-[80px_1fr] md:p-7">
									<div className="font-heading text-sm text-primary">0{index + 1}</div>
									<div>
										<h3 className="text-xl font-semibold tracking-tight">{t(titleKey)}</h3>
										<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t(bodyKey)}</p>
									</div>
								</div>
							))}
						</div>
					</div>
				</section>

				<section id="inside" className="border-y bg-muted/30">
					<div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1fr_1.08fr] lg:items-center">
						<EmployerWorkspaceMockup />

						<div className="space-y-6">
							<div>
								<p className="text-sm font-medium text-primary">{t("landing.productEyebrow")}</p>
								<h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
									{t("landing.productTitle")}
								</h2>
								<p className="mt-4 max-w-xl leading-7 text-muted-foreground">{t("landing.productBody")}</p>
							</div>
							<div className="grid gap-3">
								{EMPLOYER_PROMISES.map((key) => (
									<CheckLine key={key} text={t(key)} />
								))}
							</div>
						</div>
					</div>
				</section>

				<section id="roles" className="mx-auto max-w-7xl px-5 py-16 md:px-8">
					<div className="grid gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
						<div>
							<p className="text-sm font-medium text-primary">{t("landing.categoriesEyebrow")}</p>
							<h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
								{t("landing.categoriesTitle")}
							</h2>
							<p className="mt-4 max-w-xl leading-7 text-muted-foreground">{t("landing.categoriesBody")}</p>
						</div>
						<div className="flex flex-wrap gap-3">
							{HIRING_CATEGORIES.map((key) => (
								<span key={key} className="rounded-4xl border bg-card px-4 py-3 text-sm font-medium shadow-sm">
									{t(key)}
								</span>
							))}
						</div>
					</div>
				</section>

				<section className="bg-foreground text-background">
					<div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 md:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
						<div>
							<Badge variant="secondary" className="rounded-4xl">
								{t("landing.boardBadge")}
							</Badge>
							<h2 className="mt-4 max-w-xl text-balance text-3xl font-semibold tracking-tight md:text-5xl">
								{t("landing.boardTitle")}
							</h2>
							<p className="mt-4 max-w-xl text-sm leading-6 text-background/70">{t("landing.boardBody")}</p>
						</div>
						<div className="rounded-4xl border border-background/15 bg-background/8 p-4">
							<div className="rounded-4xl bg-background p-5 text-foreground shadow-md">
								<div className="mb-3 flex items-center gap-2">
									<Badge variant="outline">{t("landing.boardSponsored")}</Badge>
									<span className="font-mono text-xs text-muted-foreground">{t("landing.boardRoleFit")}</span>
								</div>
								<h3 className="text-xl font-semibold tracking-tight">{t("landing.boardCardTitle")}</h3>
								<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("landing.boardCardBody")}</p>
							</div>
						</div>
					</div>
				</section>

				<section className="mx-auto max-w-7xl px-5 py-16 md:px-8">
					<div className="flex flex-col gap-5 border-t pt-10 md:flex-row md:items-center md:justify-between">
						<div>
							<h2 className="text-2xl font-semibold tracking-tight">{t("landing.finalTitle")}</h2>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("landing.finalBody")}</p>
						</div>
						<div className="flex flex-col gap-2 sm:flex-row">
							<Button asChild>
								<Link to="/login" search={{ as: "employer" }}>
									{t("landing.employerPrimaryCta")}
								</Link>
							</Button>
							<Button asChild variant="outline">
								<Link to="/signup">{t("landing.createAccount")}</Link>
							</Button>
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t bg-muted/25">
				<div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 text-sm md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-8">
					<div>
						<div className="flex items-center gap-2 text-primary">
							<WezLogo variant="mark" className="size-8" />
							<span className="text-lg font-bold tracking-tight">Wez</span>
						</div>
						<p className="mt-3 max-w-sm text-muted-foreground">{t("landing.footerBody")}</p>
					</div>
					<div>
						<h3 className="font-semibold">{t("landing.footerEmployers")}</h3>
						<div className="mt-3 grid gap-2 text-muted-foreground">
							<Link to="/login" search={{ as: "employer" }} className="hover:text-foreground">
								{t("landing.employerPrimaryCta")}
							</Link>
							<Link to="/signup" className="hover:text-foreground">
								{t("landing.createAccount")}
							</Link>
						</div>
					</div>
					<div>
						<h3 className="font-semibold">{t("landing.footerAccess")}</h3>
						<div className="mt-3 grid gap-2 text-muted-foreground">
							<Link to="/login" className="hover:text-foreground">
								{t("landing.signIn")}
							</Link>
							<Link to="/login" search={{ as: "worker" }} className="hover:text-foreground">
								{t("landing.workerPrimaryCta")}
							</Link>
						</div>
					</div>
				</div>
				<div className="mx-auto flex max-w-7xl flex-col gap-3 border-t px-5 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between md:px-8">
					<span>
						&copy; {new Date().getFullYear()} Wez - {t("brand.tagline")}
					</span>
					<span>{t("landing.footerTrust")}</span>
				</div>
			</footer>
		</div>
	);
});
RootIndex.displayName = "RootIndex";

function HeroProof({ value, label }: { readonly value: string; readonly label: string }) {
	return (
		<div>
			<div className="font-heading text-base font-semibold text-foreground">{value}</div>
			<div className="mt-1 leading-6">{label}</div>
		</div>
	);
}

function CheckLine({ text }: { readonly text: string }) {
	return (
		<div className="flex items-start gap-3 rounded-4xl border bg-card px-4 py-3 shadow-sm">
			<HugeiconsIcon icon={CheckmarkCircle02Icon} className="mt-0.5 size-4 shrink-0 text-primary" />
			<span className="text-sm leading-6 text-muted-foreground">{text}</span>
		</div>
	);
}

function EmployerWorkspaceMockup({ compact = false }: { readonly compact?: boolean }) {
	const { t } = useTranslation();
	const rows = [
		{ name: "Hana T.", role: t("landing.categoryHousekeeping"), tier: "Trusted", area: "Bole" },
		{ name: "Meron A.", role: t("landing.categoryHospitality"), tier: "Trained", area: "Kazanchis" },
		{ name: "Dawit K.", role: t("landing.categoryFacilities"), tier: "Verified", area: "CMC" },
	];

	return (
		<div className="overflow-hidden rounded-4xl border bg-card shadow-xl ring-1 ring-foreground/5">
			<div className="flex items-center justify-between border-b bg-muted/35 px-5 py-4">
				<div>
					<p className="text-sm font-semibold">{t("landing.mockTitle")}</p>
					<p className="text-xs text-muted-foreground">{t("landing.mockSubtitle")}</p>
				</div>
				<Badge>{t("landing.mockStatus")}</Badge>
			</div>
			<div className={`grid gap-4 p-5 ${compact ? "" : "lg:grid-cols-[1fr_0.86fr]"}`}>
				<div className="space-y-3">
					<div className="grid grid-cols-3 gap-3">
						<MockMetric value="148" label={t("landing.mockMetricWorkers")} />
						<MockMetric value="23" label={t("landing.mockMetricRequests")} />
						<MockMetric value="6" label={t("landing.mockMetricStations")} />
					</div>
					<div className="rounded-4xl border bg-background">
						<div className="flex items-center justify-between border-b px-4 py-3">
							<p className="text-sm font-medium">{t("landing.mockShortlist")}</p>
							<Badge variant="outline">{t("landing.mockFiltered")}</Badge>
						</div>
						<div className="divide-y">
							{rows.map((row) => (
								<div key={row.name} className="flex items-center gap-3 px-4 py-3">
									<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
										{row.name
											.split(" ")
											.map((part) => part[0])
											.join("")}
									</div>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium">{row.name}</p>
										<p className="truncate text-xs text-muted-foreground">
											{row.role} - {row.area}
										</p>
									</div>
									<Badge variant="outline">{row.tier}</Badge>
								</div>
							))}
						</div>
					</div>
				</div>

				<div className="space-y-3">
					<div className="rounded-4xl border bg-background p-4">
						<div className="mb-4 flex items-center justify-between">
							<div>
								<p className="text-sm font-medium">{t("landing.mockRequest")}</p>
								<p className="text-xs text-muted-foreground">Bole Hotel</p>
							</div>
							<Badge variant="secondary">{t("hireRequests.statusAwaiting")}</Badge>
						</div>
						<div className="grid gap-3 text-sm">
							<div className="flex justify-between gap-3">
								<span className="text-muted-foreground">{t("hireRequests.proposedSalary")}</span>
								<span className="font-mono">8,500 ETB</span>
							</div>
							<div className="flex justify-between gap-3">
								<span className="text-muted-foreground">{t("hireRequests.station")}</span>
								<span>Bole</span>
							</div>
							<div className="h-2 rounded-full bg-muted">
								<div className="h-full w-2/3 rounded-full bg-primary" />
							</div>
						</div>
					</div>
					<div className="rounded-4xl border bg-primary/5 p-4">
						<div className="mb-3 flex items-center gap-2">
							<Badge variant="outline">{t("landing.boardSponsored")}</Badge>
							<span className="font-mono text-xs text-muted-foreground">{t("landing.boardRoleFit")}</span>
						</div>
						<p className="text-sm font-medium">{t("landing.boardCardTitle")}</p>
						<p className="mt-1 text-xs leading-5 text-muted-foreground">{t("landing.boardCardBody")}</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function MockMetric({ value, label }: { readonly value: string; readonly label: string }) {
	return (
		<div className="rounded-4xl border bg-background p-3">
			<div className="font-heading text-xl font-semibold">{value}</div>
			<div className="mt-1 text-[11px] leading-4 text-muted-foreground">{label}</div>
		</div>
	);
}

export const Route = createFileRoute("/")({
	component: RootIndex,
});
