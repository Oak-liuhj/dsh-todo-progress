/**
 * corner 是单组件席位。复用原条目的 store / inject / locale，把任务入口与
 * 宿主原有展开按钮组合，卸载时由 disposer 恢复原条目；不删除或改写宿主注册。
 * 采用 corner 而非 utilities，保证空白会话头部也能看到入口。
 */
import React from 'react';
import {TaskEntry} from '../components/task-entry.js';
import {hostBoundary} from './compatibility.js';

export function registerHeaderEntry(slots) {
    for (const method of ['inject', 'entriesOfSlot', 'subscribe', 'register']) {
        if (typeof slots?.[method] !== 'function') throw new Error(`slots.${method} unavailable`);
    }
    const name = 'conversation.session.header.corner';
    return slots.inject(name, () => {
        let disposeEntry;
        let active = true;
        const register = () => hostBoundary('右上角任务入口', () => {
            if (!active || disposeEntry) return;
            const original = slots.entriesOfSlot(name)[0];
            if (!original) return;
            // subscribe 在 register 内同步通知；先标记，避免递归重复注册。
            disposeEntry = () => {};
            try {
                disposeEntry = slots.register({name, priority: (original.options?.priority ?? 0) - 1,
                    store: original.store, inject: original.inject, locale: original.locale}, props =>
                    React.createElement('div', {className: 'tp-header-controls'},
                        React.createElement(TaskEntry, props), React.createElement(original.component, props)));
            } catch (error) { disposeEntry = undefined; throw error; }
        });
        const unsubscribe = slots.subscribe(name, register);
        register();
        return () => {
            if (!active) return;
            active = false;
            hostBoundary('任务入口订阅清理', () => unsubscribe?.());
            hostBoundary('任务入口注册清理', () => disposeEntry?.());
        };
    });
}
