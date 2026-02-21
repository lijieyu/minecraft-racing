# Minecraft Racing 部署到 ECS + Cloudflare Tunnel

## 目标
- 访问地址：`https://game.haerth.org/minecraft-racing/`
- ECS 对外不暴露公网端口，使用 Cloudflare Tunnel 转发
- Web 服务：Nginx 监听 `127.0.0.1:8088`

## 项目改动说明
- `vite.config.js`：支持通过 `VITE_BASE_PATH` 配置构建基础路径（默认 `/`）
- `scripts/setup-ecs-nginx.sh`：在 ECS 上安装/配置 Nginx，支持子路径部署
- `scripts/remote-setup.sh`：本地一键执行远端 Nginx 初始化
- `scripts/deploy.sh`：本地构建并发布到 ECS（版本化目录 + current 软链接）

## 一次性初始化（服务器）
在项目根目录执行：

```bash
chmod +x scripts/*.sh
./scripts/remote-setup.sh
```

默认会连接：`root@123.56.247.129`。
如需修改：

```bash
SERVER=root@123.56.247.129 ./scripts/remote-setup.sh
```

初始化完成后，服务器会生成 Nginx 配置：`/etc/nginx/conf.d/minecraft-racing.conf`。

## 每次发布
在项目根目录执行：

```bash
./scripts/deploy.sh
```

脚本会自动：
1. `npm install --no-fund --no-audit`
2. 按 `BASE_PATH=/minecraft-racing/` 构建
3. 上传 `dist/` 到 `/var/www/minecraft-racing/releases/<timestamp>/`
4. 切换 `current` 软链接并 reload Nginx

可选参数：

```bash
BASE_PATH=/minecraft-racing/ SERVER=root@123.56.247.129 ./scripts/deploy.sh
```

## Cloudflare Tunnel 配置

> 假设你的 ECS 已安装并运行 `cloudflared`，且 Tunnel 已绑定到 `haerth.org`。

### 1) DNS 记录（Cloudflare 控制台）
在 `haerth.org` 区域确认有以下 DNS（类型通常为 CNAME，代理开启）：
- `game` -> `<tunnel-id>.cfargotunnel.com`

如果你是用 `cloudflared tunnel route dns` 管理，可以在 ECS 上执行：

```bash
cloudflared tunnel route dns <YOUR_TUNNEL_NAME_OR_ID> game.haerth.org
```

### 2) Tunnel ingress 规则
编辑 ECS 上 `cloudflared` 配置（通常是 `/etc/cloudflared/config.yml`），增加规则：

```yaml
ingress:
  - hostname: game.haerth.org
    path: /minecraft-racing*
    service: http://127.0.0.1:8088
  - service: http_status:404
```

如果 `game.haerth.org` 下还有别的路径服务，把这条放在更靠前的位置（ingress 按顺序匹配）。

### 3) 重启 cloudflared

```bash
systemctl restart cloudflared
systemctl status cloudflared --no-pager
```

## 验证清单
1. ECS 本机：`curl -I http://127.0.0.1:8088/minecraft-racing/` 返回 `200`
2. 外网：打开 `https://game.haerth.org/minecraft-racing/` 能加载页面
3. 打开浏览器开发者工具，无 404 静态资源（`assets/*.js`, `assets/*.css`）
4. 刷新页面（深链接）不会 404

## 回滚
发布脚本使用版本目录。回滚方法（在本地执行，替换为目标版本号）：

```bash
ssh root@123.56.247.129 "ln -sfn /var/www/minecraft-racing/releases/<OLD_RELEASE_TAG> /var/www/minecraft-racing/current && systemctl reload nginx"
```

---

如果你希望下一步我继续帮你：我可以在你确认 tunnel 配置路径后，直接给你一条“可粘贴执行”的命令，把 `config.yml` 规则自动注入并重启服务。
