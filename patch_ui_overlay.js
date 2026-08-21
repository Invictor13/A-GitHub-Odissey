const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');

// There is no #ui-overlay element in index.html, causing uiOverlay.style.display = 'flex' to fail when uiOverlay is null.
code = code.replace(/if \(uiOverlay\) uiOverlay\.style\.display = 'flex';/g, 'if (uiOverlay) { uiOverlay.style.display = \'flex\'; }');
// Wait, the error is `Cannot read properties of undefined (reading 'add')`, not style.display. And it happens at line 219.
