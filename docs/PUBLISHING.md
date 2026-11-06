# 发布到 dsh-market

## 收录入口与格式

dsh-market 是市场应用，插件目录由 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提供。向目录仓库提交一个文件：

`data/plugins/Oak-liuhj__dsh-todo-progress.yml`

本仓库的对应文件已准备在 [marketplace/](../marketplace/Oak-liuhj__dsh-todo-progress.yml)。分类为 `ui`，包含真实仓库地址、中英文描述及 GitHub 托管的 PNG 图标；不要添加 `npm`、`tags` 或手写版本字段，也不需要修改目录仓库自动生成的 README。

格式依据：[最新贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，于 2026-11-06 只读核验。

## 本项目的发布格式

| 资源 | 用途 |
| --- | --- |
| `package.json` 的 `dsh.bundle.patch` | 宿主插件装配，指向 `cordis.patch.yml` |
| `dsh.client.platform: web` | 浏览器渲染层；同样用于桌面客户端，不表示仅支持 Web |
| `exports` 中的 `./client` | 已构建的 ModuleLoader 客户端，无需安装时编译 |
| `locale/en.json` / `locale/zh.json` 的 `meta` | 原生插件页的名称、简介；支持详情读取的宿主以 `meta.detail` 选择文档 |
| `description`、repository / homepage / bugs / license | 市场摘要、来源、反馈和许可 |
| `assets/icon.png` | 180×180 PNG，宿主插件页及市场卡片图标 |
| `screenshots.json` | 市场展示截图及顺序，路径均位于本仓库内 |
| `docs/DETAIL*` / `README.md` / `CHANGELOG.md` | 用户详情、安装开发说明和版本变化 |
| `LICENSE` / `LICENSE.upstream` / `NOTICE` | 保留 Apache-2.0 与导入 MIT 代码的许可和版权通知 |

`engines.dsh` 继续锁定已验证的 `0.2.1-rc.5`。尚未验证其他宿主版本，不扩大兼容声明。R3 为可选本地 / 内部配套包，不作为 npm 运行时依赖安装。

本机已安装的宿主实测可显示图标、标题和摘要，但插件详情页尚未渲染 `meta.detail` 长文档。中英文文档已按当前宿主源码的详情读取约定提供；在该本机版本中可通过 README 阅读完整说明，通过任务面板的“⋯ → 使用说明”查看操作引导。长文档在市场上的最终展示须在实际收录后验证。

## 本地验证与打包

```powershell
pnpm install --frozen-lockfile
npm test
npm run check:release
New-Item -ItemType Directory -Path dist -Force
npm pack --pack-destination dist
```

`check:release` 验证资源边界、装配清单、双语元数据、方形 PNG、截图声明、投稿条目及服务端入口。`npm pack` 自动构建并执行同一检查。发布包不包含认证启动日志、本地 HOME 或测试模型。

仓库 CI 同样执行测试、格式检查和打包。提交前确认 `client.js` 已由源码生成，并保留两份许可证和 NOTICE。

## 对外步骤

1. 把本地提交推送到 `Oak-liuhj/dsh-todo-progress` 的 `main`，确认公开仓库含新版本、图标、截图及文档。
2. 给仓库添加 **`dsh-plugin`** topic。2026-11-06 核验时该 topic 尚未设置。
3. 可选但推荐：创建 `v1.2.1` GitHub Release，上传已验证的 `dsh-todo-progress-1.2.1.tgz`。之后可在投稿 YAML 增加真实可下载的 `tarball` 字段；尚未上传时不要把不存在的下载地址提交给目录。
4. 满足仓库年龄要求后，向 `awesome-dsh-plugin/awesome-dsh-plugin` 提 PR，只新增上述 YAML。PR 标题和说明可直接使用 [投稿正文](../marketplace/SUBMISSION.md)。
5. 等待维护者评审和目录刷新，再在市场中搜索插件验证卡片、截图、详情、安装及更新。

**仓库年龄限制**：GitHub API 显示本仓库创建于 `2026-11-06 14:36:26`（北京时间），因此最早在 **2026-11-07 14:36:26** 满足“创建满一天”。这是目录 CI 的要求。

发布到 npm 是可选的，不影响 GitHub 插件收录。2026-11-06 查询 `dsh-todo-progress` 的 npm 元数据返回 404；当前不在文档中将它描述为已发布的 npm 包。若以后发布 npm，包的 repository 必须与目录条目相同，才能被市场关联。

当前准备工作仅生成本地代码、提交、安装包与投稿材料；没有执行 push、创建 Release、npm publish 或提交目录 PR。
