import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const MUTATION_DECORATOR_PATTERN = /^\s*@(Post|Patch|Put|Delete)(?:\(|\b)/;
const AUDIT_DECORATOR_PATTERN = /@(AuditLog|SkipAuditLog)\(/;
const CONTEXT_LINES_BEFORE = 6;
const CONTEXT_LINES_AFTER = 8;

const controllerFiles = (directory: string): string[] =>
	readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) return controllerFiles(path);
		if (entry.isFile() && entry.name.endsWith(".controller.ts")) return [path];
		return [];
	});

const auditCoverageGaps = (filePath: string): readonly string[] => {
	const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
	const gaps: string[] = [];
	for (const [index, line] of lines.entries()) {
		if (!MUTATION_DECORATOR_PATTERN.test(line)) continue;
		const nearbyLines = lines.slice(
			Math.max(0, index - CONTEXT_LINES_BEFORE),
			Math.min(lines.length, index + CONTEXT_LINES_AFTER),
		);
		if (nearbyLines.some((item) => AUDIT_DECORATOR_PATTERN.test(item))) continue;
		gaps.push(`${relative(process.cwd(), filePath)}:${index + 1} ${line.trim()}`);
	}
	return gaps;
};

describe("controller mutation audit coverage", () => {
	it("marks every state-changing controller route with AuditLog or SkipAuditLog", () => {
		const modulesRoot = join(__dirname, "..", "..", "modules");
		const gaps = controllerFiles(modulesRoot).flatMap((filePath) => auditCoverageGaps(filePath));
		expect(gaps).toEqual([]);
	});
});
