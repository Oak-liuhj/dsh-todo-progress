import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import semver from 'semver';

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const policy = JSON.parse(await readFile(new URL('../compatibility/policy.json', import.meta.url), 'utf8'));
// 宿主启用 includePrerelease；默认的 SemVer 选项会遗漏后续 0.2.x 预发布版本。
const accepts = version => semver.satisfies(version, pkg.engines.dsh, {includePrerelease: true});

test('DSH 安装范围与策略一致并包含独立记录的历史实测版本', () => {
    assert.ok(semver.validRange(pkg.engines.dsh));
    assert.equal(pkg.engines.dsh, policy.supportedRuntimeRange);
    assert.ok(policy.verifiedRuntimeVersions.includes(pkg.dsh.verifiedDsh));
    for (const version of policy.verifiedRuntimeVersions) assert.ok(accepts(version), version);
});

test('兼容范围接受旧基线、rc.3 及后续 0.2.x 的预发布和正式版本', () => {
    for (const version of ['0.2.1-rc.5', '0.2.2-rc.1', '0.2.2-rc.3', '0.2.2', '0.2.3-alpha.1', '0.2.3', '0.2.99']) {
        assert.ok(accepts(version), version);
    }
});

test('兼容范围排除非基线的旧版本及 0.3.0 的全部预发布和后续版本', () => {
    for (const version of ['0.2.1-rc.4', '0.2.1-rc.6', '0.2.1', '0.2.2-alpha.3', '0.3.0-0', '0.3.0-alpha.1', '0.3.0-rc.1', '0.3.0', '0.3.1', '1.0.0']) {
        assert.equal(accepts(version), false, version);
    }
});
