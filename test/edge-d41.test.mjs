// D-41 回归门（回归教训：测真实出厂代码，不测替身）。
// 用与 selfcheck-load.mjs 同一套 vm 沙箱装载 client.js，取 exports.__test.edgeDecide 直接测帧沿判定。
// 覆盖：
//   ① D-41 场景：上帧 2 条 in_progress → 本帧 3/3 完成 ⇒ interrupted 必须为 null、m.a=false（无黄卡）
//   ② 真中断：上帧 2 条 in_progress → 投影清空 ⇒ interrupted 必须带 prev/act
//   ③ 无上一观测帧（会话开局就空）⇒ 永不判中断
//   ④ 上帧无 in_progress（全 pending）→ 清空 ⇒ 不判中断
//   ⑤ 仍有 in_progress 的新帧 ⇒ m.a=true 且撤销旧中断记忆
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
assert.ok(loaded && loaded.__test, "client.js 须导出 __test（否则测试测不到出厂代码）");

const edge = loaded.__test.edgeDecide;
const T = (content, status) => ({ content, status });
const frame = (rows) => {
  const act = rows.filter((r) => r.status === "in_progress").map((r, i) => ({ step: i + 1, content: r.content }));
  return { a: true, p: rows.map((r, i) => ({ step: i + 1, content: r.content, status: r.status })), act, pAt: 1793846000000 };
};

test("D-41：上帧 2 条进行中 → 本帧 3/3 完成 ⇒ 不判中断（.tp-interrupt 必须为 0）", () => {
  const m = frame([T("步骤一", "in_progress"), T("步骤二", "in_progress")]);
  const out = edge(m, [T("步骤一", "completed"), T("步骤二", "completed"), T("步骤三", "completed")], null);
  assert.equal(out.interrupted, null);
  assert.equal(m.a, false);
  assert.equal(out.activeN, 0);
  assert.equal(out.doneN, 3);
  assert.equal(out.fired, false);
  assert.equal(out.revoked, true);
});

test("D-41 补充：上帧有进行中、本帧全部完成但全是 pending 转 complete 的另一种形状也不误报", () => {
  const m = frame([T("a", "in_progress")]);
  const out = edge(m, [T("a", "completed")], null);
  assert.equal(out.interrupted, null);
  assert.equal(m.a, false);
});

test("R2-07 真中断：上帧进行中 → 投影清空 ⇒ 带 prev/act 快照", () => {
  const m = frame([T("步骤一", "in_progress"), T("步骤二", "in_progress")]);
  const out = edge(m, [], null);
  assert.ok(out.interrupted, "必须判中断");
  assert.equal(out.interrupted.prev.length, 2);
  assert.equal(out.interrupted.act.length, 2);
  assert.equal(out.interrupted.prev[0].content, "步骤一");
  assert.equal(m.a, false);
  assert.equal(out.fired, true);
});

test("会话开局就空：无上一观测帧 ⇒ 永不判中断（§1.2）", () => {
  const m = { a: false };
  const out = edge(m, [], null);
  assert.equal(out.interrupted, null);
  assert.equal(out.fired, false);
});

test("上帧全 pending 无进行中 → 清空 ⇒ 不判中断", () => {
  const m = { a: false, p: [T("a", "pending")] };
  const out = edge(m, [], null);
  assert.equal(out.interrupted, null);
});

test("本帧仍有进行中 ⇒ 撤销旧中断记忆并重记观测帧", () => {
  const m = frame([T("a", "in_progress")]);
  const out = edge(m, [T("a", "in_progress"), T("b", "pending")], { prev: [T("x", "in_progress")], act: [], since: 1 });
  assert.equal(out.interrupted, null);
  assert.equal(m.a, true);
  assert.equal(m.p.length, 2);
  assert.equal(out.activeN, 1);
});

// --- 回归：完成态不得残留黄标（中断已点火后再来全完成帧）---
test("已点火的中断 + 本帧 3/3 完成 ⇒ 黄标收口（interrupted=null、revoked=true）", () => {
  const m = { a: false, p: [T("甲", "in_progress"), T("乙", "in_progress")], act: [{ step: 1, content: "甲" }, { step: 2, content: "乙" }], pAt: 1 };
  const prev = { prev: m.p, act: m.act, since: 1 };
  const out = edge(m, [T("甲", "completed"), T("乙", "completed"), T("丙", "completed")], prev);
  assert.equal(out.interrupted, null);
  assert.equal(out.revoked, true);
  assert.equal(out.doneN, 3);
});

test("已点火的中断 + 本帧非空但无进行中（全 pending）⇒ 同样收口", () => {
  const m = { a: false };
  const prev = { prev: [T("甲", "in_progress")], act: [{ step: 1, content: "甲" }], since: 1 };
  const out = edge(m, [T("甲", "pending")], prev);
  assert.equal(out.interrupted, null);
  assert.equal(out.revoked, true);
});

test("已点火的中断 + 投影持续为空 ⇒ 黄标保留（等新帧收口）", () => {
  const m = { a: false };
  const prev = { prev: [T("甲", "in_progress")], act: [{ step: 1, content: "甲" }], since: 1 };
  const out = edge(m, [], prev);
  assert.ok(out.interrupted, "空帧期间黄标必须保留");
  assert.equal(out.fired, false);
  assert.equal(out.revoked, false);
});