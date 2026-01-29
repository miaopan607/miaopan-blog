# 音乐页面后端服务使用指南

为了实现音乐页面的每日自动更新而无需重新编译前端，我们引入了一个简单的 Node.js 后端服务。

## 目录结构
- `server/index.js`: 后端主程序
- `server/music-data/`: 存放每日音乐内容的文件夹，文件名为 `YYYY-MM-DD.md`

## 准备工作
在服务器上安装 PM2 以保持后端进程常驻：
```bash
npm install pm2 -g
```

## 部署步骤
1. 将 `server` 文件夹上传到服务器。
2. 在 `server` 目录下安装依赖：
   ```bash
   cd server
   npm init -y
   npm install express cors gray-matter
   ```
3. 启动后端服务：
   ```bash
   pm2 start index.js --name "music-backend"
   ```

## Nginx 反代配置建议
为了使用 `https://api.xn--24wq0n.top` 且不开放额外端口，你可以在 Nginx 配置文件中添加如下内容：

```nginx
server {
    listen 443 ssl;
    server_name api.xn--24wq0n.top;

    # SSL 证书配置 (请根据实际路径修改)
    # ssl_certificate /path/to/fullchain.pem;
    # ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 如何更新内容
你只需要在 `server/music-data/` 目录下创建对应日期的 `.md` 文件即可。

**文件格式示例 (`2026-01-30.md`):**
```markdown
---
title: "歌曲名称 - 歌手"
id: "网易云音乐ID"
---

# 这里写你想展示的 Markdown 内容
...
```

## 注意事项
- **端口**: 后端默认在本地监听 `3001` 端口，通过 Nginx 转发后，外部访问只需通过 443 端口。
- **域名**: 前端代码已统一指向 `https://api.xn--24wq0n.top/api/today-music`。
- **CORS**: `index.js` 已开启跨域支持。

