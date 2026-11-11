/** 兼容输入区视图，以及切会话后恢复任务页的宿主联动。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {useConfig} from "../hooks.js";
import {runtime} from "../host/navigation.js";
import {TAB_KIND} from "../constants.js";
import {Panel} from "./panel.js";
import {hostBoundary} from '../host/compatibility.js';

export function LegacyDock(props) {
    var config = useConfig()[0];
    useEffect(function () {
        var active = true;
        var sidebar = runtime.sidebar;
        if (typeof sidebar?.mounted?.getSnapshot !== 'function' || typeof sidebar.mounted.subscribe !== 'function' || typeof sidebar.openTab !== 'function') return;
        var reveal = () => hostBoundary('切换会话后显示任务', function () {
            if (!active || runtime.revealSession !== props.sessionId || sidebar.mounted.getSnapshot() !== props.sessionId) return;
            try { sidebar.openTab(TAB_KIND); runtime.revealSession = null; } catch (e) { /* arriving store is not adopted yet */ }
        });
        reveal();
        var dispose = hostBoundary('任务会话订阅', () => sidebar.mounted.subscribe(function () { Promise.resolve().then(reveal); }));
        return function () { active = false; hostBoundary('任务会话订阅清理', () => dispose?.()); };
    }, [props.sessionId]);
    return config.legacyDock ? h("section", {className: "tp-legacy-dock", "aria-label": "兼容旧面板",
        style: {height: "240px", maxHeight: "35vh", overflow: "hidden", border: "1px solid var(--ds-border-color, #8884)", borderRadius: "8px"}},
        h(Panel, props)) : null;
}
