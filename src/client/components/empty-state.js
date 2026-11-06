/** 没有本轮待办时的引导状态。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {EmptySvg} from "./icons.js";

export function Empty() {
    return h("div", {className: "tp-empty"},
        h(EmptySvg),
        h("div", {className: "h3"}, "模型本轮未产生待办"),
        h("div", {className: "g"},
            "多步任务里模型会调用 ", h("code", null, "todo_write"),
            " 写入待办清单，这里将实时出现进度",
            h("br"),
            "（若上一轮进行中被打断，本页会显示黄色「未完成即中断」标记与上一轮快照入口）"));
}
