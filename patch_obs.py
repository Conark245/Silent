import re

with open('src/components/ObsOverlay.tsx', 'r') as f:
    content = f.read()

content = content.replace('<span className="text-amber-400 font-extrabold">{d.donorName}</span>', '')

name_block = re.compile(r'<motion\.h2\s+initial=\{\{.*?\}\}\s+animate=\{\{.*?\}\}\s+transition=\{\{.*?\}\}\s+className="text-4xl font-extrabold tracking-tight text-white mb-1"\s*>\s*<span className="text-amber-400">\{donation\.donorName\}</span>\s*</motion\.h2>', re.DOTALL)
content = name_block.sub('', content)

with open('src/components/ObsOverlay.tsx', 'w') as f:
    f.write(content)
