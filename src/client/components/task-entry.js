/** 右上角常驻任务入口：使用会话标准投影，按钮始终打开同一任务页。 */
import React from 'react';
import {runtime} from '../host/navigation.js';
import {TAB_KIND} from '../constants.js';
import {useTheme} from '../theme.js';
import {hostBoundary} from '../host/compatibility.js';
const h = React.createElement;

export function TaskEntry(props) {
    useTheme();
    const todos = hostBoundary('任务入口进度提示', () => props.useProjection?.('todos'));
    const unfinished = Array.isArray(todos) && todos.some(t => t?.status === 'in_progress' || t?.status === 'pending');
    return h('button', {
        type: 'button', className: 'tp-task-entry', title: '任务进度',
        'aria-label': '打开任务进度', 'data-tp-entry': '',
        disabled: typeof runtime.sidebar?.openTab !== 'function',
        onClick: () => hostBoundary('打开任务面板', () => runtime.sidebar?.openTab?.(TAB_KIND)),
    }, h('svg', {width: 17, height: 17, viewBox: '0 0 24 24', fill: 'none', 'aria-hidden': 'true'},
        h('rect', {x: 5, y: 4, width: 15, height: 17, rx: 2, stroke: 'currentColor', strokeWidth: 1.6}),
        h('path', {d: 'm3 10 2 2 4-4M11 10h5M9 16h7', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round'})),
        h('span', null, '任务'), unfinished ? h('span', {className: 'tp-entry-dot', 'aria-label': '有未完成任务'}) : null);
}
