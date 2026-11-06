/** 任务状态与展开图标。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {ROW_TITLE_LABEL} from "../model/todos.js";

export function Dot(p) {
    var cls = {
        pending: "idle", in_progress: "ongoing", complete: "done",
        interrupt: "interrupt", failed: "interrupt"
    }[p.st] || "idle";
    return h("span", {
        className: "dot " + cls, role: "img",
        "aria-label": ROW_TITLE_LABEL[p.st] || p.st
    });
}

export function ExpIcon() {
    return h("svg", {width: 9, height: 9, viewBox: "0 0 10 10", fill: "none"},
        h("path", {
            d: "M3.6 2L6.4 5L3.6 8", stroke: "currentColor", strokeWidth: 1.3,
            strokeLinecap: "round", strokeLinejoin: "round"
        }));
}

export function EmptySvg() {
    return h("svg", {width: 34, height: 34, viewBox: "0 0 24 24", fill: "none"},
        h("rect", {x: 4, y: 3.5, width: 16, height: 17, rx: 2.5, stroke: "currentColor", strokeWidth: 1.4}),
        h("path", {
            d: "M8 8.5h8M8 12h8M8 15.5h5",
            stroke: "currentColor",
            strokeWidth: 1.4,
            strokeLinecap: "round"
        }));
}
