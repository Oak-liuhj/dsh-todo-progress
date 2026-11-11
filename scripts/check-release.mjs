/** 发布前核对 DSH 装配、市场条目、说明、截图与运行时入口；只读，不联网。 */
import assert from 'node:assert/strict';
import {readFile, stat, realpath} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import path from 'node:path';
import {load} from 'js-yaml';

const root = fileURLToPath(new URL('../', import.meta.url));
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const repo = 'https://github.com/Oak-liuhj/dsh-todo-progress';
async function localFile(relative) {
    assert.equal(typeof relative, 'string');
    const file = await realpath(path.resolve(root, relative));
    assert.ok(file.startsWith(await realpath(root) + path.sep), `Resource escapes package: ${relative}`);
    assert.ok((await stat(file)).isFile(), `Missing file: ${relative}`);
    return file;
}

assert.equal(pkg.name, 'dsh-todo-progress');
assert.match(pkg.version, /^\d+\.\d+\.\d+$/);
assert.equal(pkg.repository.url, 'git+' + repo + '.git');
assert.equal(pkg.bugs.url, repo + '/issues');
assert.ok(pkg.keywords.includes('dsh-plugin'));
assert.equal(pkg.dsh.client.platform, 'web');
assert.equal(pkg.dsh.manifestVersion, 1);
// 显式列出验证过的宿主版本，避免精确单版本锁误拦升级，也避免放开未知未来版本。
const supportedDsh = pkg.engines.dsh.split(' || ');
assert.ok(supportedDsh.every(version => /^\d+\.\d+\.\d+(?:-[\w.-]+)?$/.test(version)));
assert.equal(new Set(supportedDsh).size, supportedDsh.length);
assert.ok(supportedDsh.includes(pkg.dsh.verifiedDsh), 'Verified host must be in engines.dsh');
assert.deepEqual(Object.keys(pkg.dependencies ?? {}), [], 'Runtime dependencies should remain empty');
assert.equal(pkg.scripts.prepare, undefined, 'GitHub installs use the checked-in client without an install-time build');

const patch = load(await readFile(await localFile(pkg.dsh.bundle.patch), 'utf8'));
assert.ok(patch.some(entry => entry.insert?.some(plugin => plugin.name === pkg.name)));
for (const locale of ['en', 'zh']) {
    const file = await localFile(pkg.exports['./locale/*.json'].replace('*', locale));
    const {meta} = JSON.parse(await readFile(file, 'utf8'));
    for (const field of ['title', 'description', 'detail']) assert.ok(meta[field]?.trim(), `Missing ${locale} meta.${field}`);
    await localFile(meta.detail);
}

const icon = await readFile(await localFile(pkg.icon));
assert.equal(icon.subarray(1, 4).toString(), 'PNG');
assert.ok(icon.length <= 256 * 1024, 'Host icon limit is 256 KiB');
assert.equal(icon.readUInt32BE(16), icon.readUInt32BE(20), 'Storefront icon must be square');
const shots = JSON.parse(await readFile(await localFile('screenshots.json'), 'utf8'));
assert.ok(Array.isArray(shots) && shots.length >= 1 && shots.length <= 8);
for (const shot of shots) {
    assert.ok(!path.isAbsolute(shot) && !shot.split(/[\\/]/).includes('..'));
    await localFile(shot);
    assert.match(shot, /\.(png|jpe?g|webp)$/i);
}

const registryFile = 'marketplace/Oak-liuhj__dsh-todo-progress.yml';
const entry = load(await readFile(await localFile(registryFile), 'utf8'));
assert.deepEqual(Object.keys(entry).sort(), ['category', 'description', 'icon', 'name', 'tarball', 'url']);
assert.equal(entry.url, repo);
assert.equal(entry.name, 'Oak-liuhj/dsh-todo-progress');
assert.equal(entry.category, 'ui');
assert.match(entry.description.en, /\.$/);
assert.match(entry.description.zh, /。$/);
assert.equal(entry.icon, 'https://raw.githubusercontent.com/Oak-liuhj/dsh-todo-progress/main/' + pkg.icon);
assert.equal(entry.tarball, `${repo}/releases/download/v${pkg.version}/${pkg.name}-${pkg.version}.tgz`);
for (const file of ['README.md', 'CHANGELOG.md', 'LICENSE', 'LICENSE.upstream', 'NOTICE']) await localFile(file);
const server = await import(pathToFileURL(await localFile(pkg.main)).href);
assert.equal(typeof server.default, 'function');
const client = await readFile(await localFile('client.js'), 'utf8');
assert.ok(client.includes('window.__ModuleLoader__.load('));
assert.ok(client.includes(pkg.version), 'Client version must match package');
console.log(`Release format PASS: ${pkg.name}@${pkg.version}; DSH manifest, locales, icon, ${shots.length} screenshots, registry entry and runtime entries.`);
