// dsh-todo-progress（旧名 dsh-task-panel）— server 半边：no-op。
// 接口契约：本插件零写入、零 RPC（写入面实证裁定：客户端只读 todos 投影即满足 R2），
// server 半边只作为 bundle patch 的挂载点存在（ds-bot / dsh-one-memory 同族先例）。
// 教训（dsh-one-memory/index.js 头注，diag-mount1-6）：cordis fiber 只有在全部声明
// inject 都是已注册服务时才激活；类插件 `static inject = []` 即时激活、自足；
// ctx proxy 对未声明属性访问直接 THROW —— 所以这里 logger 也只敢 try/catch 摸一下。
export default class DshTaskPanelServer {
    static inject = [];

    constructor(ctx) {
        try {
            if (ctx.logger && typeof ctx.logger.info === "function") {
                ctx.logger.info("[dsh-todo-progress] server half active (no-op; UI lives in client.js)");
            }
        } catch { /* ctx gating is best-effort; never break the host */
        }
    }
}
