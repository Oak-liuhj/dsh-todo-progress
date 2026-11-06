/** 浏览器构建入口。发布 client.js 由 esbuild 生成，宿主仍只需注入 React。 */
import {NS, VERSION} from "./constants.js";
import {apply} from "./register.js";
import {derive, edgeDecide, frameTsDecide, handoffRows} from "./model/todos.js";
import {cfgLoad, cfgSave} from "./state/storage.js";
import {useCompletionCollapse} from "./hooks.js";
import {Body} from "./components/task-panel.js";
import {ChipTitle} from "./components/tab-title.js";
import {LegacyDock} from "./components/legacy-dock.js";
import {TaskEntry} from './components/task-entry.js';
import {registerHeaderEntry} from './host/header-entry.js';
import {runtime} from './host/navigation.js';
export const name = NS;
export const inject = ["slots", "sessions"];
export {apply};
// 对生成后的真实客户端进行回归测试，避免只测一份脱离运行时的替身。
export const __test = {edgeDecide, frameTsDecide, derive, VERSION, Body, ChipTitle, LegacyDock,
    cfgLoad, cfgSave, handoffRows, useCompletionCollapse, TaskEntry, registerHeaderEntry, runtime};
