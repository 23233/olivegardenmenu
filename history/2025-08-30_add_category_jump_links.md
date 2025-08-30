# 2025-08-30: 在首页添加菜单分类快捷跳转链接

## 变更摘要 (Change Summary)

- **功能 (Feature)**: 在首页新增了一个“菜单分类快捷跳转”模块。
- **位置 (Location)**: 该新模块位于“The Full Olive Garden Menu”完整菜单表格的下方。
- **作用 (Functionality)**: 它提供了一系列直接跳转到菜单表格中各个分类（如开胃菜、经典主菜等）的锚点链接。
- **用户体验 (User Experience)**: 此快捷跳转模块默认展开，以确保用户可以轻松看到并使用它来快速导航到感兴趣的菜单部分，优化了长页面的浏览体验。
- **技术实现 (Implementation)**:
    - 创建了一个新的 `categoryJumpLinks` 组件类型。
    - 更新了 `raw/index.json` 页面蓝图，加入了这个新组件区块。
    - 修改了 `src/index.ts` 页面生成器，增加了对新组件的渲染逻辑。
