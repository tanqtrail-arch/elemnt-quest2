// ===== セーブデータ管理 =====
const Storage = {
  KEY: 'element-quest-save',

  // デフォルトのセーブデータ
  defaultData() {
    return {
      // 獲得した元素カード（元素番号のSet → 配列で保存）
      obtainedCards: [],
      // ステージクリア情報 { stageId: { cleared: bool, correctCount: int } }
      stages: {},
      // 118番ボーナス獲得済み
      bonusObtained: false
    };
  },

  // セーブデータ読み込み
  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.defaultData();
      const data = JSON.parse(raw);
      // マイグレーション: 不足キーを補完
      const def = this.defaultData();
      return { ...def, ...data };
    } catch {
      return this.defaultData();
    }
  },

  // セーブデータ保存
  save(data) {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(data));
    } catch {
      // Storage full - silently fail
    }
  },

  // カードを獲得
  addCard(elementNumber) {
    const data = this.load();
    if (!data.obtainedCards.includes(elementNumber)) {
      data.obtainedCards.push(elementNumber);
      this.save(data);
    }
    return data;
  },

  // カードを持っているか
  hasCard(elementNumber) {
    const data = this.load();
    return data.obtainedCards.includes(elementNumber);
  },

  // ステージクリア情報を保存
  saveStageClear(stageId, correctCount) {
    const data = this.load();
    const prev = data.stages[stageId];
    // 既存記録より良い場合のみ更新
    if (!prev || correctCount > prev.correctCount) {
      data.stages[stageId] = { cleared: true, correctCount };
    }
    this.save(data);
    return data;
  },

  // ステージがアンロックされているか
  isStageUnlocked(stageId) {
    if (stageId === 1) return true;
    const data = this.load();
    const prevStage = data.stages[stageId - 1];
    return prevStage && prevStage.cleared;
  },

  // ステージクリア済みか
  isStageClear(stageId) {
    const data = this.load();
    return data.stages[stageId] && data.stages[stageId].cleared;
  },

  // ステージの正答数（後方互換）
  getStageCorrectCount(stageId) {
    const data = this.load();
    return (data.stages[stageId] && data.stages[stageId].correctCount) || 0;
  },

  // ステージの星数を取得
  getStageStars(stageId) {
    const data = this.load();
    return (data.stages[stageId] && data.stages[stageId].correctCount) || 0;
  },

  // 全ステージクリア判定
  isAllStagesCleared() {
    const data = this.load();
    for (let i = 1; i <= 39; i++) {
      if (!data.stages[i] || !data.stages[i].cleared) return false;
    }
    return true;
  },

  // 全問正解判定（全ステージで9/9）
  isAllPerfect() {
    const data = this.load();
    for (let i = 1; i <= 39; i++) {
      if (!data.stages[i] || data.stages[i].correctCount < 9) return false;
    }
    return true;
  },

  // 118番ボーナス獲得
  setBonus() {
    const data = this.load();
    data.bonusObtained = true;
    this.save(data);
  },

  // 獲得カード数
  getCardCount() {
    const data = this.load();
    let count = data.obtainedCards.length;
    if (data.bonusObtained) count++; // 118番含む
    return count;
  },

  // データリセット
  reset() {
    localStorage.removeItem(this.KEY);
  }
};
