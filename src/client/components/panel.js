/** 侧栏正文入口：按会话创建独立组件状态。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {Body} from "./task-panel.js";
import {runtime} from '../host/navigation.js';

export function Panel(props) {
    const element = useRef(null);
    const info = props.useTabInfo?.();
    const visible = !!info?.tab.visible && !info.panel.isFloating && !info.sidebar.fullscreen;
    useEffect(() => {
        if (visible) return runtime.layout?.acquire(element.current?.getBoundingClientRect().width);
    }, [visible, props.sessionId]);
    return h('div', {ref: element, className: 'tp-panel-host'},
        h(Body, Object.assign({}, props, {key: props.sessionId})));
}
