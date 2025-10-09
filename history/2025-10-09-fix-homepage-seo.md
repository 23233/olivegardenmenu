# 修复首页SEO及恢复Hawaii页面

## 日期

2025年10月9日

## 问题背景

项目上线半个月后，发现首页（`index`）并未在核心关键词“Olive Garden Menu”上获得预期的搜索排名。相反，一个次级页面“hawaii”意外地获得了这个关键词的排名。为了解决这个问题，`hawaii`页面被临时停用。

经过分析，确定问题根源在于首页的TDK（标题、描述、关键词）和LD+JSON结构化数据配置不佳，同时`hawaii`页面的内容与首页形成了关键词竞争（Keyword Cannibalization），从而分散了主关键词的权重。

## 需求

1.  **优化首页**：修改`index.json`的TDK和页面内容，使其成为“Olive Garden Menu”这一核心关键词的权威着陆页。
2.  **恢复`hawaii`页面**：在优化其内容以避免关键词竞争后，恢复`hawaii`页面的可访问性。
3.  **更新时效性**：将两个页面的发布日期和内容中的月份更新为当前日期（2025年10月9日），以向搜索引擎传递内容是新鲜的信号。

## 解决方案

为了解决关键词竞争并强化首页的SEO地位，执行了以下变更：

### 1. 优化 `index.json`

- **核心关键词强化**：
  - `metadata.coreKeyword` 从 `"Olive Garden Menu"` 更新为 `"Olive Garden Menu 2025"`，目标更精确。
- **TDK优化**：
  - `metadata.h1` 更新为: `"Olive Garden Menu 2025: Full Menu With Prices (Updated Oct 2025)"`，更具权威性和时效性。
  - `metadata.description` 更新为: `"The complete Olive Garden Menu for October 2025. 🍝 Explore all dishes, from classic pastas to new specials. Includes up-to-date prices, calories, and our top recommendations. Plan your meal now! 👇"`，文案更专业，并包含时效性。
- **内容一致性**：
  - `contentBlocks[0].data.h1` (Hero区的H1) 更新为: `"Olive Garden Menu With Prices (October 2025) ✅ Every Dish, Rated!"`，与页面元数据保持一致。
- **更新发布日期**：
  - `metadata.datePublished` 更新为 `"2025-10-09"`。

### 2. 优化 `hawaii.json`

- **消除关键词竞争**：
  - 保持 `coreKeyword` 为 `"Olive Garden Hawaii"`，确保页面主题聚焦于本地。
- **更新时效性**：
  - `metadata.h1` 和 `description` 中的月份从 "Sept" 更新为 "Oct"。
  - `contentBlocks[0].data.h1` (Hero区的H1) 中的月份同步更新为 "October 2025"。
- **更新发布日期**：
  - `metadata.datePublished` 更新为 `"2025-10-09"`。

通过以上修改，`index.json`被确立为全国性“Olive Garden Menu 2025”的唯一权威来源，而`hawaii.json`则作为一个独立的、有价值的本地化页面存在。这解决了关键词蚕食问题，并为两个页面都设定了清晰的SEO目标。