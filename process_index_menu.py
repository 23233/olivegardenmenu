import json
import os

def transform_menu_with_unique_keys(input_file_path, output_file_path):
    """
    将原始菜单JSON文件转换为一个新的、以类别名称为键的JSON对象，并处理重复的键。

    这个函数会：
    1. 将所有 subCategories 提取到顶层。
    2. 如果一个子类别的名称与已存在的键冲突，则使用 "父类别名 - 子类别名" 的格式创建新键。
    3. 从被提取的子类别中删除 'code', 'slug', 'itemCount', 'icon' 字段。
    4. 对于没有子类别的顶级类别，直接以其 'name' 作为键添加到输出对象中。
    5. 将结果保存到新的JSON文件中。

    :param input_file_path: 输入的JSON文件路径 (e.g., 'raw/index-menu.json')
    :param output_file_path: 输出的JSON文件路径 (e.g., 'raw/index-full-menu.json')
    """
    try:
        # 确保输入文件所在的目录存在
        input_dir = os.path.dirname(input_file_path)
        if input_dir and not os.path.exists(input_dir):
            print(f"错误：输入目录 '{input_dir}' 不存在。")
            return

        with open(input_file_path, 'r', encoding='utf-8') as f:
            original_data = json.load(f)
    except FileNotFoundError:
        print(f"错误：输入文件 '{input_file_path}' 未找到。")
        return
    except json.JSONDecodeError:
        print(f"错误：文件 '{input_file_path}' 不是有效的JSON格式。")
        return

    # 初始化一个空字典来存储最终的JSON对象
    transformed_data_obj = {}
    # 需要从子类别中删除的键列表
    keys_to_remove = ["code", "slug", "itemCount", "icon"]

    # 遍历原始数据中的每个顶级类别
    for category in original_data:
        # 检查 'subCategories' 键是否存在且其值（列表）不为空
        if 'subCategories' in category and category['subCategories']:
            # 获取父类别的名称，用于处理键冲突
            parent_name = category.get('name')

            # 遍历子类别
            for sub_category in category['subCategories']:
                sub_cat_name = sub_category.get('name')
                if not sub_cat_name:
                    continue  # 如果子类别没有名称，则跳过

                # 确定最终要使用的键
                final_key = sub_cat_name
                # 检查键是否存在冲突
                if final_key in transformed_data_obj and parent_name:
                    # 如果键已存在，并且有父类别名称，则创建组合键
                    final_key = f"{parent_name} - {sub_cat_name}"

                # 创建子类别的一个副本以进行修改
                processed_sub_cat = sub_category.copy()

                # 遍历需要删除的键列表并删除
                for key in keys_to_remove:
                    if key in processed_sub_cat:
                        del processed_sub_cat[key]

                # 使用最终确定的键将处理后的子类别添加到对象中
                transformed_data_obj[final_key] = processed_sub_cat
        else:
            # 如果没有子类别，直接将原始类别添加到最终的对象中
            category_name = category.get('name')
            if not category_name:
                continue # 如果类别没有名称，则跳过

            # 这里不检查冲突，允许覆盖，因为顶级类别没有“父级”来创建新名称
            transformed_data_obj[category_name] = category

    try:
        # 确保输出文件所在的目录存在
        output_dir = os.path.dirname(output_file_path)
        if output_dir and not os.path.exists(output_dir):
            os.makedirs(output_dir)

        # 将转换后的对象写入新的JSON文件
        with open(output_file_path, 'w', encoding='utf-8') as f:
            json.dump(transformed_data_obj, f, indent=2, ensure_ascii=False)

        print(f"处理完成！已成功将结果保存到 '{output_file_path}'。")

    except IOError as e:
        print(f"写入文件时发生错误 '{output_file_path}': {e}")

# --- 使用示例 ---
if __name__ == "__main__":
    # 定义输入和输出文件路径
    input_json_path = os.path.join('raw', 'index-menu.json')
    output_json_path = os.path.join('raw', 'index-full-menu.json')

    # 运行转换函数
    transform_menu_with_unique_keys(input_json_path, output_json_path)