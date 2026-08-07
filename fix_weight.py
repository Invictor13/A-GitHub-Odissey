import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# I noticed we removed the weight-container. Main.js depends on it.
# Let's put it in the inventory modal header, or somewhere else.
# Wait, main.js does null checks, but it's good to have. Let's put it back in the hud-status-ui at the bottom.

new_weight = """
        <!-- Weight Container -->
        <div id="weight-container" class="flex items-center gap-2 mt-2 pt-2 border-t border-yellow-500/20 ui-element-faded text-right">
            <i class="fa-solid fa-bag-shopping text-amber-500/80 text-[10px] w-3 text-center drop-shadow"></i>
            <span class="text-[10px] font-bold font-mono text-white/80" id="weight-text">0.0 / 25.0 kg</span>
            <div id="weight-bar" style="display:none; width: 0%"></div>
        </div>
    </div>
</div>
"""

html = html.replace('    </div>\n</div>\n\n<!-- Main HUD Gold Counter -->', new_weight + '\n<!-- Main HUD Gold Counter -->')

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)
