import re

with open('src/components/UserDonationPage.tsx', 'r') as f:
    content = f.read()

# Remove state
content = content.replace("const [donorName, setDonorName] = useState('');\n", "")

# Remove validation
content = content.replace("""    if (!donorName.trim()) {
      setErrorMessage('Please enter your donor name.');
      return;
    }\n""", "")

# Remove from API call
content = content.replace("donorName: donorName.trim(),", "donorName: '',")

# Remove from the form UI
form_input_regex = re.compile(r'<div className="space-y-1">.*?<label.*?Your Name.*?</label>.*?<input.*?value=\{donorName\}.*?onChange=\{.*?setDonorName.*?\}.*?/>\s*</div>', re.DOTALL)
content = form_input_regex.sub('', content)

# Remove from preview (card 1)
content = content.replace('<span className="text-amber-400">{donorName.trim() || \'Your Name\'}</span>', '')
content = content.replace('<h4 className="text-lg font-extrabold tracking-tight text-white mb-0.5">\n                    \n                  </h4>', '')

# Remove from preview (card 2)
content = content.replace('<h2 className="text-3xl font-extrabold tracking-tight text-white mb-1">\n                \n              </h2>', '')

with open('src/components/UserDonationPage.tsx', 'w') as f:
    f.write(content)
