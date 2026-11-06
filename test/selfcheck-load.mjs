// 闸 b：隔离可加载自检（两插件通用模式）。
// 目的：在零真实宿主的环境里模拟装载语义——
//   1) 静态扫描：禁宿主对象面的无先例属性访问（__ModuleLoader__ 只允许 .load）；
//   2) vm 沙箱执行整个 client.js 文本（=宿主 combo/standalone import 的执行面），
//      window 用 Proxy 包成「先例白名单」：只允许 __ModuleLoader__；任何其它 window.* 读取记违规；
//   3) mock loader 按先例语义立即执行 factory(require)，require 只认 seed word "react"（stub），
//      再 require 其它模块名记违规；
//   4) 断言 factory 导出形制：inject 须含 ["slots","sessions"]（D-36 口径），apply 为函数。
// 崩溃版在此闸的表现 = 顶层读 __ModuleLoader__.registry → registry 为 undefined → TypeError 复现。
// 退出码：0=过闸，1=违规/异常。输出直接贴群并归档 selfcheck-output.txt。
import { readFileSync } from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
// 可选 argv：对指定文件跑同一闸（用于验证闸门能抓崩溃版快照 client.snapshot.m1.js）
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.join(dir, "..", "client.js");
const src = readFileSync(target, "utf8");
const violations = [];
const errors = [];

// —— 1) 静态扫描：无先例的宿主面属性访问 ——
const lines = src.split(/\r?\n/);
lines.forEach((raw, i) => {
  const line = raw.trimStart();
  if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) return; // 纯注释行豁免（教训注释会提及坏面名）
  // __ModuleLoader__ 只允许 .load（先例实证）；.registry / .xxx 等一律违规
  const m = line.match(/__ModuleLoader__\.(\w+)/g) || [];
  for (const acc of m) if (!acc.endsWith(".load")) violations.push(`L${i + 1} 静态: ${acc}`);
  // 曾出现过的具体坏面（回归防呆，即使写法绕过上面的正则也要被抓）
  if (/__registeredPlugins__/.test(line)) violations.push(`L${i + 1} 静态: __registeredPlugins__ 无先例`);
});

// —— react stub（seed word，宿主 loader 注入的 CJS require 面）——
function makeReact() {
  return {
    createElement: (type, props, ...children) => ({ type, props, children }),
    Fragment: "Fragment",
    useState: (v) => [v, () => {}],
    useEffect: () => {},
    useMemo: (f) => f(),
    useRef: (v) => ({ current: v }),
    useCallback: (f) => f,
  };
}
const loaded = [];
function mockRequire(name) {
  if (name === "react") return makeReact();
  violations.push(`require("${name}")：非 seed word 白名单（仅 "react"）`);
  return {};
}

// —— 2) vm 沙箱 + window Proxy 白名单 ——
const sandbox = { console: { log: () => {}, warn: () => {}, error: () => {} } };
sandbox.globalThis = sandbox;
const moduleLoader = {
  load(desc) {
    loaded.push(desc);
    if (typeof desc.id !== "string" || typeof desc.factory !== "function") {
      errors.push(`load() 参数形制错误：id=${typeof desc.id} factory=${typeof desc.factory}`);
      return;
    }
    // 3) 先例语义：loader 立即以 require 面执行 factory 取模块导出
    try {
      desc.exportsResult = desc.factory(mockRequire);
    } catch (e) {
      errors.push("factory 执行抛错: " + (e && e.message));
    }
  },
};
sandbox.window = new Proxy(
  { __ModuleLoader__: moduleLoader },
  {
    get(t, prop) {
      if (prop === "__ModuleLoader__") return t[prop];
      if (typeof prop === "symbol") return t[prop];
      violations.push(`window.${String(prop)}：无先例宿主面读取`);
      return t[prop];
    },
    has() { return true; },
    set(t, prop, v) { t[prop] = v; return true; },
  }
);
vm.createContext(sandbox);
try {
  // 模拟宿主 <script>/bundle import：整文件顶层执行（崩溃版在此复现 TypeError）
  vm.runInContext(src, sandbox, { filename: "client.js" });
} catch (e) {
  errors.push("顶层 import 抛错: " + (e && e.stack ? String(e.stack).split("\n").slice(0, 3).join(" | ") : e));
}

// —— 4) 导出形制断言 ——
if (loaded.length === 0) errors.push("未观察到 window.__ModuleLoader__.load() 调用");
for (const m of loaded) {
  const x = m.exportsResult;
  if (!x) { errors.push(`模块 ${m.id}: factory 无导出`); continue; }
  const inj = JSON.stringify(x.inject || null);
  // D-36 门禁改口径（R11）：宿主只暴露顶层 inject 声明的服务；pane.tab 席位
  // 读 todos 需 sessions。先例=asar 实读 80946538 处 session-inspector（同席位
  // pane.tab，inject:(sessionId)=>ctx.sessions.binding(sessionId) 且顶层声明
  // sessions）。旧口径「恰为 ["slots"]」源自 dsh-pick（它确实只用 slots），判错。
  const injArr = Array.isArray(x.inject) ? x.inject : [];
  if (!injArr.includes("slots") || !injArr.includes("sessions")) errors.push(`模块 ${m.id}: inject=${inj}，须含 slots 与 sessions（D-36 口径）`);
  if (typeof x.apply !== "function") errors.push(`模块 ${m.id}: apply 非函数（=${typeof x.apply}）`);
}

// —— 报告 ——
console.log("== 隔离可加载自检 client.js ==");
console.log("load() 调用: " + loaded.map((m) => `${m.id}(inject=${JSON.stringify((m.exportsResult||{}).inject)} apply=${typeof (m.exportsResult||{}).apply})`).join(", ") || "无");
console.log("静态违规: " + (violations.length ? "\n  - " + violations.join("\n  - ") : "0 处"));
console.log("执行/形制错误: " + (errors.length ? "\n  - " + errors.join("\n  - ") : "0 处"));
const pass = violations.length === 0 && errors.length === 0 && loaded.length === 1;
console.log(pass ? "结果：PASS（过闸 b）" : "结果：FAIL（不得上宿主）");
process.exitCode = pass ? 0 : 1;
