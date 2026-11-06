/** 包身份、宿主席位与浏览器持久化键。旧 NS 保留，避免丢失已有帧记录。 */
export const NS = "dsh-task-panel";
export const VERSION = typeof __PLUGIN_VERSION__ === "undefined" ? "development" : __PLUGIN_VERSION__;
export const TAB_KIND = "todo-progress";
export const SLOT = "sidebar.right.pane.tab";
export const FRAMES_KEY = NS + ".frames.v1";
export const CFG_KEY = NS + ".config.v1";
export const COLLAPSE_STEPS = [30, 1, 60];
