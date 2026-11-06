/** 插件生命周期：注册 Web 路由，动态绑定 R3 服务；分卷事务仍由 R3 负责。 */
import {handleTaskRequest} from './http-controller.js';
export default class DshTaskPanelServer {
    static inject = ['sessions', 'sessionController', 'sessionProjections', 'connection', 'workspaceRegistry'];

    constructor(ctx) {
        this.ctx = ctx;
        this.rollover = null;
        ctx.inject(['sessionRollover'], scope => {
            this.rollover = scope.sessionRollover;
            scope.effect(() => () => { this.rollover = null; });
        });
        ctx.inject(['webServer'], scope => scope.webServer.register({
            kind: 'exact', path: '/api-dsh-todo-progress',
            handler: (req, res) => this.handle(req, res),
        }));
    }

    /** 保留安装入口的请求转发方法，供宿主路由及集成测试调用。 */
    handle(req, res) { return handleTaskRequest.call(this, req, res); }
}
