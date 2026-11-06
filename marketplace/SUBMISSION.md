# 投稿标题

Add Oak-liuhj/dsh-todo-progress — task progress sidebar for DSH

# 投稿正文

This adds `Oak-liuhj/dsh-todo-progress`, a maintained task progress sidebar for DeepSeek Harness Web and desktop. The top-right Tasks button opens the current conversation's task list with completion percentage, current step, status filters and expandable details. The sidebar uses half its previous width, subject to the host's 300px minimum, and restores the previous width when another tool is selected.

The package declares `dsh.bundle.patch` and a prebuilt browser client, with no third-party runtime dependencies. Task data is read from the host's `todos` projection. Session creation uses an authenticated owner bridge; optional handoff uses a separately installed companion and is disabled when that service is unavailable.

The source includes tests, Web and desktop validation records, localized plugin details, a GitHub-hosted PNG icon, and `screenshots.json`. Compatibility is explicitly pinned to the verified DSH `0.2.1-rc.5`. The upstream MIT notice is retained alongside the repository's Apache-2.0 license.

Only `data/plugins/Oak-liuhj__dsh-todo-progress.yml` is proposed here. Screenshots and documentation are maintained in the plugin repository.

## 提交前

确认公开仓库已更新、添加 `dsh-plugin` topic，且创建满一天。此文件是本地准备的正文，不表示 PR 已提交或目录已收录。
