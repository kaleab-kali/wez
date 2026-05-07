import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";

type PlacementPartyPolicyInput = {
	readonly worker: { readonly available: boolean };
	readonly employer: { readonly rating: string };
	readonly role: {
		readonly salaryMinCents: bigint;
		readonly salaryMaxCents: bigint;
	};
};

type HireRequestPolicyInput = PlacementPartyPolicyInput & {
	readonly placement: unknown;
	readonly status: string;
};

@Injectable()
export class PlacementFinalizationPolicyService {
	assertFreshReady(input: PlacementPartyPolicyInput, salaryCents: bigint) {
		this.assertPartiesReady(input, salaryCents);
	}

	assertHireRequestReady(request: HireRequestPolicyInput, salaryCents: bigint) {
		if (request.placement) throw new ConflictException({ code: "PLACEMENT_ALREADY_EXISTS" });
		if (request.status !== "awaiting_visit") {
			throw new ConflictException({ code: "HIRE_REQUEST_NOT_AWAITING_VISIT" });
		}
		this.assertPartiesReady(request, salaryCents);
	}

	calculateCommission(salaryCents: bigint, commType: string, commValue: number): bigint {
		return commType === "percent" ? (salaryCents * BigInt(commValue)) / 100n : BigInt(commValue) * 100n;
	}

	private assertPartiesReady(input: PlacementPartyPolicyInput, salaryCents: bigint) {
		if (!input.worker.available) {
			throw new ConflictException({ code: "WORKER_NOT_AVAILABLE" });
		}
		if (input.employer.rating === "red") {
			throw new ConflictException({ code: "EMPLOYER_BANNED" });
		}
		if (salaryCents < input.role.salaryMinCents || salaryCents > input.role.salaryMaxCents) {
			throw new BadRequestException({
				code: "SALARY_OUT_OF_ROLE_RANGE",
				details: {
					roleSalaryMinCents: input.role.salaryMinCents.toString(),
					roleSalaryMaxCents: input.role.salaryMaxCents.toString(),
				},
			});
		}
	}
}
