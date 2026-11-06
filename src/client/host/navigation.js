/** 宿主服务句柄与会话导航；只通过注入服务切换会话。 */

export var runtime = {navigate: null, sidebar: null, revealSession: null, layout: null};

export function navigate(sid) {
    if (!runtime.navigate) throw new Error("当前宿主未提供会话导航，请在会话列表打开新会话。");
    runtime.revealSession = sid;
    runtime.navigate(sid);
}
