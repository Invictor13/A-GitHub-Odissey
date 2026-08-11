const fs = require('fs');

const biomes = [
    { file: 'src/world_builder/biomes/forest/ForestBiome.js', color: '0x0ea5e9' },
    { file: 'src/world_builder/biomes/desert/DesertBiome.js', color: '0x4dd0e1' },
    { file: 'src/world_builder/biomes/bamboo/BambooBiome.js', color: '0x4db6ac' },
    { file: 'src/world_builder/biomes/canyon/CanyonBiome.js', color: '0x008b8b' },
    { file: 'src/world_builder/biomes/mangrove/MangroveBiome.js', color: '0x3d5431' },
    { file: 'src/world_builder/biomes/mushroom/MushroomBiome.js', color: '0x0ea5e9' }
];

for (const b of biomes) {
    let content = fs.readFileSync(b.file, 'utf8');
    const regex = /this\.matWater\s*=\s*new\s*THREE\.MeshStandardMaterial\s*\(\s*\{[^}]*\}\s*\)\s*;/;
    content = content.replace(regex, `this.matWater = this.getWaterMaterial(${b.color});`);
    fs.writeFileSync(b.file, content);
}
