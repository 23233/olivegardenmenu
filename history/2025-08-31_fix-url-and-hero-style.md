# 变更日志：2025年8月31日

## 概述

本次更新主要解决了两个问题：
1.  全站URL标准化，确保所有生成的URL（包括Canonical标签）末尾不包含斜杠 (`/`)。
2.  修复了当页面`Hero`部分没有背景图时，HTML中会生成无效`style`属性的问题。

## 详细变更

### 1. URL标准化

**问题**: 站点部分URL（包括`site.json`中定义的`baseURL`和一些导航链接）以`/`结尾，导致Canonical URL格式不统一。

**解决方案**:
*   **修改 `raw/site.json`**:
    *   将`baseURL`的值从 `https://olivegardenmenuguide.com/` 修改为 `https://olivegardenmenuguide.com`。
    *   修正了所有导航链接，移除了末尾的斜杠，例如将 `/olive-garden-nutrition-allergen-menu/` 改为 `/olive-garden-nutrition-allergen-menu`。
    *   修正了 `/olive-garden-soup-men` 的拼写错误为 `/olive-garden-soup-menu`。
*   **影响**: 确保了所有通过`joinUrlPaths`函数生成的URL都将基于一个干净、不带斜杠的基准URL，从而保证了全站URL的一致性。

### 2. Hero组件样式修复

**问题**: 在`index.json`中，如果`hero`内容块没有提供`imageUrl`字段，`renderHero`函数依然会渲染出`<section class="hero" style="background-image: url('undefined');">`，这是一个无效且不必要的样式。

**解决方案**:
*   **修改 `src/index.ts`**:
    *   更新了`renderHero`函数。现在，该函数会先检查`data.imageUrl`是否存在。
    *   仅当`data.imageUrl`为一个有效值时，才会将`style="background-image: ..."`属性添加到`<section>`标签中。
    *   如果`imageUrl`不存在，则`<section>`标签不会包含`style`属性，从而避免了`url('undefined')`的问题。

## 结论

这些修复提升了网站的SEO健康度和代码的健壮性。URL的统一有助于搜索引擎更好地索引网站，而组件渲染逻辑的加固则避免了前端显示错误。
