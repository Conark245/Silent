import re

with open('src/main.tsx', 'r') as f:
    content = f.read()

interceptor = """
import './fetch-interceptor.ts';
"""

content = content.replace("import App from './App.tsx';", "import App from './App.tsx';\n" + interceptor)

with open('src/main.tsx', 'w') as f:
    f.write(content)
