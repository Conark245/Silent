import re

with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("4. Select Payment Method", "3. Select Payment Method")
content = content.replace("5. ", "4. ")

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
