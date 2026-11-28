import {
  STEMS, BRANCHES, STEM_ELEMENTS, BRANCH_ELEMENTS, ELEMENTS, ELEMENT_LABEL,
  ANIMALS, HIDDEN_STEMS, HIDDEN_WEIGHTS, NAYIN, STAGES, STAGE_START,
  JIE_MAP, CITIES, CLIMATE,
} from './data.js?v=20261156';
import {
  mod, makeTs, tsParts, formatDate, formatLunar, solarToLunar,
  lunarToSolar, findJieBefore, findJieAfter, lichunTs, addMonths,
  lunarYearLabel, dayOfYear, lunarMonthDays, leapDays, leapMonth,
  getSolarTermTs, getSolarTermName,
} from './astro.js?v=20261156';

const DAY_MS = 86400000;

// 立春起算的十二節：寅月到丑月
const JIE_MONTHS = [
  [2, 2], [4, 3], [6, 4], [8, 5], [10, 6], [12, 7],
  [14, 8], [16, 9], [18, 10], [20, 11], [22, 0], [0, 1],
];
const GENERATES = { wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood' };
const CONTROLS = { wood: 'earth', fire: 'metal', earth: 'water', metal: 'wood', water: 'fire' };
const GOD_GROUP = {
  比肩: '比劫', 劫財: '比劫', 食神: '食傷', 傷官: '食傷',
  偏財: '財星', 正財: '財星', 七殺: '官殺', 正官: '官殺',
  偏印: '印星', 正印: '印星',
};

const GROUP_SS = {
  taohua: { shen: 9, yin: 3, si: 6, hai: 0 },
  yima: { shen: 2, yin: 8, si: 11, hai: 5 },
  huagai: { shen: 4, yin: 10, si: 1, hai: 7 },
  jiangxing: { shen: 0, yin: 6, si: 9, hai: 3 },
  jiesha: { shen: 5, yin: 11, si: 2, hai: 8 },
  zaisha: { shen: 6, yin: 0, si: 3, hai: 9 },
  wangshen: { shen: 11, yin: 5, si: 8, hai: 2 },
};
const TIANYI = [[1, 7], [0, 8], [11, 9], [11, 9], [1, 7], [0, 8], [1, 7], [2, 6], [3, 5], [3, 5]];
const TAIJI = [[0, 6], [0, 6], [3, 9], [3, 9], [1, 4, 7, 10], [1, 4, 7, 10], [2, 11], [2, 11], [5, 8], [5, 8]];
const TIANCHU = [5, 6, 5, 6, 8, 9, 11, 0, 2, 3];
const GUOYIN = [10, 11, 1, 2, 1, 2, 4, 5, 7, 8];
const WENCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];
const YANGREN = [3, 2, 6, 5, 6, 5, 9, 8, 0, 11];
const LUZHI = [2, 3, 5, 6, 5, 6, 8, 9, 11, 0];
const HONGLUAN = [3, 2, 1, 0, 11, 10, 9, 8, 7, 6, 5, 4];
const YUEDE = { yin: 2, shen: 8, hai: 0, si: 6 };
const YUEDEHE = { yin: 7, shen: 3, hai: 5, si: 1 };
// 天德貴人／天德合：以月支起，目標或為天干或為地支（['s', 干索引] / ['b', 支索引]）
const TIANDE = [['b', 5], ['s', 6], ['s', 3], ['b', 8], ['s', 8], ['s', 7], ['b', 11], ['s', 0], ['s', 9], ['b', 2], ['s', 2], ['s', 1]];
const TIANDEHE = [['b', 8], ['s', 1], ['s', 8], ['b', 5], ['s', 3], ['s', 2], ['b', 2], ['s', 5], ['s', 4], ['b', 11], ['s', 7], ['s', 6]];
const JINYU = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
const FUXING = [[2, 0], [1], [2, 0], [11], [8], [7], [6], [5], [4], [1]];
const HONGYAN = [6, 6, 2, 7, 4, 4, 2, 8, 7, 8];
const GUCHEN = [2, 2, 5, 5, 5, 8, 8, 8, 11, 11, 11, 2];
const GUASU = [10, 10, 1, 1, 1, 4, 4, 4, 7, 7, 7, 10];
const KUIGANG = [[6, 4], [8, 4], [4, 10], [6, 10]];
const YINYANG_CHACUO = [[2, 0], [3, 1], [4, 2], [7, 3], [8, 4], [9, 5], [2, 6], [3, 7], [4, 8], [7, 9], [8, 10], [9, 11]];
const SIFEI = { spring: [[6, 8], [7, 9]], summer: [[8, 0], [9, 11]], autumn: [[0, 2], [1, 3]], winter: [[2, 6], [3, 5]] };
const TIANSHE = { spring: [4, 2], summer: [0, 6], autumn: [4, 8], winter: [0, 0] };

function seasonOf(monthBranch) {
  if ([2, 3, 4].includes(monthBranch)) return 'spring';
  if ([5, 6, 7].includes(monthBranch)) return 'summer';
  if ([8, 9, 10].includes(monthBranch)) return 'autumn';
  return 'winter';
}

const STEM_HE = [[0, 5], [1, 6], [2, 7], [3, 8], [4, 9]];
const STEM_HE_ELEMENT = ['earth', 'metal', 'water', 'wood', 'fire'];
const STEM_CHONG = [[0, 6], [1, 7], [2, 8], [3, 9]];
const BRANCH_HE = [
  { pair: [0, 1], element: 'earth' },
  { pair: [2, 11], element: 'wood' },
  { pair: [3, 10], element: 'fire' },
  { pair: [4, 9], element: 'metal' },
  { pair: [5, 8], element: 'water' },
  { pair: [6, 7], element: 'earth' },
];
const BRANCH_CHONG = [[0, 6], [1, 7], [2, 8], [3, 9], [4, 10], [5, 11]];
const BRANCH_HAI = [[0, 7], [1, 6], [2, 5], [3, 4], [8, 11], [9, 10]];
const BRANCH_PO = [[0, 9], [1, 4], [2, 11], [3, 6], [5, 8], [7, 10]];
const BRANCH_SELF_XING = [4, 6, 9, 11];
const BRANCH_SAN_XING = [[2, 5, 8], [1, 7, 10]];
const BRANCH_SAN_HE = [
  { branches: [8, 0, 4], element: 'water' },
  { branches: [11, 3, 7], element: 'wood' },
  { branches: [2, 6, 10], element: 'fire' },
  { branches: [5, 9, 1], element: 'metal' },
];
const BRANCH_AN_HE = [
  { pair: [2, 1], element: 'earth' },
  { pair: [3, 8], element: 'metal' },
  { pair: [6, 11], label: [11, 6], element: 'wood' },
  { pair: [5, 9], element: 'water' },
  { pair: [0, 5], element: 'fire' },
];

function triadGroup(branch) {
  if ([8, 0, 4].includes(branch)) return 'shen';
  if ([2, 6, 10].includes(branch)) return 'yin';
  if ([5, 9, 1].includes(branch)) return 'si';
  return 'hai';
}

export function elementOfStem(i) {
  return STEM_ELEMENTS[mod(i, 10)];
}
export function elementOfBranch(i) {
  return BRANCH_ELEMENTS[mod(i, 12)];
}
export function polarityOfStem(i) {
  return i % 2 === 0 ? '陽' : '陰';
}

export function getTenGod(dayStem, otherStem) {
  const de = STEM_ELEMENTS[dayStem];
  const oe = STEM_ELEMENTS[otherStem];
  const same = dayStem % 2 === otherStem % 2;
  if (oe === de) return same ? '比肩' : '劫財';
  if (oe === GENERATES[de]) return same ? '食神' : '傷官';
  if (oe === CONTROLS[de]) return same ? '偏財' : '正財';
  if (CONTROLS[oe] === de) return same ? '七殺' : '正官';
  return same ? '偏印' : '正印';
}

export function getStage(dayStem, branch) {
  const [start, dir] = STAGE_START[dayStem];
  const offset = dir === 1 ? mod(branch - start, 12) : mod(start - branch, 12);
  return STAGES[offset];
}

function sexagenaryIndex(stem, branch) {
  for (let i = 0; i < 60; i++) {
    if (i % 10 === stem && i % 12 === branch) return i;
  }
  return 0;
}

function monthStemFor(yearStem, branch) {
  return mod(yearStem * 2 + 2 + mod(branch - 2, 12), 10);
}

function xunKong(index) {
  const start = index - (index % 10);
  return [mod(start + 10, 12), mod(start + 11, 12)];
}

function seasonMultiplier(element, monthElement) {
  if (element === monthElement) return 1.35;
  if (GENERATES[monthElement] === element) return 1.12;
  if (GENERATES[element] === monthElement) return 0.92;
  if (CONTROLS[element] === monthElement) return 0.75;
  return 0.62;
}

const HIDDEN_LABEL = ['本氣', '中氣', '餘氣'];

function confidenceText(value) {
  return value >= 0.8 ? '高' : value >= 0.55 ? '中' : '低';
}

function patternFor(god, dayStem, monthBranch) {
  if (god === '比肩' || god === '劫財') {
    const stage = getStage(dayStem, monthBranch);
    if (stage === '臨官') return { name: '建祿格', god: '比肩', group: '比劫' };
    if (stage === '帝旺' && dayStem % 2 === 0) return { name: '羊刃格', god: '劫財', group: '比劫' };
    return { name: '比劫格', god, group: '比劫' };
  }
  return { name: `${god}格`, god, group: GOD_GROUP[god] };
}

function specialPattern(dayStem, monthBranch) {
  const stage = getStage(dayStem, monthBranch);
  if (stage === '臨官') {
    return {
      name: '建祿格', god: '比肩', group: '比劫', source: '月令',
      reason: `月支${BRANCHES[monthBranch]}為日主臨官之地，祿神當令，取建祿格。`,
      confidence: 0.9, confidenceText: '高',
    };
  }
  if (stage === '帝旺' && dayStem % 2 === 0) {
    return {
      name: '羊刃格', god: '劫財', group: '比劫', source: '月令',
      reason: `月支${BRANCHES[monthBranch]}為日主帝旺之地，羊刃當令，取羊刃格。`,
      confidence: 0.88, confidenceText: '高',
    };
  }
  return null;
}

function analyzeStructure({
  dayStem, monthBranch, monthStem, yearStem, hourStem,
  monthHidden, strength, supportRatio, dayElement, resourceElement, elementRows, timeUnknown,
}) {
  const branchChar = BRANCHES[monthBranch];
  const visible = [
    { stem: yearStem, label: '年干', weight: 0.05 },
    { stem: monthStem, label: '月干', weight: 0.08 },
  ];
  if (hourStem != null) visible.push({ stem: hourStem, label: '時干', weight: 0.04 });

  const regular = [];
  monthHidden.forEach((hidden, i) => {
    const positions = visible.filter((row) => row.stem === hidden.stem);
    if (!positions.length) return;
    const pattern = patternFor(hidden.god, dayStem, monthBranch);
    const base = [0.82, 0.62, 0.45][i] ?? 0.42;
    const bonus = Math.max(...positions.map((row) => row.weight)) + (positions.length > 1 ? 0.02 : 0);
    const confidence = Math.min(0.92, base + bonus);
    regular.push({
      ...pattern,
      source: '透干',
      hiddenIndex: i,
      hiddenChar: hidden.char,
      hiddenLabel: HIDDEN_LABEL[i] || '藏干',
      positions: positions.map((row) => row.label),
      confidence,
      confidenceText: confidenceText(confidence),
      reason: `月支${branchChar}藏${hidden.char}（${hidden.god}），透於${positions.map((row) => row.label).join('、')}，取${pattern.name}。`,
    });
  });
  regular.sort((a, b) => a.hiddenIndex - b.hiddenIndex || b.confidence - a.confidence);

  const special = specialPattern(dayStem, monthBranch);
  let candidates;
  if (special) {
    candidates = [special, ...regular.filter((row) => row.name !== special.name)];
  } else if (regular.length) {
    candidates = regular;
  } else {
    const hidden = monthHidden[0];
    const pattern = patternFor(hidden.god, dayStem, monthBranch);
    candidates = [{
      ...pattern,
      source: '本氣',
      hiddenIndex: 0,
      hiddenChar: hidden.char,
      hiddenLabel: '本氣',
      positions: [],
      confidence: 0.55,
      confidenceText: '中',
      reason: `月支${branchChar}本氣為${hidden.char}（${hidden.god}），未見於年、月、時干，暫以本氣取格。`,
    }];
  }

  const unique = new Map();
  for (const candidate of candidates) {
    const existing = unique.get(candidate.name);
    if (!existing || candidate.confidence > existing.confidence) unique.set(candidate.name, candidate);
  }
  const patternCandidates = [...unique.values()].map((row, i) => ({
    ...row, role: i === 0 ? '主格' : '兼格',
  }));
  const primary = patternCandidates[0];

  const outputElement = GENERATES[dayElement];
  const wealthElement = CONTROLS[dayElement];
  const officerElement = ELEMENTS.find((element) => CONTROLS[element] === dayElement);
  const rows = new Map(elementRows.map((row) => [row.key, row]));
  const percentOf = (element) => rows.get(element)?.percent ?? 0;

  const useful = new Map();
  const addUseful = (element, method, reason, base) => {
    if (!element) return;
    const percent = percentOf(element);
    const presence = percent >= 12 ? 0.03 : percent >= 5 ? 0 : -0.12;
    const confidence = Math.min(0.92, Math.max(0.35, base + presence));
    const existing = useful.get(element);
    if (existing) {
      if (!existing.methods.includes(method)) existing.methods.push(method);
      if (reason && !existing.reasons.includes(reason)) existing.reasons.push(reason);
      if (confidence > existing.confidence) {
        existing.confidence = confidence;
        existing.confidenceText = confidenceText(confidence);
        existing.reason = reason;
      }
      return;
    }
    useful.set(element, {
      element,
      label: ELEMENT_LABEL[element],
      percent,
      methods: [method],
      reasons: reason ? [reason] : [],
      reason: reason || '',
      confidence,
      confidenceText: confidenceText(confidence),
    });
  };

  const bias = supportRatio - 0.5;
  const weakish = strength === '身弱' || (strength === '中和' && bias < -0.015);
  const strongish = strength === '身強' || (strength === '中和' && bias > 0.015);
  const supportPct = Math.round(supportRatio * 100);

  if (weakish) {
    addUseful(resourceElement, '扶抑', `日主同黨 ${supportPct}%，以${ELEMENT_LABEL[resourceElement]}印星生扶。`, 0.8);
    addUseful(dayElement, '扶抑', '同類比劫幫身，分擔財官壓力。', 0.68);
  } else if (strongish) {
    addUseful(outputElement, '扶抑', `日主偏旺，以${ELEMENT_LABEL[outputElement]}食傷泄秀。`, 0.78);
    addUseful(wealthElement, '扶抑', `以${ELEMENT_LABEL[wealthElement]}財星耗身，承接食傷之生。`, 0.72);
    addUseful(officerElement, '扶抑', `以${ELEMENT_LABEL[officerElement]}官殺制身，收斂旺氣。`, 0.68);
  } else {
    addUseful(resourceElement, '扶抑', '強弱接近，以印星保持生機。', 0.66);
    addUseful(outputElement, '扶抑', '強弱接近，以食傷保持流通。', 0.66);
  }

  if (strongish) {
    if (primary.group === '官殺') addUseful(wealthElement, '格局配合', '財星生官，令官殺有源。', 0.76);
    if (primary.group === '財星') addUseful(outputElement, '格局配合', '食傷生財，令財有源。', 0.76);
    if (primary.group === '印星') addUseful(wealthElement, '格局配合', '財星制印，避免印旺礙泄。', 0.74);
    if (primary.group === '食傷') addUseful(wealthElement, '格局配合', '食傷生財，才華落於實用。', 0.75);
    if (primary.group === '比劫') addUseful(officerElement, '格局配合', '官殺制比劫，收斂過旺之勢。', 0.74);
  } else if (weakish) {
    if (primary.group === '官殺') addUseful(resourceElement, '格局配合', '印星化殺生身，先解壓力。', 0.8);
    if (primary.group === '財星') addUseful(dayElement, '格局配合', '比劫幫身，方能任財。', 0.72);
    if (primary.group === '食傷') addUseful(resourceElement, '格局配合', '印星制食傷，守住日主。', 0.78);
    if (primary.group === '印星') addUseful(dayElement, '格局配合', '比劫幫身，承接印蔭。', 0.72);
    if (primary.group === '比劫') addUseful(resourceElement, '格局配合', '印星生身，補足根氣。', 0.76);
  }

  const [first, second] = [...elementRows].sort((a, b) => b.score - a.score);
  if (first && second && first.percent >= 18 && second.percent >= 18) {
    let mediator = null;
    let opposing = null;
    if (CONTROLS[first.key] === second.key) {
      mediator = GENERATES[first.key];
      opposing = `${first.label}${first.percent}%與${second.label}${second.percent}%相剋`;
    } else if (CONTROLS[second.key] === first.key) {
      mediator = GENERATES[second.key];
      opposing = `${second.label}${second.percent}%與${first.label}${first.percent}%相剋`;
    }
    if (mediator) addUseful(mediator, '通關', `${opposing}，取${ELEMENT_LABEL[mediator]}通關。`, 0.76);
  }

  const climate = CLIMATE[monthBranch];
  if (climate) {
    climate.keys.forEach((element, i) => {
      addUseful(element, '調候', `生於${branchChar}月（${climate.label}），以${ELEMENT_LABEL[element]}調候。`, i === 0 ? 0.7 : 0.64);
    });
  }

  const strongest = elementRows[0];
  const controller = strongest ? ELEMENTS.find((element) => CONTROLS[element] === strongest.key) : null;
  if (strongest && controller && strongest.percent >= 40 && percentOf(controller) < 10) {
    addUseful(controller, '病藥', `${strongest.label}${strongest.percent}%過旺為病，取${ELEMENT_LABEL[controller]}制之。`, 0.72);
  }

  const usefulCandidates = [...useful.values()].sort((a, b) => b.confidence - a.confidence);
  const usefulPrimary = usefulCandidates[0] || {
    element: resourceElement,
    label: ELEMENT_LABEL[resourceElement],
    percent: percentOf(resourceElement),
    methods: ['扶抑'],
    reasons: ['以五行平衡為參。'],
    reason: '以五行平衡為參。',
    confidence: 0.5,
    confidenceText: '中',
  };

  const avoid = new Map();
  const addAvoid = (element, reason) => {
    if (!element || useful.has(element) || avoid.has(element)) return;
    avoid.set(element, {
      element,
      label: ELEMENT_LABEL[element],
      percent: percentOf(element),
      reason,
    });
  };
  if (weakish) {
    addAvoid(outputElement, '日主偏弱，不宜再受泄耗。');
    addAvoid(wealthElement, '日主偏弱，不宜再受泄耗。');
    addAvoid(officerElement, '日主偏弱，不宜再受泄耗。');
  } else if (strongish) {
    addAvoid(resourceElement, '日主已旺，再逢生扶易過。');
    addAvoid(dayElement, '日主已旺，再逢生扶易過。');
  }

  const notes = [
    '格局以月令為主，先看透干，再取本氣；未計從格、化氣格等特殊格局。',
    '用神以扶抑、通關、調候、病藥加權，屬教學性簡化模型。',
  ];
  if (timeUnknown) notes.push('時柱未知，透干與用神判斷可能受影響。');

  return {
    primary,
    candidates: patternCandidates.slice(0, 4),
    useful: {
      primary: usefulPrimary,
      candidates: usefulCandidates.slice(0, 4),
      avoid: [...avoid.values()].slice(0, 3),
    },
    notes,
    summary: `取${primary.name}；用神以${usefulPrimary.label}為主（${usefulPrimary.methods.join('、')}）。`,
  };
}

function shenshaFor(pillar, ctx) {
  const labels = [];
  const { dayStem, yearStem, yearBranch, dayBranch, monthBranch } = ctx;
  const b = pillar.branch;
  const stems = yearStem === dayStem ? [dayStem] : [dayStem, yearStem];
  const push = (label) => { if (!labels.includes(label)) labels.push(label); };

  if (stems.some((s) => TIANYI[s].includes(b))) push('天乙貴人');
  if (stems.some((s) => TAIJI[s].includes(b))) push('太極貴人');
  if (stems.some((s) => TIANCHU[s] === b)) push('天廚貴人');
  if (stems.some((s) => GUOYIN[s] === b)) push('國印貴人');
  if (stems.some((s) => WENCHANG[s] === b)) push('文昌貴人');
  if (stems.some((s) => YANGREN[s] === b)) push('羊刃');
  if (stems.some((s) => LUZHI[s] === b)) push('祿神');

  const groups = [yearBranch, dayBranch].map(triadGroup);
  for (const [key, label] of [['taohua', '桃花'], ['yima', '驛馬'], ['huagai', '華蓋'], ['jiangxing', '將星']]) {
    if (groups.some((g) => GROUP_SS[key][g] === b)) push(label);
  }

  if (HONGLUAN[yearBranch] === b) push('紅鸞');
  if (mod(HONGLUAN[yearBranch] + 6, 12) === b) push('天喜');
  if (YUEDE[triadGroup(monthBranch)] === pillar.stem) push('月德貴人');
  if (mod(yearBranch - 2, 12) === b) push('吊客');

  const tiande = TIANDE[monthBranch];
  if (tiande && ((tiande[0] === 's' && pillar.stem === tiande[1]) || (tiande[0] === 'b' && b === tiande[1]))) push('天德貴人');
  const tiandehe = TIANDEHE[monthBranch];
  if (tiandehe && ((tiandehe[0] === 's' && pillar.stem === tiandehe[1]) || (tiandehe[0] === 'b' && b === tiandehe[1]))) push('天德合');
  if (YUEDEHE[triadGroup(monthBranch)] === pillar.stem) push('月德合');
  if (stems.some((s) => JINYU[s] === b)) push('金輿');
  if (stems.some((s) => FUXING[s].includes(b))) push('福星貴人');
  if (mod(monthBranch - 1, 12) === b) push('天醫');
  if (stems.some((s) => STAGE_START[s][0] === b)) push('學堂');
  if (stems.some((s) => mod(LUZHI[s] + 1, 12) === b)) push('詞館');

  for (const [key, label] of [['jiesha', '劫煞'], ['zaisha', '災煞'], ['wangshen', '亡神']]) {
    if (groups.some((g) => GROUP_SS[key][g] === b)) push(label);
  }
  if (GUCHEN[yearBranch] === b) push('孤辰');
  if (GUASU[yearBranch] === b) push('寡宿');
  if (mod(yearBranch + 2, 12) === b) push('喪門');
  if (mod(yearBranch + 3, 12) === b) push('勾煞');
  if (mod(yearBranch - 3, 12) === b) push('絞煞');
  if (stems.some((s) => HONGYAN[s] === b)) push('紅艷煞');

  if (pillar.isDay) {
    if (KUIGANG.some(([s, br]) => s === pillar.stem && br === b)) push('魁罡');
    if (YINYANG_CHACUO.some(([s, br]) => s === pillar.stem && br === b)) push('陰陽差錯');
    const season = seasonOf(monthBranch);
    if (SIFEI[season].some(([s, br]) => s === pillar.stem && br === b)) push('四廢');
    const ts = TIANSHE[season];
    if (ts[0] === pillar.stem && ts[1] === b) push('天赦');
  }

  if (ctx.dayKong.includes(b)) push('空亡');
  else if (ctx.yearKong.includes(b)) push('年空');

  return labels;
}

const hourCache = new WeakMap();

export function hourPeriod(chart, dayStem, hourBranch) {
  let byDay = hourCache.get(chart);
  if (!byDay) {
    byDay = new Map();
    hourCache.set(chart, byDay);
  }
  let byBranch = byDay.get(dayStem);
  if (!byBranch) {
    byBranch = new Map();
    byDay.set(dayStem, byBranch);
  }
  const cached = byBranch.get(hourBranch);
  if (cached) return cached;
  const ctx = natalCtx(chart);
  const stem = mod((dayStem % 5) * 2 + hourBranch, 10);
  const result = {
    branch: hourBranch,
    stem,
    stemChar: STEMS[stem],
    branchChar: BRANCHES[hourBranch],
    tenGod: getTenGod(ctx.dayStem, stem),
    shensha: shenshaFor({ stem, branch: hourBranch }, ctx),
  };
  byBranch.set(hourBranch, result);
  return result;
}

function natalCtx(chart) {
  const year = chart.pillars.year;
  const month = chart.pillars.month;
  const day = chart.pillars.day;
  return {
    dayStem: day.stem,
    yearStem: year.stem,
    yearBranch: year.branch,
    dayBranch: day.branch,
    monthBranch: month.branch,
    dayKong: xunKong(day.index),
    yearKong: xunKong(year.index),
  };
}

const periodCache = new WeakMap();

export function periodTable(chart, year) {
  let byYear = periodCache.get(chart);
  if (!byYear) {
    byYear = new Map();
    periodCache.set(chart, byYear);
  }
  if (byYear.has(year)) return byYear.get(year);

  const ctx = natalCtx(chart);
  const dayStem = ctx.dayStem;
  const yearIdx = mod(year - 4, 60);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  const yearInfo = {
    year,
    index: yearIdx,
    stem: yearStem,
    branch: yearBranch,
    stemChar: STEMS[yearStem],
    branchChar: BRANCHES[yearBranch],
    tenGod: getTenGod(dayStem, yearStem),
    stage: getStage(dayStem, yearBranch),
    shensha: shenshaFor({ stem: yearStem, branch: yearBranch }, ctx),
  };

  const starts = JIE_MONTHS.map(([termIndex], i) => getSolarTermTs(i === 11 ? year + 1 : year, termIndex));
  const months = JIE_MONTHS.map(([termIndex, branch], i) => {
    const startTs = starts[i];
    const nextStart = starts[i + 1] ?? getSolarTermTs(year + 1, 2);
    const stem = monthStemFor(yearStem, branch);
    const days = [];
    if (startTs != null && nextStart != null) {
      const end = Math.floor(nextStart / DAY_MS) * DAY_MS;
      for (let ts = Math.floor(startTs / DAY_MS) * DAY_MS; ts < end; ts += DAY_MS) {
        const parts = tsParts(ts);
        const idx = mod(Math.floor(ts / DAY_MS) + 25567 + 10, 60);
        days.push({
          ts,
          y: parts.y,
          m: parts.m,
          d: parts.d,
          stem: idx % 10,
          branch: idx % 12,
          stemChar: STEMS[idx % 10],
          branchChar: BRANCHES[idx % 12],
          tenGod: getTenGod(dayStem, idx % 10),
          shensha: shenshaFor({ stem: idx % 10, branch: idx % 12 }, ctx),
        });
      }
    }
    return {
      index: i,
      name: getSolarTermName(termIndex),
      startTs,
      endTs: nextStart,
      stem,
      branch,
      stemChar: STEMS[stem],
      branchChar: BRANCHES[branch],
      tenGod: getTenGod(dayStem, stem),
      shensha: shenshaFor({ stem, branch }, ctx),
      days,
    };
  });

  const table = { year: yearInfo, months };
  byYear.set(year, table);
  return table;
}

function makePillar(idx, dayStem, ctx, isDay = false) {
  const stem = idx % 10;
  const branch = idx % 12;
  const hidden = HIDDEN_STEMS[branch].map((s, i) => ({
    stem: s,
    char: STEMS[s],
    element: STEM_ELEMENTS[s],
    god: getTenGod(dayStem, s),
    weight: HIDDEN_WEIGHTS[branch][i],
  }));
  return {
    index: idx,
    stem,
    branch,
    stemChar: STEMS[stem],
    branchChar: BRANCHES[branch],
    stemElement: STEM_ELEMENTS[stem],
    branchElement: BRANCH_ELEMENTS[branch],
    nayin: NAYIN[Math.floor(idx / 2)],
    stage: getStage(dayStem, branch),
    tenGod: isDay ? '日主' : getTenGod(dayStem, stem),
    hidden,
    shensha: ctx ? shenshaFor({ stem, branch, isDay }, ctx) : [],
  };
}

const STEM_KIND_ORDER = { he: 0, chong: 1 };
const BRANCH_KIND_ORDER = { he: 0, sanhe: 1, xing: 2, chong: 3, hai: 4, anhe: 5, po: 6 };

function samePair(pair, a, b) {
  return (pair[0] === a && pair[1] === b) || (pair[0] === b && pair[1] === a);
}

export function analyzeInteractions(items) {
  const stemMap = new Map();
  const branchMap = new Map();

  const add = (map, text, kind, element, sources) => {
    const existing = map.get(text);
    if (existing) {
      for (const source of sources) {
        if (!existing.sources.includes(source)) existing.sources.push(source);
      }
      return;
    }
    map.set(text, { text, kind, element, sources: [...new Set(sources)] });
  };

  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i];
      const b = items[j];
      const sources = [a.source, b.source];

      STEM_HE.forEach((pair, k) => {
        if (samePair(pair, a.stem, b.stem)) {
          add(stemMap, `${STEMS[pair[0]]}${STEMS[pair[1]]}合${ELEMENT_LABEL[STEM_HE_ELEMENT[k]]}`, 'he', STEM_HE_ELEMENT[k], sources);
        }
      });
      const stemChong = STEM_CHONG.find((pair) => samePair(pair, a.stem, b.stem));
      if (stemChong) {
        add(stemMap, `${STEMS[stemChong[0]]}${STEMS[stemChong[1]]}相沖`, 'chong', null, sources);
      }

      const he = BRANCH_HE.find((x) => samePair(x.pair, a.branch, b.branch));
      if (he) add(branchMap, `${BRANCHES[he.pair[0]]}${BRANCHES[he.pair[1]]}合化${ELEMENT_LABEL[he.element]}`, 'he', he.element, sources);

      const chong = BRANCH_CHONG.find((pair) => samePair(pair, a.branch, b.branch));
      if (chong) add(branchMap, `${BRANCHES[chong[0]]}${BRANCHES[chong[1]]}相沖`, 'chong', null, sources);

      const hai = BRANCH_HAI.find((pair) => samePair(pair, a.branch, b.branch));
      if (hai) add(branchMap, `${BRANCHES[hai[0]]}${BRANCHES[hai[1]]}相害`, 'hai', null, sources);

      const po = BRANCH_PO.find((pair) => samePair(pair, a.branch, b.branch));
      if (po) add(branchMap, `${BRANCHES[po[0]]}${BRANCHES[po[1]]}相破`, 'po', null, sources);

      const anhe = BRANCH_AN_HE.find((x) => samePair(x.pair, a.branch, b.branch));
      if (anhe) {
        const label = anhe.label || anhe.pair;
        add(branchMap, `${BRANCHES[label[0]]}${BRANCHES[label[1]]}暗合${ELEMENT_LABEL[anhe.element]}`, 'anhe', anhe.element, sources);
      }

      if (a.branch === b.branch && BRANCH_SELF_XING.includes(a.branch)) {
        add(branchMap, `${BRANCHES[a.branch]}${BRANCHES[a.branch]}自刑`, 'xing', null, sources);
      }
    }
  }

  for (const group of BRANCH_SAN_HE) {
    const matches = group.branches.map((br) => items.filter((it) => it.branch === br));
    if (matches.every((list) => list.length)) {
      const sources = [...new Set(matches.flat().map((it) => it.source))];
      add(branchMap, `${group.branches.map((br) => BRANCHES[br]).join('')}三合${ELEMENT_LABEL[group.element]}局`, 'sanhe', group.element, sources);
    }
  }

  for (const triple of BRANCH_SAN_XING) {
    const present = triple.map((br) => items.some((it) => it.branch === br));
    const sources = [...new Set(items.filter((it) => triple.includes(it.branch)).map((it) => it.source))];
    if (present.every(Boolean)) {
      add(branchMap, `${triple.map((br) => BRANCHES[br]).join('')}三刑`, 'xing', null, sources);
    } else {
      for (let x = 0; x < triple.length; x++) {
        for (let y = x + 1; y < triple.length; y++) {
          if (present[x] && present[y]) {
            add(branchMap, `${BRANCHES[triple[x]]}${BRANCHES[triple[y]]}相刑`, 'xing', null, sources);
          }
        }
      }
    }
  }

  if (items.some((it) => it.branch === 0) && items.some((it) => it.branch === 3)) {
    const sources = [...new Set(items.filter((it) => it.branch === 0 || it.branch === 3).map((it) => it.source))];
    add(branchMap, '子卯相刑', 'xing', null, sources);
  }

  return {
    stems: [...stemMap.values()].sort((a, b) => STEM_KIND_ORDER[a.kind] - STEM_KIND_ORDER[b.kind]),
    branches: [...branchMap.values()].sort((a, b) => BRANCH_KIND_ORDER[a.kind] - BRANCH_KIND_ORDER[b.kind]),
  };
}

const HARM_KINDS = new Set(['chong', 'xing', 'hai', 'po']);

export function interactionSummary(context, target) {
  const all = analyzeInteractions([...context, target]);
  const related = [...all.stems, ...all.branches].filter((item) => item.sources.includes(target.source));
  const kinds = [...new Set(related.map((item) => item.kind))]
    .sort((a, b) => (HARM_KINDS.has(b) ? 1 : 0) - (HARM_KINDS.has(a) ? 1 : 0));
  return { kinds, texts: related.map((item) => item.text), harm: related.some((item) => HARM_KINDS.has(item.kind)) };
}

function formatAge(decYears) {
  const years = Math.floor(decYears + 1e-9);
  const months = Math.floor((decYears - years) * 12 + 1e-9);
  const days = Math.round((((decYears - years) * 12) - months) * 30);
  if (days >= 30) return `${years}歲${months + 1}個月`;
  return months ? `${years}歲${months}個月` : `${years}歲${days ? `${days}天` : ''}`;
}

export function cityLongitude(name) {
  return CITIES.find((c) => c.name === name)?.longitude ?? 116.41;
}

export function computeChart(input) {
  const warnings = [];
  let solar;
  if (input.calendar === 'lunar') {
    solar = lunarToSolar(input.lunar.y, input.lunar.m, input.lunar.d, input.lunar.isLeap);
  } else {
    solar = { ...input.solar };
  }

  const timeUnknown = !input.time;
  const h = timeUnknown ? 12 : input.time.h;
  const min = timeUnknown ? 0 : input.time.min;
  const clockTs = makeTs(solar.y, solar.m, solar.d, h, min);
  let ts = clockTs;

  let solarCorrection = null;
  if (input.trueSolar && !timeUnknown) {
    const lon = cityLongitude(input.city || '北京');
    const doy = dayOfYear(clockTs);
    const B = (2 * Math.PI * (doy - 81)) / 364;
    const eot = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);
    const delta = 4 * (lon - 120) + eot;
    ts = ts + Math.round(delta * 60000);
    solarCorrection = {
      city: input.city || '北京',
      longitude: lon,
      minutes: delta,
      rounded: Math.round(delta),
      ts,
      text: formatDate(ts),
    };
  }

  const calcParts = tsParts(ts);
  const clockParts = tsParts(clockTs);
  const lunar = solarToLunar(solar.y, solar.m, solar.d);

  // 年、月柱由節氣絕對時刻決定，真太陽時只作用於日、時柱
  let yearForPillar = clockParts.y;
  const lichun = lichunTs(clockParts.y);
  if (lichun != null && clockTs < lichun) yearForPillar -= 1;
  const yearIdx = mod(yearForPillar - 4, 60);
  const yearStem = yearIdx % 10;
  const yearBranch = yearIdx % 12;

  // Month pillar (節 boundary)
  const prevJie = findJieBefore(clockTs);
  const nextJie = findJieAfter(clockTs);
  if (!prevJie) throw new Error('出生時間超出節氣數據範圍');
  const monthBranch = prevJie.branch;
  const monthStem = monthStemFor(yearStem, monthBranch);
  const monthIdx = sexagenaryIndex(monthStem, monthBranch);

  // Day pillar (23:00 子時換日)
  let dayTs = ts;
  if (!timeUnknown && calcParts.h === 23 && input.lateZi !== false) {
    dayTs += DAY_MS;
  }
  const dayIdx = mod(Math.floor(dayTs / DAY_MS) + 25567 + 10, 60);
  const dayStem = dayIdx % 10;
  const dayBranch = dayIdx % 12;

  // Hour pillar
  let hourBranch = null;
  let hourIdx = null;
  if (!timeUnknown) {
    hourBranch = Math.floor(((calcParts.h + 1) % 24) / 2);
    const hourStem = mod((dayStem % 5) * 2 + hourBranch, 10);
    hourIdx = sexagenaryIndex(hourStem, hourBranch);
  }

  const dayKong = xunKong(dayIdx);
  const yearKong = xunKong(yearIdx);
  const ctx = { dayStem, yearStem, yearBranch, dayBranch, monthBranch, dayKong, yearKong };

  const pillars = {
    year: makePillar(yearIdx, dayStem, ctx),
    month: makePillar(monthIdx, dayStem, ctx),
    day: makePillar(dayIdx, dayStem, ctx, true),
    hour: hourIdx != null ? makePillar(hourIdx, dayStem, ctx) : null,
  };

  // Five-element balance
  const scores = Object.fromEntries(ELEMENTS.map((e) => [e, 0]));
  const monthElement = BRANCH_ELEMENTS[monthBranch];
  const stemList = [yearStem, monthStem, dayStem];
  if (!timeUnknown) stemList.push(pillars.hour.stem);
  for (const s of stemList) {
    scores[STEM_ELEMENTS[s]] += 1 * seasonMultiplier(STEM_ELEMENTS[s], monthElement);
  }
  const branchEntries = [
    { branch: yearBranch, weight: 1.0 },
    { branch: monthBranch, weight: 1.6 },
    { branch: dayBranch, weight: 1.2 },
  ];
  if (!timeUnknown) branchEntries.push({ branch: hourBranch, weight: 1.0 });
  for (const { branch, weight } of branchEntries) {
    HIDDEN_STEMS[branch].forEach((s, i) => {
      const el = STEM_ELEMENTS[s];
      scores[el] += weight * HIDDEN_WEIGHTS[branch][i] * seasonMultiplier(el, monthElement);
    });
  }
  const totalScore = ELEMENTS.reduce((sum, e) => sum + scores[e], 0);
  const elementRows = ELEMENTS.map((e) => ({
    key: e,
    label: ELEMENT_LABEL[e],
    score: scores[e],
    percent: (scores[e] / totalScore) * 100,
  })).sort((a, b) => b.percent - a.percent);
  const floors = elementRows.map((row) => Math.floor(row.percent));
  let remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const fractions = elementRows
    .map((row, i) => ({ i, frac: row.percent - Math.floor(row.percent) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < remainder; k++) floors[fractions[k % fractions.length].i] += 1;
  elementRows.forEach((row, i) => { row.percent = floors[i]; });

  // Ten-god distribution
  const godCounts = {};
  const godStems = [yearStem, monthStem];
  if (!timeUnknown) godStems.push(pillars.hour.stem);
  for (const s of godStems) {
    const g = getTenGod(dayStem, s);
    godCounts[g] = (godCounts[g] || 0) + 1;
  }
  for (const { branch, weight } of branchEntries) {
    HIDDEN_STEMS[branch].forEach((s, i) => {
      const g = getTenGod(dayStem, s);
      godCounts[g] = (godCounts[g] || 0) + weight * HIDDEN_WEIGHTS[branch][i];
    });
  }
  const godTotal = Object.values(godCounts).reduce((a, b) => a + b, 0) || 1;
  const tenGods = Object.entries(godCounts)
    .map(([name, value]) => ({ name, group: GOD_GROUP[name], value, percent: Math.round((value / godTotal) * 100) }))
    .sort((a, b) => b.value - a.value);
  const godPercentSum = tenGods.reduce((sum, row) => sum + row.percent, 0);
  if (tenGods.length && godPercentSum !== 100) tenGods[0].percent += 100 - godPercentSum;

  // Day master strength
  const dayElement = STEM_ELEMENTS[dayStem];
  const resourceElement = ELEMENTS.find((e) => GENERATES[e] === dayElement);
  const support = scores[dayElement] + scores[resourceElement];
  const supportRatio = support / totalScore;
  const strength = supportRatio >= 0.55 ? '身強' : supportRatio <= 0.45 ? '身弱' : '中和';
  const officerElement = ELEMENTS.find((e) => CONTROLS[e] === dayElement);
  let favorable;
  if (strength === '身強') {
    favorable = [GENERATES[dayElement], CONTROLS[dayElement], officerElement];
  } else if (strength === '身弱') {
    favorable = [resourceElement, dayElement];
  } else {
    favorable = [resourceElement, GENERATES[dayElement]];
  }
  const favorableRows = [...new Set(favorable)].map((e) => ({
    key: e,
    label: ELEMENT_LABEL[e],
    score: scores[e],
    percent: elementRows.find((r) => r.key === e)?.percent ?? 0,
  }));

  // Luck cycles
  const yearStemPolarity = yearStem % 2 === 0 ? '陽' : '陰';
  const forward = (yearStemPolarity === '陽') === (input.gender === 'male');
  const targetJie = forward ? nextJie : prevJie;
  if (!targetJie) throw new Error('無法確定起運節氣');
  const diffDays = Math.abs(targetJie.ts - clockTs) / DAY_MS;
  const startAgeYears = diffDays / 3;
  const totalMonths = diffDays * 4;
  const startYears = Math.floor(totalMonths / 12);
  const startMonths = Math.floor(totalMonths % 12);
  const startDays = Math.round((((totalMonths % 12) % 1) * 30));
  const jiaoyunTs = addMonths(clockTs, startAgeYears * 12);
  const direction = forward ? 1 : -1;

  const steps = [];
  const nowParts = beijingNowParts();
  for (let i = 0; i < 10; i++) {
    const idx = mod(monthIdx + direction * (i + 1), 60);
    const age = startAgeYears + i * 10;
    const startTs = addMonths(clockTs, age * 12);
    const startYear = tsParts(startTs).y;
    const p = makePillar(idx, dayStem, ctx);
    const years = [];
    for (let j = 0; j < 10; j++) {
      const y = startYear + j;
      const yIdx = mod(y - 4, 60);
      years.push({
        year: y,
        index: yIdx,
        stem: yIdx % 10,
        branch: yIdx % 12,
        stemChar: STEMS[yIdx % 10],
        branchChar: BRANCHES[yIdx % 12],
        tenGod: getTenGod(dayStem, yIdx % 10),
        stage: getStage(dayStem, yIdx % 12),
        shensha: shenshaFor({ stem: yIdx % 10, branch: yIdx % 12 }, ctx),
        isCurrent: y === nowParts.y,
      });
    }
    steps.push({
      ...p,
      startAge: age,
      ageLabel: formatAge(age),
      startTs,
      startYear,
      years,
    });
  }
  steps.forEach((step, i) => {
    const endTs = (i + 1 < steps.length ? steps[i + 1].startTs : addMonths(step.startTs, 120)) - DAY_MS;
    step.startText = formatDate(step.startTs, false);
    step.endText = formatDate(endTs, false);
  });

  // Palaces
  const monthOrdinal = mod(monthBranch - 2, 12) + 1;
  let ming = null;
  let shen = null;
  if (!timeUnknown) {
    const mingBranch = mod(1 + monthOrdinal - hourBranch, 12);
    const shenBranch = mod(1 + monthOrdinal + hourBranch, 12);
    ming = {
      stem: monthStemFor(yearStem, mingBranch),
      branch: mingBranch,
    };
    shen = {
      stem: monthStemFor(yearStem, shenBranch),
      branch: shenBranch,
    };
  }
  const tai = { stem: mod(monthStem + 1, 10), branch: mod(monthBranch + 3, 12) };
  for (const p of [ming, shen, tai]) {
    if (!p) continue;
    p.stemChar = STEMS[p.stem];
    p.branchChar = BRANCHES[p.branch];
    p.tenGod = getTenGod(dayStem, p.stem);
    p.nayin = NAYIN[Math.floor(sexagenaryIndex(p.stem, p.branch) / 2)];
    p.stage = getStage(dayStem, p.branch);
  }

  // Current Beijing year / month / day for the period stars
  const nowTs = makeTs(nowParts.y, nowParts.m, nowParts.d, nowParts.h, nowParts.min);
  const nowLichun = lichunTs(nowParts.y);
  const nowYear = nowLichun != null && nowTs < nowLichun ? nowParts.y - 1 : nowParts.y;
  const nowYearIdx = mod(nowYear - 4, 60);
  const nowYearStem = nowYearIdx % 10;
  const nowPrevJie = findJieBefore(nowTs);
  const nowNextJie = findJieAfter(nowTs);
  const nowMonthBranch = nowPrevJie ? nowPrevJie.branch : 11;
  const nowMonthStem = monthStemFor(nowYearStem, nowMonthBranch);
  const nowDayTs = nowParts.h === 23 && input.lateZi !== false ? nowTs + DAY_MS : nowTs;
  const nowDayIdx = mod(Math.floor(nowDayTs / DAY_MS) + 25567 + 10, 60);
  const nowDayStem = nowDayIdx % 10;
  const nowDayBranch = nowDayIdx % 12;

  let currentLuckIndex = -1;
  for (let i = 0; i < steps.length; i++) {
    const end = i + 1 < steps.length ? steps[i + 1].startTs : addMonths(steps[i].startTs, 120);
    if (nowTs >= steps[i].startTs && nowTs < end) {
      currentLuckIndex = i;
      break;
    }
  }

  const current = {
    ts: nowTs,
    dateText: `${nowParts.y}年${nowParts.m}月${nowParts.d}日`,
    timeText: `${String(nowParts.h).padStart(2, '0')}:${String(nowParts.min).padStart(2, '0')}`,
    luckIndex: currentLuckIndex,
    year: {
      year: nowYear,
      index: nowYearIdx,
      stem: nowYearStem,
      branch: nowYearIdx % 12,
      stemChar: STEMS[nowYearStem],
      branchChar: BRANCHES[nowYearIdx % 12],
      tenGod: getTenGod(dayStem, nowYearStem),
      stage: getStage(dayStem, nowYearIdx % 12),
      shensha: shenshaFor({ stem: nowYearStem, branch: nowYearIdx % 12 }, ctx),
    },
    month: {
      stem: nowMonthStem,
      branch: nowMonthBranch,
      stemChar: STEMS[nowMonthStem],
      branchChar: BRANCHES[nowMonthBranch],
      tenGod: getTenGod(dayStem, nowMonthStem),
      shensha: shenshaFor({ stem: nowMonthStem, branch: nowMonthBranch }, ctx),
      jie: nowPrevJie ? nowPrevJie.name : '',
      nextJie: nowNextJie ? nowNextJie.name : '',
    },
    day: {
      stem: nowDayStem,
      branch: nowDayBranch,
      stemChar: STEMS[nowDayStem],
      branchChar: BRANCHES[nowDayBranch],
      tenGod: getTenGod(dayStem, nowDayStem),
      shensha: shenshaFor({ stem: nowDayStem, branch: nowDayBranch }, ctx),
    },
  };

  const prevJieDays = (clockTs - prevJie.ts) / DAY_MS;
  const nextJieDays = (nextJie.ts - clockTs) / DAY_MS;
  if (timeUnknown) warnings.push('時辰未知：時柱、命宮、身宮已略去，起運時間按正午估算。');

  const elementStrongest = elementRows[0];
  const elementWeakest = [...elementRows].reverse().find((r) => r.percent > 0) || elementRows[elementRows.length - 1];
  const strengthText = strength === '身強'
    ? '日主得令得助，氣勢偏旺，宜泄、宜剋。'
    : strength === '身弱'
      ? '日主受制，根氣偏弱，宜生扶、宜比助。'
      : '日主強弱相宜，五行較為流通，取用須結合大運流年。';

  const summary = {
    dayMaster: `日主${STEMS[dayStem]}${ELEMENT_LABEL[dayElement]}，生於${BRANCHES[monthBranch]}月（${prevJie.name}後${prevJieDays.toFixed(1)}天），${strength}。`,
    elements: `五行之中，${elementStrongest.label}${elementStrongest.percent}%最旺，${elementWeakest.label}${elementWeakest.percent}%偏弱。`,
    strengthText,
    favorableNote: strength === '中和'
      ? '命局接近平衡，以下僅列流通之助，不作斷語。'
      : `以五行平衡為參，喜${favorableRows.map((r) => r.label).join('、')}。`,
  };

  const structure = analyzeStructure({
    dayStem,
    monthBranch,
    monthStem,
    yearStem,
    hourStem: pillars.hour ? pillars.hour.stem : null,
    monthHidden: pillars.month.hidden,
    strength,
    supportRatio,
    dayElement,
    resourceElement,
    elementRows,
    timeUnknown,
  });

  return {
    input,
    solarDate: { ...solar, h, min },
    lunar,
    lunarText: formatLunar(lunar.year, lunar.month, lunar.day, lunar.isLeap),
    lunarYearText: lunarYearLabel(lunar.year),
    calcDate: formatDate(ts),
    solarCorrection,
    timeUnknown,
    animal: ANIMALS[yearBranch],
    yearPillarYear: yearForPillar,
    pillars,
    pillarList: [pillars.year, pillars.month, pillars.day, pillars.hour].filter(Boolean),
    dayMaster: {
      stem: dayStem,
      char: STEMS[dayStem],
      branch: dayBranch,
      branchChar: BRANCHES[dayBranch],
      element: dayElement,
      elementLabel: ELEMENT_LABEL[dayElement],
      polarity: polarityOfStem(dayStem),
      strength,
      supportRatio,
      score: support,
      totalScore,
      resourceElement,
      favorable: favorableRows,
    },
    elements: elementRows,
    tenGods,
    shensha: {
      year: pillars.year.shensha,
      month: pillars.month.shensha,
      day: pillars.day.shensha,
      hour: pillars.hour ? pillars.hour.shensha : [],
    },
    kongwang: { day: dayKong.map((b) => BRANCHES[b]), year: yearKong.map((b) => BRANCHES[b]) },
    monthInfo: {
      branch: monthBranch,
      branchChar: BRANCHES[monthBranch],
      element: monthElement,
      prevJie: { name: prevJie.name, days: prevJieDays, text: formatDate(prevJie.ts) },
      nextJie: { name: nextJie.name, days: nextJieDays, text: formatDate(nextJie.ts) },
      ordinal: monthOrdinal,
    },
    luck: {
      forward,
      direction,
      directionLabel: `${yearStemPolarity}年${input.gender === 'male' ? '男' : '女'}${forward ? '順行' : '逆行'}`,
      startAgeYears,
      start: { years: startYears, months: startMonths, days: startDays },
      startLabel: `${startYears}歲${startMonths}個月${startDays ? `${startDays}天` : ''}`,
      jiaoyunTs,
      jiaoyunText: formatDate(jiaoyunTs, false),
      diffDays,
      targetJie: targetJie.name,
      steps,
    },
    current,
    palaces: { ming, shen, tai },
    summary,
    structure,
    warnings,
    fourPillarsText: [pillars.year, pillars.month, pillars.day, pillars.hour]
      .filter(Boolean)
      .map((p) => `${p.stemChar}${p.branchChar}`)
      .join(' '),
  };
}

export function beijingNowParts() {
  const ts = Date.now() + 8 * 3600000;
  const d = new Date(ts);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), min: d.getUTCMinutes() };
}

export function todayOverview() {
  const now = beijingNowParts();
  const ts = makeTs(now.y, now.m, now.d, now.h, now.min);
  const lichun = lichunTs(now.y);
  const yearForPillar = lichun != null && ts < lichun ? now.y - 1 : now.y;
  const yIdx = mod(yearForPillar - 4, 60);
  const dayIdx = mod(Math.floor(ts / DAY_MS) + 25567 + 10, 60);
  const prevJie = findJieBefore(ts);
  const nextJie = findJieAfter(ts);
  return {
    dateText: `${now.y}年${now.m}月${now.d}日`,
    yearText: `${STEMS[yIdx % 10]}${BRANCHES[yIdx % 12]}年`,
    dayText: `${STEMS[dayIdx % 10]}${BRANCHES[dayIdx % 12]}日`,
    animal: ANIMALS[yIdx % 12],
    prevJie,
    nextJie,
    lunar: solarToLunar(now.y, now.m, now.d),
  };
}

export { lunarMonthDays, leapDays, leapMonth };
