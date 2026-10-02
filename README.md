# 山海异兽录

一部可以漫游的《山海经》异兽网站。使用现有 266 幅工笔风格 AI 插画，提供篇卷筛选、名称与形貌检索、浏览器本地收藏、随机探索、独立详情页、分享链接、图文卡片下载，以及原文出处。

## 预览

需要 Node.js 18 或更新版本，无需安装 npm 依赖。在项目目录执行：

```sh
node scripts/serve.mjs
```

打开 `http://127.0.0.1:8770/`。子目录兼容性预览地址为 `http://127.0.0.1:8770/shanhai-bestiary/`。

## 发布到 GitHub Pages

`site/` 为完整静态网站，可托管到 GitHub Pages、Cloudflare Pages、Netlify 或任何静态服务器。无需数据库、API 密钥或后端服务。

1. 在 GitHub 创建公开仓库，例如 `shanhai-bestiary`，上传本项目。
2. 在仓库的 **Settings → Pages → Build and deployment** 中，将 **Source** 设为 **GitHub Actions**。
3. 推送到 `main` 分支，或在 **Actions → Publish Shanhai Bestiary** 中选择 **Run workflow**。
4. 等待部署成功。网址通常为 `https://你的用户名.github.io/shanhai-bestiary/`，以 Actions 和 Pages 页面显示的实际网址为准。

随附的工作流会自动设置 canonical、Open Graph 分享信息和 sitemap，随后发布 `site/`。公开仓库和网站发布会让此项目的图片、文字与前端源码对外可见。正式分享前应确认工作流显示部署成功，且公开网址在未登录状态下可打开。

若在其他平台发布，输出目录选 `site`，构建命令留空。可先运行 `python scripts/set_site_url.py https://你的域名/` 补齐分享元数据与站点地图。

## 内容与文件

- `site/index.html`：首页与检索图鉴。
- `site/creatures/001/` 至 `266/`：266 个独立静态详情页。刷新、直接分享、禁用 JavaScript 时仍可阅读图片与正文。
- `site/assets/creatures/`：完整尺寸 WebP 插画；PNG 原始文件仍保留在原图鉴中。
- `site/assets/thumbs/`：640 像素列表缩略图，懒加载。
- `site/assets/catalog.json`：公开条目数据，不含接口配置或生图过程日志。
- `src/`：HTML 模板、CSS、JavaScript、字体与许可。
- `scripts/build.py`：从原图鉴重新生成网站，依赖 Pillow；默认读取本项目上级 `outputs/山海经异兽图鉴`，也可用 `--source` 指定目录。
- `scripts/verify.py`：检查条目数、所有图片解码与站内文件链接，依赖 Pillow。

修改 `src` 后运行 `python scripts/build.py`，再提交更新的 `site/`。字体为 Google Fonts 的 Noto Serif SC 按本图鉴字符集裁剪，遵循 SIL Open Font License，许可见 `site/assets/OFL.txt`。新增原字符集以外的文字时浏览器会使用系统字体回退。

## 阅读说明

266 是绘图条目数，包含同名异形与 30 条兽形神灵，不是独立物种的权威总数。插画是现代 AI 艺术复原；六处尚存的形貌偏差在对应详情中注明。古籍中的灾异与药效属于文献内容。原文链接指向维基文库，适用归属与许可在网站页脚说明。

收藏只保存在当前浏览器，没有账号系统，不会跨设备同步。分享链接在发布后自动使用当前网站域名；本地预览地址无法供外部访问。图文卡片在浏览器本地生成，需允许浏览器保存文件。
