/** 任务面板正文：组合投影、局部视图状态和菜单，不承担宿主注册。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {NS, COLLAPSE_STEPS} from "../constants.js";
import {useTheme} from "../theme.js";
import {useConfig, useHandoff, useCompletionCollapse} from "../hooks.js";
import {framesLoad, framesGet, framesSet} from "../state/storage.js";
import {derive, edgeDecide, frameTsDecide, handoffRows, filterRows, buildExport, FILTERS} from "../model/todos.js";
import {runtime, navigate} from "../host/navigation.js";
import {Row} from "./task-row.js";
import {Dot} from "./icons.js";
import {Empty} from "./empty-state.js";

export var warnedNoFace = false; // D-37：face 断链一次性告警位

export function Body(props) {
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
    var info = useHandoff(sid);
    var ref = useRef(null); // { snap, interrupted, ts, doneN, totalN, cAt }
    var _o = useState({}), openMap = _o[0], setOpenMap = _o[1];
    var _v = useState(false), showPrev = _v[0], setShowPrev = _v[1];
    var _f = useState("all"), filter = _f[0], setFilter = _f[1];
    var _m = useState(false), menuOpen = _m[0], setMenuOpen = _m[1];
    var _e = useState(false), exportOpen = _e[0], setExportOpen = _e[1];
    var _x = useState(null), expandedFor = _x[0], setExpandedFor = _x[1];
    var _c = useConfig(), cfg = _c[0], setCfg = _c[1];
    var _pc = useState(function () { return !!framesGet(framesLoad(), sid).panelCollapsed; });
    var panelCollapsed = _pc[0], setPanelCollapsed = _pc[1];
    var _a = useState(false), busy = _a[0], setBusy = _a[1];
    var _msg = useState(""), message = _msg[0], setMessage = _msg[1];

    // 渲染期做帧沿观测（不 setState；快照变化由 useProjection 触发重渲染）
    var map = framesLoad();
    var m = framesGet(map, sid);
    if (Array.isArray(snap) && snap.length && !m.seenProjection) {
        m.seenProjection = true;
        framesSet(map, sid, m);
    }
    var rows = handoffRows(snap, info, m.seenProjection);
    var inherited = rows !== snap && rows.length > 0;
    var edge = edgeDecide(m, rows, ref.current ? ref.current.interrupted : m.interrupted);
    var interrupted = edge.interrupted, activeN = edge.activeN, doneN = edge.doneN;
    m.interrupted = interrupted;
    if (edge.activeN > 0 || edge.fired || edge.revoked) framesSet(map, sid, m);
    // D-43：ts 落帧快照——「更新于」= 待办内容最近一次变化时刻，不再是渲染时刻。
    // 同一 sig 在刷新/重开 tab 后命中同一 m.u，时间不前移；内容真变才刷新。
    var ft = frameTsDecide(m, rows, Date.now());
    if (ft.changed) framesSet(map, sid, m);
    var frameTs = ft.ts;
    var allDone = rows.length > 0 && doneN === rows.length;
    if (allDone) {
        if (!m.cAt || ft.changed) {
            m.cAt = Date.now();
            framesSet(map, sid, m);
        }
    } else if (m.cAt) {
        delete m.cAt;
        m.cx = false;
        framesSet(map, sid, m);
    }
    var keep = ref.current;
    if (!keep || keep.snap !== rows || keep.totalN !== rows.length || keep.doneN !== doneN) {
        ref.current = {
            snap: rows, interrupted: interrupted, ts: frameTs,
            doneN: doneN, totalN: rows.length, cAt: m.cAt || null
        };
    } else {
        ref.current.interrupted = interrupted;
    }
    var cur = ref.current;
    var collapseMin = cfg.collapseMinutes || 30;
    var completionKey = sid + ":" + m.cAt + ":" + ft.sig;
    var collapsed = useCompletionCollapse(allDone && m.cAt ? m.cAt + collapseMin * 60000 : null,
        expandedFor === completionKey);
    var setPanel = function (value) {
        var saved = framesLoad(), frame = framesGet(saved, sid);
        frame.panelCollapsed = value;
        framesSet(saved, sid, frame);
        setPanelCollapsed(value);
        setMenuOpen(false);
    };
    var action = async function (kind) {
        if (busy) return;
        setBusy(true); setMessage(""); setMenuOpen(false);
        try {
            var response = await fetch("/api-dsh-todo-progress", {method: "POST",
                headers: {"Content-Type": "application/json"}, body: JSON.stringify({action: kind, sessionId: sid})});
            var result = await response.json();
            if (!response.ok || !result.newSessionId) {
                var labels = {"rollover-unavailable": "请先启用会话分卷插件", "unsafe-cut-point": "工具仍在执行，请稍后再换会话",
                    "busy": "正在交接，请稍候", "readonly": "本卷已封存，请在最新卷继续", "subagent-never": "子会话不能分卷"};
                throw new Error(labels[result.reason || result.error] || "操作未完成，原会话已保留，请重试。");
            }
            navigate(result.newSessionId);
        } catch (e) { setMessage(e.message || "操作失败，请重试。"); }
        finally { setBusy(false); }
    };

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

    // AC-R2-10：全部完成且距最后更新 ≥ 阈值 → 收起为「已完成 n 项」徽章
    var tupd = new Date(cur.ts);
    var hhmm = (tupd.getHours() < 10 ? "0" : "") + tupd.getHours() + ":" + (tupd.getMinutes() < 10 ? "0" : "") + tupd.getMinutes();
    if (panelCollapsed || collapsed) {
        return h("div", {className: "tp-panel"},
            h("div", {className: "tp-head"},
                h("div", {className: "row1"},
                    h("span", {className: "tt"}, "任务进度"),
                    h("span", {className: "tp-count"}, "完成 " + d.done + " / 共 " + d.total),
                    h("span", {className: "pct"}, d.pct + "%"))),
            h("div", {className: "tp-done-card"},
                h("button", {
                        className: "tp-badgebtn", onClick: function () {
                            setPanel(false); setExpandedFor(completionKey);
                        },
                        title: "收起于 " + collapseMin + " 分钟静默后，点击展开"
                    },
                    allDone ? "✓ 已完成 " + d.total + " 项" : "展开任务进度（" + d.total + " 项）"),
                h("span", {className: "muted"}, panelCollapsed ? "面板已收起 · 点击展开" : "静默 " + collapseMin + " 分钟后自动收起 · 点击展开")));
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
            h("button", {disabled: busy || !runtime.navigate || !(info && info.available) || !!(info && info.readonly),
                onClick: function () { action("rollover"); }}, "现在换会话"),
            h("button", {disabled: busy || !runtime.navigate, onClick: function () { action("new"); }}, "新建会话"),
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
                    var nx = {collapseMinutes: COLLAPSE_STEPS[(idx + 1) % COLLAPSE_STEPS.length], legacyDock: cfg.legacyDock};
                    setCfg(nx);
                }
            }, "完成收起阈值：" + collapseMin + " 分钟（点击切换）"),
            h("button", {role: "menuitemcheckbox", "aria-checked": cfg.legacyDock ? "true" : "false",
                onClick: function () { setCfg({collapseMinutes: cfg.collapseMinutes, legacyDock: !cfg.legacyDock}); }},
                "兼容旧面板：" + (cfg.legacyDock ? "开" : "关")),
            h("button", {onClick: function () { setPanel(true); }}, "收起面板")) : null));
    if (busy || message) nodes.push(h("div", {key: "status", className: "tp-note", role: "status"}, busy ? "正在交接，请稍候…" : message));
    if (info && info.source) nodes.push(h("div", {key: "source", className: "tp-note"},
        h("button", {className: "tp-chip", onClick: function () {
            try { navigate(info.source.sessionId); } catch (e) { setMessage(e.message); }
        }}, "承自 " + info.source.title), inherited ? " · 交接快照（当前会话尚无新待办）" : null));
    if (exportOpen) {
        var json = JSON.stringify(buildExport(d, cur, sid,
            info && info.source ? {sessionId: info.source.sessionId, title: info.source.title, inheritedSnapshot: inherited} : null), null, 2);
        nodes.push(h("div", {className: "tp-export", key: "exp"},
            h("textarea", {readOnly: true, value: json, "aria-label": "JSON 快照", spellCheck: false}),
            h("div", {className: "bar"},
                h("span", null, new TextEncoder().encode(json).length + " 字节"),
                h("button", {onClick: async function () {
                    try { await navigator.clipboard.writeText(json); setMessage("JSON 快照已复制"); }
                    catch (e) { setMessage("复制失败，请选择上方文本复制或下载 JSON。"); }
                }}, "复制 JSON"),
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
