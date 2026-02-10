// ===== クイズエンジン =====
const Quiz = {
  currentStage: null,
  currentElements: [],   // このステージの3元素
  currentElementIndex: 0, // 何番目の元素か (0-2)
  currentHintIndex: 0,    // 何番目のヒントか (0-2)
  results: [],            // このステージの結果 [{elementNumber, correct, hintsUsed}]
  choices: [],            // 現在の選択肢

  // ステージ開始
  startStage(stageId) {
    this.currentStage = stageId;
    this.currentElementIndex = 0;
    this.currentHintIndex = 0;
    this.results = [];

    // ステージに対応する3元素を取得
    const stage = STAGES[stageId - 1];
    this.currentElements = stage.elementNumbers.map(num => {
      return ALL_ELEMENTS.find(e => e.number === num);
    });

    this.startElement();
  },

  // 元素のクイズ開始
  startElement() {
    this.currentHintIndex = 0;
    this.generateChoices();
  },

  // 選択肢を生成（4択: 正解1 + ダミー3）
  generateChoices() {
    const correctElement = this.currentElements[this.currentElementIndex];
    const choices = [correctElement];

    // ダミー選択肢を同じカテゴリ優先で選ぶ
    const otherElements = ALL_ELEMENTS.filter(e => e.number !== correctElement.number);
    const sameCategory = otherElements.filter(e => e.category === correctElement.category);
    const diffCategory = otherElements.filter(e => e.category !== correctElement.category);

    // 同カテゴリから1-2個、残りを別カテゴリから
    const shuffledSame = this.shuffle(sameCategory);
    const shuffledDiff = this.shuffle(diffCategory);

    let dummyPool = [...shuffledSame.slice(0, 2), ...shuffledDiff];
    dummyPool = this.shuffle(dummyPool);

    for (let i = 0; i < 3 && i < dummyPool.length; i++) {
      choices.push(dummyPool[i]);
    }

    this.choices = this.shuffle(choices);
  },

  // 現在のヒントを取得
  getCurrentHints() {
    const element = this.currentElements[this.currentElementIndex];
    return element.hints.slice(0, this.currentHintIndex + 1);
  },

  // 現在の元素
  getCurrentElement() {
    return this.currentElements[this.currentElementIndex];
  },

  // 回答チェック
  answer(selectedNumber) {
    const correct = this.currentElements[this.currentElementIndex];
    const isCorrect = selectedNumber === correct.number;

    if (isCorrect) {
      // 正解 → この元素の結果を記録
      this.results.push({
        elementNumber: correct.number,
        correct: true,
        hintsUsed: this.currentHintIndex + 1
      });
      return { correct: true, element: correct, hintsUsed: this.currentHintIndex + 1 };
    } else {
      // 不正解
      if (this.currentHintIndex < 2) {
        // 次のヒントへ
        this.currentHintIndex++;
        this.generateChoices(); // 選択肢をシャッフルし直す
        return { correct: false, nextHint: true, hintIndex: this.currentHintIndex };
      } else {
        // 3問目も不正解 → この元素は失敗
        this.results.push({
          elementNumber: correct.number,
          correct: false,
          hintsUsed: 3
        });
        return { correct: false, nextHint: false, element: correct };
      }
    }
  },

  // 次の元素へ進む（trueならまだ続く、falseなら終了）
  nextElement() {
    this.currentElementIndex++;
    if (this.currentElementIndex >= 3) {
      return false; // ステージ終了
    }
    this.startElement();
    return true;
  },

  // ステージ結果を取得
  getStageResult() {
    const correctCount = this.results.filter(r => r.correct).length;
    const totalQuestions = this.results.reduce((sum, r) => sum + r.hintsUsed, 0);
    return {
      stageId: this.currentStage,
      results: this.results,
      correctElements: correctCount,
      totalElements: 3,
      totalQuestions: totalQuestions,
      isPerfect: correctCount === 3
    };
  },

  // Fisher-Yates シャッフル
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};
