# dsh-todo-progress（旧名 dsh-task-panel）

dsh-todo-progress 是DSH 右侧栏 任务进度面板，主要管dsh web 上的"任务走到哪了"。

会话任务进度右侧栏 tab（R2）。设计基线 v1.0（原型冻结）+ 接口契约 v0.2。

> 包身份：npm 名 `dsh-todo-progress`（规格 Q8 收口）。旧名 `dsh-task-panel` 只作**安装别名**保留，
> 不另发包：`npm i dsh-task-panel@npm:dsh-todo-progress`。运行时键（loader id / slot key /
> localStorage `dsh-task-panel.*`）按兼容性刻意不动——改它会丢用户已有的帧沿与中断记忆。

## 它是什么
- **只读**订阅宿主 `todos` 投影（`props.useProjection("todos")`，与宿主 TodoDock 同一标准 prop），在右侧栏 `sidebar.right.pane.tab` 渲染「任务进度」tab：完成数、进度条、当前第 X 步、四个数据态（待办 / 进行中 / 完成 / 中断）与空态、列表行内徽章、`⋯` 菜单（**导出** JSON 快照：只读 textarea 可选中复制 + 「下载 .json」链接）。
- 零 RPC、零第三方依赖：server 半边是 no-op 挂载点，全部逻辑在 `client.js`（ModuleLoader 契约，仅 `require("react")`）。
- 不改宿主、不写会话元数据；「步」= todos 投影数组位置（index，1 起，派生不持久化）。
- 不调用剪贴板 API（无 `navigator.clipboard` / `writeText` / `execCommand("copy")`）；快照复制由用户自行在只读 textarea 中选中完成。

## 本地存储（诚实口径）
浏览器 localStorage 中只写两个插件自有键，不上传、不跨会话、不含凭据：
- `dsh-task-panel.frames.v1`：最近一帧 todos 快照（**含会话任务文本**），用于中断判定（上一帧有进行中 · 本帧清单为空 · 之后无新写入）、「上一轮待办快照」回看，以及 D-43 的待办更新时间 `u`（配内容指纹 `uSig`；同一内容刷新后时间不前移）。
- `dsh-task-panel.cfg.v1`：收起时长配置（默认 30 分钟）。
- 读写异常（隐私模式 / 配额）一律吞掉，不影响渲染。

## 安装 / 卸载
```
dsh plugin --profile <name> add <本目录>          # 或 package.json 里 "dsh-todo-progress": "link:<本目录>"
npm i dsh-task-panel@npm:dsh-todo-progress        # 旧名 alias（等价，同一份包）
dsh plugin --profile <name> remove dsh-todo-progress
```
卸载即删包，**不删上面两个 localStorage 键**：需要彻底零残留时，请手动清除浏览器存储里的 `dsh-task-panel.*`。插件无数据目录（数据落盘口径见 dsh-session-rollover）。
已知风险（M1 实拍验证项）：GUI 会话缓存 `dsh.sidebar-right.v1.*` 卸载后 tab 记录可能残留，不阻塞。

## 版本边界
当前发布版 `1.0.0`（装机包以 `package.json` 为准）。

两个版本字段指向不同层，不是同一件事，别混读：
- `engines.dsh` / `dsh.verifiedDsh = 0.2.1-rc.5`：**dsh 运行时**（`dsh --version` 实测 `0.2.1-rc.5`）。
- `dsBot.min 0.2.6` / `dsBot.verified 0.2.7`：**ds-bot 桌面壳**（v5 实拍与装机回验所在 profile 的 `node_modules/ds-bot/package.json` 实测 `0.2.7`）。

`dsh.manifestVersion = 1`。宿主 minor 升级须复验：注入清单、`sidebar.right.pane.tab` 席位存活、todos 投影形态；不过则降级 manual。

## 已知限制（发布说明）
1. **展开区只读三行**：面板展开项按宿主 todos 投影只有 `content`/`status` 两个字段，故只显示状态、说明，不提供产物/耗时等占位（设计基线 §5.1，D-38）。
2. **M1 观察项**：GUI 卸载后 `dsh.sidebar-right.v1.*` 的 tab 记录可能残留，不影响功能，不清理。
3. **「更新于」按列表签名计时**：时间戳只在 `(content, status)` 变化时刷新（D-43）；仅打开面板、重渲染不会前移时间，同一列表内字样微调算一次变化。

## 开发
```
node test/projection.test.mjs        # 纯逻辑 9 tests（投影适配层，client.js 内联同族逻辑）
```
`src/projection.mjs` 为逻辑参考实现（Node 测试用）；运行时不 import（ModuleLoader 不能引包内 ESM，dsh-one-memory 先例全内联）。

## 许可证

本仓库原有 Apache-2.0 许可证保留在 `LICENSE`。本次导入的插件源码来自原 MIT 许可源码仓库，原始许可与版权声明保留在 `LICENSE.upstream`。
