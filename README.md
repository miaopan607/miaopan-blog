# miaopan-blog

淼畔的博客，基于 [Fuwari](https://github.com/saicaca/fuwari)。

## SSH 部署

本地需要 Node.js、pnpm、OpenSSH 和 rsync 3.0+，远端需要 SSH 服务和 rsync 3.0+。Windows 请在 WSL 中执行。只发布静态站点，不部署 `server/` 音乐后端。

1. 复制配置文件并填写部署目标：

   ```sh
   cp deploy.config.example.json deploy.config.json
   ```

   - `host`：SSH 主机别名或 `user@hostname`。
   - `path`：远端网站的绝对目录，例如 `/var/www/miaopan-blog`。SSH 用户需要有写入权限，Web 服务器的网站根目录应指向这里。

   `deploy.config.json` 已加入忽略规则，不会提交到仓库。

2. 在 `~/.ssh/config` 中配置连接信息，例如：

   ```sshconfig
   Host blog-server
       HostName 192.0.2.1
       User deploy
       Port 22
       IdentityFile ~/.ssh/id_ed25519
   ```

   先执行 `ssh blog-server` 确认可以连接。

3. 预览或执行部署：

   ```sh
   pnpm run deploy --dry-run
   pnpm run deploy
   ```

脚本先运行 `pnpm build`，生成静态页面和 Pagefind 搜索索引，再通过 SSH 同步 `dist/` 的内容。正式部署会自动创建目标目录；`--dry-run` 只构建和预览，不修改远端文件。

**目标目录必须专用于博客。同步会删除远端不在 `dist/` 中的文件，不要将上传文件、证书或其他服务的数据放在该目录内。** 同步不是原子切换。