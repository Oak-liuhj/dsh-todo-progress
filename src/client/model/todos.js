/** 只读投影的派生、筛选、中断边沿和导出模型；不调用宿主写接口。 */
import {NS, VERSION} from "../constants.js";

export var SUB_LABEL = {
    pending: "待开始 · 等前面步骤释放",
    in_progress: "进行中 · 模型正在做这一步",
    complete: "已完成",
    interrupt: "未完成即中断",
    failed: "未完成即中断"
};

export var ROW_TITLE_LABEL = {
    pending: "未开始", in_progress: "进行中", complete: "已完成",
    interrupt: "未完成即中断", failed: "未完成即中断"
};

export var FILTERS = [
    {id: "all", label: "全部"},
    {id: "active", label: "进行中"},
    {id: "pending", label: "待办"},
    {id: "done", label: "完成"}
];

export var warnedUnknown = {};

export function derive(rows) {
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

export function filterRows(list, filter) {
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

export function buildExport(d, cur, sid, provenance) {
    var inter = cur.interrupted;
    return {
        plugin: NS, version: VERSION, sessionId: sid,
        source: provenance || null,
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

export function edgeDecide(m, rows, prevInterrupted) {
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

export function frameTsDecide(m, rows, now) {
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

export function handoffRows(snap, info, seen) {
    if (Array.isArray(snap) && snap.length) return snap;
    return !seen && info && info.handoff && Array.isArray(info.handoff.todos) ? info.handoff.todos : [];
}
