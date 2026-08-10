import re

file_path = 'server/db.ts'
with open(file_path, 'r') as f:
    content = f.read()

content = re.sub(
    r"audit_logs: \[.*?\] as AuditLog\[\],", 
    "audit_logs: [] as AuditLog[],", 
    content, 
    flags=re.DOTALL
)

with open(file_path, 'w') as f:
    f.write(content)

print("Cache fixed")
