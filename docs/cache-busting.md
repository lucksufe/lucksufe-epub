# 浏览器缓存与 Cache Busting

## 为什么需要强制刷新？

浏览器为了加速页面加载，会把 CSS、JS、图片等静态资源缓存到本地。下次访问同一 URL 时，直接用本地缓存，不向服务器请求。

这在开发时很头疼：你改了代码，刷新页面，浏览器还在用旧的缓存文件。

## `Ctrl + Shift + R` 做了什么？

普通刷新（`F5`）：浏览器会带上缓存文件，先问服务器"这个文件变了吗"（`If-Modified-Since` / `ETag`），服务器回答"没变"就直接用缓存。

强制刷新（`Ctrl + Shift + R`）：跳过所有缓存，直接从服务器重新下载全部资源。

但问题是：**强制刷新只对你自己的浏览器有效**，其他用户的浏览器仍然用旧缓存。

## Query String Cache Busting

在文件 URL 后面加 `?v=2`：

```html
<!-- 旧版本，浏览器已缓存 -->
<script src="js/app.js"></script>

<!-- 新版本，浏览器当作全新 URL，重新下载 -->
<script src="js/app.js?v=2"></script>
```

### 原理

浏览器以 **完整 URL** 作为缓存的 key：

| URL | 缓存状态 |
|-----|---------|
| `js/app.js` | 已缓存（旧版本） |
| `js/app.js?v=1` | 已缓存（v1 版本） |
| `js/app.js?v=2` | 未缓存，重新下载 |

服务器上其实还是同一个文件 `js/app.js`，`?v=2` 只是给浏览器看的，服务器会忽略它。

### 为什么不直接改文件名？

比如把 `app.js` 改成 `app.v2.js`。也可以，但：

- 需要重命名文件
- HTML 里所有引用都要改
- 旧版本文件要清理

Query String 方式只需要改 HTML 里的版本号，不动文件本身。

## 版本号策略

| 方式 | 示例 | 适用场景 |
|------|------|---------|
| 手动递增 | `?v=2`, `?v=3` | 小项目，手动部署 |
| 时间戳 | `?v=1718100000` | 自动化部署，每次发布都变 |
| 文件哈希 | `?v=a3b8f2c1` | Webpack/Vite 等构建工具自动生成 |

```bash
# 用时间戳作为版本号
echo "?v=$(date +%s)"

# 用文件内容的 MD5 哈希
md5sum js/app.js | cut -c1-8
```

## 服务端缓存控制

Query String 只解决"让浏览器拿新文件"的问题。更完整的方案是让服务器返回正确的缓存头：

```
# 永久缓存（文件名带哈希时用）
Cache-Control: max-age=31536000, immutable

# 不缓存（开发时用）
Cache-Control: no-cache, no-store

# 有更新才下载
Cache-Control: max-age=0, must-revalidate
```

### Nginx 配置示例

```nginx
# JS/CSS 文件缓存 1 年（配合文件名哈希）
location ~* \.(js|css)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# HTML 不缓存（总是检查最新版本）
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

## 常见问题

### Q: 为什么强制刷新后还是旧的？

可能原因：
1. CDN 层缓存未更新（需要等或手动 purge）
2. Service Worker 缓存（需要在 DevTools → Application → Service Workers 中清除）
3. 服务器反向代理缓存

### Q: `?v=2` 和 `#v=2` 有什么区别？

- `?v=2`：发送给服务器，服务器可以据此返回不同内容（虽然一般不这么做）
- `#v=2`：纯前端锚点，不发送给服务器，**有些浏览器会忽略 hash 部分做缓存匹配**，不可靠

### Q: 构建工具怎么处理？

Webpack / Vite 等工具会自动在文件名中加入内容哈希：

```
app.a3b8f2c1.js    # 内容变了，哈希就变，URL 就变
style.f4e2d1c9.css
```

HTML 中自动引用带哈希的文件名，不需要手动管理版本号。
