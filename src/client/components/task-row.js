/** 一条只读待办；展开只影响视图，不修改任务状态。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {Dot, ExpIcon} from "./icons.js";
import {ROW_TITLE_LABEL, SUB_LABEL} from "../model/todos.js";

export function Row(p) {
    var it = p.item;
    var st = p.marked ? "interrupt" : it.status;
    var open = !!p.open;
    var toggle = p.onToggle;
    var onKey = function (e) {
        if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") {
            if (e.preventDefault) e.preventDefault();
            toggle();
        }
    };
    return h("div", {
            className: "tp-row s-" + it.status + (p.isCurrent ? " cur" : "") + (p.marked ? " s-interrupt" : "") + (open ? " open" : ""),
            key: it.key
        },
        h("span", {
            className: "tp-step",
            title: (ROW_TITLE_LABEL[st] || st) + " · 第 " + it.step + " 步" + (it.note ? "\n" + it.note : "")
        }, String(it.step)),
        h("span", {className: "tp-ico"}, h(Dot, {st: st})),
        h("span", {
            className: "tp-text", role: "button", tabIndex: 0, onClick: toggle, onKeyDown: onKey,
            "aria-expanded": open ? "true" : "false", title: "展开 / 收起该步详情"
        }, it.content),
        h("span", {
            className: "exp", onClick: toggle, onKeyDown: onKey, tabIndex: 0, role: "button",
            "aria-expanded": open ? "true" : "false", title: "展开 / 收起该步详情"
        }, h(ExpIcon)),
        h("div", {className: "sub"},
            h("div", {className: "kv"}, h("span", null, "状态"), h("b", null, SUB_LABEL[st] || st)),
            h("div", {className: "kv"}, h("span", null, "说明"), h("span", null, it.note || "—")),
            h("div", {className: "kv", style: {marginTop: "3px"}}, h("span", null, ""),
                h("span", null, "只读视图：改状态请在会话里由模型 todo_write 整表更新"))));
}
