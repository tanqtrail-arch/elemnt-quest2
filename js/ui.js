// ===== UI管理 =====
const GameUI = {
  // 画面切り替え
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  // ===== タイトル画面 =====
  showTitle() {
    this.showScreen('screen-title');
    const data = Storage.load();
    const cardCount = Storage.getCardCount();
    const totalCards = data.bonusObtained ? 118 : 117;
    const progress = document.getElementById('title-progress');
    if (cardCount > 0) {
      progress.textContent = `図鑑: ${cardCount} / ${totalCards + 1} 枚`;
    } else {
      progress.textContent = '';
    }
  },

  // ===== ステージ選択画面 =====
  showStageSelect() {
    this.showScreen('screen-stage-select');
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    STAGES.forEach(stage => {
      const unlocked = Storage.isStageUnlocked(stage.id);
      const cleared = Storage.isStageClear(stage.id);
      const correctCount = Storage.getStageCorrectCount(stage.id);
      const isPerfect = correctCount === 9;

      const card = document.createElement('div');
      card.className = 'stage-card';
      if (!unlocked) card.classList.add('locked');
      if (cleared) card.classList.add('cleared');
      if (isPerfect) card.classList.add('perfect');

      if (!unlocked) {
        card.innerHTML = `
          <div class="stage-lock-icon">🔒</div>
          <div class="stage-number">STAGE ${stage.id}</div>
          <div class="stage-name">${stage.name}</div>
          <div class="stage-status">未開放</div>
        `;
      } else {
        const stars = isPerfect ? '★★★' : cleared ? this.getStars(correctCount) : '';
        card.innerHTML = `
          <div class="stage-number">STAGE ${stage.id}</div>
          <div class="stage-name">${stage.name}</div>
          <div class="stage-status">${cleared ? `${correctCount}/9 問正解` : 'チャレンジ！'}</div>
          ${stars ? `<div class="stage-stars">${stars}</div>` : ''}
        `;
        card.addEventListener('click', () => this.startStage(stage.id));
      }

      grid.appendChild(card);
    });
  },

  getStars(correct) {
    if (correct === 9) return '★★★';
    if (correct >= 6) return '★★☆';
    if (correct >= 3) return '★☆☆';
    return '☆☆☆';
  },

  // ===== クイズ開始 =====
  startStage(stageId) {
    Quiz.startStage(stageId);
    this.showScreen('screen-quiz');

    const stage = STAGES[stageId - 1];
    document.getElementById('quiz-stage-title').textContent = `STAGE ${stageId}: ${stage.name}`;
    this.updateQuizProgress();
    this.renderQuiz();
  },

  updateQuizProgress() {
    const total = 3;
    const current = Quiz.currentElementIndex + 1;
    document.getElementById('quiz-progress').textContent = `${current} / ${total} 元素`;

    // ドット表示
    const dotContainer = document.getElementById('quiz-element-progress');
    dotContainer.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const dot = document.createElement('div');
      dot.className = 'quiz-dot';
      const elemIdx = Math.floor(i / 3);
      const hintIdx = i % 3;
      if (elemIdx < Quiz.currentElementIndex) {
        // 過去の元素
        const result = Quiz.results[elemIdx];
        dot.classList.add(result && result.correct ? 'correct' : 'wrong');
      } else if (elemIdx === Quiz.currentElementIndex && hintIdx <= Quiz.currentHintIndex) {
        dot.classList.add('active');
      }
      dotContainer.appendChild(dot);
    }
  },

  // クイズを描画
  renderQuiz() {
    this.updateQuizProgress();
    const hints = Quiz.getCurrentHints();
    const hintArea = document.getElementById('hint-area');
    hintArea.innerHTML = '';

    hints.forEach((hint, i) => {
      const div = document.createElement('div');
      div.innerHTML = `
        <span class="hint-number-badge">${i + 1}</span>
        <span class="hint-text">${hint}</span>
      `;
      div.style.marginBottom = '10px';
      hintArea.appendChild(div);
    });

    const hintLabel = document.createElement('div');
    hintLabel.className = 'hint-label';
    hintLabel.textContent = `ヒント ${Quiz.currentHintIndex + 1} / 3`;
    hintArea.prepend(hintLabel);

    // 選択肢を描画
    const answerArea = document.getElementById('answer-area');
    answerArea.innerHTML = '';
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'answer-choices';

    Quiz.choices.forEach(element => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = element.name;
      btn.addEventListener('click', () => this.handleAnswer(element.number, btn, choicesDiv));
      choicesDiv.appendChild(btn);
    });

    answerArea.appendChild(choicesDiv);
  },

  // 回答処理
  handleAnswer(selectedNumber, selectedBtn, choicesDiv) {
    // ボタンを無効化
    choicesDiv.querySelectorAll('.choice-btn').forEach(b => {
      b.disabled = true;
    });

    const result = Quiz.answer(selectedNumber);

    if (result.correct) {
      // 正解
      selectedBtn.classList.add('correct');
      // 正解の元素カードを獲得
      Storage.addCard(result.element.number);

      const feedback = document.createElement('div');
      feedback.className = 'feedback feedback-correct';
      feedback.innerHTML = `
        正解！
        <div class="feedback-element-name">${result.element.number}番 ${result.element.name} (${result.element.symbol})</div>
      `;
      document.getElementById('answer-area').appendChild(feedback);

      // カード獲得演出へ
      setTimeout(() => {
        this.showCardGet(result.element);
      }, 1200);

    } else if (result.nextHint) {
      // 不正解だが次のヒントあり
      selectedBtn.classList.add('wrong');

      const feedback = document.createElement('div');
      feedback.className = 'feedback feedback-wrong';
      feedback.textContent = '残念...次のヒントを見てみよう！';
      document.getElementById('answer-area').appendChild(feedback);

      setTimeout(() => {
        this.renderQuiz();
      }, 1200);

    } else {
      // 3問目も不正解
      selectedBtn.classList.add('wrong');
      // 正解を表示
      choicesDiv.querySelectorAll('.choice-btn').forEach(b => {
        if (b.textContent === result.element.name) {
          b.classList.add('correct');
        }
      });

      const feedback = document.createElement('div');
      feedback.className = 'feedback feedback-wrong';
      feedback.innerHTML = `
        正解は...
        <div class="feedback-element-name">${result.element.number}番 ${result.element.name} (${result.element.symbol})</div>
      `;
      document.getElementById('answer-area').appendChild(feedback);

      // 次の元素 or ステージ結果へ
      setTimeout(() => {
        this.proceedToNext();
      }, 2000);
    }
  },

  // 次へ進む
  proceedToNext() {
    const hasMore = Quiz.nextElement();
    if (hasMore) {
      this.renderQuiz();
    } else {
      this.showResult();
    }
  },

  // ===== カード獲得演出 =====
  showCardGet(element) {
    this.showScreen('screen-card-get');
    const display = document.getElementById('card-get-display');
    display.innerHTML = this.renderElementCard(element, true);

    const nextBtn = document.getElementById('card-get-next-btn');
    nextBtn.onclick = () => {
      this.proceedToNext();
    };
  },

  // ===== ステージ結果画面 =====
  showResult() {
    const result = Quiz.getStageResult();
    // クリア情報を保存
    const correctQuestions = result.results.filter(r => r.correct).length * 3
      - result.results.filter(r => r.correct).reduce((s, r) => s + (r.hintsUsed - 1), 0);
    // 正解した元素数 × 3 - 使った余分なヒント数 ではなく、
    // 正解した元素ごとに3点、を正答数として保存
    const correctElementCount = result.results.filter(r => r.correct).length;
    const totalScore = correctElementCount * 3;
    Storage.saveStageClear(result.stageId, totalScore);

    this.showScreen('screen-result');

    const title = document.getElementById('result-title');
    if (result.isPerfect) {
      title.textContent = 'パーフェクト！';
      title.style.color = 'var(--gold)';
    } else if (correctElementCount >= 2) {
      title.textContent = 'ステージクリア！';
      title.style.color = 'var(--success)';
    } else {
      title.textContent = 'ステージクリア';
      title.style.color = 'var(--text)';
    }

    document.getElementById('result-score').innerHTML = `
      ${correctElementCount} / 3 元素を獲得<br>
      <small style="color:var(--text-dim)">スコア: ${totalScore} / 9</small>
    `;

    // 獲得カード表示
    const cardsDiv = document.getElementById('result-cards');
    cardsDiv.innerHTML = '';
    result.results.forEach(r => {
      const el = ALL_ELEMENTS.find(e => e.number === r.elementNumber);
      const cardHtml = this.renderElementCard(el, r.correct, true);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = cardHtml;
      if (!r.correct) {
        wrapper.querySelector('.element-card').style.opacity = '0.3';
      }
      cardsDiv.appendChild(wrapper);
    });

    // 次のステージボタン
    const nextBtn = document.getElementById('result-next-btn');
    if (result.stageId < 39) {
      nextBtn.style.display = '';
      nextBtn.onclick = () => this.startStage(result.stageId + 1);
    } else {
      nextBtn.style.display = 'none';
    }

    // 全問正解チェック（全ステージパーフェクト）
    if (Storage.isAllPerfect() && !Storage.load().bonusObtained) {
      setTimeout(() => {
        this.showBonus();
      }, 1500);
    }
  },

  // ===== 図鑑画面 =====
  showZukan() {
    this.showScreen('screen-zukan');
    const data = Storage.load();
    const grid = document.getElementById('zukan-grid');
    grid.innerHTML = '';

    // 全118元素を表示
    const allForZukan = [...ALL_ELEMENTS];
    allForZukan.push(BONUS_ELEMENT);

    const cardCount = Storage.getCardCount();
    document.getElementById('zukan-count').textContent = `${cardCount} / ${allForZukan.length} 枚`;

    allForZukan.forEach(element => {
      const obtained = element.number === 118
        ? data.bonusObtained
        : data.obtainedCards.includes(element.number);

      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.renderElementCard(element, obtained);
      const card = wrapper.firstElementChild;

      if (obtained) {
        card.addEventListener('click', () => this.showCardDetail(element));
      }

      grid.appendChild(card);
    });
  },

  // カード詳細表示
  showCardDetail(element) {
    const overlay = document.createElement('div');
    overlay.className = 'card-detail-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });

    overlay.innerHTML = `
      <div class="card-detail">
        ${this.renderElementCard(element, true)}
        <div class="card-detail-info">
          <div>原子番号: ${element.number}</div>
          <div>元素記号: ${element.symbol}</div>
          <div>分類: ${element.category}</div>
        </div>
        <button class="btn btn-secondary" style="margin-top:16px" onclick="this.closest('.card-detail-overlay').remove()">閉じる</button>
      </div>
    `;

    document.body.appendChild(overlay);
  },

  // ===== 118番ボーナス演出 =====
  showBonus() {
    Storage.setBonus();
    this.showScreen('screen-bonus');

    const display = document.getElementById('bonus-card-display');
    display.innerHTML = this.renderElementCard(BONUS_ELEMENT, true);

    // パーティクルエフェクト
    const particles = document.getElementById('bonus-particles');
    particles.innerHTML = '';
    const colors = ['#ffd700', '#ff6f00', '#e040fb', '#6c63ff', '#00bcd4', '#4caf50'];
    for (let i = 0; i < 50; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDuration = (2 + Math.random() * 3) + 's';
      p.style.animationDelay = Math.random() * 2 + 's';
      particles.appendChild(p);
    }
  },

  // ===== 共通: 元素カードHTML生成 =====
  renderElementCard(element, obtained = false, small = false) {
    const classes = ['element-card'];
    if (obtained) {
      classes.push('obtained');
    } else {
      classes.push('locked');
    }

    const imagePath = `cards/${element.number}.png`;

    return `
      <div class="${classes.join(' ')}"
           style="--el-color: ${element.color || '#6c63ff'}"
           data-number="${element.number}">
        <img class="element-card-image" src="${imagePath}"
             onerror="this.style.display='none'"
             alt="${element.name}">
        <div class="element-card-number">${element.number}</div>
        <div class="element-card-symbol" style="color: ${element.color || '#6c63ff'}">${element.symbol}</div>
        <div class="element-card-name">${element.name}</div>
        <div class="element-card-name-en">${element.nameEn}</div>
        <div class="element-card-category">${element.category}</div>
      </div>
    `;
  },

  // ===== 確認ダイアログ =====
  confirmQuit() {
    this.showDialog('クイズを中断しますか？\n進行状況は失われます。', () => {
      this.showStageSelect();
    });
  },

  showDialog(message, onOk) {
    const overlay = document.getElementById('dialog-overlay');
    overlay.style.display = 'flex';
    document.getElementById('dialog-message').textContent = message;

    document.getElementById('dialog-ok').onclick = () => {
      overlay.style.display = 'none';
      if (onOk) onOk();
    };
    document.getElementById('dialog-cancel').onclick = () => {
      overlay.style.display = 'none';
    };
  }
};

// 起動
window.addEventListener('DOMContentLoaded', () => {
  GameUI.showTitle();
});
