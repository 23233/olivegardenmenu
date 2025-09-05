# 变更日期: 2025年9月5日

## 变更主题: 首页菜单数据源切换及渲染逻辑更新

### 变更概述

本次更新旨在将首页的菜单渲染从使用 `raw/master-menu-data.json` 切换到使用 `raw/index-full-menu.json`. 这一变更使得菜单能够展示更丰富、更精确的数据,并优化了相关字段的显示方式.

### 详细变更点

1.  **数据源切换**:
    *   在 `src/index.ts` 中,注册了新的数据源 `raw/index-full-menu.json`.
    *   在 `raw/index.json` 页面蓝图中, 将 `dataTable` 组件的 `categoriesDataUrl` 指向了新的数据源.

2.  **渲染逻辑更新 (`src/index.ts`)**:
    *   **价格显示**: 菜单项的价格现在使用 `displayPrice` 字段进行渲染,以显示更友好的格式 (例如, "$12.99" 或 "Starting at $12.99").
    *   **卡路里信息**: 卡路里信息现在使用 `nutritionalFDAMessage` 字段,可以展示更详细的 FDA 标准格式文本 (例如, "800 cal, marinara 35 cal").
    *   **成分/过敏提示**: 新增了一个逻辑,如果菜单项包含 `indicators.bottomIndicators` 数组,则会提取并显示第一个指示器的 `tooltipText`. 这用于高亮重要的信息,如高钠警告. 该提示以一个黄色的警告徽章样式呈现.
    *   **图片 `alt` 文本优化**: 为了增强SEO,图片的 `alt` 文本现在会优先使用 `imgAltText` 字段(如果存在),并结合页面的核心关键词进行组合,提供了更具描述性的替代文本.

### 影响范围

*   `src/index.ts`: 修改了数据源配置和 `renderDataTable` 函数的渲染逻辑.
*   `raw/index.json`: 更新了数据源的URL.
*   **最终用户界面**: 首页的菜单现在会显示来自新数据源的价格、卡路里和特殊提示信息,并且图片有更优化的`alt`文本.

此次变更提升了数据的准确性和丰富性,并对SEO进行了优化.
