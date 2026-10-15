# Repository Guidelines

## Project Overview

淼畔的个人博客，基于 Fuwari、Astro 5、Svelte 5 和 Tailwind CSS 3。文章构建为静态页面，Pagefind 提供站内搜索；音乐页面通过独立 Express 服务获取每日内容和播放信息。

## Architecture & Data Flow

- **文章链路**：`src/content/posts/` → `src/content/config.ts` 校验 frontmatter → `src/utils/content-utils.ts` 过滤草稿、按置顶和日期排序、生成前后文章关系 → `src/pages/[...page].astro` 分页与 `src/pages/posts/[...slug].astro` 静态详情路由。详情通过 `entry.render()` 渲染，避免在页面中另写集合过滤和排序。
- **页面组合**：`src/layouts/Layout.astro` 负责 HTML 外壳和元数据，`MainGridLayout.astro` 组合导航、侧栏、正文、页脚和目录。站点配置从 `src/config.ts` 直接导入。
- **内容处理与搜索**：`astro.config.mjs` 串联 remark/rehype、KaTeX、Expressive Code 和自定义插件；`astro build` 后运行 Pagefind 为 `dist/` 建索引。Swup 在客户端替换 `main` 与 `#toc`，修改交互时注意局部导航生命周期。
- **音乐链路**：`music.astro` 挂载 Svelte 客户端组件 → Express API → `server/music-data/YYYY-MM-DD.md` 的 frontmatter/正文 → QQ 音乐或网易云解析 → JSON 缓存与响应。今日接口选取不晚于上海时区当天的最近文件，明日接口读取对应日期文件。修改响应字段时同步检查 `DynamicMusicContent.svelte` 和 `MusicPlayer.svelte`。

## Key Directories

- `src/components/`：Astro 页面区块与 Svelte 交互组件；动态音乐内容和播放器在此。
- `src/content/posts/`、`src/content/spec/`：文章与特殊页面内容；字段以集合 schema 为准。
- `src/utils/`、`src/types/`、`src/constants/`：共用逻辑、类型和常量；`src/i18n/` 管理翻译。
- `src/plugins/`：Markdown、rehype 和 Expressive Code 扩展；`src/styles/` 存放全局样式。
- `server/`：独立音乐后端及数据，不由根项目 Astro 启动命令启动。
- `scripts/`：新文章脚本；根目录 Python 工具是批量内容维护工具。

## Development Commands

在项目根目录执行：

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 安装根项目依赖 |
| `pnpm dev` / `pnpm start` | 启动 Astro 开发服务 |
| `pnpm check` | Astro 静态检查 |
| `pnpm type-check` | `tsc --noEmit --isolatedDeclarations` |
| `pnpm build` | 构建站点并生成 Pagefind 索引 |
| `pnpm preview` | 预览已构建站点 |
| `pnpm format` | Biome 格式化 `src`，**写入文件** |
| `pnpm lint` | Biome 检查并修复 `src`，**写入文件** |
| `pnpm new-post example` | 创建 `src/content/posts/example.md` |

后端在 `server/` 单独安装依赖；其 README 使用 `npm install`，可执行 `node index.js`，部署示例使用 PM2。配置 `.env` 中的 `PORT` 和 `MUSIC_API_BASE_URL`；代码未提供默认端口，不要依赖 README 中不一致的端口示例。前端音乐 API 基址由 `PUBLIC_BASE_URL` 控制，未设置时回退到组件中的固定域名。

## Code Conventions & Common Patterns

- TypeScript 继承 Astro strict 配置，启用 `strictNullChecks`。复用 `@components/*`、`@utils/*`、`@layouts/*`、`@i18n/*`、`@assets/*`、`@constants/*` 和 `@/*` 别名。
- Biome 配置为 tab 缩进、JavaScript 双引号；Astro/Svelte 文件有专门规则覆盖。保持所在文件的现有风格，避免顺带格式化无关文件。
- 组件和布局通常用 PascalCase，如 `MusicPlayer.svelte`；工具通常用 kebab-case，如 `content-utils.ts`；页面名遵循 Astro 文件路由。
- 文章必填 `title`、`published`；可选字段包括 `updated`、`draft`、`description`、`image`、`tags`、`category`、`lang`、`pinned`。`prevTitle/prevSlug/nextTitle/nextSlug` 属于内部生成字段，不用于手工维护文章关系。
- 交互状态由 Svelte 组件本地管理，配置、工具和后端依赖通过 ES module 导入与模块级状态连接；没有统一依赖注入容器或全局状态库。
- 异步操作沿用 `async/await` 和局部 `try/catch/finally`。客户端更新加载/错误状态；后端路由捕获异常返回 500，音乐解析失败记录日志并返回 `null`，可保留仅内容的响应。后端缓存是模块级对象，JSON 缓存和内容文件使用同步文件操作。
- 样式沿用 Tailwind、PostCSS nesting 和现有 CSS 变量；暗色模式使用 class。每次提交聚焦单一改动。
- 必须使用中文约定式提交：格式为 `type(scope): 中文描述`，scope 可省略；type 使用 `feat`、`fix`、`docs`、`refactor`、`test`、`chore` 等标准类型，描述和正文使用中文。例如 `docs: 添加仓库开发指南`、`fix(music): 修复播放器加载失败`。

## Important Files

- `src/config.ts`、`src/types/config.ts`：站点配置及其类型。
- `src/content/config.ts`、`src/utils/content-utils.ts`：内容契约和共用文章查询逻辑。
- `src/pages/rss.xml.ts`、`src/pages/robots.txt.ts`：订阅和爬虫输出入口。
- `astro.config.mjs`：站点 URL、尾斜杠、集成与 Markdown 管线；`pagefind.yml` 排除数学公式、搜索面板及标记为忽略的节点。
- `tsconfig.json`、`biome.json`、`svelte.config.js`、`tailwind.config.cjs`、`postcss.config.mjs`：类型、格式、预处理与样式工具配置。
- `server/index.js`、`server/package.json`、`server/README.md`：音乐 API 实现、独立依赖和部署说明。
- `scripts/new-post.js`：文章生成；`rename_posts.py`、`fix_yaml.py`、`download_all.py` 会重命名或改写文章，后者还下载图片，不作为只读检查运行。

## Runtime/Tooling Preferences

- 根项目使用 **Node.js 和 pnpm 9.14.4**，保留 `pnpm-lock.yaml`。`preinstall` 强制 pnpm；不要改用 npm/yarn/Bun 安装根项目依赖。
- 根 `package.json` 没有 `engines` 或精确 Node 版本约束；中文模板文档列出的 Node.js `<= 22` 不属于配置强制限制，选择运行时需以实际工具兼容性为准。
- `server/` 是独立 ESM 包，依赖包含 dotenv，不要假设根依赖安装已满足后端要求。
- `pnpm run deploy` 运行 `scripts/deploy.js`，构建站点和 Pagefind 后通过 SSH/rsync 同步 `dist/`；本地配置见 `deploy.config.example.json`。本地和远端均需 rsync 3.0+，`--dry-run` 仅预览远端变更；正式部署会删除目标目录中的非构建文件，目标必须为博客专用目录，不包含 `server/` 后端部署。
- `.astro/` 和 `dist/` 是生成产物，修改源配置和内容，不手工维护生成文件。

## Testing & QA

未发现自动化测试框架、测试脚本或覆盖率阈值；不要调用不存在的 `pnpm test` 或声称测试覆盖率要求。

贡献指南要求提交前运行 `pnpm check`、`pnpm format`；后者会修改文件。只读 Biome 检查可用 `pnpm exec biome check ./src`。涉及构建或内容管线时运行 `pnpm build`；验证搜索需基于构建后的 Pagefind 索引，而非仅开发服务。

按变更验证具体页面、文章排序/草稿过滤或音乐接口行为，并在 PR 的 How To Test 中记录实际检查结果。音乐功能验证需独立启动后端并配置前端 API 地址，单独启动 Astro 不能证明后端链路可用。
