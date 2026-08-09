import { LeatherHelmet } from './armors/helmets/leather/LeatherHelmet.js';
import { IronHelmet } from './armors/helmets/iron/IronHelmet.js';
import { SteelHelmet } from './armors/helmets/steel/SteelHelmet.js';
import { GoldHelmet } from './armors/helmets/gold/GoldHelmet.js';
import { DiamondHelmet } from './armors/helmets/diamond/DiamondHelmet.js';

export class ArmorModels {
    static createHelmet(type) {
        switch (type) {
            case 'leather':
                return LeatherHelmet.create();
            case 'iron':
                return IronHelmet.create();
            case 'steel':
                return SteelHelmet.create();
            case 'gold':
                return GoldHelmet.create();
            case 'diamond':
                return DiamondHelmet.create();
            case 'none':
            default:
                return null;
        }
    }
}
