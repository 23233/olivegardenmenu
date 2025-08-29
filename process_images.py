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
JSON_FILE_PATH = 'raw/index.json'
IMAGE_DOWNLOAD_DIR = 'public/static/image/upload/'
NEW_IMAGE_URL_PREFIX = '/static/image/upload/'
MAX_WORKERS = 10  # 设置并发处理的线程数
MAX_FILE_SIZE_KB = 300  # 图片最大文件大小 (KB)
MIN_WEBP_QUALITY = 65  # WebP 格式的最低质量
INITIAL_WEBP_QUALITY = 85  # WebP 格式的初始保存质量

# 用于在多线程环境下安全打印的线程锁
print_lock = threading.Lock()

def get_image_dimensions(image_path):
    """读取并返回图片的宽度和高度。"""
    try:
        with Image.open(image_path) as img:
            return img.size  # 返回 (宽度, 高度) 元组
    except Exception as e:
        with print_lock:
            print(f"  [警告] ✗ 无法读取图片尺寸: {os.path.basename(image_path)} (错误: {e})")
        return (0, 0)

def finalize_and_compress_image(image_path):
    """
    确保图片的MD5哈希值被更改，并通过循环压缩保证文件大小符合要求。
    这是一个核心函数，它处理所有图片的最终状态。
    """
    max_size_bytes = MAX_FILE_SIZE_KB * 1024
    try:
        # --- 步骤 1: 保证MD5哈希值被修改 ---
        # 优先尝试修改EXIF元数据
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
            # 如果EXIF修改失败（例如，图片不支持EXIF），则采用像素修改的备用方案
            with print_lock:
                print(f"  [提示] EXIF更新失败，回退到像素修改模式: {os.path.basename(image_path)}")

            with Image.open(image_path) as img:
                img = img.convert('RGBA')
                pixels = img.load()
                r, g, b, a = pixels[0, 0]
                new_r = (r + 1) % 256
                pixels[0, 0] = (new_r, g, b, a)
                img.save(image_path, 'webp', quality=INITIAL_WEBP_QUALITY)

        # --- 步骤 2: 循环压缩以满足文件大小要求 ---
        current_quality = INITIAL_WEBP_QUALITY
        if os.path.getsize(image_path) > max_size_bytes:
            with Image.open(image_path) as img:
                img = img.convert('RGB') # 转换为有损压缩效果更好的RGB
                while os.path.getsize(image_path) > max_size_bytes and current_quality > MIN_WEBP_QUALITY:
                    current_quality -= 5  # 降低质量
                    with print_lock:
                        print(f"  [压缩中] -> {os.path.basename(image_path)} 质量调整为 {current_quality}")
                    img.save(image_path, 'webp', quality=current_quality)

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
    处理单个菜品项：确定源URL，下载，转换为WebP，修改哈希值，压缩并获取尺寸。
    """
    # 步骤 1: 确定源URL，并处理 raw_image_url
    is_first_run = 'raw_image_url' not in item and item.get('image_url', '').startswith(('http://', 'https://'))

    if 'raw_image_url' in item:
        source_url = item['raw_image_url']
    else:
        source_url = item.get('image_url')

    if not source_url:
        return {'status': 'error', 'reason': '缺少有效的 image_url'}

    # 1. 从URL解析路径
    parsed_path = urlparse(source_url).path

    # 2. 对路径进行URL解码，以处理像 %E2%80%93 这样的字符
    decoded_path = unquote(parsed_path)

    # 3. 从解码后的路径中获取文件名
    original_filename = os.path.basename(decoded_path)

    webp_filename = os.path.splitext(original_filename)[0] + '.webp'

    local_image_path = os.path.join(IMAGE_DOWNLOAD_DIR, original_filename)
    webp_local_path = os.path.join(IMAGE_DOWNLOAD_DIR, webp_filename)
    final_url = f"{NEW_IMAGE_URL_PREFIX}{webp_filename}"

    # 步骤 2: 下载原始文件（如果需要）
    if source_url.startswith(('http://', 'https://')) and not os.path.exists(local_image_path):
        try:
            with print_lock:
                print(f"  [下载中] -> {original_filename}")
            response = requests.get(source_url, stream=True, timeout=20)
            response.raise_for_status()
            with open(local_image_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
        except requests.exceptions.RequestException as e:
            with print_lock:
                print(f"  [失败] ✗ 下载失败: {original_filename}: {e}")
            return {'status': 'error', 'reason': '下载失败'}

    # 步骤 3: 转换为WebP（如果需要）
    if os.path.exists(local_image_path) and not local_image_path.lower().endswith('.webp'):
        if not os.path.exists(webp_local_path):
            try:
                with print_lock:
                    print(f"  [转换中] -> {original_filename} to WebP")
                with Image.open(local_image_path) as img:
                    img.convert('RGB').save(webp_local_path, 'webp', quality=INITIAL_WEBP_QUALITY)
            except Exception as e:
                with print_lock:
                    print(f"  [失败] ✗ 转换失败: {original_filename}: {e}")
                return {'status': 'error', 'reason': '转换失败'}

    if not os.path.exists(webp_local_path):
        with print_lock:
            print(f"  [错误] ✗ 找不到待处理文件: {webp_local_path}")
        return {'status': 'error', 'reason': '文件未找到'}

    # 步骤 4: 最终处理（修改哈希值和压缩）
    if not finalize_and_compress_image(webp_local_path):
        return {'status': 'error', 'reason': '最终处理失败'}

    # 步骤 5: 获取最终尺寸
    width, height = get_image_dimensions(webp_local_path)
    if width == 0 or height == 0:
        return {'status': 'error', 'reason': '无法获取尺寸'}

    return {
        'status': 'success',
        'item': item,
        'new_url': final_url,
        'source_url': source_url,
        'is_first_run': is_first_run,
        'width': width,
        'height': height
    }

def update_and_run_downloader():
    """
    主函数，处理JSON文件中的所有图片。
    """
    os.makedirs(IMAGE_DOWNLOAD_DIR, exist_ok=True)
    print(f"目录 '{IMAGE_DOWNLOAD_DIR}' 已就绪。")

    try:
        with open(JSON_FILE_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"错误: 读取JSON文件 '{JSON_FILE_PATH}' 失败: {e}")
        return

    items_to_process = [item for category in data.values() if 'items' in category and isinstance(category['items'], list) for item in category['items']]
    if not items_to_process:
        print("\n未在JSON文件中找到任何菜品项。")
        return

    print(f"\n发现 {len(items_to_process)} 个菜品需要处理。开始使用最多 {MAX_WORKERS} 个线程...")

    successful_updates = []
    failed_count = 0

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(process_item, item): item for item in items_to_process}
        for future in as_completed(futures):
            result = future.result()
            if result and result.get('status') == 'success':
                successful_updates.append(result)
            elif result and result.get('status') == 'error':
                failed_count += 1

    if successful_updates:
        print("\n处理完成。正在更新JSON文件...")
        for result in successful_updates:
            item = result['item']

            if result['is_first_run']:
                item['raw_image_url'] = item.pop('image_url')

            updated_item = {}
            for key, value in item.items():
                if key not in ['width', 'height', 'image_url']:
                    updated_item[key] = value
                if key == 'price':
                    updated_item['width'] = result['width']
                    updated_item['height'] = result['height']

            if 'price' not in item:
                updated_item['width'] = result['width']
                updated_item['height'] = result['height']

            updated_item['image_url'] = result['new_url']

            item.clear()
            item.update(updated_item)

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
    print(f"总计: {len(items_to_process)} 项")
    print("------------------\n")

if __name__ == '__main__':
    update_and_run_downloader()