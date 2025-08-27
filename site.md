# site.md - Global Site Configuration

# 网站元数据 (Site Metadata)
siteName: "Crumbl Cookies Menu Fan Hub"
baseURL: "https://your-domain.com"

# 技术集成 (Technical Integrations)
googleAnalyticsId: "G-XXXXXXXXXX"  # (可选) Google Analytics ID
googleAdsenseId: "ca-pub-XXXXXXXXXXXXXXXX" # (可选) Google AdSense ID

# 视觉定义 (Visual Identity)
# AI将基于这些颜色动态生成<style>标签中的CSS变量
colors:
  primary: "#FFC0CB"    # 主色调 (例如: Crumbl Pink)
  secondary: "#4A4A4A"  # 次色调
  background: "#FFFFFF" # 背景色
  text_primary: "#121212" # 主要文字颜色
  text_secondary: "#5A5A5A" # 次要文字颜色
  accent: "#FF69B4"      # 强调色 (例如: 按钮)

# 全局导航 (Global Navigation)
# 用于生成统一的页眉和页脚
navigation:
  - text: "Weekly Menu"
    url: "/"
  - text: "All Cookies"
    url: "/all-cookies/"
  - text: "About Us"
    url: "/about/"
