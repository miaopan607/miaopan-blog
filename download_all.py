import re
import os
import requests
from pathlib import Path

# ================= 配置区域 =================
# 1. 你的博文根目录
POSTS_DIR = 'src/content/posts'

# 2. 图片存放的总目录（建议放在 assets 或同级，方便 Astro 优化）
# 这里我们设为 posts 目录下的 images 文件夹
IMG_BASE_DIR = os.path.join(POSTS_DIR, 'images')

# 3. Markdown 中引用的相对路径前缀
# 这样修改后，链接会变成 ./images/xxx.png
RELATIVE_LINK_PREFIX = './images/'
# ===========================================

# 确保图片目录存在
if not os.path.exists(IMG_BASE_DIR):
    os.makedirs(IMG_BASE_DIR)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.cnblogs.com/'
}

def process_file(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 正则匹配所有网络图片链接 (支持 http 和 https)
    img_links = re.findall(r'!\[.*?\]\(((https?://.*?)\))', content)
    # 注意：img_links 此时是 [(完整括号内容, url), ...]
    
    if not img_links:
        return False

    print(f"\n正在处理文件: {os.path.basename(file_path)}")
    new_content = content
    modified = False

    for full_match, link in img_links:
        # 只处理外部链接，跳过已经是本地路径的
        if 'http' not in link:
            continue
        
        # 排除非图片链接（可选）
        if not any(ext in link.lower() for ext in ['.png', '.jpg', '.jpeg', '.gif', '.webp']):
            # 如果博客园链接没后缀，我们根据 URL 取名
            file_name = link.split('/')[-1]
            if '.' not in file_name: file_name += ".png" 
        else:
            file_name = link.split('/')[-1]

        local_path = os.path.join(IMG_BASE_DIR, file_name)

        # 下载图片
        try:
            if not os.path.exists(local_path):
                print(f"  下载图片: {link}")
                r = requests.get(link, headers=headers, timeout=10)
                if r.status_code == 200:
                    with open(local_path, 'wb') as f:
                        f.write(r.content)
                else:
                    print(f"  ❌ 下载失败 (HTTP {r.status_code}): {link}")
                    continue
            
            # 替换 Markdown 链接
            # Fuwari 的结构建议用相对路径
            new_link = f"{RELATIVE_LINK_PREFIX}{file_name}"
            new_content = new_content.replace(link, new_link)
            modified = True
        except Exception as e:
            print(f"  ❌ 出错: {e}")

    if modified:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        return True
    return False

def main():
    count = 0
    # 遍历所有 .md 文件
    for root, dirs, files in os.walk(POSTS_DIR):
        for file in files:
            if file.endswith('.md'):
                file_path = os.path.join(root, file)
                if process_file(file_path):
                    count += 1

    print(f"\n✨ 全部处理完成！共更新了 {count} 篇博文。")
    print(f"📁 图片已保存至: {IMG_BASE_DIR}")

if __name__ == "__main__":
    main()