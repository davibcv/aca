// tests/orchestrator.dryrun.spec.ts
import fs from "fs";
import path from "path";
import os from "os";
import { runCycle } from "../src/orchestrator";

describe("orchestrator runCycle dry-run", () => {
  const tmpRoot = path.join(os.tmpdir(), `aca-test-${Date.now()}`);

  beforeAll(async () => {
    // create a small fixture repo
    await fs.promises.mkdir(tmpRoot, { recursive: true });
    // sample file with TODO
    await fs.promises.writeFile(path.join(tmpRoot, "sample.ts"), "// TODO: fix me\nconst x = 1;\n");
    // create a node_modules dir to ensure skip works
    await fs.promises.mkdir(path.join(tmpRoot, "node_modules"), { recursive: true });
  });

  afterAll(async () => {
    // cleanup
    try {
      await fs.promises.rm(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  test("runCycle in dry-run inspects files and writes report without applying patches", async () => {
    const reportDir = path.join(tmpRoot, ".aca_reports");
    const res = await runCycle({
      repoPath: tmpRoot,
      reportDir,
      dryRun: true,
      providerName: "mock",
      maxFiles: 50,
      maxFileBytes: 1024 * 50,
    });
    expect(res).toBeDefined();
    expect(res.ok).toBe(true);
    expect(Array.isArray(res.inspected)).toBe(true);
    // report file exists
    const files = await fs.promises.readdir(reportDir);
    const jsons = files.filter((f) => f.endsWith(".json"));
    expect(jsons.length).toBeGreaterThan(0);
    // result applied must be false in dry-run
    expect(res.applied).toBe(false);
  }, 20000);
});
