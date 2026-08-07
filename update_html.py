import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Remove the old main-header as it contains vitals which we move to hub-status-ui, but actually let's see where vitals are right now.
