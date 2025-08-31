# 变更日志: 2025年8月31日 - 营业时间更新与FAQ内容扩充

## 概述

本次更新旨在提升用户体验和SEO效果, 主要围绕以下几个方面进行了优化:

1.  **营业时间显示优化**: 在首页和假日时间页面, 将原先合并显示的每周营业时间, 改为每日独立显示, 让用户可以更清晰地了解每天的营业时段.
2.  **FAQ内容扩充**: 大幅增加了各页面的FAQ (常见问题与解答) 内容. 基于`raw/olive-garden-menu_question_2025-08-30.csv`提供的用户搜索数据, 补充了大量高频问题, 旨在为用户提供更全面的信息.
    *   **首页**: FAQ数量增加至15个.
    *   **假日时间页面**: FAQ数量增加至5个.
    *   **其他菜单页面 (饮品、午餐、甜点、儿童)**: FAQ数量均增加至5个.
3.  **路由 (URL) 优化**: 为了提升SEO效果, 对全站大部分页面的URL路径进行了重写, 加入了核心关键词 (例如, `/holiday-hours/` 变更为 `/olive-garden-holiday-hours/`).

## 具体文件变更

### 内容更新 (JSON)

*   `raw/index.json`:
    *   更新了 `richText` 组件中的 `htmlContent`, 分解了每周营业时间.
    *   扩充了 `faq` 组件的 `items` 数组, 新增了9个问答.
*   `raw/holiday-hours.json`:
    *   更新了 `dataTable` 组件的 `rows`, 将每周营业时间按天分解.
    *   扩充了 `faq` 组件的 `items` 数组, 新增了3个问答.
*   `raw/drink-menu.json`:
    *   扩充了 `faq` 组件的 `items` 数组, 新增了2个问答.
*   `raw/lunch-menu.json`:
    *   扩充了 `faq` 组件的 `items` 数组, 新增了2个问答.
*   `raw/dessert-menu.json`:
    *   扩充了 `faq` 组件的 `items` 数组, 新增了2个问答.
*   `raw/kids-menu.json`:
    *   扩充了 `faq` 组件的 `items` 数组, 新增了2个问答.

### 路由与导航更新

*   `src/index.ts`:
    *   修改了所有 `app.get()` 的路由路径, 以匹配新的SEO友好URL.
    *   同步更新了 `generateHead` 函数中传递的页面路径参数.
*   `raw/site.json`:
    *   更新了 `navigation.header` 和 `navigation.footer` 中所有链接的 `url` 字段, 使其指向新的路由地址.

## 结论

通过本次更新, 网站的信息内容更加丰富, 结构更加清晰, 同时也为搜索引擎优化打下了更好的基础.
