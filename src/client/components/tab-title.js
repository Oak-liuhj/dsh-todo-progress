/** 标签标题及无数字的未完成任务蓝点。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {useTheme} from "../theme.js";
import {useHandoff} from "../hooks.js";
import {handoffRows} from "../model/todos.js";
import {framesLoad, framesGet} from "../state/storage.js";

export function ChipTitle(props) {
    useTheme();
    var info = null;
    try {
        info = props && props.useTabInfo ? props.useTabInfo() : null;
    } catch (e) {
    }
    var snap = null;
    if (props && typeof props.useProjection === "function") {
        try {
            snap = props.useProjection("todos");
        } catch (e) {
            snap = null;
        }
    }
    var sid = props && props.sessionId || "";
    var info = useHandoff(sid);
    snap = handoffRows(snap, info, framesGet(framesLoad(), sid).seenProjection);
    var active = 0;
    if (Array.isArray(snap)) for (var i = 0; i < snap.length; i++) {
        var s = snap[i] && snap[i].status;
        if (s === "in_progress" || s === "pending") active++;
    }
    return h("span", {style: {display: "inline-flex", alignItems: "center", gap: "6px"}},
        info && info.label ? info.label : "任务进度",
        active > 0 ? h("span", {
            className: "tp-badge",
            title: active + " 项未完成",
            "aria-label": active + " 项未完成"
        }) : null);
}
