# site.md - Global Site Configuration

# 网站元数据 (Site Metadata)

siteName: "Olive Garden Menu With Prices"
baseURL: "https://olivegardenmenuguide.com"

# 技术集成 (Technical Integrations)

googleAnalyticsId: ""  # (可选) Google Analytics ID
googleAdsenseId: "" # (可选) Google AdSense ID

# 视觉定义 (Visual Identity)

# AI将基于这些颜色动态生成<style>标签中的CSS变量

colors:
primary: "#FFC0CB"    # 主色调
secondary: "#4A4A4A"  # 次色调
background: "#FFFFFF" # 背景色
text_primary: "#121212" # 主要文字颜色
text_secondary: "#5A5A5A" # 次要文字颜色
accent: "#FF69B4"      # 强调色 (例如: 按钮)

# 全局导航 (Global Navigation)

# 用于生成统一的页眉和页脚

navigation:

- header
    - text: "Olive Garden Menu 2025"
      submenu:
        - text: "Olive Garden Drink Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Lunch Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Dinner Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Dessert Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Catering Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Kids Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Pasta Menu 2025"
          url: "/menu/"
        - text: "Olive Garden Soup Menu 2025"
          url: "/menu/"
        - text: "Nutrition & Allergen Menu 2025"
          url: "/menu/"
    - text: "Olive Garden Specials"
      url: "/about/"    
    - text: "Happy Hours 2025"
      url: "/about/"  
    - text: "Coupons"
      url: "/about/"  
    - text: "Holiday Hours 2025"
      url: "/about/"  
    - text: "App"
      url: "/about/"
- footer
    - text: "This website is not affiliated with, sponsored by, or endorsed by Olive Garden. All trademarks, names, and logos belong to their respective owners. For official information, visit the official Olive Garden website."
    - text: "© 2025 Olive Garden Menu"
    - text: "Contact Us"
      url: "/contact_us"
    - text: "Privacy Policy"
      url: "/privacy_policy"
    - text: "Terms of Service"
      url: "/terms_of_service"
