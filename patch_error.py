with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("console.error('Failed to fetch OBS overlay queue:', err);", "// console.error('Failed to fetch OBS overlay queue:', err); // Suppress polling error on dev server restart")

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
