const fs = require('fs');
let code = fs.readFileSync('main.js', 'utf8');
code = code.replace(/document\.getElementById\('game-canvas'\)\.classList\.remove\('menu-active'\);/g,
"const canvas = document.getElementById('game-canvas');\n            if (canvas) canvas.classList.remove('menu-active');");
fs.writeFileSync('main.js', code);
