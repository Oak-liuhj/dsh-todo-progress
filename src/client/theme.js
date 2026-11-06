/** 主题令牌和插件样式：只管理 tp-* 组件，不改变宿主布局。 */
import React from "react";
const {createElement: h, useRef, useEffect, useState} = React;
import {NS} from "./constants.js";

export var LIGHT = {
    ink: "#0f1115", ink2: "#61666b", ink3: "#81858c", safe: "#6b7076",
    accent: "#4d6bfe", accTxt: "#3d56d6", ok: "#189a5d", okTxt: "#127a4a",
    warn: "#b25e09", warnTxt: "#a3540a",
    line: "rgba(0,0,0,.10)", line2: "rgba(0,0,0,.06)",
    card2: "#fafbfc", acw: "rgba(77,107,254,.09)", acw2: "rgba(77,107,254,.16)",
    warnBg: "rgba(178,94,9,.10)", chipOn: "rgba(77,107,254,.13)", chipLine: "rgba(0,0,0,.08)"
};

export var DARK = {
    ink: "#e9ebef", ink2: "#a7acb4", ink3: "#8b9098", safe: "#9ba1a9",
    accent: "#7d95ff", accTxt: "#a8b9ff", ok: "#3ecf8e", okTxt: "#5fdcaa",
    warn: "#d99530", warnTxt: "#eab45e",
    line: "rgba(255,255,255,.14)", line2: "rgba(255,255,255,.08)",
    card2: "#1a1c20", acw: "rgba(125,149,255,.14)", acw2: "rgba(125,149,255,.26)",
    warnBg: "rgba(217,149,48,.14)", chipOn: "rgba(125,149,255,.20)", chipLine: "rgba(255,255,255,.12)"
};

export function themeIsDark() {
    try {
        var de = document.documentElement;
        var cs = "";
        try {
            cs = getComputedStyle(de).colorScheme || "";
        } catch (e) {
        }
        if (!cs) cs = de.style && de.style.colorScheme ? de.style.colorScheme : "";
        if (/dark/.test(cs)) return true;
        if (/light/.test(cs)) return false;
        var src = de.getAttribute("data-ds-theme-source");
        if (src === "dark") return true;
        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    } catch (e) {
        return false;
    }
}

export var C = LIGHT; // 当前生效 token（ensureCss 时按主题刷新）

export function cssText(t) {
    return [
        '.tp-panel-host {height:100%; min-height:0; width:100%; overflow:hidden}',
        '.tp-header-controls {display:flex;align-items:center;gap:6px}',
        '.tp-task-entry {display:inline-flex;align-items:center;justify-content:center;gap:5px;min-width:32px;height:30px;padding:0 8px;border:0;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer;-webkit-app-region:no-drag}',
        '.tp-task-entry:hover {background:' + t.acw + '}',
        '.tp-task-entry:focus-visible {outline:2px solid ' + t.accent + ';outline-offset:2px}',
        '.tp-entry-dot {width:6px;height:6px;background:' + t.accent + ';border-radius:50%}',
        '@media(max-width:480px){.tp-task-entry>span:not(.tp-entry-dot){display:none}}',
        ".tp-panel { display:flex; flex-direction:column; height:100%; overflow:hidden;",
        " font:13px/20px -apple-system,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif; color:" + t.ink2 + "; }",
        ".tp-head { flex:0 0 auto; padding:10px 14px 6px; }",
        ".tp-head .row1 { display:flex; align-items:center; gap:6px; }",
        ".tp-head .tt { font-size:13px; font-weight:500; line-height:24px; white-space:nowrap; color:" + t.ink + "; }",
        ".tp-count { margin-left:auto; font-size:12.5px; color:" + t.ink2 + ";",
        " font-variant-numeric:tabular-nums; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }",
        ".pct { font-size:12px; color:" + t.safe + "; width:34px; text-align:right; font-variant-numeric:tabular-nums; }",
        ".tp-bar { height:5px; border-radius:99px; background:" + t.line2 + "; overflow:hidden; margin-top:8px; position:relative; }",
        ".tp-bar i { display:block; height:100%; background:" + t.accent + "; border-radius:99px; transition:width .5s ease; }",
        ".tp-meta { display:flex; align-items:center; gap:6px; font-size:11.5px; color:" + t.safe + "; margin-top:6px; }",
        ".tp-more { flex:none; border:0; background:none; color:" + t.ink3 + "; font-size:14px; line-height:20px;",
        " width:24px; height:24px; border-radius:6px; cursor:pointer; margin-left:2px; }",
        ".tp-more:hover, .tp-more[aria-expanded=\"true\"] { background:" + t.line2 + "; color:" + t.ink + "; }",
        ".tp-menu { margin-top:6px; display:flex; flex-direction:column; gap:2px; border:.5px solid " + t.line + ";",
        " border-radius:8px; padding:4px; background:" + t.card2 + "; }",
        ".tp-menu button { text-align:left; border:0; background:none; color:" + t.ink2 + "; font-size:12px;",
        " line-height:22px; padding:2px 8px; border-radius:6px; cursor:pointer; }",
        ".tp-menu button:hover { background:" + t.acw + "; color:" + t.ink + "; }",
        ".tp-export { margin:8px 14px 0; }",
        ".tp-export textarea { width:100%; box-sizing:border-box; height:150px; resize:vertical; font-size:11px; line-height:16px;",
        " font-family:'SF Mono','JetBrains Mono',Consolas,monospace; color:" + t.ink2 + "; background:" + t.card2 + ";",
        " border:.5px solid " + t.line + "; border-radius:8px; padding:8px; }",
        ".tp-export .bar { display:flex; gap:8px; align-items:center; margin-top:4px; font-size:11.5px; color:" + t.safe + "; }",
        ".tp-export a { color:" + t.accTxt + "; }",
        ".tp-chips { display:flex; gap:6px; flex-wrap:wrap; margin:8px 14px 0; }",
        ".tp-chip { border:.5px solid " + t.chipLine + "; background:none; color:" + t.ink2 + "; cursor:pointer;",
        " font-size:11.5px; line-height:18px; padding:2px 9px; border-radius:99px; }",
        ".tp-chip .n { color:" + t.safe + "; margin-left:3px; font-variant-numeric:tabular-nums; }",
        ".tp-chip[aria-pressed=\"true\"] { background:" + t.chipOn + "; border-color:" + t.acw2 + "; color:" + t.accTxt + "; }",
        ".tp-chip[aria-pressed=\"true\"] .n { color:" + t.accTxt + "; }",
        ".tp-chip:focus-visible, .tp-more:focus-visible, .exp:focus-visible, .tp-text:focus-visible, .btn:focus-visible",
        " { outline:2px solid " + t.accent + "; outline-offset:1px; }",
        ".tp-cur { margin:8px 14px 0; font-size:12px; color:" + t.ink2 + "; background:" + t.acw + ";",
        " border-radius:8px; padding:5px 9px; line-height:18px; }",
        ".tp-cur b { color:" + t.accTxt + "; font-weight:600; }",
        ".muted { color:" + t.safe + "; font-size:11.5px; }",
        ".tp-interrupt { margin:8px 14px 0; display:flex; gap:8px; align-items:flex-start;",
        " border:.5px solid " + t.warn + "; background:" + t.warnBg + "; border-radius:10px;",
        " padding:10px 12px; font-size:12.5px; line-height:19px; color:" + t.ink + "; }",
        ".tp-interrupt b { color:" + t.warnTxt + "; }",
        ".tp-interrupt .why { color:" + t.safe + "; font-size:11.5px; line-height:18px; }",
        ".tp-interrupt .btn { margin-top:6px; display:inline-block; border:.5px solid " + t.warn + ";",
        " color:" + t.warnTxt + "; border-radius:99px; font-size:11.5px; padding:2px 10px; cursor:pointer; background:none; }",
        ".tp-done-card { text-align:center; padding:18px 14px; color:" + t.ink2 + "; font-size:12.5px; }",
        ".tp-done-card .big { font-size:26px; color:" + t.okTxt + "; line-height:40px; }",
        ".tp-done-card .muted { display:block; margin-top:2px; }",
        ".tp-badgebtn { border:.5px solid " + t.line + "; background:" + t.card2 + "; color:" + t.okTxt + ";",
        " font-size:13px; line-height:20px; padding:9px 14px; border-radius:99px; cursor:pointer; }",
        ".tp-badgebtn:hover { border-color:" + t.acw2 + "; }",
        ".tp-list { flex:1 1 auto; overflow-y:auto; margin:0; padding:6px 14px 8px;",
        " display:flex; flex-direction:column; gap:2px; min-height:0; }",
        ".tp-row { display:flex; align-items:flex-start; gap:8px; padding:6px 8px;",
        " border-radius:8px; border:.5px solid transparent; flex-wrap:wrap; }",
        ".tp-row.cur { background:" + t.acw + "; border-color:" + t.acw2 + "; }",
        ".tp-step { flex:none; width:16px; font-size:11px; color:" + t.safe + "; text-align:right;",
        " line-height:20px; font-variant-numeric:tabular-nums; }",
        ".tp-ico { flex:none; width:16px; height:16px; display:grid; place-items:center; margin-top:2px; }",
        ".dot { width:9px; height:9px; border-radius:50%; }",
        ".dot.idle { background:none; border:1.5px solid " + t.ink3 + "; }",
        ".dot.ongoing { background:" + t.accent + "; box-shadow:0 0 0 0 " + t.acw2 + "; animation:" + NS + "-pulse 1.6s infinite; }",
        ".dot.done { background:" + t.ok + "; }",
        ".dot.interrupt { background:none; border:1.5px solid " + t.warn + "; }",
        "@keyframes " + NS + "-pulse { from { box-shadow:0 0 0 0 " + t.acw2 + "; }",
        " to { box-shadow:0 0 0 6px rgba(77,107,254,0); } }",
        // 以零 basis 分配剩余空间，避免窄栏中长标题把序号和展开按钮挤到不同行。
        ".tp-text { flex:1 1 0; min-width:0; font-size:13px; line-height:20px; color:" + t.ink2 + ";",
        " word-break:break-word; cursor:pointer; }",
        ".tp-row.s-complete .tp-text { color:" + t.safe + "; }",
        ".tp-row.s-interrupt .tp-text { color:" + t.warnTxt + "; }",
        ".tp-row.cur .tp-text { color:" + t.ink + "; }",
        ".exp { flex:none; width:14px; height:14px; margin-top:3px; display:grid; place-items:center;",
        " color:" + t.ink3 + "; opacity:.7; transition:transform .18s; cursor:pointer; position:relative;",
        " border-radius:4px; }",
        ".exp::after { content:\"\"; position:absolute; inset:-5px; }",
        ".tp-row.open .exp { transform:rotate(90deg); opacity:1; color:" + t.accent + "; }",
        ".tp-row.open { background:" + t.card2 + "; border-color:" + t.line + "; }",
        ".sub { display:none; flex-basis:100%; margin:3px 0 2px 26px; padding:6px 8px;",
        " border-left:2px solid " + t.line + "; font-size:11.5px; line-height:18px; color:" + t.safe + "; }",
        ".tp-row.open .sub { display:block; }",
        ".sub .kv { display:flex; gap:6px; }",
        ".sub .kv span:first-child { flex:none; color:" + t.safe + "; min-width:44px; }",
        ".sub .kv b { color:" + t.ink2 + "; font-weight:500; }",
        ".tp-badge { width:7px; height:7px; border-radius:50%; background:" + t.accent + ";",
        " display:inline-block; margin-left:4px; vertical-align:1px; }",
        ".tp-empty { margin-top:auto; margin-bottom:auto; text-align:center; color:" + t.safe + "; font-size:12.5px;",
        " line-height:20px; padding:30px 24px; }",
        ".tp-empty svg { opacity:.5; margin-bottom:10px; }",
        ".tp-empty .h3 { font-size:13px; color:" + t.ink2 + "; }",
        ".tp-empty .g { margin-top:8px; font-size:11.5px; color:" + t.safe + "; background:" + t.card2 + ";",
        " border:.5px dashed " + t.line + "; border-radius:8px; padding:8px 10px; text-align:left; }",
        ".tp-empty .g code { font-family:'SF Mono','JetBrains Mono',Consolas,'Microsoft YaHei',monospace;",
        " font-size:11px; color:" + t.accTxt + "; }",
        ".tp-note { padding:10px 0; color:" + t.safe + "; text-align:center; font-size:12.5px; }",
        "@media (prefers-reduced-motion: reduce) { .dot.ongoing { animation:none; }",
        " .tp-bar i, .exp { transition:none; } }"
    ].join("\n");
}

export var cssDark = null; // null = 未注入；true/false = 已注入的 token 主题

export function ensureCss() {
    if (typeof document === "undefined") return;
    var dark = themeIsDark();
    C = dark ? DARK : LIGHT;
    var st = document.getElementById(NS + "-style");
    if (st && cssDark === dark) return;
    if (!st) {
        st = document.createElement("style");
        st.id = NS + "-style";
        document.head.appendChild(st);
    }
    st.textContent = cssText(C);
    cssDark = dark;
}

export function useTheme() {
    var _d = useState(themeIsDark), dark = _d[0], setDark = _d[1];
    useEffect(function () {
        var upd = function () {
            setDark(themeIsDark());
        };
        var mo = null;
        try {
            mo = new MutationObserver(upd);
            mo.observe(document.documentElement, {
                attributes: true,
                attributeFilter: ["style", "data-ds-theme-source", "class"]
            });
        } catch (e) {
        }
        var mq = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
        if (mq) {
            if (mq.addEventListener) mq.addEventListener("change", upd); else if (mq.addListener) mq.addListener(upd);
        }
        return function () {
            try {
                if (mo) mo.disconnect();
            } catch (e) {
            }
            if (mq) {
                if (mq.removeEventListener) mq.removeEventListener("change", upd); else if (mq.removeListener) mq.removeListener(upd);
            }
        };
    }, []);
    useEffect(function () {
        ensureCss();
    }, [dark]);
    return dark;
}
