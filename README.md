# dsh-todo-progress

**DSH 任务进度面板 · 在会话右上角查看多步任务的完成情况**

为 DeepSeek Harness Web 与桌面客户端提供任务进度侧栏。点击右上角「任务」，即可查看当前会话的完成比例、正在执行的步骤和待办清单，适合代码开发、问题排查、资料整理等多步任务。

> 多步任务里模型会调用 todo_write 写入待办清单，这里将实时出现进度

当前版本 **1.2.2** · 已验证 DSH **0.2.2-rc.1**，保留 **0.2.1-rc.5** 支持 · 无第三方运行时依赖 · 任务界面为中文

[安装](#安装) · [快速上手](#快速上手) · [常见问题](#常见问题) · [English overview](docs/DETAIL.md) · [更新记录](CHANGELOG.md) · [问题反馈](https://github.com/Oak-liuhj/dsh-todo-progress/issues)

![DSH 会话右上角的任务入口与任务进度侧栏](docs/images/v1.2-task-panel.png)

## 功能一览

| 功能 | 使用体验 |
| --- | --- |
| 一键打开 | 右上角「任务」直接进入进度面板，空白会话也能打开；重复点击复用已有标签页 |
| 进度与当前步骤 | 显示完成数、总任务数、百分比及当前步骤，并行进行中的任务同时高亮 |
| 筛选与详情 | 按「全部 / 进行中 / 待办 / 完成」筛选，展开任务查看完整内容 |
| 更窄的侧栏 | 默认使用原右栏宽度的一半，最低 300px；切换工具后恢复，保留主动拖动后的宽度 |
| 收起与恢复 | 支持手动收起；全部完成后默认 30 分钟自动收起，可选择 1 / 30 / 60 分钟 |
| 快照与导出 | 查看必要的中断提示和上一轮快照，将当前任务快照复制或下载为 JSON |
| 会话联动 | 新建空白会话并继承工作区；启用配套分卷插件后可使用「现在换会话」 |

<details>
<summary>查看桌面客户端效果</summary>

Web 与桌面客户端使用同一套会话界面和任务入口。

![DSH 桌面客户端中的任务入口与进度面板](docs/images/v1.2-desktop-task-panel.png)

</details>

## 安装

### 从市场安装

市场收录后，在 **dsh-market** 中搜索 `dsh-todo-progress`，查看插件详情后安装，并确认插件已启用。收录和可安装状态以市场实际展示为准。

### 按包名安装

**升级到 DSH `0.2.2-rc.1` 后，请指定 `dsh-todo-progress@1.2.2`。** 刚发布时，pnpm 的发布观察期可能让不带版本的安装选中旧版 `1.2.1`，继而触发宿主不兼容提示。添加插件时可直接填写 `dsh-todo-progress@1.2.2`，或执行 `dsh plugin --profile desktop add dsh-todo-progress@1.2.2 --ignore-scripts --registry=https://registry.npmjs.org/`；Web 请将 profile 改为 `web`。无需启用宿主版本豁免。

已发布 [npm 公共包 `dsh-todo-progress`](https://www.npmjs.com/package/dsh-todo-progress)。在 DSH 的添加插件入口填写 **`dsh-todo-progress`**；也可按实际 profile 选择一条命令：

```powershell
# DSH 桌面客户端
dsh plugin --profile desktop add dsh-todo-progress --ignore-scripts

# DSH Web
dsh plugin --profile web add dsh-todo-progress --ignore-scripts
```

包名安装从 npm 获取插件，与市场目录搜索的更新进度相互独立。若所用 npm 镜像尚未同步，可在命令末尾添加 `--registry=https://registry.npmjs.org/` 使用官方源。安装后按下文说明重新打开对应的 DSH 客户端或 Web 服务。

### 从本地安装包安装

使用 `dsh-todo-progress-1.2.2.tgz`。如果仓库 [Releases](https://github.com/Oak-liuhj/dsh-todo-progress/releases) 已提供附件，可下载对应版本；否则按下方「开发与打包」从源码生成。

在安装包所在目录打开 PowerShell，按实际使用的 profile **选择一条**执行：

```powershell
# DSH 桌面客户端
dsh plugin --profile desktop add ".\dsh-todo-progress-1.2.2.tgz" --ignore-scripts

# DSH Web
dsh plugin --profile web add ".\dsh-todo-progress-1.2.2.tgz" --ignore-scripts
```

自定义 profile 请将 `desktop` 或 `web` 替换为实际名称。更新已有版本时使用相同命令即可；插件客户端已预构建，安装时无需编译。

安装后确认插件已启用，并正常退出、重新打开对应的 DSH 客户端或 Web 服务，让服务端和界面同时加载新版本。已有本地设置使用原存储键继续读取。若 profile 含手工放置的依赖，更新前请保留备份，宿主包管理器可能整理未声明的包。

## 快速上手

1. 打开一个会话，向模型描述需要分步骤完成的任务。
2. 点击会话右上角的 **「任务」**，打开「任务进度」侧栏。
3. 模型通过 `todo_write` 创建或更新待办后，面板随清单变化刷新进度。
4. 使用状态筛选查看任务，展开任务行查看详情；需要调整任务时，在会话中告诉模型。
5. 点击面板右上角 **「⋯ → 使用说明」**，查看面板内的操作提示。

可以用这样的任务开始：

> 请检查这个项目的构建问题，先建立待办清单，再按步骤定位原因、修复并验证。

简单问答可能不会产生待办。面板展示模型写入的任务清单；模型未创建清单时会显示引导文案。

### 面板菜单

| 菜单项 | 作用 |
| --- | --- |
| 使用说明 | 展开或收起操作引导 |
| 导出 JSON 快照 | 复制或下载当前任务快照；剪贴板不可用时可选择文本或下载 |
| 收起面板 | 将面板收起为可点击恢复的卡片 |
| 完成收起阈值 | 在 1 / 30 / 60 分钟之间切换，仅在全部任务完成后生效 |
| 兼容旧面板 | 在输入框上方显示同一份任务列表，默认关闭 |
| 新建会话 | 创建空白会话，优先继承原工作区，无工作区时继承工作目录 |
| 现在换会话 | 通过配套分卷插件交接会话，需另行安装并启用兼容版本 |

有待开始或进行中的任务时，入口和任务标签显示蓝点。点击「已完成」徽章可重新展开；出现新清单后，自动收起重新计时。

<details>
<summary>查看 1.2.1 空态与面板使用说明</summary>

![任务面板中的使用说明与空态文案](docs/images/v1.2.1-usage-guide.png)

</details>

## 可选：会话分卷联动

基础任务进度功能可独立使用。若需要「现在换会话」和交接来源展示，请另行安装并启用配套的 [dsh-session-rollover](https://github.com/Oak-liuhj/dsh-session-rollover)。它需要提供兼容的会话分卷服务；相关接口在 1.0.1 起提供，安装方式与版本要求以配套仓库说明为准。

未启用兼容服务时，「现在换会话」不可用。新卷尚无自己的待办时，可展示带来源标识的交接快照；当前会话清单出现后，以当前清单为准。快照不会被写回为当前会话的待办。

新建和交接会话要求宿主 owner 身份，共享查看者不能通过这些入口修改会话。

## 兼容性与数据说明

- **验证范围**：DSH 运行时 `0.2.1-rc.5`、`0.2.2-rc.1`，Web 与桌面客户端。其他宿主版本需要重新验证；界面中的任务名称和操作提示目前为中文。
- **任务来源**：读取宿主当前会话的待办清单。完成比例按已完成项数计算，不代表工时或耗时比例；当前步骤取首个进行中任务。
- **任务修改**：通过会话中的模型更新。插件读取和展示任务，不直接修改待办，也不自动创建任务清单。
- **本地存储**：最近任务帧包含任务文本，与收起状态和偏好一起保存在当前浏览器或桌面客户端的本地存储中；这份缓存不提供跨设备同步。
- **模型配置**：无需为插件另行提供模型 API Key；模型调用继续使用 DSH 的配置。插件不保存登录凭据。
- **布局适配**：半宽布局依赖当前宿主实现。宿主升级后若缺少所需能力，插件保留宿主布局；浮动和全屏模式沿用宿主行为。

### 后续 DSH 升级

仓库新增每日、手动及 PR 的宿主兼容检查，覆盖已验证版本和 npm `latest` / `next`。客户端把入口、布局、旧面板和导航分别隔离，减少可选接口变化对任务正文的影响。检查通过后仍需在新宿主的 Web / 桌面完成实机验收，再发布适配版本。

1.2.2 已在 DSH `0.2.2-rc.1` 上验证 Web 的工具写入、进度筛选和新建会话，以及本机桌面的入口、已有待办与设置保留。兼容声明显式列出两个宿主版本，避免旧包精确锁定导致升级被拦截。具体范围及后续升级步骤见 [DSH 升级适配说明](docs/COMPATIBILITY.md)。

<details>
<summary>本地缓存与卸载清理说明</summary>

为兼容旧版本，保留以下 localStorage 键：

| 键 | 内容 |
| --- | --- |
| `dsh-task-panel.frames.v1` | 按会话保存最近任务帧、中断记忆、收起状态和更新时间，含任务文本 |
| `dsh-task-panel.config.v1` | 完成后收起时长、兼容旧面板开关 |

存储不可用时仍可展示当前任务。卸载不会自动删除缓存；若需要彻底清理，可在对应 DSH 界面的开发者工具中删除以上两个键。此操作会清除插件缓存与偏好，不会删除宿主会话。

宿主自己的 `dsh.sidebar-right.v1.*` 键可能保留标签页记录，插件不会直接修改这些键。会话交接数据由配套分卷插件管理。

</details>

## 常见问题

**为什么任务面板是空的？**

当前会话尚未产生待办，或模型尚未调用 `todo_write`。可以要求模型先建立待办清单。若模型已经写入清单，请确认打开的是对应会话，并检查宿主版本是否兼容。

**能直接在面板中勾选完成或修改任务吗？**

任务由模型创建和更新。如需修改内容或状态，请在会话中提出要求。

**为什么宽度不是原来的精确一半？**

侧栏遵守宿主 300px 的最小宽度，例如原宽度 576px 时会使用 300px。手动拖动过侧栏后，插件会保留新宽度；切换到其他工具或关闭任务页时，未手动调整的宽度会恢复。

**为什么「现在换会话」不可点击？**

请确认配套分卷插件已经启用并提供兼容服务。已封存的只读会话、缺少会话导航能力或操作正在进行时，此入口也可能不可用。

**更新后还是旧界面，或者看不到完整插件说明？**

正常退出并重新打开对应的客户端或 Web 服务，确认版本已更新。部分宿主版本只能显示插件图标、名称和摘要，尚不渲染长篇详情；可阅读本 README，或打开任务面板的「使用说明」。

## 卸载

按安装时使用的 profile 选择一条命令：

```powershell
# DSH 桌面客户端
dsh plugin --profile desktop remove dsh-todo-progress

# DSH Web
dsh plugin --profile web remove dsh-todo-progress
```

重新打开 DSH 后生效。插件卸载时注销自己的入口和插槽，恢复宿主原入口及原待办面板；本地缓存清理方式见上文。

## 开发与打包

本仓库 CI 使用 **Node.js 24 / pnpm 11**。React 由 DSH 提供，esbuild 和 js-yaml 仅为开发依赖。

```powershell
git clone https://github.com/Oak-liuhj/dsh-todo-progress.git
cd dsh-todo-progress
pnpm install --frozen-lockfile

npm run build          # 从 src/client/ 生成 client.js
npm test               # 回归测试与 ModuleLoader 加载自检
npm run check:release  # 产物一致性、装配、元数据、图标、截图和投稿条目
npm run check:host -- --host latest  # 联网检查最新宿主的所用声明结构

New-Item -ItemType Directory -Path dist -Force | Out-Null
npm pack --pack-destination dist
```

打包后得到 `dist/dsh-todo-progress-1.2.2.tgz`。`npm pack` 自动构建并检查发布格式；包内包含运行时源码、预构建客户端、说明、图标、截图及许可证，不包含本地验证配置与认证日志。

### 项目结构

```text
index.js / client.js        服务端入口 / 生成的客户端入口
cordis.patch.yml            DSH 插件装配
src/client/
  components/              任务入口、面板、任务行、空态与使用说明
  model/                   待办派生、筛选、中断判定与导出
  state/                   本地缓存与偏好
  host/                    会话导航、右上角入口与布局适配
  hooks.js / register.js   状态订阅 / 插槽注册和生命周期
src/server/                会话操作、认证与请求校验
locale/                    插件页的中英文元数据和详情文档路径
assets/                    图标源文件与 PNG
screenshots.json           市场截图声明
scripts/                   客户端构建、发布检查与官方宿主声明探测
test/                      回归测试和加载自检
docs/                      插件说明、发布指南与验收记录
marketplace/               投稿 YAML 与 PR 正文
```

修改客户端源码后执行 `npm run build`，不要直接修改生成的 `client.js`。开发 profile 可通过 `link:` 指向自己的项目路径；不要复用其他机器的绝对路径。

<details>
<summary>宿主接口与升级适配说明</summary>

- 任务数据使用宿主 `props.useProjection("todos")`。步号由清单顺序派生，从 1 开始；内容或状态变化时更新待办时间。上一轮进行中的清单被清空时，按状态边沿保留中断提示与上一轮快照，新清单到来后解除。
- 右上角入口组合在 `conversation.session.header.corner` 插槽，复用宿主注册的 store / inject / locale。注销后恢复原条目。
- `host/compact-layout.js` 从公开 root 插槽记录取得共享 store，调用 `setRightbar` 调整宽度。该适配依赖当前宿主实现；多个可见任务页共用一次调整，最后一个退出才恢复。
- 包名及 ModuleLoader id 为 `dsh-todo-progress`；插槽命名空间和缓存键保留 `dsh-task-panel` 以兼容已有数据。
- `engines.dsh` 与 `dsh.verifiedDsh` 指向 DSH 运行时版本；历史 `dsBot.min` / `dsBot.verified` 是桌面壳字段，不与运行时版本混用。
- 宿主升级后按 [兼容维护流程](docs/COMPATIBILITY.md) 复验入口、空会话、待办订阅、侧栏宽度恢复、浮动 / 全屏、会话操作和卸载。结构检查不自动扩大版本范围。

</details>

## 发布与反馈

本次实机记录：[1.2.2 / DSH 0.2.2-rc.1 升级验收](docs/升级验收记录-1.2.2-2026-11-11.md)。

上架格式、投稿材料和操作步骤见 [发布指南](docs/PUBLISHING.md)。[中文详情](docs/DETAIL.zh-CN.md) 与 [英文详情](docs/DETAIL.md) 通过 `locale/*` 的 `meta.detail` 提供给支持详情读取的宿主；市场展示应在实际收录后验证。

发布前执行测试、发布检查和打包。市场收录不要求先发布 npm；公开安装包和市场可用状态以 Releases 与市场实际展示为准。

使用问题请提交到 [GitHub Issues](https://github.com/Oak-liuhj/dsh-todo-progress/issues)，建议附上 DSH 版本、Web / 桌面、插件版本、复现步骤和已脱敏截图。请勿提交 API Key、登录 token 或完整会话数据。

历史实机记录：[1.2.0 Web 验收](https://github.com/Oak-liuhj/dsh-todo-progress/blob/main/docs/本地验收记录-1.2.0-2026-11-06.md) · [1.2.0 桌面验收](https://github.com/Oak-liuhj/dsh-todo-progress/blob/main/docs/桌面客户端验收记录-1.2.0-2026-11-06.md) · [1.2.1 发布准备验收](https://github.com/Oak-liuhj/dsh-todo-progress/blob/main/docs/发布验收记录-1.2.1-2026-11-06.md)。这些记录对应各自版本和验证环境，不代表所有宿主版本均已验证。

## 许可证

本项目包含 Apache-2.0 与 MIT 许可的代码，包清单标记为 `(Apache-2.0 AND MIT)`。原仓库许可证见 [LICENSE](LICENSE)，导入源码的 MIT 许可证见 [LICENSE.upstream](LICENSE.upstream)，来源与版权通知见 [NOTICE](NOTICE)。
