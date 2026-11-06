// dsh-task-panel — 会话任务进度右侧栏 tab（todos 投影只读适配层）
// 接口契约 §1（只读投影口径）；UI 逐件抄自 UI 原型 v0.1（renderR2Panel doing/empty/interrupt 屏）。
// M2：宿主惯用法（D-42）— 组件取 props.useProjection("todos") 标准注入，不写 inject、不手写 subscribe+setTick；深色主题、筛选 chips、完成度汇总、
// JSON 快照导出、R2-07 三条件中断、AC-R2-10 完成收起、键盘可达与对比度（D-25/26/27/33/34/35）。
// 类名映射：宿主席位无关的本组件契约类名保持 .tp-row/.tp-text/.tp-count/.tp-ico/.tp-step
// （探针契约）；原型新增件用原型原词 .pct/.tp-bar/.exp/.sub/.tp-meta/
// .tp-cur/.tp-interrupt/.tp-done-card/.tp-empty/.tp-chips/.g/.kv/.dot。
(function () {
    window.__ModuleLoader__.load({
        // 必须与包名 / dsh.client 条目 id 逐字一致（package.json name=dsh-todo-progress；
        // dsBot.aliases 里的 dsh-task-panel 只是显示用别名，loader 不认）。
        id: "dsh-todo-progress",
        factory: function (require) {
            // 宿主 loader 先例（dsh-pick / dsh-client-modules 本体）：factory 只收 require，
            // module 由包体内自建，loader 读 factory 返回值作模块导出。
            var module = {exports: {}};
            var React = require("react");
            var h = React.createElement;
            var useRef = React.useRef;
            var useEffect = React.useEffect;
            var useState = React.useState;

            var NS = "dsh-task-panel";
            var VERSION = "0.2.0";
            var TAB_KIND = "todo-progress";
            var SLOT = "sidebar.right.pane.tab";
            var FRAMES_KEY = NS + ".frames.v1";
            var CFG_KEY = NS + ".config.v1";
            var COLLAPSE_STEPS = [30, 1, 60];

            // ---------- 设计 token（D-25：浅/深两套，按宿主 color-scheme 取） ----------
            var LIGHT = {
                ink: "#0f1115", ink2: "#61666b", ink3: "#81858c", safe: "#6b7076",
                accent: "#4d6bfe", accTxt: "#3d56d6", ok: "#189a5d", okTxt: "#127a4a",
                warn: "#b25e09", warnTxt: "#a3540a",
                line: "rgba(0,0,0,.10)", line2: "rgba(0,0,0,.06)",
                card2: "#fafbfc", acw: "rgba(77,107,254,.09)", acw2: "rgba(77,107,254,.16)",
                warnBg: "rgba(178,94,9,.10)", chipOn: "rgba(77,107,254,.13)", chipLine: "rgba(0,0,0,.08)"
            };
            var DARK = {
                ink: "#e9ebef", ink2: "#a7acb4", ink3: "#8b9098", safe: "#9ba1a9",
                accent: "#7d95ff", accTxt: "#a8b9ff", ok: "#3ecf8e", okTxt: "#5fdcaa",
                warn: "#d99530", warnTxt: "#eab45e",
                line: "rgba(255,255,255,.14)", line2: "rgba(255,255,255,.08)",
                card2: "#1a1c20", acw: "rgba(125,149,255,.14)", acw2: "rgba(125,149,255,.26)",
                warnBg: "rgba(217,149,48,.14)", chipOn: "rgba(125,149,255,.20)", chipLine: "rgba(255,255,255,.12)"
            };

            function themeIsDark() {
                try {
                    var de = document.documentElement;
                    var cs = "";
                    try {
                        cs = getComputedStyle(de).colorScheme || "";
                    } catch (e) {
                    }
                    if (!cs) cs = de.style && de.style.colorScheme ? de.style.colorScheme : "";
                    if (/dark/.test(cs)) return true;
                    if (/light/.test(cs)) return false;
                    var src = de.getAttribute("data-ds-theme-source");
                    if (src === "dark") return true;
                    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
                } catch (e) {
                    return false;
                }
            }

            var C = LIGHT; // 当前生效 token（ensureCss 时按主题刷新）
            // 状态词表：宿主投影 = pending/in_progress/completed；interrupt 为客户端帧沿判定态（非投影值）
            var SUB_LABEL = {
                pending: "待开始 · 等前面步骤释放",
                in_progress: "进行中 · 模型正在做这一步",
                complete: "已完成",
                interrupt: "未完成即中断",
                failed: "未完成即中断"
            };
            var ROW_TITLE_LABEL = {
                pending: "未开始", in_progress: "进行中", complete: "已完成",
                interrupt: "未完成即中断", failed: "未完成即中断"
            };
            var FILTERS = [
                {id: "all", label: "全部"},
                {id: "active", label: "进行中"},
                {id: "pending", label: "待办"},
                {id: "done", label: "完成"}
            ];
            // 兜底：未知 status → pending（渲染不崩，记 warn 一次）
            var warnedUnknown = {};
            var warnedNoFace = false; // D-37：face 断链一次性告警位

            function cssText(t) {
                return [
                    ".tp-panel { display:flex; flex-direction:column; height:100%; overflow:hidden;",
                    " font:13px/20px -apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif; color:" + t.ink2 + "; }",
                    ".tp-head { flex:0 0 auto; padding:10px 14px 6px; }",
                    ".tp-head .row1 { display:flex; align-items:center; gap:6px; }",
                    ".tp-head .tt { font-size:13px; font-weight:500; line-height:24px; white-space:nowrap; color:" + t.ink + "; }",
                    ".tp-count { margin-left:auto; font-size:12.5px; color:" + t.ink2 + ";",
                    " font-variant-numeric:tabular-nums; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }",
                    ".pct { font-size:12px; color:" + t.safe + "; width:34px; text-align:right; font-variant-numeric:tabular-nums; }",
                    ".tp-bar { height:5px; border-radius:99px; background:" + t.line2 + "; overflow:hidden; margin-top:8px; position:relative; }",
                    ".tp-bar i { display:block; height:100%; background:" + t.accent + "; border-radius:99px; transition:width .5s ease; }",
                    ".tp-meta { display:flex; align-items:center; gap:6px; font-size:11.5px; color:" + t.safe + "; margin-top:6px; }",
                    ".tp-more { flex:none; border:0; background:none; color:" + t.ink3 + "; font-size:14px; line-height:20px;",
                    " width:24px; height:24px; border-radius:6px; cursor:pointer; margin-left:2px; }",
                    ".tp-more:hover, .tp-more[aria-expanded=\"true\"] { background:" + t.line2 + "; color:" + t.ink + "; }",
                    ".tp-menu { margin-top:6px; display:flex; flex-direction:column; gap:2px; border:.5px solid " + t.line + ";",
                    " border-radius:8px; padding:4px; background:" + t.card2 + "; }",
                    ".tp-menu button { text-align:left; border:0; background:none; color:" + t.ink2 + "; font-size:12px;",
                    " line-height:22px; padding:2px 8px; border-radius:6px; cursor:pointer; }",
                    ".tp-menu button:hover { background:" + t.acw + "; color:" + t.ink + "; }",
                    ".tp-export { margin:8px 14px 0; }",
                    ".tp-export textarea { width:100%; box-sizing:border-box; height:150px; resize:vertical; font-size:11px; line-height:16px;",
                    " font-family:'SF Mono','JetBrains Mono',Consolas,monospace; color:" + t.ink2 + "; background:" + t.card2 + ";",
                    " border:.5px solid " + t.line + "; border-radius:8px; padding:8px; }",
                    ".tp-export .bar { display:flex; gap:8px; align-items:center; margin-top:4px; font-size:11.5px; color:" + t.safe + "; }",
                    ".tp-export a { color:" + t.accTxt + "; }",
                    ".tp-chips { display:flex; gap:6px; flex-wrap:wrap; margin:8px 14px 0; }",
                    ".tp-chip { border:.5px solid " + t.chipLine + "; background:none; color:" + t.ink2 + "; cursor:pointer;",
                    " font-size:11.5px; line-height:18px; padding:2px 9px; border-radius:99px; }",
                    ".tp-chip .n { color:" + t.safe + "; margin-left:3px; font-variant-numeric:tabular-nums; }",
                    ".tp-chip[aria-pressed=\"true\"] { background:" + t.chipOn + "; border-color:" + t.acw2 + "; color:" + t.accTxt + "; }",
                    ".tp-chip[aria-pressed=\"true\"] .n { color:" + t.accTxt + "; }",
                    ".tp-chip:focus-visible, .tp-more:focus-visible, .exp:focus-visible, .tp-text:focus-visible, .btn:focus-visible",
                    " { outline:2px solid " + t.accent + "; outline-offset:1px; }",
                    ".tp-cur { margin:8px 14px 0; font-size:12px; color:" + t.ink2 + "; background:" + t.acw + ";",
                    " border-radius:8px; padding:5px 9px; line-height:18px; }",
                    ".tp-cur b { color:" + t.accTxt + "; font-weight:600; }",
                    ".muted { color:" + t.safe + "; font-size:11.5px; }",
                    ".tp-interrupt { margin:8px 14px 0; display:flex; gap:8px; align-items:flex-start;",
                    " border:.5px solid " + t.warn + "; background:" + t.warnBg + "; border-radius:10px;",
                    " padding:10px 12px; font-size:12.5px; line-height:19px; color:" + t.ink + "; }",
                    ".tp-interrupt b { color:" + t.warnTxt + "; }",
                    ".tp-interrupt .why { color:" + t.safe + "; font-size:11.5px; line-height:18px; }",
                    ".tp-interrupt .btn { margin-top:6px; display:inline-block; border:.5px solid " + t.warn + ";",
                    " color:" + t.warnTxt + "; border-radius:99px; font-size:11.5px; padding:2px 10px; cursor:pointer; background:none; }",
                    ".tp-done-card { text-align:center; padding:18px 14px; color:" + t.ink2 + "; font-size:12.5px; }",
                    ".tp-done-card .big { font-size:26px; color:" + t.okTxt + "; line-height:40px; }",
                    ".tp-done-card .muted { display:block; margin-top:2px; }",
                    ".tp-badgebtn { border:.5px solid " + t.line + "; background:" + t.card2 + "; color:" + t.okTxt + ";",
                    " font-size:13px; line-height:20px; padding:9px 14px; border-radius:99px; cursor:pointer; }",
                    ".tp-badgebtn:hover { border-color:" + t.acw2 + "; }",
                    ".tp-list { flex:1 1 auto; overflow-y:auto; margin:0; padding:6px 14px 8px;",
                    " display:flex; flex-direction:column; gap:2px; min-height:0; }",
                    ".tp-row { display:flex; align-items:flex-start; gap:8px; padding:6px 8px;",
                    " border-radius:8px; border:.5px solid transparent; flex-wrap:wrap; }",
                    ".tp-row.cur { background:" + t.acw + "; border-color:" + t.acw2 + "; }",
                    ".tp-step { flex:none; width:16px; font-size:11px; color:" + t.safe + "; text-align:right;",
                    " line-height:20px; font-variant-numeric:tabular-nums; }",
                    ".tp-ico { flex:none; width:16px; height:16px; display:grid; place-items:center; margin-top:2px; }",
                    ".dot { width:9px; height:9px; border-radius:50%; }",
                    ".dot.idle { background:none; border:1.5px solid " + t.ink3 + "; }",
                    ".dot.ongoing { background:" + t.accent + "; box-shadow:0 0 0 0 " + t.acw2 + "; animation:" + NS + "-pulse 1.6s infinite; }",
                    ".dot.done { background:" + t.ok + "; }",
                    ".dot.interrupt { background:none; border:1.5px solid " + t.warn + "; }",
                    "@keyframes " + NS + "-pulse { from { box-shadow:0 0 0 0 " + t.acw2 + "; }",
                    " to { box-shadow:0 0 0 6px rgba(77,107,254,0); } }",
                    ".tp-text { flex:1 1 auto; min-width:0; font-size:13px; line-height:20px; color:" + t.ink2 + ";",
                    " word-break:break-word; cursor:pointer; }",
                    ".tp-row.s-complete .tp-text { color:" + t.safe + "; }",
                    ".tp-row.s-interrupt .tp-text { color:" + t.warnTxt + "; }",
                    ".tp-row.cur .tp-text { color:" + t.ink + "; }",
                    ".exp { flex:none; width:14px; height:14px; margin-top:3px; display:grid; place-items:center;",
                    " color:" + t.ink3 + "; opacity:.7; transition:transform .18s; cursor:pointer; position:relative;",
                    " border-radius:4px; }",
                    ".exp::after { content:\"\"; position:absolute; inset:-5px; }",
                    ".tp-row.open .exp { transform:rotate(90deg); opacity:1; color:" + t.accent + "; }",
                    ".tp-row.open { background:" + t.card2 + "; border-color:" + t.line + "; }",
                    ".sub { display:none; flex-basis:100%; margin:3px 0 2px 26px; padding:6px 8px;",
                    " border-left:2px solid " + t.line + "; font-size:11.5px; line-height:18px; color:" + t.safe + "; }",
                    ".tp-row.open .sub { display:block; }",
                    ".sub .kv { display:flex; gap:6px; }",
                    ".sub .kv span:first-child { flex:none; color:" + t.safe + "; min-width:44px; }",
                    ".sub .kv b { color:" + t.ink2 + "; font-weight:500; }",
                    ".tp-badge { width:7px; height:7px; border-radius:50%; background:" + t.accent + ";",
                    " display:inline-block; margin-left:4px; vertical-align:1px; }",
                    ".tp-empty { margin-top:auto; margin-bottom:auto; text-align:center; color:" + t.safe + "; font-size:12.5px;",
                    " line-height:20px; padding:30px 24px; }",
                    ".tp-empty svg { opacity:.5; margin-bottom:10px; }",
                    ".tp-empty .h3 { font-size:13px; color:" + t.ink2 + "; }",
                    ".tp-empty .g { margin-top:8px; font-size:11.5px; color:" + t.safe + "; background:" + t.card2 + ";",
                    " border:.5px dashed " + t.line + "; border-radius:8px; padding:8px 10px; text-align:left; }",
                    ".tp-empty .g code { font-family:'SF Mono','JetBrains Mono',Consolas,'Microsoft YaHei',monospace;",
                    " font-size:11px; color:" + t.accTxt + "; }",
                    ".tp-note { padding:10px 0; color:" + t.safe + "; text-align:center; font-size:12.5px; }",
                    "@media (prefers-reduced-motion: reduce) { .dot.ongoing { animation:none; }",
                    " .tp-bar i, .exp { transition:none; } }"
                ].join("\n");
            }

            var cssDark = null; // null = 未注入；true/false = 已注入的 token 主题
            function ensureCss() {
                if (typeof document === "undefined") return;
                var dark = themeIsDark();
                C = dark ? DARK : LIGHT;
                var st = document.getElementById(NS + "-style");
                if (st && cssDark === dark) return;
                if (!st) {
                    st = document.createElement("style");
                    st.id = NS + "-style";
                    document.head.appendChild(st);
                }
                st.textContent = cssText(C);
                cssDark = dark;
            }

            function useTheme() {
                var _d = useState(themeIsDark), dark = _d[0], setDark = _d[1];
                useEffect(function () {
                    var upd = function () {
                        setDark(themeIsDark());
                    };
                    var mo = null;
                    try {
                        mo = new MutationObserver(upd);
                        mo.observe(document.documentElement, {
                            attributes: true,
                            attributeFilter: ["style", "data-ds-theme-source", "class"]
                        });
                    } catch (e) {
                    }
                    var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
                    if (mq) {
                        if (mq.addEventListener) mq.addEventListener("change", upd); else if (mq.addListener) mq.addListener(upd);
                    }
                    return function () {
                        try {
                            if (mo) mo.disconnect();
                        } catch (e) {
                        }
                        if (mq) {
                            if (mq.removeEventListener) mq.removeEventListener("change", upd); else if (mq.removeListener) mq.removeListener(upd);
                        }
                    };
                }, []);
                useEffect(function () {
                    ensureCss();
                }, [dark]);
                return dark;
            }

            // ---------- 只读口径（只读投影口径；投影数组即渲染源） ----------
            function derive(rows) {
                var out = {
                    list: [], total: 0, done: 0, active: 0, pending: 0, pct: 0,
                    cur: null, curStep: null, warn: false
                };
                if (!Array.isArray(rows)) return out;
                var idx = 0;
                for (var i = 0; i < rows.length; i++) {
                    var r = rows[i];
                    if (!r || typeof r.content !== "string") continue;
                    idx += 1; // 步号 = todos 投影数组位置 index（1 起，派生不持久化，接口契约）
                    var status = typeof r.status === "string" ? r.status : "pending";
                    // 宿主 todo schema 字面量是 "completed"（asar schema 实读），面板内部口径 complete。
                    if (status === "completed") status = "complete";
                    if (!SUB_LABEL[status]) {
                        if (!warnedUnknown[status]) {
                            warnedUnknown[status] = true;
                            try {
                                console.warn("[" + NS + "] 未知 status，按未开始渲染:", status);
                            } catch (e) {
                            }
                        }
                        status = "pending";
                    }
                    out.total += 1;
                    if (status === "complete") out.done += 1;
                    else if (status === "in_progress") out.active += 1;
                    else out.pending += 1;
                    out.list.push({
                        step: idx, content: r.content, status: status,
                        note: typeof r.note === "string" ? r.note : "",
                        key: r.id || (idx + ":" + r.content)
                    });
                    // 当前步 = 首个 in_progress（并行：所有 in_progress 行都高亮，汇总取首个）
                    if (!out.cur && status === "in_progress") {
                        out.cur = out.list[out.list.length - 1];
                        out.curStep = idx;
                    }
                }
                out.pct = out.total ? Math.floor(out.done / out.total * 100) : 0;
                out.warn = out.cur === null && out.done < out.total && out.total > 0;
                return out;
            }

            function filterRows(list, filter) {
                if (filter === "active") return list.filter(function (r) {
                    return r.status === "in_progress";
                });
                if (filter === "pending") return list.filter(function (r) {
                    return r.status === "pending";
                });
                if (filter === "done") return list.filter(function (r) {
                    return r.status === "complete";
                });
                return list;
            }

            // ---------- 帧沿记忆（本会话帧沿；AC-R2-7 刷新恢复靠它 + 投影尾页） ----------
            // localStorage 仅存插件自有键；异常一律吞（隐私模式/配额），不影响渲染。
            function framesLoad() {
                try {
                    if (typeof localStorage === "undefined") return {};
                    var raw = localStorage.getItem(FRAMES_KEY);
                    var o = raw ? JSON.parse(raw) : null;
                    return (o && typeof o === "object") ? o : {};
                } catch (e) {
                    return {};
                }
            }

            function framesGet(map, sid) {
                var v = map[sid];
                return (v && typeof v === "object") ? v : {a: false, p: []};
            }

            function framesSet(map, sid, v) {
                map[sid] = v;
                try {
                    if (typeof localStorage !== "undefined") localStorage.setItem(FRAMES_KEY, JSON.stringify(map));
                } catch (e) {
                }
            }

            function cfgLoad() {
                try {
                    if (typeof localStorage === "undefined") return {collapseMinutes: 30};
                    var o = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
                    if (o && typeof o === "object" && typeof o.collapseMinutes === "number" && o.collapseMinutes > 0) return o;
                } catch (e) {
                }
                return {collapseMinutes: 30};
            }

            function cfgSave(o) {
                try {
                    if (typeof localStorage !== "undefined") localStorage.setItem(CFG_KEY, JSON.stringify(o));
                } catch (e) {
                }
            }

            // ---------- 组件（createElement，无 JSX） ----------
            function Dot(p) {
                var cls = {
                    pending: "idle", in_progress: "ongoing", complete: "done",
                    interrupt: "interrupt", failed: "interrupt"
                }[p.st] || "idle";
                return h("span", {
                    className: "dot " + cls, role: "img",
                    "aria-label": ROW_TITLE_LABEL[p.st] || p.st
                });
            }

            function ExpIcon() {
                return h("svg", {width: 9, height: 9, viewBox: "0 0 10 10", fill: "none"},
                    h("path", {
                        d: "M3.6 2L6.4 5L3.6 8", stroke: "currentColor", strokeWidth: 1.3,
                        strokeLinecap: "round", strokeLinejoin: "round"
                    }));
            }

            // D-31：空态 svg 墨迹判定「不升原型」，形态保持 M1 冻结值（34×34 / stroke 1.4 / opacity .5）。
            function EmptySvg() {
                return h("svg", {width: 34, height: 34, viewBox: "0 0 24 24", fill: "none"},
                    h("rect", {x: 4, y: 3.5, width: 16, height: 17, rx: 2.5, stroke: "currentColor", strokeWidth: 1.4}),
                    h("path", {
                        d: "M8 8.5h8M8 12h8M8 15.5h5",
                        stroke: "currentColor",
                        strokeWidth: 1.4,
                        strokeLinecap: "round"
                    }));
            }

            function Row(p) {
                var it = p.item;
                var st = p.marked ? "interrupt" : it.status;
                var open = !!p.open;
                var toggle = p.onToggle;
                var onKey = function (e) {
                    if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
                        if (e.preventDefault) e.preventDefault();
                        toggle();
                    }
                };
                return h("div", {
                        className: "tp-row s-" + it.status + (p.isCurrent ? " cur" : "") + (p.marked ? " s-interrupt" : "") + (open ? " open" : ""),
                        key: it.key
                    },
                    h("span", {
                        className: "tp-step",
                        title: (ROW_TITLE_LABEL[st] || st) + " · 第 " + it.step + " 步" + (it.note ? "\n" + it.note : "")
                    }, String(it.step)),
                    h("span", {className: "tp-ico"}, h(Dot, {st: st})),
                    h("span", {
                        className: "tp-text", role: "button", tabIndex: 0, onClick: toggle, onKeyDown: onKey,
                        "aria-expanded": open ? "true" : "false", title: "展开 / 收起该步详情"
                    }, it.content),
                    h("span", {
                        className: "exp", onClick: toggle, onKeyDown: onKey, tabIndex: 0, role: "button",
                        "aria-expanded": open ? "true" : "false", title: "展开 / 收起该步详情"
                    }, h(ExpIcon)),
                    h("div", {className: "sub"},
                        h("div", {className: "kv"}, h("span", null, "状态"), h("b", null, SUB_LABEL[st] || st)),
                        h("div", {className: "kv"}, h("span", null, "说明"), h("span", null, it.note || "—")),
                        h("div", {className: "kv", style: {marginTop: "3px"}}, h("span", null, ""),
                            h("span", null, "只读视图：改状态请在会话里由模型 todo_write 整表更新"))));
            }

            function Empty() {
                return h("div", {className: "tp-empty"},
                    h(EmptySvg),
                    h("div", {className: "h3"}, "模型本轮未产生待办"),
                    h("div", {className: "g"},
                        "长任务开始时模型会调用 ", h("code", null, "todo_write"),
                        " 写入待办清单，这里将实时出现进度。",
                        h("br"),
                        "（若上一轮进行中被打断，本页会显示黄色「未完成即中断」标记与上一轮快照入口）"));
            }

            // 视图模型 → JSON 快照（R2-04；字段与契约 §1.2 一一对应，不新增派生字段）
            function buildExport(d, cur, sid) {
                var inter = cur.interrupted;
                return {
                    plugin: NS, version: VERSION, sessionId: sid,
                    exportedAt: new Date().toISOString(),
                    updatedAt: new Date(cur.ts).toISOString(),
                    view: {
                        total: d.total, done: d.done, active: d.active, pending: d.pending, percent: d.pct,
                        interrupted: !!inter,
                        current: (d.cur && d.curStep != null) ? {index: d.curStep, content: d.cur.content} : null
                    },
                    tasks: d.list.map(function (it) {
                        return {index: it.step, content: it.content, status: it.status, note: it.note};
                    }),
                    previous: inter ? {
                        tasks: (inter.prev || []).map(function (r) {
                            return {index: r.step, content: r.content, status: r.status};
                        }),
                        active: (inter.act || []).map(function (r) {
                            return {index: r.step, content: r.content};
                        })
                    } : null
                };
            }

            // R2-07 三条件 + D-41 撤销：帧沿判定的唯一实现。
            // 抽成纯函数是为了让 test/edge-d41.test.mjs 直接 vm 装载本文件后测「真实出厂代码」，
            // 而不是复刻一份逻辑做替身（R6 教训：只认实测，不认「看起来对」）。
            function edgeDecide(m, rows, prevInterrupted) {
                var activeN = 0, doneN = 0, prevFull = [], prevAct = [];
                for (var i = 0; i < rows.length; i++) {
                    var r = rows[i];
                    if (!r || typeof r.content !== "string") continue;
                    var st0 = r.status === "completed" ? "complete" : (typeof r.status === "string" ? r.status : "pending");
                    prevFull.push({step: i + 1, content: String(r.content), status: st0});
                    if (st0 === "in_progress") {
                        activeN++;
                        prevAct.push({step: i + 1, content: String(r.content)});
                    } else if (st0 === "complete") doneN++;
                }
                var interrupted = prevInterrupted || null, fired = false, revoked = false;
                if (activeN > 0) {
                    m.a = true;
                    m.p = prevFull;
                    m.act = prevAct;
                    m.pAt = Date.now();
                    interrupted = null;
                } else if (rows.length === 0) {
                    // 三条件：①上一观测帧含 in_progress ②投影变空（清空边沿）③清空后无新的非空写入
                    if (m.a) {
                        interrupted = {prev: (m.p || []).slice(), act: (m.act || []).slice(), since: m.pAt || null};
                        m.a = false;
                        fired = true;
                    }
                    // 已点火的黄标在投影持续为空时保留，等新帧来收口
                } else {
                    // ③不成立：出现新的非空写入（含「全部完成」）→ 中断态一律撤销（D-41 修复点）
                    // 同时收口「已点火后再来全完成帧」：完成态不得残留黄标（AC-R2-4 / 回归项）
                    if (m.a) {
                        m.a = false;
                        revoked = true;
                    }
                    if (interrupted) {
                        interrupted = null;
                        revoked = true;
                    }
                }
                return {
                    interrupted: interrupted, m: m, activeN: activeN, doneN: doneN,
                    prevFull: prevFull, prevAct: prevAct, fired: fired, revoked: revoked
                };
            }

            // D-43：待办更新时间入帧快照。sig 只取投影里真正可变的 (content,status)，
            // 与帧同存 localStorage；同一 sig 命中旧 u ⇒ 刷新不前移，内容变才换时间。
            // 抽成纯函数同 edgeDecide：测试用 vm 直接装载出厂代码，不做替身。
            function frameTsDecide(m, rows, now) {
                var sig = "";
                for (var i = 0; i < rows.length; i++) {
                    var r = rows[i] || {};
                    sig += (i ? "\u0001" : "") + String(r.content == null ? "" : r.content)
                        + "\u0000" + String(r.status == null ? "" : r.status);
                }
                var changed = m.uSig !== sig || typeof m.u !== "number";
                if (changed) {
                    m.uSig = sig;
                    m.u = now;
                }
                return {changed: changed, ts: typeof m.u === "number" ? m.u : now, sig: sig};
            }

            function Body(props) {
                var dark = useTheme();
                // D-42 宿主惯用法：useProjection 是 renderer 给每个 slot 组件统一注入的标准 prop
                // （宿主 TodoDock 即 `function TodoDock({ useProjection, t })`，注册时不写 inject）。
                // 自定义 hooks 面不是「传 face 对象」，而是 source 源（keyed 解析函数），故不用它。
                var useProj = props && typeof props.useProjection === "function" ? props.useProjection : null;
                var snap;
                if (useProj) {
                    try {
                        snap = useProj("todos");
                    } catch (e) {
                        snap = null;
                    }
                }
                if (!useProj && !warnedNoFace) { // D-37：断链不再哑失败，一次性告警
                    warnedNoFace = true;
                    try {
                        console.warn("[" + NS + "] useProjection 标准 prop 缺失（宿主版本不符），面板降级空态");
                    } catch (e) {
                    }
                }
                var sid = (props && props.sessionId) || "";
                var ref = useRef(null); // { snap, interrupted, ts, doneN, totalN, cAt }
                var _o = useState({}), openMap = _o[0], setOpenMap = _o[1];
                var _v = useState(false), showPrev = _v[0], setShowPrev = _v[1];
                var _f = useState("all"), filter = _f[0], setFilter = _f[1];
                var _m = useState(false), menuOpen = _m[0], setMenuOpen = _m[1];
                var _e = useState(false), exportOpen = _e[0], setExportOpen = _e[1];
                var _x = useState(false), expandedOnce = _x[0], setExpandedOnce = _x[1];
                var _c = useState(cfgLoad), cfg = _c[0], setCfg = _c[1];

                // 渲染期做帧沿观测（不 setState；快照变化由 useProjection 触发重渲染）
                var rows = Array.isArray(snap) ? snap : [];
                var map = framesLoad();
                var m = framesGet(map, sid);
                var edge = edgeDecide(m, rows, ref.current ? ref.current.interrupted : null);
                var interrupted = edge.interrupted, activeN = edge.activeN, doneN = edge.doneN;
                if (edge.activeN > 0 || edge.fired || edge.revoked) framesSet(map, sid, m);
                // D-43：ts 落帧快照——「更新于」= 待办内容最近一次变化时刻，不再是渲染时刻。
                // 同一 sig 在刷新/重开 tab 后命中同一 m.u，时间不前移；内容真变才刷新。
                var ft = frameTsDecide(m, rows, Date.now());
                if (ft.changed) framesSet(map, sid, m);
                var frameTs = ft.ts;
                var allDone = rows.length > 0 && doneN === rows.length;
                if (allDone) {
                    if (!m.cAt) {
                        m.cAt = Date.now();
                        framesSet(map, sid, m);
                    }
                } else if (m.cAt) {
                    delete m.cAt;
                    m.cx = false;
                    framesSet(map, sid, m);
                }
                var keep = ref.current;
                if (!keep || keep.snap !== snap || keep.totalN !== rows.length || keep.doneN !== doneN) {
                    ref.current = {
                        snap: snap, interrupted: interrupted, ts: frameTs,
                        doneN: doneN, totalN: rows.length, cAt: m.cAt || null
                    };
                } else {
                    ref.current.interrupted = interrupted;
                }
                var cur = ref.current;

                // AC-R2-4：hook 断链 / 非法快照一律整体空态，不报错不白屏
                if (!cur) return h("div", {className: "tp-panel"}, h(Empty));
                var d = derive(cur.snap);
                var inter = cur.interrupted;
                // 中断行标记：上一帧 in_progress 的内容，本轮仍未 complete → 琥珀
                var interSet = null;
                if (inter) {
                    interSet = {};
                    var acts = (inter.act && inter.act.length ? inter.act : inter.prev) || [];
                    for (var q = 0; q < acts.length; q++) interSet["" + acts[q].step + "\u0000" + acts[q].content] = true;
                }
                var toggle = function (key) {
                    return function () {
                        var nx = {};
                        var k;
                        for (k in openMap) if (Object.prototype.hasOwnProperty.call(openMap, k)) nx[k] = openMap[k];
                        nx[key] = !nx[key];
                        setOpenMap(nx);
                    };
                };
                // 完全无投影且无中断记忆 → 引导空态
                if (d.total === 0 && !inter) return h("div", {className: "tp-panel"}, h(Empty));

                // AC-R2-10：全部完成且距最后更新 ≥ 阈值 → 收起为「已完成 n 项」徽章
                var collapseMin = cfg.collapseMinutes || 30;
                var collapsed = allDone && cur.cAt && (Date.now() - cur.cAt >= collapseMin * 60000) && !expandedOnce;
                var tupd = new Date(cur.ts);
                var hhmm = (tupd.getHours() < 10 ? "0" : "") + tupd.getHours() + ":" + (tupd.getMinutes() < 10 ? "0" : "") + tupd.getMinutes();
                if (collapsed) {
                    return h("div", {className: "tp-panel"},
                        h("div", {className: "tp-head"},
                            h("div", {className: "row1"},
                                h("span", {className: "tt"}, "任务进度"),
                                h("span", {className: "tp-count"}, "完成 " + d.done + " / 共 " + d.total),
                                h("span", {className: "pct"}, d.pct + "%"))),
                        h("div", {className: "tp-done-card"},
                            h("button", {
                                    className: "tp-badgebtn", onClick: function () {
                                        setExpandedOnce(true);
                                    },
                                    title: "收起于 " + collapseMin + " 分钟静默后，点击展开"
                                },
                                "✓ 已完成 " + d.total + " 项"),
                            h("span", {className: "muted"}, "静默 " + collapseMin + " 分钟后自动收起 · 点击展开")));
                }

                var firstPrev = inter && inter.prev.length ? inter.prev[0] : null;
                var nodes = [];
                nodes.push(h("div", {className: "tp-head", key: "head"},
                    h("div", {className: "row1"},
                        h("span", {className: "tt"}, "任务进度"),
                        h("span", {
                                className: "tp-count",
                                title: "共 " + d.total + " 步：完成 " + d.done + " · 进行中 " + d.active + " · 待办 " + d.pending
                            },
                            "完成 " + d.done + " / 共 " + d.total),
                        h("span", {className: "pct"}, d.pct + "%"),
                        h("button", {
                            className: "tp-more",
                            "aria-label": "更多操作",
                            "aria-expanded": menuOpen ? "true" : "false",
                            onClick: function () {
                                setMenuOpen(!menuOpen);
                            }
                        }, "⋯")),
                    h("div", {className: "tp-bar"}, h("i", {style: {width: d.pct + "%"}})),
                    h("div", {className: "tp-meta"},
                        h("span", {title: tupd.toLocaleString()}, "更新于 " + hhmm), h("span", null, "·"),
                        h("span", null, "进行中 " + d.active), h("span", null, "·"),
                        h("span", null, "待办 " + d.pending)),
                    menuOpen ? h("div", {className: "tp-menu"},
                        h("button", {
                                onClick: function () {
                                    setExportOpen(!exportOpen);
                                    setMenuOpen(false);
                                }
                            },
                            exportOpen ? "收起 JSON 快照" : "导出 JSON 快照"),
                        h("button", {
                            onClick: function () {
                                var idx = COLLAPSE_STEPS.indexOf(cfg.collapseMinutes);
                                var nx = {collapseMinutes: COLLAPSE_STEPS[(idx + 1) % COLLAPSE_STEPS.length]};
                                cfgSave(nx);
                                setCfg(nx);
                            }
                        }, "完成收起阈值：" + collapseMin + " 分钟（点击切换）")) : null));
                if (exportOpen) {
                    var json = JSON.stringify(buildExport(d, cur, sid), null, 2);
                    nodes.push(h("div", {className: "tp-export", key: "exp"},
                        h("textarea", {readOnly: true, value: json, "aria-label": "JSON 快照", spellCheck: false}),
                        h("div", {className: "bar"},
                            h("span", null, json.length + " 字节"),
                            h("a", {
                                href: "data:application/json;charset=utf-8," + encodeURIComponent(json),
                                download: "task-panel-" + (sid || "session").slice(0, 16) + ".json"
                            }, "下载 .json"))));
                }
                if (inter) {
                    nodes.push(h("div", {className: "tp-interrupt", key: "inter"},
                        h("div", {style: {flex: "1"}},
                            h("b", null, "上一轮有步骤没做完。"), h("br"),
                            firstPrev ? ["上一轮停在 ", h("b", null, "第 " + firstPrev.step + " 步"),
                                    "「" + firstPrev.content + "」，本轮清单已被清空" + (inter.empty === undefined ? "" : "") + "，之后没有新的待办写入。"]
                                : "上一轮有进行中的步骤，本轮清单已不在。",
                            h("div", {
                                    className: "why",
                                    title: "判定依据（帧沿记录，随会话保存在本机浏览器）：上一观测帧含 in_progress ∧ 本帧 todos 为空 ∧ 清空后无新的 todo_write"
                                },
                                "依据：上一帧有进行中 · 本帧清单为空 · 之后无新写入"),
                            h("button", {
                                    className: "btn", onClick: function () {
                                        setShowPrev(!showPrev);
                                    },
                                    "aria-expanded": showPrev ? "true" : "false"
                                },
                                showPrev ? "收起上一轮待办快照" : "查看上一轮待办快照"))));
                    if (showPrev && inter.prev.length) {
                        nodes.push(h("div", {className: "tp-list", key: "prev", style: {flex: "0 0 auto"}},
                            inter.prev.map(function (pItem) {
                                return h("div", {
                                        className: "tp-row s-interrupt",
                                        key: "pv" + pItem.step + pItem.content
                                    },
                                    h("span", {className: "tp-step"}, String(pItem.step)),
                                    h("span", {className: "tp-ico"}, h(Dot, {st: "interrupt"})),
                                    h("span", {className: "tp-text", style: {cursor: "default"}}, pItem.content));
                            })));
                    }
                }
                if (d.total > 0 && d.done === d.total) {
                    nodes.push(h("div", {className: "tp-done-card", key: "done"},
                        h("div", {className: "big"}, "✓"),
                        "全部完成（" + d.total + "/" + d.total + "）",
                        h("span", {className: "muted"}, "最后更新 " + hhmm)));
                } else if (d.cur && d.curStep != null) {
                    nodes.push(h("div", {className: "tp-cur", key: "cur"},
                        "当前第 ", h("b", null, d.curStep + " 步"), "：" + d.cur.content,
                        d.active > 1 ? h("span", {className: "muted"}, " （并行 " + d.active + " 项进行中）") : null));
                }
                if (d.total > 0) {
                    var shown = filterRows(d.list, filter);
                    // D-26 筛选 chips：纯视图层，不动 todos、不改派生口径
                    nodes.push(h("div", {
                            className: "tp-chips",
                            key: "chips",
                            role: "group",
                            "aria-label": "按状态筛选"
                        },
                        FILTERS.map(function (f) {
                            var n = f.id === "all" ? d.total : f.id === "active" ? d.active : f.id === "pending" ? d.pending : d.done;
                            return h("button", {
                                key: f.id, className: "tp-chip", "aria-pressed": filter === f.id ? "true" : "false",
                                onClick: function () {
                                    setFilter(f.id);
                                }
                            }, f.label, h("span", {className: "n"}, String(n)));
                        })));
                    nodes.push(h("div", {className: "tp-list", key: "list"},
                        shown.length ? shown.map(function (it) {
                            return h(Row, {
                                key: it.key, item: it,
                                isCurrent: it.status === "in_progress", // 并行全高亮（表22 第5行）
                                marked: !!(interSet && it.status !== "complete" && interSet[it.step + "\u0000" + it.content]),
                                open: !!openMap[it.key], onToggle: toggle(it.key)
                            });
                        }) : h("div", {className: "tp-note", key: "none"},
                            filter === "active" ? "当前没有进行中的步骤" :
                                filter === "pending" ? "当前没有待开始的步骤" :
                                    filter === "done" ? "还没有完成的步骤" : "当前没有待办")));
                } else if (!inter) {
                    nodes.push(h(Empty, {key: "e"}));
                } else {
                    nodes.push(h("div", {className: "tp-note", key: "empty"}, "当前清单为空 · 中断后没有新的待办"));
                }
                return h("div", {className: "tp-panel", "data-tp-dark": dark ? "1" : "0"}, nodes);
            }

            // 标签页标题上的进行数蓝点徽章（tab.title 席位，R2-01；表22=蓝点非数字）
            function ChipTitle(props) {
                useTheme();
                var info = null;
                try {
                    info = props && props.useTabInfo ? props.useTabInfo() : null;
                } catch (e) {
                }
                var snap = null;
                if (props && typeof props.useProjection === "function") {
                    try {
                        snap = props.useProjection("todos");
                    } catch (e) {
                        snap = null;
                    }
                }
                var active = 0;
                if (Array.isArray(snap)) for (var i = 0; i < snap.length; i++) {
                    var s = snap[i] && snap[i].status;
                    if (s === "in_progress") active++;
                }
                return h("span", {style: {display: "inline-flex", alignItems: "center", gap: "6px"}},
                    info && info.label ? info.label : "任务进度",
                    active > 0 ? h("span", {
                        className: "tp-badge",
                        title: active + " 项进行中",
                        "aria-label": active + " 项进行中"
                    }) : null);
            }

            function apply(ctx) {
                if (!ctx || typeof ctx.inject !== "function") {
                    try {
                        console.warn("[" + NS + "] 宿主 ctx 无 inject 面，面板未挂载");
                    } catch (e) {
                    }
                    return;
                }
                // dsh-pick 先例形态：服务从 ctx.inject 作用域取，不假设顶层 ctx 成员。
                ctx.inject(["sidebarRight", "sidebarRightTabs", "slots", "sessions"], function (scope) {
                    try {
                        ensureCss();
                        var get = function (name) {
                            var v = null;
                            try {
                                v = (scope.get && scope.get(name)) || scope[name];
                            } catch (e) {
                                v = scope && scope[name];
                            }
                            return v;
                        };
                        var eff = function (fn, label) {
                            if (typeof scope.effect === "function") return scope.effect(fn, label);
                            return fn();
                        };

                        // 阶段 1：tab 类型注册（两阶段接口契约 §2.1，dsh-pick 同款字段）
                        eff(function () {
                            var tabs = get("sidebarRightTabs");
                            if (!tabs || typeof tabs.register !== "function") {
                                try {
                                    console.warn("[" + NS + "] sidebarRightTabs 服务不可得，tab 未注册");
                                } catch (e) {
                                }
                                return function () {
                                };
                            }
                            return tabs.register({
                                id: NS, kind: TAB_KIND, priority: "extension", keepMounted: true,
                                title: function () {
                                    return "任务进度";
                                },
                                guide: [{
                                    id: NS, order: 45, title: function () {
                                        return "任务进度";
                                    },
                                    description: function () {
                                        return "会话待办实时进度（只读 todos 投影）";
                                    }
                                }]
                            });
                        }, "task-panel: tab type");

                        // 阶段 2：正文席位（dsh-pick 同款：inject 里 register 返回 dispose）
                        var slots = get("slots");
                        if (slots && typeof slots.register === "function") {
                            var body = function () {
                                eff(function () {
                                    return slots.register({name: SLOT, key: NS, locale: NS,}, Body);
                                }, "task-panel: pane body");
                                eff(function () {
                                    return slots.register({name: SLOT + ".title", key: NS, locale: NS,}, ChipTitle);
                                }, "task-panel: pane title");
                            };
                            eff(function () {
                                return slots.inject ? slots.inject(SLOT, body) : body();
                            }, "task-panel: pane tab slot");
                        } else {
                            try {
                                console.warn("[" + NS + "] slots 服务不可得，面板未挂载");
                            } catch (e) {
                            }
                        }
                    } catch (e) {
                        try {
                            console.error("[" + NS + "] apply failed:", e);
                        } catch (_) {
                        }
                    }
                });
            }

            // 宿主仅向插件暴露顶层 inject 声明过的服务；todos 取数走 slot 标准 prop，不再自建 hooks 面（D-42）。
            module.exports = {
                name: NS,
                inject: ["slots", "sessions"],
                apply: apply,
                __test: {edgeDecide: edgeDecide, frameTsDecide: frameTsDecide, derive: derive, VERSION: VERSION}
            };
            return module.exports;
        },
    });
})();