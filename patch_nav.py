with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    '<nav className="p-4 space-y-1">',
    '<nav className="p-2 md:p-4 flex flex-row md:flex-col gap-1 md:gap-0 md:space-y-1 overflow-x-auto w-full scrollbar-hide">'
)
content = content.replace(
    'className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition cursor-pointer ${',
    'className={`shrink-0 md:w-full flex items-center justify-between px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${'
)
content = content.replace(
    'className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition cursor-pointer ${',
    'className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-lg text-sm font-medium transition cursor-pointer ${'
)
content = content.replace(
    '<span>Dashboard Queue</span>',
    '<span className="whitespace-nowrap">Dashboard Queue</span>'
)
content = content.replace(
    '<span>Analytics & Charts</span>',
    '<span className="whitespace-nowrap">Analytics & Charts</span>'
)
content = content.replace(
    '<span>Payment Methods</span>',
    '<span className="whitespace-nowrap">Payment Methods</span>'
)
content = content.replace(
    '<span>Reward Items</span>',
    '<span className="whitespace-nowrap">Reward Items</span>'
)
content = content.replace(
    '<span>Media Assets</span>',
    '<span className="whitespace-nowrap">Media Assets</span>'
)
content = content.replace(
    '<span>Telegram Bot</span>',
    '<span className="whitespace-nowrap">Telegram Bot</span>'
)
content = content.replace(
    '<span>Audit Logs</span>',
    '<span className="whitespace-nowrap">Audit Logs</span>'
)
content = content.replace(
    '<span>OBS Setup Guide</span>',
    '<span className="whitespace-nowrap">OBS Setup Guide</span>'
)
content = content.replace(
    '<aside className="w-full md:w-64 bg-white dark:bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0">',
    '<aside className="w-full md:w-64 bg-white dark:bg-[#1E293B] border-b md:border-b-0 md:border-r border-slate-300 dark:border-slate-700 flex flex-col shrink-0 overflow-hidden">'
)

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
