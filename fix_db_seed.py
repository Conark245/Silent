import re

file_path = 'server/db.ts'

with open(file_path, 'r') as f:
    content = f.read()

# Replace arrays with empty arrays
content = re.sub(r'const initialPaymentMethods: PaymentMethod\[\] = \[.*?\];', 'const initialPaymentMethods: PaymentMethod[] = [];', content, flags=re.DOTALL)
content = re.sub(r'const initialDonationItems: DonationItem\[\] = \[.*?\];', 'const initialDonationItems: DonationItem[] = [];', content, flags=re.DOTALL)
content = re.sub(r'const initialMediaAssets: MediaAsset\[\] = \[.*?\];', 'const initialMediaAssets: MediaAsset[] = [];', content, flags=re.DOTALL)

with open(file_path, 'w') as f:
    f.write(content)

print("DB seed fixed.")
