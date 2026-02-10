// ===== 全117元素 + ボーナス118番 =====
// 39ステージ × 3元素 = 117元素
// 各元素に3問のヒント（ヒント1=難、ヒント2=中、ヒント3=簡単）

// カテゴリごとの色マップ
const CATEGORY_COLORS = {
  "非金属": "#00bcd4",
  "貴ガス": "#9c27b0",
  "アルカリ金属": "#ff5722",
  "アルカリ土類金属": "#ff9800",
  "遷移金属": "#607d8b",
  "半金属": "#4caf50",
  "ハロゲン": "#cddc39",
  "ランタノイド": "#e91e63",
  "アクチノイド": "#76ff03",
  "卓金属": "#795548"
};

// ===== 元素データを結合 =====
// elements-part1.js, elements-part2.js, elements-part3.js で定義された
// ELEMENTS_PART1, ELEMENTS_PART2, ELEMENTS_PART3 を結合

const ALL_ELEMENTS = [...ELEMENTS_PART1, ...ELEMENTS_PART2, ...ELEMENTS_PART3].map(el => ({
  ...el,
  color: CATEGORY_COLORS[el.category] || "#6c63ff"
}));

// 118番 オガネソン（ボーナスカード）
const BONUS_ELEMENT = {
  number: 118,
  symbol: "Og",
  name: "オガネソン",
  nameEn: "Oganesson",
  category: "貴ガス",
  color: "#e040fb",
  hints: []
};

// ===== 39ステージ構成 =====
// 原子番号順に3元素ずつ
const STAGE_NAMES = [
  "はじまりの元素",        // 1: H, He, Li
  "軽い仲間たち",          // 2: Be, B, C
  "空気と生命",            // 3: N, O, F
  "光と炎",                // 4: Ne, Na, Mg
  "大地の元素",            // 5: Al, Si, P
  "反応と色",              // 6: S, Cl, Ar
  "金属の入口",            // 7: K, Ca, Sc
  "強靭な金属",            // 8: Ti, V, Cr
  "鉄の時代",              // 9: Mn, Fe, Co
  "実用金属",              // 10: Ni, Cu, Zn
  "半金属の世界",          // 11: Ga, Ge, As
  "海の元素",              // 12: Se, Br, Kr
  "アルカリの炎",          // 13: Rb, Sr, Y
  "耐熱の戦士",            // 14: Zr, Nb, Mo
  "希少な輝き",            // 15: Tc, Ru, Rh
  "貴金属I",               // 16: Pd, Ag, Cd
  "身近な卓金属",          // 17: In, Sn, Sb
  "異界の元素",            // 18: Te, I, Xe
  "重いアルカリ",          // 19: Cs, Ba, La
  "ランタノイドI",         // 20: Ce, Pr, Nd
  "ランタノイドII",        // 21: Pm, Sm, Eu
  "ランタノイドIII",       // 22: Gd, Tb, Dy
  "ランタノイドIV",        // 23: Ho, Er, Tm
  "ランタノイドV",         // 24: Yb, Lu, Hf
  "超耐熱金属",            // 25: Ta, W, Re
  "最も重い金属",          // 26: Os, Ir, Pt
  "貴金属II",              // 27: Au, Hg, Tl
  "重い卓金属",            // 28: Pb, Bi, Po
  "放射性希ガス",          // 29: At, Rn, Fr
  "アクチノイドI",         // 30: Ra, Ac, Th
  "核の元素",              // 31: Pa, U, Np
  "超ウラン元素I",         // 32: Pu, Am, Cm
  "超ウラン元素II",        // 33: Bk, Cf, Es
  "人名の元素I",           // 34: Fm, Md, No
  "人名の元素II",          // 35: Lr, Rf, Db
  "超重元素I",             // 36: Sg, Bh, Hs
  "超重元素II",            // 37: Mt, Ds, Rg
  "最新の元素I",           // 38: Cn, Nh, Fl
  "最新の元素II"           // 39: Mc, Lv, Ts
];

const STAGES = [];
for (let i = 0; i < 39; i++) {
  const startNum = i * 3; // ALL_ELEMENTS配列のインデックス
  STAGES.push({
    id: i + 1,
    name: STAGE_NAMES[i],
    elementNumbers: [
      ALL_ELEMENTS[startNum].number,
      ALL_ELEMENTS[startNum + 1].number,
      ALL_ELEMENTS[startNum + 2].number
    ]
  });
}
