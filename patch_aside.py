with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<aside className="w-full md:w-64 bg-white dark:bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0 overflow-hidden">',
    '<aside className="w-full md:w-64 bg-white dark:bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0 z-30 sticky top-16 md:static overflow-hidden">'
)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
