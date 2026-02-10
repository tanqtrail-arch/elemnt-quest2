// ===== クイズエンジン =====
const Quiz = {
  currentStage: null,
  currentElements: [],     // このステージの3元素
  currentElementIndex: 0,  // 何番目の元素か (0-2)
  currentHintIndex: 0,     // Q1のヒント段階 (0-2)
  currentPhase: 'hint',    // 'hint' | 'symbol' | 'number'
  results: [],             // [{elementNumber, q1, q2, q3, allCorrect}]
  choices: [],             // 現在の選択肢
  currentResult: null,     // 進行中の元素の結果

  // ステージ開始
  startStage(stageId) {
    this.currentStage = stageId;
    this.currentElementIndex = 0;
    this.results = [];

    const stage = STAGES[stageId - 1];
    this.currentElements = stage.elementNumbers.map(num => {
      return ALL_ELEMENTS.find(e => e.number === num);
    });

    this.startElement();
  },

  // 元素のクイズ開始
  startElement() {
    this.currentHintIndex = 0;
    this.currentPhase = 'hint';
    this.currentResult = { elementNumber: this.getCurrentElement().number, q1: false, q2: false, q3: false, allCorrect: false };
    this.generateChoices();
  },

  // 現在のフェーズに応じた選択肢を生成
  generateChoices() {
    const correctElement = this.getCurrentElement();

    if (this.currentPhase === 'hint') {
      // Q1: 元素名の4択
      const choices = [correctElement];
      const others = ALL_ELEMENTS.filter(e => e.number !== correctElement.number);
      const sameCategory = others.filter(e => e.category === correctElement.category);
      const diffCategory = others.filter(e => e.category !== correctElement.category);
      const shuffledSame = this.shuffle(sameCategory);
      const shuffledDiff = this.shuffle(diffCategory);
      let dummyPool = [...shuffledSame.slice(0, 2), ...shuffledDiff];
      dummyPool = this.shuffle(dummyPool);
      for (let i = 0; i < 3 && i < dummyPool.length; i++) {
        choices.push(dummyPool[i]);
      }
      this.choices = this.shuffle(choices);

    } else if (this.currentPhase === 'symbol') {
      // Q2: 元素記号の4択
      const correctSymbol = correctElement.symbol;
      const symbols = [correctSymbol];
      const others = ALL_ELEMENTS.filter(e => e.symbol !== correctSymbol);
      // 似た記号を優先（同じ先頭文字）
      const similar = others.filter(e => e.symbol[0] === correctSymbol[0]);
      const rest = others.filter(e => e.symbol[0] !== correctSymbol[0]);
      const pool = [...this.shuffle(similar), ...this.shuffle(rest)];
      for (let i = 0; i < 3 && i < pool.length; i++) {
        symbols.push(pool[i].symbol);
      }
      this.choices = this.shuffle(symbols);

    } else if (this.currentPhase === 'number') {
      // Q3: 原子番号の4択
      const correctNum = correctElement.number;
      const numbers = [correctNum];
      // 近い番号をダミーに
      const offsets = this.shuffle([-3, -2, -1, 1, 2, 3, -5, 5, -10, 10]);
      for (const offset of offsets) {
        const n = correctNum + offset;
        if (n >= 1 && n <= 118 && !numbers.includes(n)) {
          numbers.push(n);
        }
        if (numbers.length >= 4) break;
      }
      this.choices = this.shuffle(numbers);
    }
  },

  // 現在のヒントを取得（Q1用）
  getCurrentHints() {
    const element = this.getCurrentElement();
    return element.hints.slice(0, this.currentHintIndex + 1);
  },

  getCurrentElement() {
    return this.currentElements[this.currentElementIndex];
  },

  // Q1: ヒント問題の回答
  answerHint(selectedNumber) {
    const correct = this.getCurrentElement();
    const isCorrect = selectedNumber === correct.number;

    if (isCorrect) {
      this.currentResult.q1 = true;
      // Q2（元素記号）へ
      this.currentPhase = 'symbol';
      this.generateChoices();
      return { correct: true, element: correct, nextPhase: 'symbol' };
    } else {
      if (this.currentHintIndex < 2) {
        // 次のヒントへ
        this.currentHintIndex++;
        this.generateChoices();
        return { correct: false, nextHint: true, hintIndex: this.currentHintIndex };
      } else {
        // 3ヒント全部外れ → この元素失敗
        this.currentResult.q1 = false;
        this.finalizeElement();
        return { correct: false, nextHint: false, element: correct, failed: true };
      }
    }
  },

  // Q2: 元素記号の回答
  answerSymbol(selectedSymbol) {
    const correct = this.getCurrentElement();
    const isCorrect = selectedSymbol === correct.symbol;

    if (isCorrect) {
      this.currentResult.q2 = true;
      // Q3（原子番号）へ
      this.currentPhase = 'number';
      this.generateChoices();
      return { correct: true, element: correct, nextPhase: 'number' };
    } else {
      // 不正解 → この元素失敗
      this.currentResult.q2 = false;
      this.finalizeElement();
      return { correct: false, element: correct, correctAnswer: correct.symbol, failed: true };
    }
  },

  // Q3: 原子番号の回答
  answerNumber(selectedNumber) {
    const correct = this.getCurrentElement();
    const isCorrect = selectedNumber === correct.number;

    if (isCorrect) {
      this.currentResult.q3 = true;
      this.currentResult.allCorrect = true;
      this.finalizeElement();
      return { correct: true, element: correct, cardGet: true };
    } else {
      this.currentResult.q3 = false;
      this.finalizeElement();
      return { correct: false, element: correct, correctAnswer: correct.number, failed: true };
    }
  },

  // 元素の結果を確定
  finalizeElement() {
    this.results.push({ ...this.currentResult });
  },

  // 次の元素へ（trueならまだ続く）
  nextElement() {
    this.currentElementIndex++;
    if (this.currentElementIndex >= 3) {
      return false;
    }
    this.startElement();
    return true;
  },

  // ステージ結果
  getStageResult() {
    const cardCount = this.results.filter(r => r.allCorrect).length;
    // 星: 各元素で正解した問数（Q1+Q2+Q3 = 最大3）
    let totalStars = 0;
    this.results.forEach(r => {
      if (r.q1) totalStars++;
      if (r.q2) totalStars++;
      if (r.q3) totalStars++;
    });

    return {
      stageId: this.currentStage,
      results: this.results,
      cardCount,
      totalStars,
      isPerfect: totalStars === 9
    };
  },

  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
};
