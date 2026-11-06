import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {CompactPanelLayout, halfPanelWidth, resolveLayoutStore} from '../src/client/host/compact-layout.js';

function layout(width = 648) {
    const info = {rightbar: width, viewportWidth: 1440};
    const calls = [];
    const store = {getSnapshot: () => ({layoutInfo: info}), actions: {setRightbar(value) { calls.push(value); info.rightbar = value; }}};
    return {info, calls, store, lease: new CompactPanelLayout(() => store)};
}

test('panel halves the width with a 300px host minimum', () => {
    assert.equal(halfPanelWidth(648), 324);
    assert.equal(halfPanelWidth(450), 300);
    const h = layout(null);
    h.lease.acquire(0);
    assert.deepEqual(h.calls, [324]);
    h.lease.dispose();
    assert.equal(h.info.rightbar, 648);
});

test('visible panels share one adjustment and the last release restores width', () => {
    const h = layout();
    const a = h.lease.acquire(648), b = h.lease.acquire(324);
    assert.deepEqual(h.calls, [324]);
    a(); a();
    assert.equal(h.info.rightbar, 324);
    b(); b();
    assert.deepEqual(h.calls, [324, 648]);
});

test('manual dragging is preserved; unloading restores only plugin width', () => {
    const h = layout();
    const release = h.lease.acquire(648);
    h.info.rightbar = 410;
    release();
    assert.equal(h.info.rightbar, 410);
    const staleRelease = h.lease.acquire(410);
    h.lease.dispose();
    staleRelease();
    assert.equal(h.info.rightbar, 410);
});

test('layout capability is resolved from the shared root store or degrades safely', () => {
    const h = layout();
    assert.equal(resolveLayoutStore({entriesOfSlot: () => [{store: {create: () => h.store}}]}), h.store);
    assert.equal(resolveLayoutStore({entriesOfSlot: () => []}), null);
    const lease = new CompactPanelLayout(() => null);
    lease.warned = true;
    const release = lease.acquire(500);
    assert.doesNotThrow(() => { release(); lease.dispose(); });
});

function client() {
    let api;
    const React = {createElement: (type, props, ...children) => ({type, props, children}),
        useState: initial => [typeof initial === 'function' ? initial() : initial, () => {}], useEffect() {}};
    vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
        window: {__ModuleLoader__: {load: d => {api = d.factory(() => React).__test;}}},
    });
    return api;
}

test('header composition preserves host bindings and cleans up without duplicate registration', () => {
    const api = client();
    const original = {options: {priority: 0}, store: {}, inject: {}, locale: 'host', component() {}};
    let listener, registration, registrations = 0, removed = 0, unsubscribed = 0;
    const slots = {
        inject: (_, fn) => fn(), entriesOfSlot: () => [original],
        subscribe: (_, fn) => {listener = fn; return () => unsubscribed++;},
        register(options, component) {
            registrations++; listener(); registration = {options, component};
            return () => removed++;
        },
    };
    const dispose = api.registerHeaderEntry(slots);
    listener();
    assert.equal(registrations, 1);
    for (const key of ['store', 'inject', 'locale']) assert.equal(registration.options[key], original[key]);
    assert.equal(registration.options.priority, -1);
    assert.equal(registration.component({}).children[1].type, original.component);
    dispose();
    assert.equal(removed, 1);
    assert.equal(unsubscribed, 1);
});

test('header task button opens the registered task tab and reflects unfinished work', () => {
    const api = client(), opened = [];
    api.runtime.sidebar = {openTab: kind => opened.push(kind)};
    const button = api.TaskEntry({useProjection: () => [{content: '验证', status: 'pending'}]});
    assert.equal(button.props['aria-label'], '打开任务进度');
    button.props.onClick(); button.props.onClick();
    assert.deepEqual(opened, ['todo-progress', 'todo-progress']);
    assert.equal(button.children[2].props['aria-label'], '有未完成任务');
    assert.equal(api.TaskEntry({useProjection: () => []}).children[2], null);
});
