with open('server/db.ts', 'r') as f:
    lines = f.readlines()

out = []
skip = False
for line in lines:
    if "  // --- SYSTEM SETTINGS ---" in line:
        skip = True
    if skip and "  // Payment Methods" in line:
        skip = False
    if not skip:
        out.append(line)

with open('server/db.ts', 'w') as f:
    f.writelines(out)

