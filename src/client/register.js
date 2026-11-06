/** 客户端生命周期入口：注册标签类型与插槽，并随插件卸载注销。 */
import {NS, TAB_KIND, SLOT} from "./constants.js";
import {ensureCss} from "./theme.js";
import {runtime} from "./host/navigation.js";
import {Panel} from "./components/panel.js";
import {ChipTitle} from "./components/tab-title.js";
import {LegacyDock} from "./components/legacy-dock.js";
import {CompactPanelLayout, resolveLayoutStore} from './host/compact-layout.js';
import {registerHeaderEntry} from './host/header-entry.js';

export function apply(ctx) {
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
            runtime.sidebar = get("sidebarRight");
            eff(function () { return function () { runtime.sidebar = null; runtime.revealSession = null; }; }, "task-panel: navigation cleanup");
            scope.inject(["uiWorkspace"], function (navigationScope) {
                runtime.navigate = function (id) { navigationScope.uiWorkspace.openSession(id); };
                navigationScope.effect(function () { return function () { runtime.navigate = null; }; });
            });

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
                            return "查看多步任务的完成比例、当前步骤和待办清单";
                        }
                    }]
                });
            }, "task-panel: tab type");

            // 阶段 2：正文席位（dsh-pick 同款：inject 里 register 返回 dispose）
            var slots = get("slots");
            if (slots && typeof slots.register === "function") {
                runtime.layout = new CompactPanelLayout(() => resolveLayoutStore(slots));
                eff(() => () => { runtime.layout?.dispose(); runtime.layout = null; }, 'task-panel: compact layout');
                eff(() => registerHeaderEntry(slots), 'task-panel: header entry');
                var body = function () {
                    eff(function () {
                        return slots.register({name: SLOT, key: NS, locale: NS,}, Panel);
                    }, "task-panel: pane body");
                    eff(function () {
                        return slots.register({name: SLOT + ".title", key: NS, locale: NS,}, ChipTitle);
                    }, "task-panel: pane title");
                };
                eff(function () {
                    return slots.inject ? slots.inject(SLOT, body) : body();
                }, "task-panel: pane tab slot");
                eff(function () {
                    return slots.inject("conversation.input.dock", function () {
                        return slots.register({name: "conversation.input.dock", id: "todo", priority: -10, order: 0, locale: NS}, LegacyDock);
                    });
                }, "task-panel: legacy dock");
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
