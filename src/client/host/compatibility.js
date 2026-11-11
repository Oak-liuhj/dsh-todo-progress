/** 可选宿主能力的故障边界；同一能力只提示一次，不吞掉宿主认证错误。 */
const warned = new Set();

export function warnHost(feature, error) {
    if (warned.has(feature)) return;
    warned.add(feature);
    console.warn(`[dsh-todo-progress] ${feature} 不可用，其他任务功能继续加载。`, error);
}

/** 同时保护注册与异步触发的回调，并保护卸载链上的后续清理。 */
export function hostBoundary(feature, fn) {
    try { return fn(); }
    catch (error) { warnHost(feature, error); }
}

export function hostEffect(scope, feature, setup) {
    const guarded = () => {
        const dispose = hostBoundary(feature, setup);
        if (typeof dispose === 'function') return () => hostBoundary(`${feature}清理`, dispose);
    };
    return hostBoundary(feature, () => typeof scope.effect === 'function'
        ? scope.effect(guarded, `task-panel: ${feature}`) : guarded());
}

export function hostService(scope, name) {
    try { return scope.get?.(name) || scope[name]; }
    catch { return scope[name]; }
}
