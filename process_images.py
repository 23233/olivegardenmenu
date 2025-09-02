import json
import os
import requests
import threading
import uuid
import argparse
import hashlib
from datetime import datetime
from urllib.parse import urlparse, unquote, parse_qs
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image, UnidentifiedImageError
import piexif
import piexif.helper

# --- 配置信息 ---
# 1. 移除全局配置，这些将通过CLI传入
# IMAGE_DOWNLOAD_DIR = 'public/static/image/upload/'
# NEW_IMAGE_URL_PREFIX = '/static/image/upload/'
MAX_WORKERS = 10
MAX_FILE_SIZE_KB = 300
MIN_WEBP_QUALITY = 65
INITIAL_WEBP_QUALITY = 85

print_lock = threading.Lock()

def generate_unique_filename_base(url: str) -> str:
    """
    根据URL智能生成一个唯一的文件名基础部分（不含扩展名）。
    优先级: URL查询参数 'ContentFile' > URL路径中的文件名 > 完整URL的MD5哈希值。
    """
    try:
        parsed_url = urlparse(url)

        query_params = parse_qs(parsed_url.query)
        if 'ContentFile' in query_params and query_params['ContentFile'][0]:
            filename = query_params['ContentFile'][0]
            return os.path.splitext(os.path.basename(filename))[0]

        decoded_path = unquote(parsed_url.path)
        basename = os.path.basename(decoded_path)
        if basename and '.' in basename and basename.lower() != 'content':
             return os.path.splitext(basename)[0]

        url_bytes = url.encode('utf-8')
        md5_hash = hashlib.md5(url_bytes).hexdigest()
        with print_lock:
            print(f"  [提示] ⓘ 未找到明确文件名，使用哈希值 {md5_hash[:12]}... 作为文件名")
        return md5_hash

    except Exception:
        url_bytes = url.encode('utf-8')
        return hashlib.md5(url_bytes).hexdigest()


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
    except (UnidentifiedImageError, FileNotFoundError):
        with print_lock:
            print(f"  [警告] ✗ 无法读取图片尺寸 (文件可能无效或不存在): {os.path.basename(image_path)}")
        return (0, 0)
    except Exception as e:
        with print_lock:
            print(f"  [警告] ✗ 读取图片尺寸时发生未知错误: {os.path.basename(image_path)} (错误: {e})")
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
                temp_path = image_path + ".tmp"
                while os.path.getsize(image_path) > max_size_bytes and current_quality > MIN_WEBP_QUALITY:
                    current_quality -= 5
                    with print_lock:
                        print(f"  [压缩中] -> {os.path.basename(image_path)} 质量调整为 {current_quality}")
                    img.save(temp_path, 'webp', quality=current_quality)
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
    except UnidentifiedImageError:
        with print_lock:
            print(f"  [失败] ✗ 图片最终处理失败: {os.path.basename(image_path)} 不是一个有效的图片文件。")
        if os.path.exists(image_path):
            os.remove(image_path)
        return False
    except Exception as e:
        with print_lock:
            print(f"  [失败] ✗ 图片最终处理失败: {os.path.basename(image_path)}: {e}")
        return False

# 2. 将目录和前缀作为参数传入
def process_item(item, image_download_dir, new_image_url_prefix):
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
            # 使用传入的参数进行检查
            if 'image_url' in item and item['image_url'].startswith(new_image_url_prefix):
                 print(f"  [跳过] ✓ '{item_title}' 已是处理过的本地路径。")
            else:
                 print(f"  [跳过] ✓ '{item_title}' 的图片URL [{source_url}] 无效。")
        return None

    is_first_run = source_key is not None and 'raw_image_url' not in item

    filename_base = generate_unique_filename_base(source_url)

    original_file_hash = hashlib.md5(source_url.encode('utf-8')).hexdigest()
    # 使用传入的参数构建路径
    local_image_path = os.path.join(image_download_dir, f"{original_file_hash}.tmp")

    webp_filename = f"{filename_base}.webp"
    # 使用传入的参数构建路径
    webp_local_path = os.path.join(image_download_dir, webp_filename)
    # 使用传入的参数构建URL
    final_url = f"{new_image_url_prefix}{webp_filename}"

    if os.path.exists(webp_local_path):
        with print_lock:
            print(f"  [已存在] ✓ {webp_filename} 本地已存在，跳过下载和转换。")
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

    try:
        with print_lock:
            print(f"  [下载中] -> {source_url}")
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(source_url, stream=True, timeout=20, headers=headers)
        response.raise_for_status()

        content_type = response.headers.get('content-type', '').lower()
        if not content_type.startswith('image/'):
            return {'status': 'error', 'reason': f"下载内容不是图片 (Content-Type: {content_type})"}

        with open(local_image_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=812):
                f.write(chunk)
    except requests.exceptions.RequestException as e:
        if os.path.exists(local_image_path):
            os.remove(local_image_path)
        return {'status': 'error', 'reason': f'下载失败: {e}'}

    try:
        with print_lock:
            print(f"  [转换中] -> {os.path.basename(local_image_path)} to {webp_filename}")
        with Image.open(local_image_path) as img:
            img.convert('RGB').save(webp_local_path, 'webp', quality=INITIAL_WEBP_QUALITY)
    except UnidentifiedImageError:
        if os.path.exists(local_image_path):
            os.remove(local_image_path)
        return {'status': 'error', 'reason': f'转换失败: 下载的文件不是有效的图片格式'}
    except Exception as e:
        if os.path.exists(local_image_path):
            os.remove(local_image_path)
        return {'status': 'error', 'reason': f'转换失败: {e}'}

    if not finalize_and_compress_image(webp_local_path):
        return {'status': 'error', 'reason': '最终处理失败'}

    width, height = get_image_dimensions(webp_local_path)
    if width == 0 or height == 0:
        return {'status': 'error', 'reason': '无法获取尺寸'}

    if os.path.exists(local_image_path):
        try:
            os.remove(local_image_path)
        except OSError as e:
            with print_lock:
                print(f"  [警告] ✗ 无法删除临时文件 {os.path.basename(local_image_path)}: {e}")

    return {
        'status': 'success',
        'item': item,
        'new_url': final_url,
        'source_key': source_key,
        'is_first_run': is_first_run,
        'width': width,
        'height': height
    }

# 2. 将目录和前缀作为参数传入
def update_and_run_downloader(json_file_path, image_download_dir, new_image_url_prefix):
    """主函数，读取JSON，递归查找所有项目，并发处理图片，并统一图片URL字段。"""
    # 使用传入的参数创建目录
    os.makedirs(image_download_dir, exist_ok=True)
    print(f"图片目录 '{image_download_dir}' 已就绪。")

    try:
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"错误: 读取JSON文件 '{json_file_path}' 失败: {e}")
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
        # 将参数传递给 process_item
        future_to_item = {
            executor.submit(process_item, item, image_download_dir, new_image_url_prefix): item
            for item in items_to_process
        }
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
            with open(json_file_path, 'w', encoding='utf-8') as f:
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
    parser = argparse.ArgumentParser(
        description="一个用于下载、转换和优化菜单图片，并更新JSON数据的脚本。",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter
    )

    # 必要的位置参数
    parser.add_argument('json_file', type=str, help='需要处理的JSON文件的路径。')

    # 可选参数
    parser.add_argument(
        '--output-dir',
        type=str,
        default='public/static/image/upload/',
        help='本地图片存储的目录路径。'
    )
    # 1. 修改这里：移除默认值，让我们可以判断用户是否真的输入了这个参数
    parser.add_argument(
        '--url-prefix',
        type=str,
        help='写入JSON文件中的图片URL前缀。如果未提供，将根据output-dir自动推断。'
    )

    args = parser.parse_args()

    # --- 2. 新增的智能逻辑 ---
    final_output_dir = args.output_dir
    final_url_prefix = args.url_prefix

    # 如果用户没有手动指定 url-prefix
    if final_url_prefix is None:
        # 我们就根据 output-dir 自动生成一个
        # 简单规则：替换路径分隔符为'/'，并确保前后都有'/'
        # 同时，我们假设 'public' 目录是网站根目录，所以把它从URL中去掉

        # 将所有反斜杠'\' 替换为 正斜杠'/'
        path_as_url = final_output_dir.replace('\\', '/')

        # 如果路径以 'public/' 开头，就去掉它
        if path_as_url.startswith('public/'):
            path_as_url = path_as_url[len('public/'):]

        # 确保路径以'/'开头
        if not path_as_url.startswith('/'):
            path_as_url = '/' + path_as_url

        # 确保路径以'/'结尾
        if not path_as_url.endswith('/'):
            path_as_url += '/'

        final_url_prefix = path_as_url
        print(f"[提示] ⓘ 未提供 --url-prefix，已根据输出目录自动生成: {final_url_prefix}")


    # 将最终确定好的参数传递给主函数
    update_and_run_downloader(args.json_file, final_output_dir, final_url_prefix)