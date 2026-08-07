import re

with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Replace the hub-status-ui and main-header with the unified gothi/low-poly design.
# And remove bottom-vitals.

# We will create a unified card in the top left, which replaces the existing hub-status-ui,
# main-header and bottom-vitals.

# Let's write the new HTML to inject:
new_card = """
<!-- Hub Status Overlays & Unified Main Header -->
<div id="hub-status-ui" class="absolute top-4 left-4 md:top-6 md:left-6 pointer-events-none hidden z-40 flex flex-col p-4 md:p-5 transition-all duration-700 opacity-0 text-white glass-panel border border-yellow-500/30 shadow-2xl rounded-2xl bg-[rgba(15,12,22,0.8)] max-w-[280px]">

    <div class="flex items-center gap-3 mb-3 border-b border-yellow-500/20 pb-2">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-950 to-stone-950 border border-yellow-500/50 flex items-center justify-center text-yellow-400 text-xl shadow-lg shadow-amber-950/50">
            <i id="location-icon" class="fa-solid fa-cloud"></i>
        </div>
        <div>
            <h2 id="location-title" class="font-bold text-sm md:text-base text-gray-100 uppercase tracking-wider font-title">Santuário Celeste</h2>
            <p id="location-subtitle" class="text-[11px] text-yellow-400 font-medium font-game">Dia 1 • 08:00 • ☀️ Ensolarado</p>
        </div>
    </div>

    <!-- Vitals Bars -->
    <div id="vitals-container" class="flex flex-col gap-2 w-full mt-1">
        <!-- HP Bar -->
        <div class="flex items-center gap-2" title="Pontos de Vida">
            <i class="fa-solid fa-heart text-red-600 text-[10px] w-3 text-center"></i>
            <div class="flex-grow h-1.5 bg-black/60 rounded-full overflow-hidden border border-red-900/50">
                <div id="vital-hp" class="h-full bg-red-600 transition-all duration-300" style="width: 100%"></div>
            </div>
            <span class="text-[10px] font-mono font-bold text-red-300 w-8 text-right" id="txt-hp">100%</span>
        </div>
        <!-- Food (Mana temp replacement) Bar -->
        <div class="flex items-center gap-2" title="Fome">
            <i class="fa-solid fa-drumstick-bite text-amber-500 text-[10px] w-3 text-center"></i>
            <div class="flex-grow h-1.5 bg-black/60 rounded-full overflow-hidden border border-amber-900/50">
                <div id="vital-food" class="h-full bg-amber-500 transition-all duration-300" style="width: 75%"></div>
            </div>
            <span class="text-[10px] font-mono font-bold text-amber-300 w-8 text-right" id="txt-food">75%</span>
        </div>
        <!-- Water (Stamina temp replacement) Bar -->
        <div class="flex items-center gap-2" title="Sede">
            <i class="fa-solid fa-droplet text-sky-500 text-[10px] w-3 text-center"></i>
            <div class="flex-grow h-1.5 bg-black/60 rounded-full overflow-hidden border border-sky-900/50">
                <div id="vital-water" class="h-full bg-sky-500 transition-all duration-300" style="width: 60%"></div>
            </div>
            <span class="text-[10px] font-mono font-bold text-sky-300 w-8 text-right" id="txt-water">60%</span>
        </div>
    </div>
</div>
"""

# We need to remove the existing <div id="hub-status-ui"> ... </div>
html = re.sub(r'<div id="hub-status-ui".*?</div>\s*</div>\s*</div>', new_card, html, flags=re.DOTALL)

# We need to remove <header id="main-header"> ... </header>
html = re.sub(r'<header id="main-header".*?</header>', '', html, flags=re.DOTALL)

# We need to remove <div id="bottom-vitals"> ... </div>
html = re.sub(r'<div id="bottom-vitals".*?</div>\s*</div>\s*</div>', '', html, flags=re.DOTALL)

# We also have the weight-container that was in the main-header. Wait, maybe we need to keep weight-container somewhere. Let's put it in the inventory or a small floating widget?
# Actually, the user didn't explicitly mention the weight container for the new HUD, but we should probably keep it available or hidden for now.
# I'll put it back into the new card for now, just in case, or leave it out if it breaks layout. Let's add it to the new_card.

with open('index2.html', 'w', encoding='utf-8') as f:
    f.write(html)
