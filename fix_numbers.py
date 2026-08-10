import re

with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("2. Select Amount", "1. Select Amount")
content = content.replace("{/* 2.", "{/* 1.")

content = content.replace("3. Choose Reward Item", "2. Choose Reward Item")
content = content.replace("{/* 3.", "{/* 2.")

content = content.replace("4. Payment Details", "3. Payment Details")
content = content.replace("{/* 4.", "{/* 3.")

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
