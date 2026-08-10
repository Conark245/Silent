import re
with open('src/components/AdminDashboard.tsx', 'r') as f:
    content = f.read()

content = content.replace("}   Palette,\n} from 'lucide-react';", "  Palette,\n} from 'lucide-react';")

with open('src/components/AdminDashboard.tsx', 'w') as f:
    f.write(content)
