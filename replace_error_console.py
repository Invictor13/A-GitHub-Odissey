import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace #error-console styles
old_style = r'#error-console \{ position: fixed; top: 10px; left: 10px; right: 10px; background: rgba\(220, 38, 38, 0\.95\); color: white; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 9999; display: none; white-space: pre-wrap; box-shadow: 0 4px 20px rgba\(0,0,0,0\.8\); \}'
new_style = '#error-console { position: fixed; bottom: 20px; right: 20px; max-width: 350px; background: rgba(220, 38, 38, 0.95); color: white; padding: 14px; border-radius: 8px; font-family: monospace; font-size: 12px; z-index: 9999; display: none; white-space: pre-wrap; box-shadow: 0 4px 20px rgba(0,0,0,0.8); border: 1px solid rgba(255,100,100,0.5); transition: opacity 0.3s ease, transform 0.3s ease; }'

html = re.sub(old_style, new_style, html)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
