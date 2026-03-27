// 使用 Pokemon HOME 的 3D 渲染风格图片
const IMG_BASE = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/";

const TYPE_MAP = {
    fire: "火", water: "水", grass: "草", electric: "电", flying: "飞行", 
    bug: "虫", poison: "毒", ground: "地面", psychic: "超能", ice: "冰", 
    fighting: "格斗", ghost: "幽灵", steel: "钢", dragon: "龙", fairy: "妖精", 
    normal: "一般", dark: "恶"
};

const PokemonData = [
    // 1. 飞行系
    { id: 101, pokeId: 16, name: "波波", type: "flying", tier: 1, attack: 10, defense: 8, cost: 1, next: 102, skillDesc: "基础飞行宝可梦" },
    { id: 102, pokeId: 17, name: "比比鸟", type: "flying", tier: 2, attack: 15, defense: 12, cost: 2, next: 103, skillDesc: "10%概率造成额外5点伤害" },
    { id: 103, pokeId: 18, name: "比雕", type: "flying", tier: 3, attack: 22, defense: 18, cost: 3, next: null, skillDesc: "20%概率对相邻敌人造成10点溅射" },
    
    // 2. 水系
    { id: 201, pokeId: 7, name: "杰尼龟", type: "water", tier: 1, attack: 8, defense: 12, cost: 1, next: 202, skillDesc: "防御时10%减免5伤" },
    { id: 202, pokeId: 8, name: "卡咪龟", type: "water", tier: 2, attack: 12, defense: 18, cost: 2, next: 203, skillDesc: "防御时20%恢复3点血量" },
    { id: 203, pokeId: 9, name: "水箭龟", type: "water", tier: 3, attack: 18, defense: 25, cost: 3, next: null, skillDesc: "每回合回5血,30%减10伤" },
    
    // 3. 火系
    { id: 301, pokeId: 4, name: "小火龙", type: "fire", tier: 1, attack: 12, defense: 7, cost: 1, next: 302, skillDesc: "10%造成每回合3点灼伤" },
    { id: 302, pokeId: 5, name: "火恐龙", type: "fire", tier: 2, attack: 18, defense: 11, cost: 2, next: 303, skillDesc: "20%造成每回合5点灼伤" },
    { id: 303, pokeId: 6, name: "喷火龙", type: "fire", tier: 3, attack: 28, defense: 18, cost: 3, next: 304, skillDesc: "30%喷射火球造成20点额外伤害" },
    { id: 304, pokeId: 10034, name: "喷火龙mega", type: "fire", tier: 4, attack: 40, defense: 25, cost: 4, next: null, skillDesc: "40%概率攻击双目标,伤害+30" },

    // 4. 草系
    { id: 401, pokeId: 1, name: "妙蛙种子", type: "grass", tier: 1, attack: 9, defense: 10, cost: 1, next: 402, skillDesc: "回合结束恢复自身2点血量" },
    { id: 402, pokeId: 2, name: "妙蛙草", type: "grass", tier: 2, attack: 14, defense: 15, cost: 2, next: 403, skillDesc: "回合结束恢复自身及相邻3点血" },
    { id: 403, pokeId: 3, name: "妙蛙花", type: "grass", tier: 3, attack: 20, defense: 22, cost: 3, next: 404, skillDesc: "回合结束全员恢复4点血量" },
    { id: 404, pokeId: 10033, name: "妙蛙花mega", type: "grass", tier: 4, attack: 28, defense: 30, cost: 4, next: null, skillDesc: "全员回6血,30%触发剧毒伤害" },

    // 5. 电系
    { id: 501, pokeId: 25, name: "皮卡丘", type: "electric", tier: 1, attack: 11, defense: 8, cost: 1, next: 502, skillDesc: "15%概率电击造成额外8伤" },
    { id: 502, pokeId: 26, name: "雷丘", type: "electric", tier: 2, attack: 18, defense: 13, cost: 2, next: null, skillDesc: "25%额外15伤,10%概率麻痹" },

    // 6. 虫系
    { id: 601, pokeId: 10, name: "绿毛虫", type: "bug", tier: 1, attack: 7, defense: 6, cost: 1, next: 602, skillDesc: "极易抽取的合成素材" },
    { id: 602, pokeId: 11, name: "铁甲蛹", type: "bug", tier: 2, attack: 8, defense: 15, cost: 2, next: 603, skillDesc: "5%概率临时提升10点攻击" },
    { id: 603, pokeId: 12, name: "巴大蝶", type: "bug", tier: 3, attack: 16, defense: 12, cost: 3, next: null, skillDesc: "25%概率使对手睡眠无法攻击" },

    // 7. 毒系
    { id: 701, pokeId: 88, name: "臭泥", type: "poison", tier: 1, attack: 8, defense: 9, cost: 1, next: 702, skillDesc: "10%概率剧毒造成持续伤害" },
    { id: 702, pokeId: 89, name: "臭臭泥", type: "poison", tier: 2, attack: 13, defense: 16, cost: 2, next: null, skillDesc: "20%概率感染相邻敌人造成伤害" },

    // 8. 地面系
    { id: 801, pokeId: 74, name: "小拳石", type: "ground", tier: 1, attack: 10, defense: 11, cost: 1, next: 802, skillDesc: "防御时10%减免4伤" },
    { id: 802, pokeId: 75, name: "隆隆石", type: "ground", tier: 2, attack: 16, defense: 18, cost: 2, next: 803, skillDesc: "15%概率额外造成10伤害" },
    { id: 803, pokeId: 76, name: "隆隆岩", type: "ground", tier: 3, attack: 24, defense: 26, cost: 3, next: 804, skillDesc: "30%减免12伤,提升血量上限" },
    { id: 804, pokeId: 76, name: "隆隆岩mega", type: "ground", tier: 4, attack: 32, defense: 35, cost: 4, next: null, skillDesc: "25%全体震击,防御大幅提升" },

    // 9. 超能系
    { id: 901, pokeId: 150, name: "超梦", type: "psychic", tier: 3, attack: 25, defense: 20, cost: 3, next: 902, skillDesc: "30%额外20伤,无视5防御" },
    { id: 902, pokeId: 10043, name: "超梦mega", type: "psychic", tier: 4, attack: 38, defense: 28, cost: 4, next: null, skillDesc: "40%精神爆破造成40点巨额伤害" },

    // 10. 冰系
    { id: 1001, pokeId: 582, name: "迷你冰", type: "ice", tier: 1, attack: 8, defense: 10, cost: 1, next: 1002, skillDesc: "10%概率冻结对手" },
    { id: 1002, pokeId: 471, name: "冰伊布", type: "ice", tier: 2, attack: 15, defense: 16, cost: 2, next: null, skillDesc: "20%概率大范围冰封" },

    // 11. 格斗系
    { id: 1101, pokeId: 66, name: "腕力", type: "fighting", tier: 1, attack: 12, defense: 9, cost: 1, next: 1102, skillDesc: "10%暴击率" },
    { id: 1102, pokeId: 67, name: "豪力", type: "fighting", tier: 2, attack: 18, defense: 14, cost: 2, next: 1103, skillDesc: "15%暴击且额外5伤" },
    { id: 1103, pokeId: 68, name: "怪力", type: "fighting", tier: 3, attack: 26, defense: 20, cost: 3, next: 1104, skillDesc: "25%暴击且额外10伤" },
    { id: 1104, pokeId: 68, name: "怪力mega", type: "fighting", tier: 4, attack: 36, defense: 28, cost: 4, next: null, skillDesc: "35%概率触发毁灭性暴击" },

    // 12. 幽灵系
    { id: 1201, pokeId: 92, name: "鬼斯", type: "ghost", tier: 1, attack: 9, defense: 7, cost: 1, next: 1202, skillDesc: "10%无视3点防御" },
    { id: 1202, pokeId: 93, name: "鬼斯通", type: "ghost", tier: 2, attack: 15, defense: 12, cost: 2, next: 1203, skillDesc: "20%概率偷取对手攻击力" },
    { id: 1203, pokeId: 94, name: "耿鬼", type: "ghost", tier: 3, attack: 22, defense: 18, cost: 3, next: 1204, skillDesc: "30%暗影突袭额外18伤" },
    { id: 1204, pokeId: 10038, name: "耿鬼mega", type: "ghost", tier: 4, attack: 32, defense: 25, cost: 4, next: null, skillDesc: "40%概率攻击双人并附带闪避" },

    // 13. 钢系
    { id: 1301, pokeId: 95, name: "大岩蛇", type: "steel", tier: 2, attack: 16, defense: 20, cost: 2, next: 1302, skillDesc: "20%概率减免8伤" },
    { id: 1302, pokeId: 208, name: "大钢蛇", type: "steel", tier: 3, attack: 24, defense: 28, cost: 3, next: null, skillDesc: "30%概率反弹50%伤害" },

    // 14. 龙系
    { id: 1401, pokeId: 147, name: "迷你龙", type: "dragon", tier: 1, attack: 10, defense: 9, cost: 1, next: 1402, skillDesc: "每回合永久提升2攻击" },
    { id: 1402, pokeId: 148, name: "哈克龙", type: "dragon", tier: 2, attack: 16, defense: 15, cost: 2, next: 1403, skillDesc: "每回合提升3攻3防" },
    { id: 1403, pokeId: 149, name: "快龙", type: "dragon", tier: 3, attack: 25, defense: 22, cost: 3, next: 1404, skillDesc: "25%概率龙之吐息25伤" },
    { id: 1404, pokeId: 149, name: "快龙mega", type: "dragon", tier: 4, attack: 38, defense: 30, cost: 4, next: null, skillDesc: "全屏龙之怒,每回合持续进化" },

    // 15. 妖精系
    { id: 1501, pokeId: 39, name: "胖丁", type: "fairy", tier: 1, attack: 7, defense: 11, cost: 1, next: 1502, skillDesc: "回合末相邻友军回3血" },
    { id: 1502, pokeId: 40, name: "胖可丁", type: "fairy", tier: 2, attack: 12, defense: 17, cost: 2, next: null, skillDesc: "全员回4血,附带概率催眠" },

    // 17. 恶系
    { id: 1701, pokeId: 198, name: "黑暗鸦", type: "dark", tier: 1, attack: 11, defense: 8, cost: 1, next: 1702, skillDesc: "10%概率造成破甲效果" },
    { id: 1702, pokeId: 430, name: "乌鸦头头", type: "dark", tier: 2, attack: 17, defense: 14, cost: 2, next: null, skillDesc: "20%概率造成高额破甲" },

    // 18. 传说级
    { id: 1801, pokeId: 384, name: "烈空坐", type: "dragon", tier: 3, attack: 26, defense: 22, cost: 3, next: 1802, skillDesc: "神兽级攻击力" },
    { id: 1802, pokeId: 10045, name: "烈空坐mega", type: "dragon", tier: 4, attack: 40, defense: 30, cost: 4, next: null, skillDesc: "天空霸主: 画龙点睛" },

    // 19. 传说级
    { id: 1901, pokeId: 248, name: "班基拉斯", type: "ground", tier: 3, attack: 27, defense: 24, cost: 3, next: 1902, skillDesc: "准神级面板" },
    { id: 1902, pokeId: 10037, name: "班基拉斯mega", type: "ground", tier: 4, attack: 38, defense: 32, cost: 4, next: null, skillDesc: "沙暴君王: 大地震动" },

    // 20. 传说级
    { id: 2001, pokeId: 145, name: "闪电鸟", type: "electric", tier: 3, attack: 23, defense: 18, cost: 3, next: null, skillDesc: "全屏落雷打击" }
];

PokemonData.forEach(p => {
    p.maxHp = p.defense * 2 + p.tier * 20; // 调整血量公式，让战斗稍微持久一点
    p.image = `${IMG_BASE}${p.pokeId}.png`;
    p.typeName = TYPE_MAP[p.type] || "未知";
});
