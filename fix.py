import re
import os

files = ['src/components/AdminDashboard.tsx', 'src/components/DonationAnalytics.tsx']

for file_path in files:
    with open(file_path, 'r') as f:
        content = f.read()
    
    content = content.replace('text-slate-400 dark:text-slate-500 dark:text-slate-400', 'text-slate-500 dark:text-slate-400')
    content = content.replace('text-slate-400 dark:text-slate-600', 'text-slate-400 dark:text-slate-600') # Wait, didn't do text-slate-600 after 500
    
    with open(file_path, 'w') as f:
        f.write(content)

print("Fixed.")
