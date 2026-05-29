import os
from pathlib import Path

def collect_project(root_dir, output_file='project_dump.txt', ignore_dirs=None):
    if ignore_dirs is None:
        ignore_dirs = {'.git', '__pycache__', 'venv', 'env', '.idea', '.vscode', 
                       'node_modules', 'dist', 'build', 'target', '.pytest_cache',
                       'out', 'bin', 'obj'}
    
    # Текстовые расширения для всех языков
    text_extensions = {
        # Веб
        '.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
        # Java
        '.java', '.jsp', '.jspx', '.tag', '.tld',
        # Python
        '.py', '.pyw', '.ipynb',
        # Языки общего назначения
        '.c', '.cpp', '.h', '.hpp', '.cs', '.go', '.rs', '.rb', '.php', '.swift',
        '.kt', '.kts', '.scala', '.clj', '.lua', '.r',
        # Конфиги и данные
        '.json', '.xml', '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
        '.md', '.txt', '.rst', '.adoc', '.tex',
        '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
        '.sql', '.graphql', '.proto',
        '.properties', '.gradle', '.groovy',
    }
    
    with open(output_file, 'w', encoding='utf-8') as out:
        # Пишем структуру
        out.write("=" * 80 + "\n")
        out.write("СТРУКТУРА ПРОЕКТА\n")
        out.write("=" * 80 + "\n\n")
        
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            level = root.replace(root_dir, '').count(os.sep)
            indent = ' ' * 2 * level
            out.write(f"{indent}{os.path.basename(root)}/\n")
            
            sub_indent = ' ' * 2 * (level + 1)
            for file in sorted(files):
                ext = os.path.splitext(file)[1].lower()
                if ext in text_extensions or '.' not in file:
                    out.write(f"{sub_indent}{file}\n")
        
        # Пишем содержимое файлов
        out.write("\n" + "=" * 80 + "\n")
        out.write("СОДЕРЖИМОЕ ФАЙЛОВ\n")
        out.write("=" * 80 + "\n\n")
        
        for root, dirs, files in os.walk(root_dir):
            dirs[:] = [d for d in dirs if d not in ignore_dirs]
            
            for file in sorted(files):
                ext = os.path.splitext(file)[1].lower()
                if ext in text_extensions or '.' not in file:
                    file_path = os.path.join(root, file)
                    try:
                        out.write(f"\n{'=' * 80}\n")
                        rel_path = os.path.relpath(file_path, root_dir)
                        out.write(f"ФАЙЛ: {rel_path}\n")
                        out.write(f"{'=' * 80}\n")
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            out.write(content)
                            if not content.endswith('\n'):
                                out.write('\n')
                    except UnicodeDecodeError:
                        out.write(f"[Бинарный файл, не отображается]\n")
                    except Exception as e:
                        out.write(f"Ошибка: {e}\n")
    
    print(f"✅ Проект собран в: {output_file}")

if __name__ == "__main__":
    collect_project(".", "project_complete.txt")
