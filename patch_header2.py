import re

with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = re.sub(r'<div className="flex items-center gap-2">\s*<button.*?Admin Dashboard\s*</button>\s*</div>', '', content, flags=re.DOTALL)

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
