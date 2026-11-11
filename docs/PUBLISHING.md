# 发布到 dsh-market

## 收录入口与格式

dsh-market 是市场应用，插件目录由 [awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) 提供。向目录仓库提交一个文件：

`data/plugins/Oak-liuhj__dsh-todo-progress.yml`

本仓库的对应文件在 [marketplace/](../marketplace/Oak-liuhj__dsh-todo-progress.yml)。分类为 `ui`，包含仓库地址、中英文描述、GitHub 托管的 PNG 图标及钉住版本的 Release tarball 地址；不要添加 `npm`、`tags` 或手写版本字段，也不需要修改目录仓库自动生成的 README。

格式依据：[最新贡献指南](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md)，于 2026-11-09 重新核验。

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

`engines.dsh` 显式声明 `0.2.1-rc.5 || 0.2.2-rc.1`，`dsh.verifiedDsh` 记录最新验证的 `0.2.2-rc.1`。后续版本完成实机验证后再追加，不使用无限制通配符。配套 [dsh-session-rollover](https://github.com/Oak-liuhj/dsh-session-rollover) 单独安装和启用，不作为 npm 运行时依赖安装。

本机 DSH 0.2.2-rc.1 的插件详情页已能展示 `meta.detail` 长文档。详情版本声明与 README 同步；市场卡片、目录索引和 npm 包可用状态分别验证。

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
2. 确认仓库已添加 **`dsh-plugin`** topic。2026-11-09 核验时已设置，且仓库创建满一天。
3. 创建 `v1.2.2` GitHub Release，上传已验证的 `dsh-todo-progress-1.2.2.tgz`。投稿 YAML 使用钉住标签的 `tarball` 地址；先验证下载与本地包 SHA-256 一致，再提交目录 PR。不要使用 `latest/download/` 搭配带版本文件名，以免后续发版使地址失效。
4. 满足仓库年龄要求后，向 `awesome-dsh-plugin/awesome-dsh-plugin` 提 PR，只修改上述 YAML（首次收录时新增）。PR 标题和说明可直接使用 [投稿正文](../marketplace/SUBMISSION.md)。
5. 等待维护者评审和目录刷新，再在市场中搜索插件验证卡片、截图、详情、安装及更新。

**仓库年龄限制**：GitHub API 显示本仓库创建于 `2026-11-06 14:36:26`（北京时间），因此最早在 **2026-11-07 14:36:26** 满足“创建满一天”。这是目录 CI 的要求。

GitHub 插件收录与 npm 发布是两个独立步骤。若要让用户直接填写 `dsh-todo-progress` 包名安装，必须把同名公共包发布到 npm；仅上传 GitHub Release 或合并收录 PR 不足以支持 npm 包名安装。包的 repository 必须与目录条目相同，市场才能在后续探测中关联 npm 来源，不要为此向投稿 YAML 添加不支持的 `npm` 字段。

### 发布 npm 包名安装渠道

优先发布与 GitHub Release 完全相同、已校验的安装包，保持两个渠道的版本和内容一致：

```powershell
npm whoami --registry=https://registry.npmjs.org/
npm publish .\dist\dsh-todo-progress-1.2.2.tgz --access public --registry=https://registry.npmjs.org/ --ignore-scripts
npm view dsh-todo-progress@1.2.2 name version repository dist --json --registry=https://registry.npmjs.org/
```

npm 发布账号需要完成 2FA 安全密钥绑定；登录邮箱验证码不能代替密钥绑定。发布过程中按 npm 提示完成本次操作的安全密钥验证，不要关闭 2FA 或在仓库中保存凭据。

发布成功后，匿名下载 npm 安装包并核对它与 Release 的 SHA-256；再在独立 `DSH_HOME` 中运行 `dsh plugin --profile web add dsh-todo-progress --ignore-scripts --registry=https://registry.npmjs.org/`，检查安装版本、服务端入口和客户端加载。测试使用隔离 profile，避免整理用户实际 profile 中的手工依赖。

以 npm 官方源能够查询和按包名安装为该渠道的生效依据；第三方 npm 镜像、市场目录和搜索索引的同步分别验证，不承诺固定同步时间。

版本发布以 [GitHub Releases](https://github.com/Oak-liuhj/dsh-todo-progress/releases) 为准。目录申请状态以 [收录 PR](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/pulls?q=is%3Apr+author%3AOak-liuhj+dsh-todo-progress) 为准；PR 提交、检查通过与正式收录是不同阶段，最终以维护者合并及市场索引刷新为准。
