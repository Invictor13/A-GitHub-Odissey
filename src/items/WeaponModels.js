import { Dagger } from './weapons/daggers/Dagger.js';
import { Sword1H } from './weapons/swords_1h/Sword1H.js';
import { Sword2H } from './weapons/swords_2h/Sword2H.js';
import { BastardSword } from './weapons/bastard_swords/BastardSword.js';
import { Club } from './weapons/clubs/Club.js';
import { Hammer } from './weapons/hammers/Hammer.js';
import { Pickaxe } from './weapons/pickaxes/Pickaxe.js';
import { MagicStaff } from './weapons/magic_staffs/MagicStaff.js';
import { Gauntlet } from './weapons/gauntlets/Gauntlet.js';
import { Spear } from './weapons/spears/Spear.js';
import { Shield } from './shields/Shield.js';

export class WeaponModels {
    // Legacy API wrappers
    static createKnife() { return Dagger.create(); }
    static createSword1H() { return Sword1H.create(); }
    static createSword2H() { return Sword2H.create(); }
    static createClub() { return Club.create(); }
    static createSpear() { return Spear.create(); }
    static createShield() { return Shield.create(); }

    // New weapon wrappers
    static createBastardSword() { return BastardSword.create(); }
    static createHammer() { return Hammer.create(); }
    static createPickaxe() { return Pickaxe.create(); }
    static createMagicStaff() { return MagicStaff.create(); }
    static createGauntlet() { return Gauntlet.create(); }
}
