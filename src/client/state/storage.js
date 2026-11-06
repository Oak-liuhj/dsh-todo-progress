/** 插件自己的 localStorage 状态；会话帧按 sid 隔离，存储失败时继续渲染。 */
import {NS, FRAMES_KEY, CFG_KEY} from "../constants.js";

export function framesLoad() {
    try {
        if (typeof localStorage === "undefined") return {};
        var raw = localStorage.getItem(FRAMES_KEY);
        var o = raw ? JSON.parse(raw) : null;
        return (o && typeof o === "object") ? o : {};
    } catch (e) {
        return {};
    }
}

export function framesGet(map, sid) {
    var v = map[sid];
    return (v && typeof v === "object") ? v : {a: false, p: []};
}

export function framesSet(map, sid, v) {
    map[sid] = v;
    try {
        if (typeof localStorage !== "undefined") localStorage.setItem(FRAMES_KEY, JSON.stringify(map));
    } catch (e) {
    }
}

export function cfgLoad() {
    try {
        if (typeof localStorage === "undefined") return {collapseMinutes: 30, legacyDock: false};
        var o = JSON.parse(localStorage.getItem(CFG_KEY) || "null");
        if (o && typeof o === "object") return {
            collapseMinutes: typeof o.collapseMinutes === "number" && isFinite(o.collapseMinutes) && o.collapseMinutes > 0 ? o.collapseMinutes : 30,
            legacyDock: o.legacyDock === true
        };
    } catch (e) {
    }
    return {collapseMinutes: 30, legacyDock: false};
}

export function cfgSave(o) {
    try {
        if (typeof localStorage !== "undefined") localStorage.setItem(CFG_KEY, JSON.stringify(o));
        window.dispatchEvent(new Event(NS + ".config"));
    } catch (e) {
    }
}
