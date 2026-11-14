# 投稿标题

Add Oak-liuhj/dsh-todo-progress — task progress sidebar for DSH

# 投稿正文

This adds `Oak-liuhj/dsh-todo-progress`, a maintained task progress sidebar for DeepSeek Harness Web and desktop. The top-right Tasks button opens the current conversation's task list with completion percentage, current step, status filters and expandable details. The sidebar uses half its previous width, subject to the host's 300px minimum, and restores the previous width when another tool is selected.

The package declares `dsh.bundle.patch` and a prebuilt browser client, with no third-party runtime dependencies. Task data is read from the host's `todos` projection. Session creation uses an authenticated owner bridge; optional handoff uses a separately installed companion and is disabled when that service is unavailable.

The source includes tests, Web and desktop validation records, localized plugin details, a GitHub-hosted PNG icon, and `screenshots.json`. The declared DSH installation range is `0.2.1-rc.5 || >=0.2.2-rc.1 <0.3.0-0`, including rc.3 and later 0.2.x releases. Historical Web and desktop validation covers `0.2.1-rc.5` and `0.2.2-rc.1`; the range does not claim that every included host has been tested. The upstream MIT notice is retained alongside the repository's Apache-2.0 license.

The prebuilt `v1.2.3` release tarball is pinned in the entry so installation does not require a frontend build. The source includes modular client/server code, a top-right task entry, compact sidebar restoration, task filters, completion collapse, JSON export and an in-panel usage guide. Imported MIT-licensed code by Fei2411 is credited in `LICENSE.upstream` and `NOTICE`.

Only `data/plugins/Oak-liuhj__dsh-todo-progress.yml` is proposed here. Screenshots and documentation are maintained in the plugin repository.

## 提交前

确认公开仓库已更新、添加 `dsh-plugin` topic，且创建满一天。此文件是本地准备的正文，不表示 PR 已提交或目录已收录。
