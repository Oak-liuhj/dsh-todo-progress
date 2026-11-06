/** 配置订阅、交接快照读取和完成计时。每个副作用都提供卸载清理。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {NS} from "./constants.js";
import {cfgLoad, cfgSave} from "./state/storage.js";

export function useConfig() {
    var s = useState(cfgLoad);
    useEffect(function () {
        var update = function () { s[1](cfgLoad()); };
        window.addEventListener(NS + ".config", update);
        window.addEventListener("storage", update);
        return function () {
            window.removeEventListener(NS + ".config", update);
            window.removeEventListener("storage", update);
        };
    }, []);
    return [s[0], function (value) { cfgSave(value); s[1](value); }];
}

export function useHandoff(sid) {
    var s = useState(null);
    useEffect(function () {
        var controller = new AbortController();
        s[1](null);
        fetch("/api-dsh-todo-progress?session=" + encodeURIComponent(sid), {signal: controller.signal})
            .then(function (r) { if (!r.ok) throw new Error("unavailable"); return r.json(); })
            .then(function (v) { if (!controller.signal.aborted) s[1](v); })
            .catch(function () {});
        return function () { controller.abort(); };
    }, [sid]);
    return s[0];
}

export function useCompletionCollapse(deadline, reopened) {
    var clock = useState(0);
    useEffect(function () {
        if (!deadline || reopened || Date.now() >= deadline) return;
        var timer = setTimeout(function () { clock[1](function (v) { return v + 1; }); },
            Math.min(2147483647, Math.max(0, deadline - Date.now())));
        return function () { clearTimeout(timer); };
    }, [deadline, reopened, clock[0]]);
    return !!deadline && !reopened && Date.now() >= deadline;
}
