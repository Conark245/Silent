import re

files = ['src/components/AdminDashboard.tsx', 'src/components/DonationAnalytics.tsx']

replacements = [
    ('hover:text-slate-900 dark:text-white', 'hover:text-slate-900 dark:hover:text-white'),
    ('hover:text-slate-800 dark:text-slate-200', 'hover:text-slate-800 dark:hover:text-slate-200'),
    ('hover:text-slate-700 dark:text-slate-300', 'hover:text-slate-700 dark:hover:text-slate-300'),
    ('hover:bg-slate-100 dark:bg-[#1E293B]', 'hover:bg-slate-100 dark:hover:bg-[#1E293B]'),
    ('hover:bg-slate-200 dark:bg-slate-800', 'hover:bg-slate-200 dark:hover:bg-slate-800'),
]

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(file_path, 'w') as f:
        f.write(content)

print("Hover fixed.")
