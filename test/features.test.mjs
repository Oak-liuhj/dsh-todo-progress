import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Readable} from 'node:stream';
import Server from '../index.js';

function harness(seed) {
    let plugin, cursor = 0, now = 100000, component, props, tree, pending = [];
    const cells = [], effects = [], timers = new Map(), storage = new Map(seed);
    let seq = 0;
    const react = {
        createElement: (type, props, ...children) => ({type, props: props || {}, children: children.flat(Infinity)}),
        useState(initial) {
            const i = cursor++;
            if (!(i in cells)) cells[i] = typeof initial === 'function' ? initial() : initial;
            return [cells[i], value => { cells[i] = typeof value === 'function' ? value(cells[i]) : value; }];
        },
        useRef(initial) { const i = cursor++; return cells[i] || (cells[i] = {current: initial}); },
        useEffect(fn, deps) {
            const i = cursor++;
            if (!effects[i] || deps.some((v, n) => v !== effects[i].deps[n])) {
                pending.push(() => { effects[i]?.dispose?.(); effects[i] = {deps, dispose: fn()}; });
            }
        },
    };
    const FakeDate = class extends Date { static now() { return now; } };
    const sandbox = {console, Date: FakeDate, TextEncoder, AbortController, Event,
        localStorage: {getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value)},
        fetch: () => new Promise(() => {}),
        setTimeout: (fn, delay) => { timers.set(++seq, {fn, at: now + delay}); return seq; },
        clearTimeout: id => timers.delete(id),
        window: {addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
            __ModuleLoader__: {load: desc => { plugin = desc.factory(() => react); }}},
    };
    vm.runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), sandbox);
    const render = () => { cursor = 0; tree = component(props); const jobs = pending; pending = []; jobs.forEach(fn => fn()); return tree; };
    return {api: plugin.__test, storage, timers,
        mount(name, value) { component = plugin.__test[name]; props = value; return render(); },
        render, get tree() { return tree; },
        tick(ms) { now += ms; const due = [...timers].filter(([, t]) => t.at <= now); due.forEach(([id, t]) => { timers.delete(id); t.fn(); }); return render(); },
        unmount() { effects.forEach(e => e.dispose?.()); },
    };
}
const nodes = tree => !tree || typeof tree !== 'object' ? [] : [tree, ...tree.children.flatMap(nodes)];
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree) : tree?.children?.map(text).join('') || '';
const click = (h, label) => {
    const button = nodes(h.tree).find(n => n.type === 'button' && text(n) === label);
    assert.ok(button, label); button.props.onClick(); h.render();
};

test('pending-only snapshot shows the unread blue dot, completed-only clears it', () => {
    const h = harness(); let status = 'pending';
    h.mount('ChipTitle', {useProjection: () => [{content: '验收', status}]});
    assert.equal(nodes(h.tree).filter(n => n.props.className === 'tp-badge').length, 1);
    status = 'completed'; h.render();
    assert.equal(nodes(h.tree).filter(n => n.props.className === 'tp-badge').length, 0);
});

test('completion deadline triggers a render without projection changes; reopening, new list and unmount work', () => {
    const h = harness(); let rows = [{content: '验收', status: 'completed'}];
    h.mount('Body', {sessionId: 'test', useProjection: () => rows});
    assert.ok(!text(h.tree).includes('✓ 已完成 1 项'));
    h.tick(30 * 60000);
    assert.ok(text(h.tree).includes('✓ 已完成 1 项'));
    click(h, '✓ 已完成 1 项');
    assert.ok(!nodes(h.tree).some(n => n.props.className === 'tp-badgebtn'));
    rows = [{content: '第二组', status: 'completed'}]; h.render();
    assert.ok(!nodes(h.tree).some(n => n.props.className === 'tp-badgebtn'));
    h.tick(30 * 60000);
    assert.ok(text(h.tree).includes('✓ 已完成 1 项'));
    rows = [{content: '第三组', status: 'completed'}]; h.render();
    assert.ok(h.timers.size > 0); h.unmount(); assert.equal(h.timers.size, 0);
});

test('whole-panel collapse and legacy toggle preserve source data, settings and refresh state', () => {
    const h = harness(); const rows = Object.freeze([Object.freeze({content: '只读任务', status: 'pending'})]);
    h.mount('Body', {sessionId: 'test', useProjection: () => rows});
    nodes(h.tree).find(n => n.props['aria-label'] === '更多操作').props.onClick(); h.render();
    click(h, '兼容旧面板：关'); click(h, '完成收起阈值：30 分钟（点击切换）');
    const cfg = JSON.parse(h.storage.get('dsh-task-panel.config.v1'));
    assert.deepEqual(cfg, {collapseMinutes: 1, legacyDock: true});
    click(h, '收起面板');
    assert.ok(text(h.tree).includes('展开任务进度（1 项）'));
    assert.equal(JSON.parse(h.storage.get('dsh-task-panel.frames.v1')).test.panelCollapsed, true);
    click(h, '展开任务进度（1 项）');
    assert.equal(rows[0].status, 'pending');
});

test('handoff fallback never replaces real projection or resurrects cleared observed tasks', () => {
    const h = harness(); const inherited = [{content: '旧卷', status: 'in_progress'}];
    const info = {handoff: {todos: inherited}};
    assert.equal(h.api.handoffRows(null, info, false), inherited);
    assert.equal(h.api.handoffRows([], info, true).length, 0);
    const current = [{content: '新卷', status: 'pending'}];
    assert.equal(h.api.handoffRows(current, info, false), current);
});

test('interruption survives a fresh page load without changing the source projection', () => {
    const h = harness(); let rows = [{content: '未做完', status: 'in_progress'}];
    h.mount('Body', {sessionId: 'test', useProjection: () => rows});
    rows = []; h.render();
    assert.ok(nodes(h.tree).some(n => n.props.className === 'tp-interrupt'));
    const fresh = harness(h.storage);
    fresh.mount('Body', {sessionId: 'test', useProjection: () => rows});
    assert.ok(nodes(fresh.tree).some(n => n.props.className === 'tp-interrupt'));
    assert.equal(rows.length, 0);
});

async function request(input, overrides = {}, headers = {}) {
    const server = Object.create(Server.prototype); let mutations = 0, createdOptions;
    server.ctx = {connection: {admit: () => ({peer: {principal: {kind: 'owner'}}})},
        workspaceRegistry: {list: () => []},
        sessions: {get: () => ({id: 'test'})}, sessionProjections: {stateOf: () => 'D:/work'},
        sessionController: {create: async options => { mutations++; createdOptions = options; return {sessionId: 'new'}; }}, ...overrides};
    server.rollover = {rollover: async () => { mutations++; return {status: 'rolled-over', newSessionId: 'continued'}; }};
    const req = Readable.from([JSON.stringify(input)]);
    Object.assign(req, {method: 'POST', url: '/api-dsh-todo-progress', headers: {'content-type': 'application/json', host: 'localhost:3080', origin: 'http://localhost:3080', ...headers}});
    let status, body;
    await server.handle(req, {writeHead: code => { status = code; }, end: data => { body = JSON.parse(data); }});
    return {status, body, mutations, createdOptions};
}
test('bridge requires owner authentication and rejects invalid actions before any mutation', async () => {
    assert.equal((await request({action: 'new', sessionId: 'test'}, {connection: {admit: () => ({rejection: 401})}})).mutations, 0);
    assert.equal((await request({action: 'new', sessionId: 'test'}, {connection: {admit: () => ({peer: {principal: {kind: 'share-viewer'}}})}})).status, 403);
    assert.equal((await request({action: 'unknown', sessionId: 'test'})).status, 400);
    assert.equal((await request({action: 'rollover', sessionId: '../escape'})).status, 400);
    assert.equal((await request({action: 'rollover', sessionId: 'test'})).body.newSessionId, 'continued');
    assert.equal((await request({action: 'new', sessionId: 'test'})).body.newSessionId, 'new');
});

test('bridge rejects cross-origin, oversized and null payloads without mutations', async () => {
    const crossOrigin = await request({action: 'new', sessionId: 'test'}, {}, {origin: 'http://other.example'});
    assert.equal(crossOrigin.status, 403);
    assert.equal(crossOrigin.mutations, 0);
    const oversized = await request({action: 'new', sessionId: 'test', padding: 'x'.repeat(4096)});
    assert.equal(oversized.status, 413);
    assert.equal(oversized.mutations, 0);
    const nullBody = await request(null);
    assert.equal(nullBody.status, 400);
    assert.equal(nullBody.mutations, 0);
});

test('new session inherits workspace first, otherwise working directory', async () => {
    const input = {action: 'new', sessionId: 'test'};
    assert.deepEqual((await request(input)).createdOptions, {cwd: 'D:/work'});
    const workspace = await request(input, {workspaceRegistry: {list: () => [{id: 'workspace-1', sessionIds: ['test']}]}});
    assert.deepEqual(workspace.createdOptions, {workspaceId: 'workspace-1'});
});
