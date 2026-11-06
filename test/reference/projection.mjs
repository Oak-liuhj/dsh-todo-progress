// dsh-task-panel · R2 只读投影适配层核心（接口契约 §1；纯逻辑，零写面，宿主接线在 M1）
// 唯一数据源 = 会话 todos 投影帧 { todos: null | [{content,status}], asOfSeq }
export const STATUSES = new Set(['completed', 'pending', 'in_progress']);

/** 空态判定（AC-R2-4：不报错不白屏） */
export function emptyView(reason) {
    return {
        empty: true,
        reason,
        items: [],
        total: 0,
        done: 0,
        active: 0,
        pending: 0,
        interrupted: false,
        currentStep: null,
        updatedAt: null
    };
}

/** 校验一帧 todos 数组；非法帧整体降级为空态，不部分接受 */
export function validateTodos(todos) {
    if (todos === null) return {ok: true, todos: null};
    if (!Array.isArray(todos)) return {ok: false, reason: 'not-array'};
    for (const t of todos) {
        if (!t || typeof t.content !== 'string' || !STATUSES.has(t.status)) return {ok: false, reason: 'bad-entry'};
    }
    return {ok: true, todos};
}

/** 派生视图模型（契约 §1.2 字段冻结：content/status/index/total/done/active/pending/interrupted/updatedAt） */
export function deriveView(todos) {
    const total = todos.length;
    const items = todos.map((t, i) => ({content: t.content, status: t.status, index: i + 1}));
    const done = todos.filter((t) => t.status === 'completed').length;
    const activeList = items.filter((t) => t.status === 'in_progress'); // active 可 >1，全部高亮（§0.1-1）
    const firstActive = activeList[0] ?? null;
    return {
        empty: false, reason: null, items, total, done,
        active: activeList.length, activeIndexes: activeList.map((t) => t.index),
        pending: total - done - activeList.length,
        interrupted: false, currentStep: firstActive ? firstActive.index : null, updatedAt: null,
    };
}

/**
 * 有状态适配器：帧去重/乱序拒绝（asOfSeq 取大，§1.3）+ interrupted 边沿判定（§1.2 钉死案）。
 * interrupted = 上一非null帧含 in_progress ∧ 非null→null 边沿被观察到 ∧ 此后无新 todo/write 帧；
 * 「会话从开始就 null」永不判中断；turn/end 保留帧期间不判（到达的非null帧会重置）。
 */
export function createProjectionAdapter() {
    let lastAsOf = null;       // asOfSeq 水位
    let lastNonNull = null;    // 最近非null帧派生前快照
    let sawNonNull = false;
    let interrupted = false;
    let updatedAt = null;
    let view = emptyView('no-todo-this-turn');

    return {
        /** @returns {{accepted:boolean, reason?:string, view:object}} */
        applyFrame(frame, receivedAt = Date.now()) {
            if (!frame || typeof frame !== 'object') return {accepted: false, reason: 'bad-frame', view};
            const seq = typeof frame.asOfSeq === 'number' ? frame.asOfSeq : null;
            if (seq !== null && lastAsOf !== null && seq <= lastAsOf) {
                return {accepted: false, reason: 'stale-or-dup', view}; // 去重/乱序拒绝（不进视图字段）
            }
            const v = validateTodos(frame.todos === undefined ? null : frame.todos);
            if (!v.ok) {
                view = {...emptyView('malformed'), interrupted};
                return {accepted: false, reason: v.reason, view};
            }
            if (seq !== null) lastAsOf = seq;

            if (v.todos === null) {
                // 边沿判定：仅当曾见非null且其含 in_progress
                if (sawNonNull && lastNonNull && lastNonNull.some((t) => t.status === 'in_progress')) interrupted = true;
                view = {...emptyView('no-todo-this-turn'), interrupted};
                lastNonNull = null;
            } else {
                sawNonNull = true;
                interrupted = false;
                lastNonNull = v.todos;
                updatedAt = receivedAt;
                view = {...deriveView(v.todos), interrupted: false, updatedAt};
            }
            return {accepted: true, view};
        },
        view: () => view,
    };
}

/** updatedAt 只展示「N 分钟前」，不参与计算（§1.2） */
export function formatUpdatedAt(nowMs, updatedAtMs) {
    const m = Math.floor((nowMs - updatedAtMs) / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m} 分钟前`;
    const h = Math.floor(m / 60);
    return h < 24 ? `${h} 小时前` : `${Math.floor(h / 24)} 天前`;
}
