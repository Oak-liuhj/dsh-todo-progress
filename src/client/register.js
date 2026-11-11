/** 核心面板优先注册；入口、布局与导航分别隔离，适配面集中在 host/。 */
import {NS, TAB_KIND, SLOT} from './constants.js';
import {ensureCss} from './theme.js';
import {runtime} from './host/navigation.js';
import {Panel} from './components/panel.js';
import {ChipTitle} from './components/tab-title.js';
import {LegacyDock} from './components/legacy-dock.js';
import {CompactPanelLayout, resolveLayoutStore} from './host/compact-layout.js';
import {registerHeaderEntry} from './host/header-entry.js';
import {hostBoundary, hostEffect, hostService, warnHost} from './host/compatibility.js';

export function apply(ctx) {
    if (typeof ctx?.inject !== 'function') {
        warnHost('插件服务注入', new Error('ctx.inject unavailable'));
        return;
    }
    hostBoundary('插件服务注入', () => ctx.inject(['sidebarRight', 'sidebarRightTabs', 'slots', 'sessions'], scope => {
        hostBoundary('面板样式', ensureCss);
        const sidebar = hostService(scope, 'sidebarRight');
        runtime.sidebar = sidebar;
        hostEffect(scope, '会话联动', () => () => {
            if (runtime.sidebar === sidebar) { runtime.sidebar = null; runtime.revealSession = null; }
        });
        hostEffect(scope, '任务标签类型', () => {
            const tabs = hostService(scope, 'sidebarRightTabs');
            if (typeof tabs?.register !== 'function') throw new Error('sidebarRightTabs.register unavailable');
            return tabs.register({
                id: NS, kind: TAB_KIND, priority: 'extension', keepMounted: true,
                title: () => '任务进度',
                guide: [{id: NS, order: 45, title: () => '任务进度',
                    description: () => '查看多步任务的完成比例、当前步骤和待办清单'}],
            });
        });
        const slots = hostService(scope, 'slots');
        if (typeof slots?.register !== 'function') {
            warnHost('任务正文插槽', new Error('slots.register unavailable'));
            return;
        }
        // 插槽声明可能晚于插件加载。每个回调也要有边界，不能只保护 apply 同步栈。
        const registerSlot = (name, label, options, component) => hostEffect(scope, label, () => {
            const register = () => hostEffect(scope, label, () => slots.register({name, ...options}, component));
            return typeof slots.inject === 'function' ? slots.inject(name, register) : register();
        });
        registerSlot(SLOT, '任务正文', {key: NS, locale: NS}, Panel);
        registerSlot(SLOT + '.title', '任务标题', {key: NS, locale: NS}, ChipTitle);
        const layout = new CompactPanelLayout(() => resolveLayoutStore(slots));
        runtime.layout = layout;
        hostEffect(scope, '窄侧栏', () => () => {
            layout.dispose();
            if (runtime.layout === layout) runtime.layout = null;
        });
        hostEffect(scope, '右上角任务入口', () => registerHeaderEntry(slots));
        registerSlot('conversation.input.dock', '兼容输入区面板',
            {id: 'todo', priority: -10, order: 0, locale: NS}, LegacyDock);
        hostEffect(scope, '会话导航', () => {
            if (typeof scope.inject !== 'function') return;
            return scope.inject(['uiWorkspace'], navigationScope => hostEffect(navigationScope, '会话导航', () => {
                const workspace = hostService(navigationScope, 'uiWorkspace');
                if (typeof workspace?.openSession !== 'function') throw new Error('uiWorkspace.openSession unavailable');
                const navigate = id => workspace.openSession(id);
                runtime.navigate = navigate;
                return () => { if (runtime.navigate === navigate) runtime.navigate = null; };
            }));
        });
    }));
}
