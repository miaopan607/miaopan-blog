import os
import re
import yaml

# 配置路径
POSTS_DIR = r'src/content/posts'

def clean_filename(filename):
    """
    清理文件名中的特殊字符，只保留中文、字母、数字、下划线和中划线
    """
    # 分离文件名和后缀
    name, ext = os.path.splitext(filename)
    # 将空格、#、&、以及各种括号替换为下划线或去掉
    # \u4e00-\u9fa5 是中文范围
    name = re.sub(r'[^\w\u4e00-\u9fa5\-]', '_', name)
    # 连续的下划线合并为一个
    name = re.sub(r'_+', '_', name).strip('_')
    return name + ext

def get_date_from_file(file_path):
    """
    从 Markdown 的 Frontmatter 中获取日期
    """
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # 匹配两个 --- 之间的 YAML 内容
            match = re.search(r'^---\s*\n(.*?)\n---\s*\n', content, re.DOTALL)
            if match:
                data = yaml.safe_load(match.group(1))
                # 尝试获取不同的日期字段（根据你的模板调整）
                date_val = data.get('published') or data.get('date')
                if date_val:
                    # 如果是 datetime 对象，格式化为 YYYY-MM-DD
                    if hasattr(date_val, 'strftime'):
                        return date_val.strftime('%Y-%m-%d')
                    # 如果是字符串，取前10位
                    return str(date_val)[:10]
    except Exception as e:
        print(f"解析 {file_path} 出错: {e}")
    return None

def main():
    if not os.path.exists(POSTS_DIR):
        print(f"错误: 找不到目录 {POSTS_DIR}")
        return

    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith('.md'):
            continue

        old_path = os.path.join(POSTS_DIR, filename)
        
        # 1. 获取日期前缀
        date_prefix = get_date_from_file(old_path)
        
        # 2. 清理文件名
        cleaned_name = clean_filename(filename)
        
        # 3. 拼接新文件名
        if date_prefix and not cleaned_name.startswith(date_prefix):
            new_filename = f"{date_prefix}-{cleaned_name}"
        else:
            new_filename = cleaned_name

        new_path = os.path.join(POSTS_DIR, new_filename)

        # 4. 执行重命名
        if old_path != new_path:
            try:
                # 如果目标文件已存在，先处理冲突
                if os.path.exists(new_path):
                    print(f"[跳过] 目标已存在: {new_filename}")
                    continue
                
                os.rename(old_path, new_path)
                print(f"[成功] {filename} -> {new_filename}")
            except Exception as e:
                print(f"[失败] 重命名 {filename} 时出错: {e}")

if __name__ == "__main__":
    main()