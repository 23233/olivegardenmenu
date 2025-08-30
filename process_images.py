import json
import os
import requests
import threading
import uuid
from datetime import datetime
from urllib.parse import urlparse, unquote
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image
import piexif
import piexif.helper

# --- 配置信息 ---
JSON_FILE_PATH = 'raw/ue-menu-data.json'
IMAGE_DOWNLOAD_DIR = 'public/static/image/upload/'
NEW_IMAGE_URL_PREFIX = '/static/image/upload/'
MAX_WORKERS = 10
MAX_FILE_SIZE_KB = 300
MIN_WEBP_QUALITY = 65
INITIAL_WEBP_QUALITY = 85

print_lock = threading.Lock()

def find_all_items_recursive(data):
    """通过递归遍历，查找并返回JSON结构中所有在'items'列表里的项目。"""
    if isinstance(data, dict):
        for key, value in data.items():
            if key == 'items' and isinstance(value, list):
                for item in value:
                    if isinstance(item, dict):
                        yield item
            if isinstance(value, (dict, list)):
                 yield from find_all_items_recursive(value)
    elif isinstance(data, list):
        for element in data:
            yield from find_all_items_recursive(element)


def get_image_dimensions(image_path):
    """读取并返回图片的宽度和高度。"""
    try:
        with Image.open(image_path) as img:
            return img.size
    except Exception as e:
        with print_lock:
            print(f"  [警告] ✗ 无法读取图片尺寸: {os.path.basename(image_path)} (错误: {e})")
        return (0, 0)

def finalize_and_compress_image(image_path):
    """确保图片的MD5哈希值被更改，并通过循环压缩保证文件大小符合要求。"""
    max_size_bytes = MAX_FILE_SIZE_KB * 1024
    try:
        try:
            unique_comment = f"Processed on {datetime.now().isoformat()} with UID {uuid.uuid4()}"
            exif_dict = piexif.load(image_path)
            exif_dict["Exif"][piexif.ExifIFD.UserComment] = piexif.helper.UserComment.dump(unique_comment, encoding="unicode")
            exif_bytes = piexif.dump(exif_dict)
            with Image.open(image_path) as img:
                img.save(image_path, 'webp', exif=exif_bytes, quality=INITIAL_WEBP_QUALITY)
            with print_lock:
                print(f"  [更新-EXIF] ✓ {os.path.basename(image_path)} 的元数据已更新")
        except Exception:
            with print_lock:
                print(f"  [提示] EXIF更新失败，回退到像素修改模式: {os.path.basename(image_path)}")
            with Image.open(image_path) as img:
                img = img.convert('RGBA')
                pixels = img.load()
                r, g, b, a = pixels[0, 0]
                pixels[0, 0] = ((r + 1) % 256, g, b, a)
                img.save(image_path, 'webp', quality=INITIAL_WEBP_QUALITY)

        if os.path.getsize(image_path) > max_size_bytes:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                current_quality = INITIAL_WEBP_QUALITY
                # 确保保存一次，以便 getsize 能获取最新大小
                temp_path = image_path + ".tmp"
                while os.path.getsize(image_path) > max_size_bytes and current_quality > MIN_WEBP_QUALITY:
                    current_quality -= 5
                    with print_lock:
                        print(f"  [压缩中] -> {os.path.basename(image_path)} 质量调整为 {current_quality}")
                    img.save(temp_path, 'webp', quality=current_quality)
                    # 只有在成功保存后才替换原文件
                    if os.path.exists(temp_path):
                        os.replace(temp_path, image_path)


        final_size_kb = os.path.getsize(image_path) / 1024
        if final_size_kb > MAX_FILE_SIZE_KB:
            with print_lock:
                print(f"  [警告] ✗ {os.path.basename(image_path)} 无法压缩至 {MAX_FILE_SIZE_KB}KB 以下。最终大小: {final_size_kb:.1f}KB")
        else:
            with print_lock:
                print(f"  [成功] ✓ {os.path.basename(image_path)} 的最终大小: {final_size_kb:.1f}KB")
        return True
    except Exception as e:
        with print_lock:
            print(f"  [失败] ✗ 图片最终处理失败: {os.path.basename(image_path)}: {e}")
        return False

def process_item(item):
    """
    处理单个菜品项：确定源URL，下载、转换、压缩并获取尺寸。
    如果最终的WebP图片已存在，则跳过大部分处理步骤。
    """
    item_title = item.get('title', f"一个缺少标题的项目 (ID: {id(item)})")

    source_url = None
    source_key = None
    if 'raw_image_url' in item:
        source_url = item['raw_image_url']
    elif 'imageUrl' in item:
        source_url = item['imageUrl']
        source_key = 'imageUrl'
    elif 'image_url' in item:
        source_url = item['image_url']
        source_key = 'image_url'

    if not source_url:
        with print_lock:
            print(f"  [信息] ⓘ '{item_title}' 中未找到 'imageUrl' 或 'image_url' 字段，已跳过。")
        return None

    if not isinstance(source_url, str) or not source_url.startswith(('http://', 'https://')):
        with print_lock:
            # 检查是否已经是处理过的本地路径
            if 'image_url' in item and item['image_url'].startswith(NEW_IMAGE_URL_PREFIX):
                 print(f"  [跳过] ✓ '{item_title}' 已是处理过的本地路径。")
            else:
                 print(f"  [跳过] ✓ '{item_title}' 的图片URL [{source_url}] 无效。")
        return None

    is_first_run = source_key is not None and 'raw_image_url' not in item

    parsed_path = urlparse(source_url).path
    decoded_path = unquote(parsed_path)
    original_filename = os.path.basename(decoded_path)
    original_filename_base, _ = os.path.splitext(original_filename)

    webp_filename = f"{original_filename_base}.webp"
    local_image_path = os.path.join(IMAGE_DOWNLOAD_DIR, original_filename)
    webp_local_path = os.path.join(IMAGE_DOWNLOAD_DIR, webp_filename)
    final_url = f"{NEW_IMAGE_URL_PREFIX}{webp_filename}"

    # --- 新增的核心逻辑 ---
    # 如果 WebP 文件已经存在，直接跳过下载和转换过程
    if os.path.exists(webp_local_path):
        with print_lock:
            print(f"  [已存在] ✓ {webp_filename} 本地已存在，跳过下载和转换。")
        # 仍然需要获取尺寸并返回成功信息
        width, height = get_image_dimensions(webp_local_path)
        if width == 0 or height == 0:
            return {'status': 'error', 'reason': f'无法获取已存在文件 {webp_filename} 的尺寸'}

        return {
            'status': 'success',
            'item': item,
            'new_url': final_url,
            'source_key': source_key,
            'is_first_run': is_first_run,
            'width': width,
            'height': height
        }
    # --- 结束新增逻辑 ---

    if not os.path.exists(local_image_path):
        try:
            with print_lock:
                print(f"  [下载中] -> {original_filename}")
            response = requests.get(source_url, stream=True, timeout=20)
            response.raise_for_status()
            with open(local_image_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
        except requests.exceptions.RequestException as e:
            # 下载失败时，最好清理掉可能产生的空文件或不完整文件
            if os.path.exists(local_image_path):
                os.remove(local_image_path)
            return {'status': 'error', 'reason': f'下载失败: {e}'}

    try:
        with print_lock:
            print(f"  [转换中] -> {original_filename} to WebP")
        with Image.open(local_image_path) as img:
            img.convert('RGB').save(webp_local_path, 'webp', quality=INITIAL_WEBP_QUALITY)
    except Exception as e:
        return {'status': 'error', 'reason': f'转换失败: {e}'}

    if not finalize_and_compress_image(webp_local_path):
        return {'status': 'error', 'reason': '最终处理失败'}

    width, height = get_image_dimensions(webp_local_path)
    if width == 0 or height == 0:
        return {'status': 'error', 'reason': '无法获取尺寸'}

    return {
        'status': 'success',
        'item': item,
        'new_url': final_url,
        'source_key': source_key,
        'is_first_run': is_first_run,
        'width': width,
        'height': height
    }

def update_and_run_downloader():
    """主函数，读取JSON，递归查找所有项目，并发处理图片，并统一图片URL字段。"""
    os.makedirs(IMAGE_DOWNLOAD_DIR, exist_ok=True)
    print(f"图片目录 '{IMAGE_DOWNLOAD_DIR}' 已就绪。")

    try:
        with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"错误: 读取JSON文件 '{JSON_FILE_PATH}' 失败: {e}")
        return

    items_to_process = list(find_all_items_recursive(data))
    if not items_to_process:
        print("\n未在JSON文件中找到任何菜品项。")
        return

    print(f"\n发现 {len(items_to_process)} 个菜品需要处理。开始使用最多 {MAX_WORKERS} 个线程...")

    successful_updates = []
    failed_count = 0
    skipped_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_item = {executor.submit(process_item, item): item for item in items_to_process}
        for future in as_completed(future_to_item):
            try:
                result = future.result()
                if result is None:
                    skipped_count += 1
                elif result.get('status') == 'success':
                    successful_updates.append(result)
                else:
                    failed_count += 1
                    with print_lock:
                         print(f"  [错误详情] ✗ 项目 '{future_to_item[future].get('title', '未知')}' 处理失败: {result.get('reason')}")
            except Exception as exc:
                failed_count += 1
                with print_lock:
                    print(f"  [严重错误] ✗ 项目 '{future_to_item[future].get('title', '未知')}' 产生异常: {exc}")


    if successful_updates:
        print(f"\n处理完成。正在更新 {len(successful_updates)} 个项目到JSON文件...")

        for result in successful_updates:
            item = result['item']
            source_key = result.get('source_key')

            if result['is_first_run'] and source_key:
                item['raw_image_url'] = item.pop(source_key)

            item['image_url'] = result['new_url']
            item['width'] = result['width']
            item['height'] = result['height']

            if 'imageUrl' in item and 'image_url' in item:
                del item['imageUrl']

        try:
            with open(JSON_FILE_PATH, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            print("JSON文件更新成功！")
        except Exception as e:
            print(f"\n错误: 写入JSON文件失败: {e}")
    else:
        print("\n本次运行没有成功更新任何项目，JSON文件未被修改。")

    print("\n--- 处理结果 ---")
    print(f"成功处理并更新: {len(successful_updates)} 项")
    print(f"处理失败: {failed_count} 项")
    print(f"跳过处理: {skipped_count} 项")
    print(f"总计: {len(items_to_process)} 项")
    print("------------------\n")

if __name__ == '__main__':
    update_and_run_downloader()