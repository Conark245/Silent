const fs = require('fs');
let code = fs.readFileSync('server/db.ts', 'utf8');

let newCode = '';
let i = 0;

while (i < code.length) {
    let matchIndex = code.indexOf('if (this.isConnected) {', i);
    if (matchIndex === -1) {
        newCode += code.substring(i);
        break;
    }
    
    // Append everything up to the match
    newCode += code.substring(i, matchIndex);
    
    // Replace the opening part
    newCode += 'if (process.env.MONGODB_URI) {\n      this.waitForConnection().then(() => {';
    
    let j = matchIndex + 'if (this.isConnected) {'.length;
    let braceCount = 1;
    
    // Find the matching closing brace
    let content = '';
    while (j < code.length && braceCount > 0) {
        if (code[j] === '{') braceCount++;
        if (code[j] === '}') braceCount--;
        
        if (braceCount === 0) {
            break;
        }
        content += code[j];
        j++;
    }
    
    newCode += content + '      });\n    }';
    i = j + 1;
}

fs.writeFileSync('server/db.ts', newCode);
console.log('Refactoring done.');
