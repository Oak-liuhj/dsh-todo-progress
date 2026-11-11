/**
 * rc.5 的 panel 只有 id，rc.1 新增 isFloating。优先使用新接口；旧版只探测
 * 已确认的 dockkit DOM 标记。未知展示方式保留宿主宽度，不依赖混淆后的 CSS 类名。
 */
export function canResizePanel(info, element) {
    if (!info?.tab?.visible || !info.panel || !info.sidebar || info.sidebar.fullscreen) return false;
    if (typeof info.panel.isFloating === 'boolean') return !info.panel.isFloating;
    if (typeof element?.closest !== 'function') return false;
    return !element.closest('[data-dockkit-float]') && !!element.closest('[data-dockkit-pane]');
}
