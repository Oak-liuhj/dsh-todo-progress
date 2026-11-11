/**
 * 任务页的临时宽度租约。
 * DSH 0.2.1-rc.5 的 layout 服务没有 resize 方法；使用公开插槽注册表中
 * root 的共享 store 及其 setRightbar action，不访问 LayoutController 的私有字段，
 * 不写宿主 localStorage。此版本 root 的 create() 明确返回同一个共享实例。
 * 适配面集中在此文件；宿主改版缺少该能力时保留可用面板并提示一次。
 */
import {warnHost} from './compatibility.js';
export const MIN_PANEL_WIDTH = 300;

export function halfPanelWidth(width) {
    return Math.max(MIN_PANEL_WIDTH, Math.round(width / 2));
}

export function resolveLayoutStore(slots) {
    if (typeof slots?.entriesOfSlot !== 'function') return null;
    const root = slots.entriesOfSlot('root')?.[0];
    const store = root?.store?.create?.();
    return typeof store?.actions?.setRightbar === 'function' && store.getSnapshot?.()?.layoutInfo ? store : null;
}

export class CompactPanelLayout {
    constructor(resolve) {
        this.resolve = resolve;
        this.holders = 0;
        this.store = null;
        this.previousWidth = null;
        this.compactWidth = null;
        this.warned = false;
    }

    /** 首个可见任务页使用一半宽度，多个同屏任务页共用一次调整。 */
    acquire(measuredWidth) {
        if (this.holders++ === 0) {
            try {
                this.store = this.resolve();
                if (!this.store) throw new Error('layout store unavailable');
                const info = this.store.getSnapshot().layoutInfo;
                this.previousWidth = info.rightbar ?? Math.round(info.viewportWidth * 0.45);
                const width = measuredWidth > 0 ? measuredWidth : this.previousWidth;
                if (!Number.isFinite(width) || !Number.isFinite(this.previousWidth)) throw new Error('invalid layout width');
                this.compactWidth = halfPanelWidth(width);
                this.store.actions.setRightbar(this.compactWidth);
            } catch (error) {
                if (!this.warned) console.warn('[dsh-todo-progress] 无法调整侧栏宽度，保留宿主布局。', error);
                this.warned = true;
            }
        }
        let released = false;
        return () => {
            if (released || this.holders === 0) return;
            released = true;
            if (--this.holders === 0) this.restore();
        };
    }

    /** 仅撤回本插件的调整；用户主动拖动过侧栏时保留用户的新宽度。 */
    restore() {
        try {
            if (this.store?.getSnapshot?.()?.layoutInfo?.rightbar === this.compactWidth && this.compactWidth !== null) {
                this.store.actions.setRightbar(this.previousWidth);
            }
        } catch (error) {
            warnHost('侧栏宽度恢复', error);
        } finally {
            this.store = null;
            this.previousWidth = this.compactWidth = null;
        }
    }

    dispose() { this.holders = 0; this.restore(); }
}
