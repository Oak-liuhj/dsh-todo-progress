/** 下载官方声明并校验 SHA-512；不安装/执行宿主包，不修改用户 DSH profile。 */
import {readFile, writeFile, mkdir, mkdtemp, rm} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {contracts, checkDeclarations} from './host-contracts.mjs';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const args = process.argv.slice(2);
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const selector = option('--host', 'latest');
if (!/^(verified|latest|next|\d+\.\d+\.\d+(?:-[\w.-]+)?)$/.test(selector || '')) throw new Error('Invalid --host: use verified, latest, next or an exact version');
const target = selector === 'verified' ? pkg.dsh.verifiedDsh : selector;
const output = path.resolve(option('--report', `.local-validation/host-compatibility/${selector}.json`));
const report = {checkedAt: new Date().toISOString(), pluginVersion: pkg.version, selector, verifiedDsh: pkg.dsh.verifiedDsh,
    level: 'published-declaration-structure', runtimeVerified: false, packages: [], errors: []};
const cache = new Map();
const temp = await mkdtemp(path.join(tmpdir(), 'dsh-todo-host-'));

async function request(url, binary = false) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.hostname !== 'registry.npmjs.org') throw new Error('Only the official npm registry is accepted');
    for (let attempt = 0; ; attempt++) {
        try {
            const response = await fetch(url, {signal: AbortSignal.timeout(30000), redirect: 'error'});
            if (!response.ok) throw new Error(`npm HTTP ${response.status}: ${parsed.pathname}`);
            return binary ? Buffer.from(await response.arrayBuffer()) : await response.json();
        } catch (error) { if (attempt >= 1) throw error; }
    }
}
async function metadata(name, version) {
    const key = `${name}@${version}`;
    if (!cache.has(key)) cache.set(key, request(`https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`));
    return cache.get(key);
}
async function dependency(owner, name) {
    const version = owner.dependencies?.[name];
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version || '')) {
        throw new Error(`${owner.name} does not pin ${name}; review the host dependency graph before adapting the checker`);
    }
    return metadata(name, version);
}
async function declarations(meta, index) {
    const bytes = await request(meta.dist.tarball, true);
    const expected = meta.dist.integrity?.split(/\s+/).find(value => value.startsWith('sha512-'));
    if (!expected || `sha512-${createHash('sha512').update(bytes).digest('base64')}` !== expected) throw new Error(`Integrity check failed: ${meta.name}`);
    const archive = path.join(temp, `${index}.tgz`);
    await writeFile(archive, bytes);
    const tar = options => execFileSync('tar', options, {encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, timeout: 30000, windowsHide: true});
    const files = tar(['-tzf', archive]).split(/\r?\n/).filter(file => /^package\/lib\/types\/[\w./-]+\.d\.ts$/.test(file));
    if (!files.length) throw new Error(`No published declarations: ${meta.name}`);
    // stdout only: no archive member is extracted onto the filesystem.
    const sources = Object.fromEntries(files.map(file => [file, tar(['-xOzf', archive, file])]));
    return {sources, integrity: expected};
}

try {
    const host = await metadata('@deepseek-ai/dsh', target);
    report.hostVersion = host.version;
    report.requiresRuntimeReview = host.version !== pkg.dsh.verifiedDsh;
    const web = await dependency(host, '@deepseek-ai/dsh-web-app');
    const entries = Object.entries(contracts);
    // 独立包并行下载；每个包的完整性与声明检查顺序执行，失败也保留其余包的结果。
    const checks = await Promise.allSettled(entries.map(async ([short, required], index) => {
        const name = `@deepseek-ai/${short}`;
        const meta = await dependency(web.dependencies?.[name] ? web : host, name);
        const {sources, integrity} = await declarations(meta, index);
        return {name, version: meta.version, integrity, checks: checkDeclarations(sources, required)};
    }));
    checks.forEach((result, index) => {
        if (result.status === 'fulfilled') report.packages.push(result.value);
        else report.errors.push({package: entries[index][0], message: result.reason.message});
    });
} catch (error) {
    report.errors.push({message: error.message});
} finally {
    await rm(temp, {recursive: true, force: true});
}
report.passed = report.errors.length === 0 && report.packages.every(p => p.checks.every(c => c.ok));
await mkdir(path.dirname(output), {recursive: true});
await writeFile(output, JSON.stringify(report, null, 2) + '\n');
console.log(`DSH ${report.hostVersion ?? target}: declaration structure ${report.passed ? 'PASS' : 'FAIL'}; report ${output}`);
for (const p of report.packages) for (const c of p.checks) if (!c.ok) console.error(`${p.name}: ${c.contract} changed or missing`);
for (const error of report.errors) console.error(error.package ?? 'host', error.message);
console.log('This does not certify runtime/UI compatibility or update engines.dsh. Complete the upgrade checklist before release.');
if (report.requiresRuntimeReview) {
    const notice = `DSH ${report.hostVersion} requires Web/desktop runtime review; verifiedDsh remains ${pkg.dsh.verifiedDsh}.`;
    console.log(process.env.GITHUB_ACTIONS ? `::warning::${notice}` : notice);
}
if (process.env.GITHUB_STEP_SUMMARY) {
    const {appendFile} = await import('node:fs/promises');
    await appendFile(process.env.GITHUB_STEP_SUMMARY,
        `### DSH ${report.hostVersion ?? target}\n\nDeclaration structure: **${report.passed ? 'PASS' : 'FAIL'}**. Runtime review: **${report.requiresRuntimeReview ? 'required for this new host' : 'see the release checklist'}**.\n\nThis job does not certify UI compatibility or change the supported version range. See the JSON artifact for package versions, integrity and individual checks.\n`);
}
process.exitCode = report.passed ? 0 : 1;
