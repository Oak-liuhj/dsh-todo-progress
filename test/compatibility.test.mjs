/** 对生成客户端执行故障注入，验证宿主可选能力变化不会阻断正文。 */
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CompactPanelLayout, resolveLayoutStore} from '../src/client/host/compact-layout.js';
import {canResizePanel} from '../src/client/host/presentation.js';

function client() {
    let exports;
    const warnings = [], effects = [];
    const React = {
        createElement: (type, props, ...children) => ({type, props, children}),
        useRef: value => ({current: value}),
        useState: value => [typeof value === 'function' ? value() : value, () => {}],
        useEffect: fn => effects.push(fn),
    };
    vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
        console: {warn: (...args) => warnings.push(args), error: (...args) => warnings.push(args)},
        window: {addEventListener() {}, removeEventListener() {},
            __ModuleLoader__: {load: d => { exports = d.factory(() => React); }}},
    });
    return {...exports, api: exports.__test, warnings, effects};
}

function host({deferred = false, fail = ''} = {}) {
    const registrations = [], waiting = new Map(), disposers = [];
    const scope = {
        effect(fn) { const dispose = fn(); if (typeof dispose === 'function') disposers.push(dispose); return dispose; },
        inject() { throw new Error('workspace navigation changed'); },
        sidebarRight: {openTab() {}},
        sidebarRightTabs: {register() { registrations.push('tab-kind'); return () => {}; }},
        slots: {
            inject(name, fn) {
                if (name === 'conversation.session.header.corner') throw new Error('header changed');
                if (deferred) { waiting.set(name, fn); return () => {}; }
                return fn();
            },
            register({name}) {
                if (name === fail) throw new Error('slot changed');
                registrations.push(name); return () => registrations.push(`removed:${name}`);
            },
        },
    };
    return {scope, registrations, waiting, disposers, ctx: {inject: (_, fn) => fn(scope)}};
}

test('optional header, navigation and legacy failures leave the core panel and title registered', () => {
    const c = client(), h = host({fail: 'conversation.input.dock'});
    assert.doesNotThrow(() => c.apply(h.ctx));
    assert.ok(h.registrations.includes('sidebar.right.pane.tab'));
    assert.ok(h.registrations.includes('sidebar.right.pane.tab.title'));
    assert.ok(h.registrations.includes('tab-kind'));
    assert.ok(c.warnings.length > 0);
    assert.doesNotThrow(() => h.disposers.reverse().forEach(fn => fn()));
    assert.equal(c.api.runtime.sidebar, null);
    assert.equal(c.api.runtime.layout, null);
});

test('deferred slot failures are isolated when the host declares slots after apply returns', () => {
    const c = client(), h = host({deferred: true, fail: 'sidebar.right.pane.tab.title'});
    c.apply(h.ctx);
    for (const fn of h.waiting.values()) assert.doesNotThrow(fn);
    assert.ok(h.registrations.includes('sidebar.right.pane.tab'));
    assert.ok(h.registrations.includes('conversation.input.dock'));
});

test('hosts without optional slots.inject still register a panel and preserve cleanup', () => {
    const c = client(), h = host();
    delete h.scope.slots.inject;
    c.apply(h.ctx);
    assert.ok(h.registrations.includes('sidebar.right.pane.tab'));
    h.disposers.reverse().forEach(fn => fn());
    assert.ok(h.registrations.includes('removed:sidebar.right.pane.tab'));
});

test('failed header registration retains a disposable subscription and cannot re-register after unload', () => {
    const {api} = client();
    let listener, registrations = 0, unsubscribed = 0;
    const slots = {
        inject: (_, fn) => fn(), entriesOfSlot: () => [{options: {}, component() {}}],
        subscribe: (_, fn) => {listener = fn; return () => {unsubscribed++; throw new Error('unsubscribe changed');};},
        register() { registrations++; throw new Error('registration changed'); },
    };
    const dispose = api.registerHeaderEntry(slots);
    assert.equal(registrations, 1);
    assert.doesNotThrow(dispose);
    listener(); dispose();
    assert.equal(registrations, 1);
    assert.equal(unsubscribed, 1);
});

test('missing tab information leaves body rendered and avoids resizing floating or unknown panels', () => {
    const c = client();
    let acquired = 0;
    c.api.runtime.layout = {acquire() { acquired++; }};
    for (const useTabInfo of [undefined, () => ({}), () => ({tab: {visible: true}}),
        () => {throw new Error('hook changed');},
        () => ({tab: {visible: true}, panel: {isFloating: true}, sidebar: {fullscreen: false}})]) {
        const panel = c.api.Panel({sessionId: 'one', useTabInfo});
        assert.equal(panel.children[0].type, c.api.Body);
    }
    c.effects.forEach(fn => fn());
    assert.equal(acquired, 0);
});

test('task entry survives removed sidebar and throwing projection; repeated warnings are bounded', () => {
    const c = client();
    c.api.runtime.sidebar = null;
    const props = {useProjection() { throw new Error('projection changed'); }};
    const button = c.api.TaskEntry(props);
    assert.equal(button.props.disabled, true);
    assert.doesNotThrow(button.props.onClick);
    c.api.TaskEntry(props);
    assert.equal(c.warnings.length, 1);
    c.api.runtime.sidebar = {openTab() {throw new Error('service changed');}};
    assert.doesNotThrow(() => c.api.TaskEntry({}).props.onClick());
});

test('legacy dock skips a removed mounted subscription API', () => {
    const c = client();
    c.api.runtime.sidebar = {mounted: {}};
    c.api.LegacyDock({sessionId: 'one'});
    c.effects.forEach(fn => assert.doesNotThrow(fn));
});

test('layout cleanup tolerates host removal after opening and clears retained state', t => {
    t.mock.method(console, 'warn', () => {});
    const store = {getSnapshot: () => ({layoutInfo: {rightbar: 648}}), actions: {setRightbar() {}}};
    const lease = new CompactPanelLayout(() => store);
    const release = lease.acquire(648);
    store.getSnapshot = () => { throw new Error('host disposed'); };
    assert.doesNotThrow(release);
    assert.equal(lease.store, null);
    assert.equal(lease.holders, 0);
    assert.doesNotThrow(() => lease.dispose());
    assert.equal(resolveLayoutStore({}), null);
});

test('new panel metadata and rc.5 dockkit markers distinguish floating panels from docked panels', () => {
    const info = {tab: {visible: true}, panel: {id: 'p1'}, sidebar: {fullscreen: false}};
    const dock = {closest: selector => selector === '[data-dockkit-pane]' ? {} : null};
    const floating = {closest: selector => selector === '[data-dockkit-float]' ? {} : null};
    assert.equal(canResizePanel(info, dock), true);
    assert.equal(canResizePanel(info, floating), false);
    assert.equal(canResizePanel(info, {closest: () => null}), false);
    assert.equal(canResizePanel({...info, panel: {isFloating: false}}, null), true);
    assert.equal(canResizePanel({...info, panel: {isFloating: true}}, dock), false);
    assert.equal(canResizePanel({...info, sidebar: {fullscreen: true}}, dock), false);
    assert.equal(canResizePanel({...info, tab: {visible: false}}, dock), false);
});
