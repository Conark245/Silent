with open('src/App.tsx', 'r') as f:
    content = f.read()

content = content.replace("""  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });""", """  const handleLogout = async () => {
    try {
      localStorage.removeItem('obs_admin_token');
      await fetch('/api/admin/logout', { method: 'POST' });""")

with open('src/App.tsx', 'w') as f:
    f.write(content)
