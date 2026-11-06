/** 面板内的简明使用说明；不要求用户理解投影或插件装配机制。 */
import React from 'react';
import {VERSION} from '../constants.js';

export function UsageGuide() {
    const h = React.createElement;
    return h('section', {className: 'tp-guide', 'aria-label': '任务进度使用说明'},
        h('strong', null, '任务进度'),
        h('span', {className: 'tp-guide-version'}, 'v' + VERSION),
        h('p', null, '在 DSH Web 或桌面客户端，点击右上角“任务”即可打开当前会话的进度。'),
        h('ul', null,
            h('li', null, '多步任务产生待办后，可查看完成比例、当前步骤，按状态筛选并展开详情。'),
            h('li', null, '这里只展示待办。如需调整任务或状态，请在会话中告诉模型；简单问答可能没有待办。'),
            h('li', null, '全部完成后默认 30 分钟收起，可在“更多操作”中调整时长。'),
            h('li', null, '“现在换会话”需启用配套会话分卷插件；未启用时仍可正常查看任务。')));
}
