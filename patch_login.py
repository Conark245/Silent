with open('src/components/AdminLogin.tsx', 'r') as f:
    content = f.read()

content = content.replace("""      if (res.ok) {
        onLoginSuccess();
      } else {""", """      if (res.ok) {
        const data = await res.json();
        if (data.token) localStorage.setItem('obs_admin_token', data.token);
        onLoginSuccess();
      } else {""")

with open('src/components/AdminLogin.tsx', 'w') as f:
    f.write(content)
