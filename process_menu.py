import json
import os
import re

# 步骤1: 建立精确的“翻译词典” (JSON Key 映射)
# ==============================================================================
# 将 hawai-order.json 中的分类名精确映射到 hawai-menu.json 中的分类名
CATEGORY_MAP = {
    'Appetizers': 'APPETIZERS 2025',
    'Classic Entrees': 'CLASSIC ENTRÉES 2025',
    'Amazing Alfredos': 'AMAZING ALFREDOS! 2025',
    'Soups, Salad & Breadsticks': 'SOUPS, SALAD & BREADSTICKS 2025',
    'Create Your Own Pasta': 'CREATE YOUR OWN PASTA 2025',
    'Lunch-Sized Favorites': 'LUNCH-SIZED FAVORITES 2025',
    'Desserts': 'DESSERTS 2025',
    'Sides & Sauces': 'SIDES 2025',
    'Beverages': 'NON-ALCOHOLIC BEVERAGES 2025',
    'Kids Menu': 'KIDS MEALS – FOR CHILDREN UNDER 12 2025',
    'Catering Family Bundles': 'FAMILY-STYLE MEALS 2025',
    'Catering Family Size Pans (Serves 4-6)': 'FAMILY-STYLE MEALS 2025'
}

# 为少数名称有细微差异的菜品建立特例映射
# 结构: { 'order.json中的分类名': { 'order.json中的菜品名': 'menu.json中的菜品名' } }
DISH_MAP = {
    'Appetizers': {
        'Spinach Artichoke Dip': 'Spinach-Artichoke Dip'
    },
    'Lunch-Sized Favorites': {
        'Weekday Lunch Special: Soup AND Salad AND Breadsticks': 'Soup, Salad and Breadsticks'
    }
}
# ==============================================================================

def normalize_name(name):
    """一个简单的清理函数，用于处理常规的名称匹配。"""
    if not isinstance(name, str): return ""
    # 移除括号及其内容，转为小写，去除首尾空格
    normalized = re.sub(r'\(.*?\)', '', name).lower().strip()
    return normalized

def create_updated_menu(menu_file_path, order_file_path):
    """使用精确的、基于Map的映射策略来合并菜单数据。"""
    try:
        with open(menu_file_path, 'r', encoding='utf-8') as f:
            menu_data = json.load(f)
        with open(order_file_path, 'r', encoding='utf-8') as f:
            order_data = json.load(f)
    except FileNotFoundError as e:
        print(f"错误：找不到文件 {e}。")
        return None

    # --- 步骤2: 将 hawai-menu.json 的数据构建成一个易于查找的结构 ---
    calorie_lookup = {}
    print("--- 正在从 hawai-menu.json 构建查找表 ---")
    for category_name, content in menu_data.items():
        if 'items' in content:
            calorie_lookup[category_name] = {}
            for item in content['items']:
                title, calories = item.get('title'), item.get('calories')
                if title and calories:
                    # 使用原始名称作为键，同时存储一个清理过的名称用于常规匹配
                    calorie_lookup[category_name][title] = {
                        'calories': calories,
                        'normalized': normalize_name(title)
                    }
    print("--- 构建完成 ---\n")

    # --- 步骤3: 遍历订单，使用Map进行精确查找 ---
    new_menu = {}
    not_found_log = []

    for order_category in order_data:
        order_cat_name = order_category.get("name")
        if not order_cat_name: continue

        new_menu[order_cat_name] = {"items": []}

        # 策略1: 使用 CATEGORY_MAP 找到对应的源分类名
        source_cat_name = CATEGORY_MAP.get(order_cat_name)

        if not source_cat_name:
            not_found_log.append(f"[分类未在Map中定义]: '{order_cat_name}'")
            continue # 如果分类不在Map中，跳过整个分类

        source_dishes = calorie_lookup.get(source_cat_name)
        if not source_dishes:
            not_found_log.append(f"[分类未在源文件中找到]: '{source_cat_name}'")
            continue

        for order_item in order_category.get("menuItems", []):
            item_name = order_item.get("name")
            if not item_name: continue

            calories = "N/A"
            found = False

            # 策略2: 优先使用 DISH_MAP 中的特例
            special_dish_name = DISH_MAP.get(order_cat_name, {}).get(item_name)
            if special_dish_name and special_dish_name in source_dishes:
                calories = source_dishes[special_dish_name]['calories']
                found = True

            # 策略3: 如果不是特例，进行常规的标准化名称匹配
            if not found:
                norm_item_name = normalize_name(item_name)
                for dish_data in source_dishes.values():
                    if dish_data['normalized'] == norm_item_name:
                        calories = dish_data['calories']
                        found = True
                        break # 找到后立即停止搜索

            if not found:
                not_found_log.append(f"  - [菜品未匹配]: '{item_name}' (在分类 '{order_cat_name}' -> '{source_cat_name}' 中)")

            new_item = {
                "title": item_name,
                "price": order_item.get("unitPrice", "N/A"),
                "calories": calories,
                "image_url": order_item.get("imageUrl"),
                "description": order_item.get("description")
            }
            new_menu[order_cat_name]["items"].append(new_item)

    # --- 步骤4: 报告最终的数据差异 ---
    if not_found_log:
        print("\n--- 最终数据差异报告：以下项目在源文件(hawai-menu.json)中确实不存在 ---")
        for log_entry in sorted(list(set(not_found_log))):
            print(log_entry)
        print("-----------------------------------------------------------------------------------\n")

    return json.dumps(new_menu, indent=2, ensure_ascii=False)


if __name__ == "__main__":
    raw_folder = 'raw'
    menu_file = os.path.join(raw_folder, 'hawai-menu.json')
    order_file = os.path.join(raw_folder, 'hawai-order.json')

    new_menu_json = create_updated_menu(menu_file, order_file)

    if new_menu_json:
        print("--- 更新后的菜单JSON ---")
#         print(new_menu_json)

        output_filename = 'raw/hawai-full-menu.json'
        with open(output_filename, 'w', encoding='utf-8') as f:
            f.write(new_menu_json)
        print(f"\n✅ 您的菜单合并任务已成功完成！结果已保存至文件: {output_filename}")