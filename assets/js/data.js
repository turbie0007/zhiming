export const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

export const STEM_ELEMENTS = ['wood', 'wood', 'fire', 'fire', 'earth', 'earth', 'metal', 'metal', 'water', 'water'];
export const BRANCH_ELEMENTS = ['water', 'earth', 'wood', 'wood', 'earth', 'fire', 'fire', 'earth', 'metal', 'metal', 'earth', 'water'];

export const ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'];
export const ELEMENT_LABEL = { wood: '木', fire: '火', earth: '土', metal: '金', water: '水' };
export const ELEMENT_META = {
  wood: { label: '木', season: '春', nature: '曲直', color: '青綠', organ: '肝膽' },
  fire: { label: '火', season: '夏', nature: '炎上', color: '赤紅', organ: '心小腸' },
  earth: { label: '土', season: '四季', nature: '稼穡', color: '黃褐', organ: '脾胃' },
  metal: { label: '金', season: '秋', nature: '從革', color: '白金', organ: '肺大腸' },
  water: { label: '水', season: '冬', nature: '潤下', color: '玄黑', organ: '腎膀胱' },
};

export const ANIMALS = ['鼠', '牛', '虎', '兔', '龍', '蛇', '馬', '羊', '猴', '雞', '狗', '豬'];

// 地支藏干：索引順序為「本氣、中氣、餘氣」
export const HIDDEN_STEMS = [
  [9], [5, 9, 7], [0, 2, 4], [1], [4, 1, 9], [2, 6, 4],
  [3, 5], [5, 3, 1], [6, 8, 4], [7], [4, 7, 3], [8, 0],
];
export const HIDDEN_WEIGHTS = [
  [1], [0.60, 0.28, 0.12], [0.60, 0.28, 0.12], [1], [0.60, 0.28, 0.12], [0.60, 0.28, 0.12],
  [0.70, 0.30], [0.60, 0.28, 0.12], [0.60, 0.28, 0.12], [1], [0.60, 0.28, 0.12], [0.70, 0.30],
];

export const CLIMATE = {
  0: { label: '仲冬', text: '水冷木寒，調候重在暖局；全局過寒時，火氣最能提神。', keys: ['fire'] },
  1: { label: '季冬', text: '濕寒未退，土凍水冷，調候同樣以火暖局為先。', keys: ['fire'] },
  2: { label: '初春', text: '餘寒未盡，木氣初生，宜火暖木、金修剪。', keys: ['fire', 'metal'] },
  3: { label: '仲春', text: '木旺而濕，調候取火泄秀、金修剪，使木不偏枯。', keys: ['fire', 'metal'] },
  4: { label: '季春', text: '土濕木盛，宜火暖土、木疏土，令氣機流通。', keys: ['fire', 'wood'] },
  5: { label: '初夏', text: '火氣漸旺，燥熱將起，以水潤局為調候主軸。', keys: ['water'] },
  6: { label: '仲夏', text: '炎熱當令，最忌燥烈，調候重在水潤。', keys: ['water'] },
  7: { label: '季夏', text: '燥土當權，水氣不足，仍以水潤土為先。', keys: ['water'] },
  8: { label: '初秋', text: '金旺氣肅，宜火煉金、水潤燥，使剛而不脆。', keys: ['fire', 'water'] },
  9: { label: '仲秋', text: '金旺而燥，調候取火煉金、水洗金，剛柔相濟。', keys: ['fire', 'water'] },
  10: { label: '季秋', text: '燥土傷金，宜水潤燥、木疏土，避免過乾。', keys: ['water', 'wood'] },
  11: { label: '初冬', text: '水寒金冷，調候以火暖局，使生機不絕。', keys: ['fire'] },
};

export const TEN_GODS = ['比肩', '劫財', '食神', '傷官', '偏財', '正財', '七殺', '正官', '偏印', '正印'];
export const TEN_GOD_SHORT = {
  比肩: '比', 劫財: '劫', 食神: '食', 傷官: '傷', 偏財: '才', 正財: '財',
  七殺: '殺', 正官: '官', 偏印: '梟', 正印: '印',
};

export const NAYIN = [
  '海中金', '爐中火', '大林木', '路旁土', '劍鋒金', '山頭火',
  '澗下水', '城頭土', '白蠟金', '楊柳木', '泉中水', '屋上土',
  '霹靂火', '松柏木', '長流水', '沙中金', '山下火', '平地木',
  '壁上土', '金箔金', '覆燈火', '天河水', '大驛土', '釵釧金',
  '桑柘木', '大溪水', '沙中土', '天上火', '石榴木', '大海水',
];

export const STAGES = ['長生', '沐浴', '冠帶', '臨官', '帝旺', '衰', '病', '死', '墓', '絕', '胎', '養'];
// [長生所在地支, 順/逆]
export const STAGE_START = [
  [11, 1], [6, -1], [2, 1], [9, -1], [2, 1],
  [9, -1], [5, 1], [0, -1], [8, 1], [3, -1],
];

export const TERM_NAMES = ['小寒', '大寒', '立春', '雨水', '驚蟄', '春分', '清明', '穀雨', '立夏', '小滿', '芒種', '夏至', '小暑', '大暑', '立秋', '處暑', '白露', '秋分', '寒露', '霜降', '立冬', '小雪', '大雪', '冬至'];
// 十二「節」→ 月支（子起）
export const JIE_MAP = [
  [0, 1], [2, 2], [4, 3], [6, 4], [8, 5], [10, 6],
  [12, 7], [14, 8], [16, 9], [18, 10], [20, 11], [22, 0],
];

export const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '冬月', '臘月'];
export const LUNAR_DAYS = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十',
];

// 1900-2100 農曆數據（每年一個 16 進制數：閏月、大小月、閏月大小）
export const LUNAR_INFO = [
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2,
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977,
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970,
  0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950,
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557,
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0,
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0,
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6,
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570,
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x055c0, 0x0ab60, 0x096d5, 0x092e0,
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5,
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930,
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530,
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45,
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0,
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0,
  0x0a2e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4,
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0,
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160,
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252,
  0x0d520,
];
export const LUNAR_MIN_YEAR = 1900;
export const LUNAR_MAX_YEAR = 2100;

export const CITIES = [
  { name: '北京', longitude: 116.41 },
  { name: '上海', longitude: 121.47 },
  { name: '廣州', longitude: 113.26 },
  { name: '深圳', longitude: 114.06 },
  { name: '天津', longitude: 117.20 },
  { name: '重慶', longitude: 106.55 },
  { name: '成都', longitude: 104.07 },
  { name: '杭州', longitude: 120.15 },
  { name: '南京', longitude: 118.80 },
  { name: '武漢', longitude: 114.31 },
  { name: '西安', longitude: 108.94 },
  { name: '長沙', longitude: 112.94 },
  { name: '鄭州', longitude: 113.63 },
  { name: '濟南', longitude: 117.00 },
  { name: '青島', longitude: 120.38 },
  { name: '瀋陽', longitude: 123.43 },
  { name: '哈爾濱', longitude: 126.53 },
  { name: '長春', longitude: 125.32 },
  { name: '石家莊', longitude: 114.51 },
  { name: '太原', longitude: 112.55 },
  { name: '呼和浩特', longitude: 111.75 },
  { name: '蘭州', longitude: 103.83 },
  { name: '西寧', longitude: 101.78 },
  { name: '銀川', longitude: 106.23 },
  { name: '烏魯木齊', longitude: 87.62 },
  { name: '拉薩', longitude: 91.14 },
  { name: '昆明', longitude: 102.83 },
  { name: '貴陽', longitude: 106.63 },
  { name: '南寧', longitude: 108.37 },
  { name: '海口', longitude: 110.20 },
  { name: '福州', longitude: 119.30 },
  { name: '南昌', longitude: 115.89 },
  { name: '合肥', longitude: 117.23 },
  { name: '臺北', longitude: 121.56 },
  { name: '香港', longitude: 114.17 },
];

export const GENDER_LABEL = { male: '男', female: '女' };
