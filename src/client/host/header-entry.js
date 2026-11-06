/**
 * corner 是单组件席位。复用原条目的 store / inject / locale，把任务入口与
 * 宿主原有展开按钮组合，卸载时由 disposer 恢复原条目；不删除或改写宿主注册。
 * 采用 corner 而非 utilities，保证空白会话头部也能看到入口。
 */
import React from 'react';
import {TaskEntry} from '../components/task-entry.js';

export function registerHeaderEntry(slots) {
    const name = 'conversation.session.header.corner';
    return slots.inject(name, () => {
        let disposeEntry;
        const register = () => {
            if (disposeEntry) return;
            const original = slots.entriesOfSlot(name)[0];
            if (!original) return;
            // subscribe 在 register 内同步通知；先标记，避免递归重复注册。
            disposeEntry = () => {};
            try {
                disposeEntry = slots.register({name, priority: (original.options.priority ?? 0) - 1,
                    store: original.store, inject: original.inject, locale: original.locale}, props =>
                    React.createElement('div', {className: 'tp-header-controls'},
                        React.createElement(TaskEntry, props), React.createElement(original.component, props)));
            } catch (error) { disposeEntry = undefined; throw error; }
        };
        const unsubscribe = slots.subscribe(name, register);
        register();
        return () => { unsubscribe(); disposeEntry?.(); };
    });
}
