# Let's check where the hotbar slots are dynamically rendered.
import os

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.js'):
            with open(os.path.join(root, file), 'r') as f:
                content = f.read()
                if 'hotbar-grid' in content:
                    print(os.path.join(root, file))
