import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Add media queries for Mobile Touch Controls
css = """
    /* Mobile Touch Controls Integration & Responsiveness */
    @media (max-width: 768px) {
        #hub-status-ui {
            transform: scale(0.85);
            transform-origin: top left;
        }
        #mobile-controls-container {
            display: block !important;
        }
    }
    @media (min-width: 769px) {
        /* Desktop specific adjustments */
        #mobile-controls-container {
            display: none !important;
        }
    }
"""

html = html.replace('</style>', css + '\n</style>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
