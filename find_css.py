import os
import re

def find_patterns(dir_path):
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if '<p' in content and '<span' in content:
                        print(f"File: {path}")
                        lines = content.split('\n')
                        for i, line in enumerate(lines):
                            if '<p' in line:
                                print(f"  Line {i+1}: {line.strip()}")
                            if '<span' in line:
                                print(f"  Line {i+1}: {line.strip()}")
