import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

new_footer = """
<!-- Hotbar (1-5) -->
<footer class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
    <div class="flex gap-3" id="hotbar-grid">
        <!-- Slots 1-5 populated dynamically -->
        <!-- Will style them in CSS -->
    </div>
</footer>
"""

html = re.sub(r'<footer.*?</footer>', new_footer, html, flags=re.DOTALL)

# Add CSS for hotbar slots since they are populated dynamically. Let's see if there is CSS for it or we can add it.
# Actually, the user asked to change it to:
# 5 slots quadrados vazios/preenchidos com moldura em tom bronze/dourado.
# Indicador de tecla (1, 2, 3, 4, 5) discreto no canto de cada slot.
# Tamanho adequado para toque (min-width: 44px).
css_hotbar = """
    /* New Hotbar Slot Styling */
    #hotbar-grid .inventory-slot {
        width: 44px;
        height: 44px;
        background: rgba(15, 12, 22, 0.8);
        border: 2px solid rgba(212, 175, 55, 0.6);
        border-radius: 8px;
        position: relative;
        backdrop-filter: blur(8px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    }
    @media (min-width: 769px) {
        #hotbar-grid .inventory-slot {
            width: 52px;
            height: 52px;
        }
    }
    #hotbar-grid .inventory-slot::after {
        /* This will be handled by JS adding the number or we can use nth-child */
    }
"""

html = html.replace('</style>', css_hotbar + '\n</style>')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
