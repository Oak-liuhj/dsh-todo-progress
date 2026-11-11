import test from 'node:test';
import assert from 'node:assert/strict';
import {checkDeclarations} from '../scripts/host-contracts.mjs';

test('contract probe ignores comments and detects removed APIs and changed slot kinds', () => {
    const required = {SlotMap: [['pane', 'kind', 'keyed']], Registry: ['register']};
    const good = {'host.d.ts': 'interface SlotMap { "pane": {kind: "keyed";}; } declare class Registry {register(): void;}'};
    assert.ok(checkDeclarations(good, required).every(c => c.ok));
    const changed = {'host.d.ts': '// Registry.register()\ninterface SlotMap { "pane": {kind: "single";}; } declare class Registry {open(): void;}'};
    assert.ok(checkDeclarations(changed, required).every(c => !c.ok));
});

test('contract probe checks nested intersection members without accepting partial paths', () => {
    const required = {Info: [['tab', 'visible'], ['sidebar', 'fullscreen']]};
    const source = {'host.d.ts': 'interface Info { tab: HostTab & {visible: boolean}; sidebar: {}; }'};
    assert.deepEqual(checkDeclarations(source, required).map(c => c.ok), [true, false]);
});
