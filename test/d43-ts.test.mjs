// D-43 回归门：ts 落帧快照（「更新于」= 待办更新时间，不是渲染时刻）。
// 同 edge-d41：vm 装载真实 client.js，取 exports.__test.frameTsDecide，不测替身。
// 覆盖：
//   ① 首次观测 ⇒ 记录 now
//   ② 刷新（帧快照经 JSON 往返，等同 localStorage）且内容不变 ⇒ ts 不前移
//   ③ 内容变（status 变）⇒ ts 换新
//   ④ 内容变（仅 content 变）⇒ ts 换新
//   ⑤ 清空清单 ⇒ ts 换新
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";

const dir = path.dirname(fileURLToPath(import.meta.url));
const src = readFileSync(path.join(dir, "..", "client.js"), "utf8");

const react = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: "Fragment",
  useState: (v) => [v, () => {}],
  useEffect: () => {},
  useMemo: (f) => f(),
  useRef: (v) => ({ current: v }),
  useCallback: (f) => f,
};
let loaded = null;
const sandbox = { console: { log() {}, warn() {}, error() {} } };
sandbox.globalThis = sandbox;
sandbox.window = {
  __ModuleLoader__: {
    load(desc) { loaded = desc.exportsResult = desc.factory((n) => (n === "react" ? react : {})); },
  },
};
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: "client.js" });
assert.ok(loaded && loaded.__test && typeof loaded.__test.frameTsDecide === "function",
  "client.js 须导出 __test.frameTsDecide");

const decide = loaded.__test.frameTsDecide;
const T = (content, status) => ({ content, status });
const reload = (m) => JSON.parse(JSON.stringify(m)); // localStorage 往返
const NOW1 = 1793846000000;
const NOW2 = 1793846123456;

test("D-43 ①：首次观测记录 now", () => {
  const m = { a: false, p: [] };
  const rows = [T("步骤一", "in_progress"), T("步骤二", "pending")];
  const out = decide(m, rows, NOW1);
  assert.equal(out.changed, true);
  assert.equal(out.ts, NOW1);
  assert.equal(m.u, NOW1);
  assert.equal(typeof m.uSig, "string");
  assert.notEqual(m.uSig, "");
});

test("D-43 ②：刷新后内容不变 ⇒ ts 保持旧值（不前移）", () => {
  const rows = [T("步骤一", "completed"), T("步骤二", "in_progress")];
  const m0 = { a: false, p: [] };
  decide(m0, rows, NOW1);
  const m = reload(m0); // 刷新 = 重新 framesLoad()
  const out = decide(m, rows, NOW2);
  assert.equal(out.changed, false);
  assert.equal(out.ts, NOW1, "刷新不得把「更新于」推到渲染时刻");
});

test("D-43 ③：status 变化 ⇒ ts 换新", () => {
  const m = { a: false, p: [] };
  decide(m, [T("步骤一", "in_progress")], NOW1);
  const out = decide(reload(m), [T("步骤一", "completed")], NOW2);
  assert.equal(out.changed, true);
  assert.equal(out.ts, NOW2);
});

test("D-43 ④：仅 content 变化 ⇒ ts 换新", () => {
  const m = { a: false, p: [] };
  decide(m, [T("旧标题", "pending")], NOW1);
  const out = decide(reload(m), [T("新标题", "pending")], NOW2);
  assert.equal(out.changed, true);
  assert.equal(out.ts, NOW2);
});

test("D-43 ⑤：清单清空 ⇒ ts 换新；空帧重复观测不前移", () => {
  const m = { a: true, p: [{ step: 1, content: "步骤一", status: "in_progress" }], act: [] };
  const out1 = decide(m, [], NOW1);
  assert.equal(out1.changed, true);
  assert.equal(out1.ts, NOW1);
  const out2 = decide(reload(m), [], NOW2);
  assert.equal(out2.changed, false);
  assert.equal(out2.ts, NOW1);
});