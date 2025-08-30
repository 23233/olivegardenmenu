# 2025年8月30日：修复全站 Canonical URL

## 问题

经过审查，发现全站所有页面的 `<link rel="canonical">` 标签都错误地指向了网站的根域名 (`https://olivegardenmenuguide.com/`)，而不是指向页面自身的URL。这对SEO非常不利，会导致搜索引擎无法正确索引各个独立页面。

## 解决方案

为了解决这个问题，我对核心的页面生成逻辑进行了以下修改：

1.  **修改 `generateHead` 函数**：
    *   在 `src/index.ts` 中，修改了 `generateHead` 函数，为其增加了一个 `pagePath` 参数。
    *   此函数现在会使用 `baseURL` 和传入的 `pagePath` 动态地构建每个页面的、唯一的、正确的URL。

2.  **更新所有页面路由**：
    *   在 `src/index.ts` 中，遍历了所有18个页面路由（例如 `/`、`/drink-menu/`、`/contact_us/` 等）。
    *   在每个路由的处理器中，调用 `generateHead` 时，都传入了该页面的确切路径。

## 结果

通过以上修改，现在每个页面生成的HTML都会包含一个指向其自身完整URL的 `canonical` 标签，例如 `/drink-menu/` 页面的 canonical URL 现在是 `https://olivegardenmenuguide.com/drink-menu/`。这符合SEO最佳实践，有助于搜索引擎正确理解和索引网站的每一个页面。
