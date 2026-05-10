import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";
import chalk from "chalk";
import type { Metrics } from "./types.js";

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function readText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    die(`Missing file: ${filePath}`);
  }
  return fs.readFileSync(filePath, "utf8");
}

export function readYaml<T>(filePath: string): T {
  return YAML.parse(readText(filePath)) as T;
}

export function readJson<T>(filePath: string): T {
  return JSON.parse(readText(filePath)) as T;
}

export function die(message: string): never {
  console.error(chalk.red(`ERROR: ${message}`));
  process.exit(1);
}

export function loadMetrics(metricsPath: string): Metrics {
  return readJson<Metrics>(metricsPath);
}
