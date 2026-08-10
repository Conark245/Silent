with open('server.ts', 'r') as f:
    content = f.read()

content = content.replace("if (!donorName || !donorName.trim()) {\n        return res.status(400).json({ error: 'Donor name is required' });\n      }", "")
content = content.replace("donorName: donorName.trim(),", "donorName: donorName ? donorName.trim() : '',")

with open('server.ts', 'w') as f:
    f.write(content)
