import re

file_path = 'src/components/AdminLogin.tsx'

replacements = [
    (r'bg-\[#0F172A\]', 'bg-slate-50 dark:bg-[#0F172A]'),
    (r'bg-\[#1E293B\]', 'bg-white dark:bg-[#1E293B]'),
    (r'\bborder-slate-800\b', 'border-slate-200 dark:border-slate-800'),
    (r'\bborder-slate-700\b', 'border-slate-300 dark:border-slate-700'),
    (r'\btext-slate-100\b', 'text-slate-900 dark:text-slate-100'),
    (r'\btext-slate-200\b', 'text-slate-800 dark:text-slate-200'),
    (r'\btext-slate-300\b', 'text-slate-700 dark:text-slate-300'),
    (r'\btext-slate-400\b', 'text-slate-500 dark:text-slate-400'),
    (r'\btext-white\b', 'text-slate-900 dark:text-white'),
    (r'\bbg-slate-900\b', 'bg-slate-100 dark:bg-slate-900'),
    (r'\bbg-slate-950/50\b', 'bg-slate-200 dark:bg-slate-950/50'),
    (r'\bhover:text-white\b', 'hover:text-slate-900 dark:hover:text-white'),
]

with open(file_path, 'r') as f:
    content = f.read()

for old, new in replacements:
    content = re.sub(old, new, content)

with open(file_path, 'w') as f:
    f.write(content)

print("Login fixed.")
