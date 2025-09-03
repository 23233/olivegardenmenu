# 变更日志：2025年9月3日 - 新增 IndexNow 手动提交功能

## 概述

根据用户需求，本次更新为网站增加了一个 IndexNow 手动提交功能。该功能允许网站管理员通过一个安全的、隐藏的管理页面，一键将全站所有页面的 URL 提交给 IndexNow，从而通知各大搜索引擎网站内容已更新，加速收录过程。

此方案替代了原先的全自动提议，给予了管理员对提交时机的完全控制权。

## 主要变更点

### 1. **更新站点配置 (`raw/site.json`)**

-   在 `site.json` 文件中新增了一个 `metadata` 对象。
-   在该对象中添加了两个新的密钥：
    -   `indexNowKey`: 用于向 IndexNow API 进行身份验证的密钥。
    -   `adminKey`: 用于访问新增的手动提交管理页面的秘密访问密钥。
-   这两个密钥均已通过 UUID 的方式安全生成，确保了唯一性和安全性。

### 2. **创建手动提交管理页面 (`/admin-panel/:key`)**

-   在 `src/index.ts` 中新增了一个动态路由 `GET /admin-panel/:key`。
-   **安全访问**：此页面必须通过在 URL 中提供正确的 `adminKey` 才能访问，否则将返回 404 Not Found 错误，有效防止了未授权的访问。
-   **功能界面**：
    -   页面会首先验证访问密钥的有效性。
    -   验证通过后，会自动抓取并展示网站中所有通过导航和页脚链接的可访问页面的完整 URL 列表。
    -   页面上提供了一个醒目的 "一键提交到 IndexNow" 按钮，方便管理员操作。
    -   界面简洁明了，同时会显示当前的 IndexNow 密钥，并提供提交状态的实时反馈（成功或失败）。

### 3. **实现后端提交 API (`/api/index-now-submit`)**

-   在 `src/index.ts` 中新增了一个 `POST /api/index-now-submit` API 端点，作为管理页面提交功能的服务端。
-   **安全验证**：该端点会验证 POST 请求体中是否包含正确的 `adminKey`，确保只有通过管理页面才能触发提交。
-   **核心逻辑**：
    -   接收到合法的请求后，它会重新获取全站的 URL 列表。
    -   使用 `site.json` 中的 `baseURL` 和 `indexNowKey` 构建符合 IndexNow API 规范的 JSON payload。
    -   通过 `fetch` API 向 IndexNow 的官方端点 (`https://api.indexnow.org/indexnow`) 发送 POST 请求。
    -   将 IndexNow API 的响应返回给前端，以便在管理页面上显示提交结果。
-   **错误处理**：实现了完整的 `try...catch` 错误处理机制，能够捕获并报告提交过程中可能出现的网络或 API 错误。

## 如何使用

1.  从 `raw/site.json` 文件中获取您的 `adminKey`。
2.  在浏览器中访问 `https://<您的域名>/admin-panel/<您获取到的adminKey>`。
3.  页面加载后，核对将要提交的 URL 列表。
4.  点击 "一键提交到 IndexNow" 按钮。
5.  等待页面上的状态消息，确认提交是否成功。
