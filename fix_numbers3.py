with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

content = content.replace("2. Select Donation Amount", "1. Select Donation Amount")
content = content.replace("3. Optional Message to Streamer", "2. Optional Message to Streamer")

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
