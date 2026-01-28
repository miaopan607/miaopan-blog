import os
import re

POSTS_DIR = r'src/content/posts'

def fix_frontmatter(content):
    # 匹配 --- 之间的 Frontmatter 部分
    match = re.search(r'^(---\s*\n)(.*?)(\n---)', content, re.DOTALL)
    if not match:
        return content
    
    header = match.group(2)
    lines = header.split('\n')
    new_lines = []
    
    for line in lines:
        # 针对 description 字段进行修复
        if line.startswith('description:'):
            # 提取 key 之后的所有内容
            val = line[len('description:'):].strip()
            # 如果内容被双引号包裹，则替换为单引号
            if val.startswith('"') and val.endswith('"'):
                inner_content = val[1:-1]
                # 将内部已有的单引号做双重处理 (YAML 中单引号内两个单引号代表一个单引号)
                inner_content = inner_content.replace("'", "''")
                line = f"description: '{inner_content}'"
        new_lines.append(line)
        
    new_header = '\n'.join(new_lines)
    return match.group(1) + new_header + match.group(3) + content[match.end():]

def main():
    for filename in os.listdir(POSTS_DIR):
        if not filename.endswith('.md'):
            continue
            
        file_path = os.path.join(POSTS_DIR, filename)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        new_content = fix_frontmatter(content)
        
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"[修复成功] {filename}")

if __name__ == "__main__":
    main()