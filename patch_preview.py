with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

old_1 = """                  {/* Donor Name & Amount */}
                  
                  <div className="text-base font-black text-emerald-400 font-mono mb-1.5">"""
new_1 = """                  {/* Donor Name & Amount */}
                  <div className="text-lg font-black text-white drop-shadow-md">
                    {donorName.trim() || 'Anonymous'}
                  </div>
                  <div className="text-base font-black text-emerald-400 font-mono mb-1.5">"""

old_2 = """              {/* Donor Name & Amount */}
              
              <div className="text-2xl font-black text-emerald-400 font-mono my-2">"""
new_2 = """              {/* Donor Name & Amount */}
              <div className="text-3xl font-black text-white drop-shadow-lg">
                {donorName.trim() || 'Anonymous'}
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono my-2">"""

content = content.replace(old_1, new_1)
content = content.replace(old_2, new_2)

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
