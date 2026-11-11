/** 侧栏正文入口：按会话创建独立组件状态。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {Body} from "./task-panel.js";
import {runtime} from '../host/navigation.js';
import {hostBoundary} from '../host/compatibility.js';
import {canResizePanel} from '../host/presentation.js';

export function Panel(props) {
    const element = useRef(null);
    const info = hostBoundary('任务页布局信息', () => props.useTabInfo?.());
    useEffect(() => {
        if (canResizePanel(info, element.current)) return runtime.layout?.acquire(element.current?.getBoundingClientRect().width);
    }, [info?.tab?.visible, info?.panel?.id, info?.panel?.isFloating, info?.sidebar?.fullscreen, props.sessionId]);
    return h('div', {ref: element, className: 'tp-panel-host'},
        h(Body, Object.assign({}, props, {key: props.sessionId})));
}
