#!/usr/bin/env node
/**
 * Validate Allure ethalon / consumer allurerc.mjs:
 * - import succeeds
 * - locked 2×2 at indices 0–3 (awesome + dashboard):
 *     [0] currentStatus  [1] durationDynamics
 *     [2] testingPyramid [3] durations (groupBy: layer)
 * - testingPyramid.layers === PYRAMID_LAYERS (no visual)
 *
 * Usage:
 *   node scripts/validate-allurerc.mjs [path/to/allurerc.mjs]
 * Default: ./allurerc.mjs (cwd) or ethalon _ethalon/allurerc.mjs when run from generators/ethalon/tests-java.
 */
import { pathToFileURL } from "node:url";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FALLBACK_LAYERS = [
  "unit",
  "component",
  "integration",
  "api",
  "e2e",
  "manual",
];

function fail(message) {
  console.error(`validate-allurerc: FAIL — ${message}`);
  process.exit(1);
}

async function loadPyramidLayers(configDir) {
  const candidates = [
    path.join(configDir, "allure", "constants.mjs"),
    path.resolve(__dirname, "../_ethalon/allure/constants.mjs"),
    path.resolve(__dirname, "../allure/constants.mjs"),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const mod = await import(pathToFileURL(file).href);
      if (Array.isArray(mod.PYRAMID_LAYERS) && mod.PYRAMID_LAYERS.length) {
        return mod.PYRAMID_LAYERS;
      }
    } catch {
      /* try next */
    }
  }
  return FALLBACK_LAYERS;
}

function assertLockedQuad(charts, label, layers) {
  if (!Array.isArray(charts) || charts.length < 4) {
    fail(`${label}: expected array with at least 4 tiles (locked 2×2)`);
  }
  if (charts[0]?.type !== "currentStatus") {
    fail(`${label}[0]: expected type currentStatus, got ${charts[0]?.type}`);
  }
  if (charts[1]?.type !== "durationDynamics") {
    fail(`${label}[1]: expected type durationDynamics, got ${charts[1]?.type}`);
  }
  if (charts[2]?.type !== "testingPyramid") {
    fail(`${label}[2]: expected type testingPyramid, got ${charts[2]?.type}`);
  }
  if (charts[3]?.type !== "durations" || charts[3]?.groupBy !== "layer") {
    fail(
      `${label}[3]: expected type durations with groupBy "layer", got type=${charts[3]?.type} groupBy=${charts[3]?.groupBy}`,
    );
  }
  const actual = charts[2].layers ?? [];
  if (JSON.stringify(actual) !== JSON.stringify(layers)) {
    fail(
      `${label}[2].layers: expected ${JSON.stringify(layers)}, got ${JSON.stringify(actual)}`,
    );
  }
  if (actual.includes("visual")) {
    fail(`${label}[2].layers: must not include visual`);
  }
}

async function loadConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    fail(`file not found: ${configPath}`);
  }
  const mod = await import(pathToFileURL(path.resolve(configPath)).href);
  if (!mod.default || typeof mod.default !== "object") {
    fail(`${configPath}: export default object required`);
  }
  return mod.default;
}

async function main() {
  const arg = process.argv[2];
  const packageRoot = path.resolve(__dirname, "..");
  const configPath = arg
    ? path.resolve(process.cwd(), arg)
    : fs.existsSync(path.join(process.cwd(), "allurerc.mjs"))
      ? path.join(process.cwd(), "allurerc.mjs")
      : path.join(packageRoot, "_ethalon", "allurerc.mjs");

  const config = await loadConfig(configPath);
  const layers = await loadPyramidLayers(path.dirname(configPath));
  const charts = config.plugins?.awesome?.options?.charts;
  const layout = config.plugins?.dashboard?.options?.layout;

  assertLockedQuad(charts, "plugins.awesome.options.charts", layers);
  assertLockedQuad(layout, "plugins.dashboard.options.layout", layers);

  if (!config.name || typeof config.name !== "string") {
    fail("name: required string");
  }
  if (!config.qualityGate?.rules?.length) {
    fail("qualityGate.rules: required non-empty");
  }

  const catGroupBy = config.categories?.rules?.flatMap((r) => r.groupBy ?? []) ?? [];
  const allowed = new Set([
    "flaky",
    "owner",
    "severity",
    "transition",
    "status",
    "environment",
    "layer",
  ]);
  for (const selector of catGroupBy) {
    if (typeof selector === "string" && !allowed.has(selector)) {
      fail(
        `categories.groupBy invalid selector "${selector}" (Allure 3.13 builtins: ${[...allowed].join(", ")})`,
      );
    }
  }

  console.log(`validate-allurerc: OK — ${configPath}`);
  console.log(`  name=${config.name}`);
  console.log(`  awesome.charts=${charts.length}, dashboard.layout=${layout.length}`);
  console.log(
    `  locked 2×2: currentStatus | durationDynamics / testingPyramid | durations(layer)`,
  );
  console.log(`  pyramid@2 layers=[${layers.join(", ")}]`);
}

main().catch((err) => {
  fail(err?.stack || String(err));
});
