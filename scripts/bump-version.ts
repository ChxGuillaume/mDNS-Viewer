import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const USAGE = `Usage:
  bun run bump <patch | minor | major | canary | X.Y.Z[-canary.N]> [--force]
      print the next release tag, based on the latest v* tag, and the commands to push it
  bun scripts/bump-version.ts --check <tag>
      fail unless the tag is vX.Y.Z[-canary.N] and higher than every other v* tag
  bun scripts/bump-version.ts --set <version>
      write the version to package.json, src-tauri/Cargo.toml and src-tauri/Cargo.lock (used by CI)

  patch, minor, major  bump that part (a canary of that kind of version is released as is)
  canary               next canary: X.Y.Z -> X.Y.(Z+1)-canary.1, X.Y.Z-canary.N -> X.Y.Z-canary.(N+1)
  --force              allow a version that isn't higher than the latest tag`;

interface Version {
  major: number;
  minor: number;
  patch: number;
  canary?: number;
}

function parse(text: string): Version | undefined {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-canary\.(\d+))?$/.exec(text);
  if (!match)
    return undefined;
  const [, major, minor, patch, canary] = match;
  return { major: Number(major), minor: Number(minor), patch: Number(patch), canary: canary === undefined ? undefined : Number(canary) };
}

function format(v: Version): string {
  return `${v.major}.${v.minor}.${v.patch}${v.canary === undefined ? '' : `-canary.${v.canary}`}`;
}

function compare(a: Version, b: Version): number {
  return a.major - b.major
    || a.minor - b.minor
    || a.patch - b.patch
    || (a.canary ?? Infinity) - (b.canary ?? Infinity);
}

function next(current: Version, target: string): Version | undefined {
  const { major, minor, patch, canary } = current;
  switch (target) {
    case 'major': return canary !== undefined && minor === 0 && patch === 0 ? { major, minor, patch } : { major: major + 1, minor: 0, patch: 0 };
    case 'minor': return canary !== undefined && patch === 0 ? { major, minor, patch } : { major, minor: minor + 1, patch: 0 };
    case 'patch': return canary === undefined ? { major, minor, patch: patch + 1 } : { major, minor, patch };
    case 'canary': return canary === undefined ? { major, minor, patch: patch + 1, canary: 1 } : { major, minor, patch, canary: canary + 1 };
    default: return parse(target);
  }
}

function fail(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

const root = resolve(import.meta.dir, '..');
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');

function latestTag(except?: string): { tag: string; version: Version } | undefined {
  const tags = execFileSync('git', ['tag', '--list', 'v*'], { cwd: root, encoding: 'utf8' }).split('\n');
  let latest: { tag: string; version: Version } | undefined;
  for (const tag of tags) {
    const version = tag && tag !== except ? parse(tag) : undefined;
    if (version && (!latest || compare(version, latest.version) > 0))
      latest = { tag, version };
  }
  return latest;
}

function check(tag: string) {
  const version = parse(tag);
  if (!version || !tag.startsWith('v'))
    fail(`tag ${tag} isn't vX.Y.Z or vX.Y.Z-canary.N`);
  const latest = latestTag(tag);
  if (latest && compare(version, latest.version) <= 0)
    fail(`tag ${tag} isn't higher than ${latest.tag}, the stores reject versions that don't increase`);
  console.log(`✓ ${tag} is a valid release tag${latest ? `, higher than ${latest.tag}` : ''}`);
}

function set(text: string) {
  const version = format(parse(text) ?? fail(`${text} isn't X.Y.Z or X.Y.Z-canary.N`));
  const crate = /^name = "(.+)"$/m.exec(read('src-tauri/Cargo.toml'))?.[1] ?? fail('no package name in src-tauri/Cargo.toml');
  const escapedCrate = crate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const edits: { path: string; pattern: RegExp }[] = [
    { path: 'package.json', pattern: /^(\s*"version":\s*")([^"]*)(")/m },
    { path: 'src-tauri/Cargo.toml', pattern: /^(\[package\]\r?\n(?:[^[\r\n].*\r?\n|\r?\n)*?version = ")([^"]*)(")/m },
    { path: 'src-tauri/Cargo.lock', pattern: new RegExp(`^(name = "${escapedCrate}"\\r?\\nversion = ")([^"]*)(")`, 'm') },
  ];
  const updates = edits.map(({ path, pattern }) => {
    const content = read(path);
    const match = pattern.exec(content) ?? fail(`couldn't find the version in ${path}`);
    return { path, from: match[2]!, content: content.replace(pattern, `$1${version}$3`) };
  });
  for (const { path, from, content } of updates) {
    writeFileSync(resolve(root, path), content);
    console.log(`  ${path}: ${from} → ${version}`);
  }
}

function suggest(target: string, force: boolean) {
  const latest = latestTag();
  const base = latest?.version ?? { major: 0, minor: 0, patch: 0 };
  const version = next(base, target) ?? fail(`${target} isn't patch, minor, major, canary or a X.Y.Z[-canary.N] version`);
  if (latest && compare(version, latest.version) <= 0 && !force)
    fail(`v${format(version)} isn't higher than ${latest.tag}, the stores reject versions that don't increase (use --force to tag it anyway)`);
  const tag = `v${format(version)}`;
  console.log(`${latest ? `${latest.tag} → ` : ''}${tag}

  git tag ${tag}
  git push origin ${tag}`);
}

const args = process.argv.slice(2);
const positional = args.filter(arg => !arg.startsWith('--'));
if (args.includes('--help') || args.includes('-h')) {
  console.log(USAGE);
  process.exit(0);
}
if (positional.length !== 1) {
  console.error(USAGE);
  process.exit(2);
}

if (args.includes('--check'))
  check(positional[0]!);
else if (args.includes('--set'))
  set(positional[0]!);
else
  suggest(positional[0]!, args.includes('--force'));
