// Generator of the 2,000 file perf fixture for REQ-IDX-004. It writes only under the given root.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export function genPerf(root: string, n = 1000): void {
  const w = (rel: string, text: string): void => {
    const p = join(root, rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, text);
  };
  w("openspec/specs/base/spec.md", "# base\n\n### Requirement: REQ-AAA-001 Base\nText.\n\n#### Scenario: SCN-AAA-001-1 S\n- a\n");
  for (let i = 0; i < n; i++) {
    const cap = "G" + String.fromCharCode(65 + (Math.floor(i / 1000) % 26)) + String.fromCharCode(65 + (Math.floor(i / 100) % 10));
    const num = String(i % 1000).padStart(3, "0");
    w(`openspec/specs/gen${i}/spec.md`,
      `# gen\n\n### Requirement: REQ-${cap}-${num} Item ${i}\nText of item ${i}.\n\nRefs: REQ-AAA-001\n\n` +
      `#### Scenario: SCN-${cap}-${num}-1 S\n- **WHEN** a\n- **THEN** b\n`);
    w(`src/gen/f${i}.ts`, "// " + "REQ-AAA-001\n" + "export const x = 1;\n".repeat(40));
  }
}
