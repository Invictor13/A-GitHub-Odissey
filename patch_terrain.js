const fs = require('fs');
let content = fs.readFileSync('src/world_builder/hub_terrain.js', 'utf8');

content = content.replace(/initHeightMap\(\) \{[\s\S]*?buildTerrain\(\) \{/, `initHeightMap() {
        for (let x = -10; x < 10; x++) {
            this.heightMap[x] = [];
            for (let z = -10; z < 10; z++) {
                // Area norte do Portal (X entre -2 e 2, Z entre -9 e -7): Altura Y = 2
                if (x >= -2 && x <= 2 && z >= -9 && z <= -7) {
                    this.heightMap[x][z] = 2;
                }
                // Canal fluvial (Z entre 2 e 3 e |X| < 6): Altura Y = 0
                else if (z >= 2 && z <= 3 && Math.abs(x) < 6) {
                    this.heightMap[x][z] = 0;
                }
                // Centro da ilha (X entre -3 e 3, Z entre -3 e 3): Altura Y = 2
                else if (x >= -3 && x <= 3 && z >= -3 && z <= 3) {
                    this.heightMap[x][z] = 2;
                }
                // Bordas elevadas (|X| > 7 ou |Z| > 7): Altura Y = 3
                else if (Math.abs(x) > 7 || Math.abs(z) > 7) {
                    this.heightMap[x][z] = 3;
                }
                // Platô base
                else {
                    this.heightMap[x][z] = 2;
                }
            }
        }
    }

    buildTerrain() {`);

fs.writeFileSync('src/world_builder/hub_terrain.js', content);
