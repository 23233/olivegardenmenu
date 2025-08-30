# 变更日志：2025年8月30日

## 主题：完善页脚链接页面

### 描述

本次变更旨在完善网站页脚区域的三个核心信息页面：`Contact Us`, `Privacy Policy`, 和 `Terms of Service`。此前这些页面的链接虽然存在，但并未指向任何实际内容。

### 实现细节

1.  **创建数据源**:
    *   在 `raw/` 目录下，为每个新页面创建了对应的JSON数据文件：
        *   `contact_us.json`: 包含联系方式和地址信息。
        *   `privacy_policy.json`: 包含标准的隐私政策文本，并注明最后更新日期为2025年8月30日。
        *   `terms_of_service.json`: 包含标准的服务条款文本，同样注明了更新日期。
    *   所有JSON文件都遵循项目既定的 `contentBlocks` 结构，主要使用 `richText` 组件来展示内容。

2.  **添加页面路由**:
    *   在 `src/index.ts` 文件中，为以下路径添加了新的Hono路由：
        *   `/contact_us/`
        *   `/privacy_policy/`
        *   `/terms_of_service/`
    *   每个路由都会加载对应的JSON数据源，并使用现有的 `generateHead`, `generatePageBody` 等函数来动态生成完整的HTML页面。

3.  **更新站点配置**:
    *   修改了 `raw/site.json` 文件，将页脚导航中对应这三个页面的 `url` 更新为包含尾部斜杠的路径 (e.g., `/contact_us/`)，以确保与项目中的路由定义保持一致。

### 影响

*   网站用户现在可以访问功能齐全的“联系我们”、“隐私政策”和“服务条款”页面。
*   项目结构保持了良好的一致性，新页面的实现复用了现有的代码生成逻辑。
