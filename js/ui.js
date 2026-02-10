// ===== UI管理 =====
const GameUI = {
  zukanView: 'grid',

  showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  },

  // ===== タイトル画面 =====
  showTitle() {
    this.showScreen('screen-title');
    const cardCount = Storage.getCardCount();
    const progress = document.getElementById('title-progress');
    progress.textContent = cardCount > 0 ? `図鑑: ${cardCount} / 118 枚` : '';
  },

  // ===== ステージ選択画面 =====
  showStageSelect() {
    this.showScreen('screen-stage-select');
    const grid = document.getElementById('stage-grid');
    grid.innerHTML = '';

    STAGES.forEach(stage => {
      const unlocked = Storage.isStageUnlocked(stage.id);
      const cleared = Storage.isStageClear(stage.id);
      const stars = Storage.getStageStars(stage.id);
      const isPerfect = stars === 9;

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
        const starsDisplay = cleared ? this.renderStarsText(stars) : '';
        card.innerHTML = `
          <div class="stage-number">STAGE ${stage.id}</div>
          <div class="stage-name">${stage.name}</div>
          <div class="stage-status">${cleared ? `★ ${stars} / 9` : 'チャレンジ！'}</div>
          ${starsDisplay ? `<div class="stage-stars">${starsDisplay}</div>` : ''}
        `;
        card.addEventListener('click', () => this.startStage(stage.id));
      }

      grid.appendChild(card);
    });
  },

  renderStarsText(totalStars) {
    let s = '';
    for (let i = 0; i < totalStars; i++) s += '★';
    for (let i = totalStars; i < 9; i++) s += '☆';
    return s;
  },

  // ===== クイズ開始 =====
  startStage(stageId) {
    Quiz.startStage(stageId);
    this.showScreen('screen-quiz');
    const stage = STAGES[stageId - 1];
    document.getElementById('quiz-stage-title').textContent = `STAGE ${stageId}: ${stage.name}`;
    this.renderQuiz();
  },

  // ===== 進捗ドット =====
  updateQuizProgress() {
    const current = Quiz.currentElementIndex + 1;
    document.getElementById('quiz-progress').textContent = `${current} / 3 元素`;

    const dotContainer = document.getElementById('quiz-element-progress');
    dotContainer.innerHTML = '';

    for (let ei = 0; ei < 3; ei++) {
      for (let qi = 0; qi < 3; qi++) {
        const dot = document.createElement('div');
        dot.className = 'quiz-dot';

        if (ei < Quiz.currentElementIndex) {
          // 過去の元素
          const r = Quiz.results[ei];
          const qKey = ['q1', 'q2', 'q3'][qi];
          dot.classList.add(r[qKey] ? 'correct' : 'wrong');
        } else if (ei === Quiz.currentElementIndex) {
          // 現在の元素
          const phaseIndex = { hint: 0, symbol: 1, number: 2 }[Quiz.currentPhase];
          if (qi < phaseIndex) {
            dot.classList.add('correct'); // 前の問題は正解してる
          } else if (qi === phaseIndex) {
            dot.classList.add('active');
          }
        }

        dotContainer.appendChild(dot);
      }

      // 元素間のスペーサー
      if (ei < 2) {
        const spacer = document.createElement('div');
        spacer.style.width = '4px';
        dotContainer.appendChild(spacer);
      }
    }
  },

  // ===== フェーズ別レンダリング =====
  renderQuiz() {
    this.updateQuizProgress();

    const phase = Quiz.currentPhase;
    if (phase === 'hint') {
      this.renderHintQuestion();
    } else if (phase === 'symbol') {
      this.renderSymbolQuestion();
    } else if (phase === 'number') {
      this.renderNumberQuestion();
    }
  },

  // Q1: ヒント問題
  renderHintQuestion() {
    const hints = Quiz.getCurrentHints();
    const hintArea = document.getElementById('hint-area');
    hintArea.innerHTML = '';

    const hintLabel = document.createElement('div');
    hintLabel.className = 'hint-label';
    hintLabel.textContent = `Q1: この元素は何？（ヒント ${Quiz.currentHintIndex + 1} / 3）`;
    hintArea.appendChild(hintLabel);

    hints.forEach((hint, i) => {
      const div = document.createElement('div');
      div.innerHTML = `<span class="hint-number-badge">${i + 1}</span><span class="hint-text">${hint}</span>`;
      div.style.marginBottom = '10px';
      hintArea.appendChild(div);
    });

    // 4択（元素名）
    const answerArea = document.getElementById('answer-area');
    answerArea.innerHTML = '';
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'answer-choices';

    Quiz.choices.forEach(element => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn';
      btn.textContent = element.name;
      btn.addEventListener('click', () => this.handleHintAnswer(element.number, btn, choicesDiv));
      choicesDiv.appendChild(btn);
    });

    answerArea.appendChild(choicesDiv);
  },

  // Q2: 元素記号問題
  renderSymbolQuestion() {
    const el = Quiz.getCurrentElement();
    const hintArea = document.getElementById('hint-area');
    hintArea.innerHTML = `
      <div class="hint-label">Q2: 元素記号を答えよう</div>
      <div class="quiz-question-text">「<strong>${el.name}</strong>」の元素記号は？</div>
    `;

    const answerArea = document.getElementById('answer-area');
    answerArea.innerHTML = '';
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'answer-choices';

    Quiz.choices.forEach(symbol => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn choice-btn-symbol';
      btn.textContent = symbol;
      btn.addEventListener('click', () => this.handleSymbolAnswer(symbol, btn, choicesDiv));
      choicesDiv.appendChild(btn);
    });

    answerArea.appendChild(choicesDiv);
  },

  // Q3: 原子番号問題
  renderNumberQuestion() {
    const el = Quiz.getCurrentElement();
    const hintArea = document.getElementById('hint-area');
    hintArea.innerHTML = `
      <div class="hint-label">Q3: 原子番号を答えよう</div>
      <div class="quiz-question-text">「<strong>${el.name}</strong>（${el.symbol}）」の原子番号は？</div>
    `;

    const answerArea = document.getElementById('answer-area');
    answerArea.innerHTML = '';
    const choicesDiv = document.createElement('div');
    choicesDiv.className = 'answer-choices';

    Quiz.choices.forEach(num => {
      const btn = document.createElement('button');
      btn.className = 'choice-btn choice-btn-number';
      btn.textContent = num;
      btn.addEventListener('click', () => this.handleNumberAnswer(num, btn, choicesDiv));
      choicesDiv.appendChild(btn);
    });

    answerArea.appendChild(choicesDiv);
  },

  // ===== 回答処理 =====

  disableChoices(choicesDiv) {
    choicesDiv.querySelectorAll('.choice-btn').forEach(b => { b.disabled = true; });
  },

  // Q1回答
  handleHintAnswer(selectedNumber, selectedBtn, choicesDiv) {
    this.disableChoices(choicesDiv);
    const result = Quiz.answerHint(selectedNumber);

    if (result.correct) {
      selectedBtn.classList.add('correct');
      this.showFeedback('answer-area', true, `正解！ ${result.element.name}`, () => {
        this.renderQuiz(); // → Q2へ
      });
    } else if (result.nextHint) {
      selectedBtn.classList.add('wrong');
      this.showFeedback('answer-area', false, '残念...次のヒントを見てみよう！', () => {
        this.renderQuiz(); // 次のヒントでQ1再表示
      });
    } else {
      // 3回外れ → 失敗
      selectedBtn.classList.add('wrong');
      this.showCorrectButton(choicesDiv, result.element.name);
      this.showFeedback('answer-area', false,
        `正解は... ${result.element.number}番 ${result.element.name} (${result.element.symbol})`,
        () => this.proceedToNext()
      , 2000);
    }
  },

  // Q2回答
  handleSymbolAnswer(selectedSymbol, selectedBtn, choicesDiv) {
    this.disableChoices(choicesDiv);
    const result = Quiz.answerSymbol(selectedSymbol);

    if (result.correct) {
      selectedBtn.classList.add('correct');
      this.showFeedback('answer-area', true, `正解！ ${result.element.symbol}`, () => {
        this.renderQuiz(); // → Q3へ
      });
    } else {
      selectedBtn.classList.add('wrong');
      this.showCorrectButton(choicesDiv, result.correctAnswer);
      this.showFeedback('answer-area', false,
        `残念... 正解は「${result.correctAnswer}」`,
        () => this.proceedToNext()
      , 2000);
    }
  },

  // Q3回答
  handleNumberAnswer(selectedNumber, selectedBtn, choicesDiv) {
    this.disableChoices(choicesDiv);
    const result = Quiz.answerNumber(selectedNumber);

    if (result.correct) {
      selectedBtn.classList.add('correct');
      Storage.addCard(result.element.number);
      this.showFeedback('answer-area', true, '正解！ 3問全問正解！ カード獲得！', () => {
        this.proceedToNext();
      });
    } else {
      selectedBtn.classList.add('wrong');
      this.showCorrectButton(choicesDiv, String(result.correctAnswer));
      this.showFeedback('answer-area', false,
        `残念... 正解は「${result.correctAnswer}」`,
        () => this.proceedToNext()
      , 2000);
    }
  },

  // 正解ボタンをハイライト
  showCorrectButton(choicesDiv, correctText) {
    choicesDiv.querySelectorAll('.choice-btn').forEach(b => {
      if (b.textContent === correctText) b.classList.add('correct');
    });
  },

  // フィードバック表示
  showFeedback(containerId, isCorrect, message, callback, delay) {
    const container = document.getElementById(containerId);
    const feedback = document.createElement('div');
    feedback.className = `feedback ${isCorrect ? 'feedback-correct' : 'feedback-wrong'}`;
    feedback.innerHTML = message;
    container.appendChild(feedback);
    setTimeout(callback, delay || 1200);
  },

  // 次の元素 or ステージ結果へ
  proceedToNext() {
    const hasMore = Quiz.nextElement();
    if (hasMore) {
      this.renderQuiz();
    } else {
      this.showStageCards();
    }
  },

  // ===== ステージ終了後のカード獲得演出 =====
  showStageCards() {
    const result = Quiz.getStageResult();
    Storage.saveStageClear(result.stageId, result.totalStars);

    const gotCards = result.results.filter(r => r.allCorrect);

    if (gotCards.length === 0) {
      // カード獲得なし → 結果画面へ直行
      this.showResult();
      return;
    }

    this.showScreen('screen-card-get');

    const label = document.getElementById('card-get-label');
    label.textContent = gotCards.length === 3
      ? 'パーフェクト！ 全カード獲得！'
      : `${gotCards.length} 枚のカードを獲得！`;

    const display = document.getElementById('card-get-display');
    display.innerHTML = '';

    result.results.forEach(r => {
      const el = ALL_ELEMENTS.find(e => e.number === r.elementNumber);
      const item = document.createElement('div');
      item.className = 'card-get-item';
      const got = r.allCorrect;
      item.innerHTML = `
        ${this.renderElementCard(el, got)}
        <div class="card-get-item-label ${got ? 'got' : ''}">
          ${got ? '★★★ GET!' : '×'}
        </div>
      `;
      if (!got) {
        item.querySelector('.element-card').style.opacity = '0.3';
      }
      display.appendChild(item);
    });

    // ボタン
    const btnsDiv = document.getElementById('card-get-buttons');
    btnsDiv.innerHTML = '';

    const zukanBtn = document.createElement('button');
    zukanBtn.className = 'btn btn-secondary btn-large';
    zukanBtn.textContent = '図鑑を見る';
    zukanBtn.addEventListener('click', () => this.showZukan());
    btnsDiv.appendChild(zukanBtn);

    const resultBtn = document.createElement('button');
    resultBtn.className = 'btn btn-large';
    resultBtn.textContent = 'リザルトを見る';
    resultBtn.style.background = 'var(--warning)';
    resultBtn.style.color = '#000';
    resultBtn.addEventListener('click', () => this.showResult());
    btnsDiv.appendChild(resultBtn);

    if (result.stageId < 39 && Storage.isStageUnlocked(result.stageId + 1)) {
      const nextBtn = document.createElement('button');
      nextBtn.className = 'btn btn-primary btn-large';
      nextBtn.textContent = '次のステージへ';
      nextBtn.addEventListener('click', () => this.startStage(result.stageId + 1));
      btnsDiv.appendChild(nextBtn);
    }

    // 全問正解チェック
    if (Storage.isAllPerfect() && !Storage.load().bonusObtained) {
      setTimeout(() => this.showBonus(), 2000);
    }
  },

  // ===== ステージ結果画面 =====
  showResult() {
    const result = Quiz.getStageResult();
    // カード0枚で直行した場合のみ保存（showStageCards経由の場合は既に保存済み）
    Storage.saveStageClear(result.stageId, result.totalStars);

    this.showScreen('screen-result');

    const title = document.getElementById('result-title');
    if (result.isPerfect) {
      title.textContent = 'パーフェクト！';
      title.style.color = 'var(--gold)';
    } else if (result.cardCount >= 2) {
      title.textContent = 'ステージクリア！';
      title.style.color = 'var(--success)';
    } else if (result.cardCount >= 1) {
      title.textContent = 'ステージクリア';
      title.style.color = 'var(--text)';
    } else {
      title.textContent = 'もう一度挑戦しよう';
      title.style.color = 'var(--danger)';
    }

    document.getElementById('result-score').innerHTML = `
      <div style="font-size:1.6rem;color:var(--gold);margin-bottom:8px">${this.renderStarsText(result.totalStars)}</div>
      ${result.cardCount} / 3 カード獲得 (★ ${result.totalStars} / 9)
    `;

    // 各元素カード表示
    const cardsDiv = document.getElementById('result-cards');
    cardsDiv.innerHTML = '';
    result.results.forEach(r => {
      const el = ALL_ELEMENTS.find(e => e.number === r.elementNumber);
      const stars = (r.q1 ? 1 : 0) + (r.q2 ? 1 : 0) + (r.q3 ? 1 : 0);
      const wrapper = document.createElement('div');
      wrapper.style.textAlign = 'center';
      wrapper.innerHTML = `
        ${this.renderElementCard(el, r.allCorrect)}
        <div style="margin-top:6px;font-size:0.85rem">
          <span style="color:${r.q1 ? 'var(--success)' : 'var(--danger)'}">Q1${r.q1 ? '○' : '×'}</span>
          <span style="color:${r.q2 ? 'var(--success)' : 'var(--danger)'}">Q2${r.q2 ? '○' : '×'}</span>
          <span style="color:${r.q3 ? 'var(--success)' : 'var(--danger)'}">Q3${r.q3 ? '○' : '×'}</span>
        </div>
        <div style="margin-top:2px;color:var(--gold);font-size:0.85rem">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
      `;
      if (!r.allCorrect) {
        wrapper.querySelector('.element-card').style.opacity = '0.3';
      }
      cardsDiv.appendChild(wrapper);
    });

    // ボタン
    const resultBtns = document.getElementById('result-buttons');
    resultBtns.innerHTML = `
      <button class="btn btn-secondary btn-large" onclick="GameUI.showStageSelect()">ステージ選択へ</button>
      <button class="btn btn-secondary btn-large" onclick="GameUI.showZukan()">図鑑を見る</button>
      <button class="btn btn-large" onclick="GameUI.startStage(${result.stageId})" style="background:var(--warning);color:#000">もう一度</button>
      ${result.stageId < 39 ? `<button class="btn btn-primary btn-large" onclick="GameUI.startStage(${result.stageId + 1})">次のステージへ</button>` : ''}
    `;

    // 全問正解チェック（カード0枚で直行した場合用）
    if (Storage.isAllPerfect() && !Storage.load().bonusObtained) {
      setTimeout(() => this.showBonus(), 1500);
    }
  },

  // ===== 図鑑画面 =====
  showZukan() {
    this.showScreen('screen-zukan');
    this.renderZukan();
  },

  renderZukan() {
    const data = Storage.load();
    document.getElementById('zukan-count').textContent = `${Storage.getCardCount()} / 118 枚`;

    document.querySelectorAll('.zukan-toggle .btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(this.zukanView === 'grid' ? 'btn-grid-view' : 'btn-periodic-view');
    if (activeBtn) activeBtn.classList.add('active');

    const gridContainer = document.getElementById('zukan-grid');
    const periodicContainer = document.getElementById('zukan-periodic');

    if (this.zukanView === 'grid') {
      gridContainer.style.display = '';
      periodicContainer.style.display = 'none';
      this.renderZukanGrid(data, gridContainer);
    } else {
      gridContainer.style.display = 'none';
      periodicContainer.style.display = '';
      this.renderPeriodicTable(data, periodicContainer);
    }
  },

  renderZukanGrid(data, grid) {
    grid.innerHTML = '';
    [...ALL_ELEMENTS, BONUS_ELEMENT].forEach(element => {
      const obtained = element.number === 118
        ? data.bonusObtained
        : data.obtainedCards.includes(element.number);
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.renderElementCard(element, obtained);
      const card = wrapper.firstElementChild;
      if (obtained) card.addEventListener('click', () => this.showCardDetail(element));
      grid.appendChild(card);
    });
  },

  // ===== 周期表ビュー =====
  renderPeriodicTable(data, container) {
    container.innerHTML = '';
    const layout = this.getPeriodicTableLayout();

    const mainTable = document.createElement('div');
    mainTable.className = 'periodic-table';

    const cells = {};
    for (let row = 1; row <= 7; row++) {
      for (let col = 1; col <= 18; col++) {
        cells[`${row}-${col}`] = null;
      }
    }

    ALL_ELEMENTS.forEach(el => {
      const pos = layout[el.number];
      if (pos && pos.row <= 7) cells[`${pos.row}-${pos.col}`] = el;
    });

    for (let row = 1; row <= 7; row++) {
      for (let col = 1; col <= 18; col++) {
        const el = cells[`${row}-${col}`];
        if (el) {
          const obtained = data.obtainedCards.includes(el.number);
          const cell = this.createPTCell(el, obtained);
          cell.style.gridRow = row;
          cell.style.gridColumn = col;
          mainTable.appendChild(cell);
        }
      }
    }
    container.appendChild(mainTable);

    // ランタノイド・アクチノイド
    const lanActContainer = document.createElement('div');
    lanActContainer.className = 'periodic-table-lan-act';

    [
      { label: 'ランタノイド', start: 57, end: 71 },
      { label: 'アクチノイド', start: 89, end: 103 }
    ].forEach(({ label, start, end }) => {
      const lbl = document.createElement('div');
      lbl.className = 'pt-section-label';
      lbl.textContent = label;
      lanActContainer.appendChild(lbl);

      const row = document.createElement('div');
      row.className = 'pt-extra-row';
      for (let num = start; num <= end; num++) {
        const el = ALL_ELEMENTS.find(e => e.number === num);
        if (el) {
          const obtained = data.obtainedCards.includes(el.number);
          row.appendChild(this.createPTCell(el, obtained));
        }
      }
      lanActContainer.appendChild(row);
    });

    container.appendChild(lanActContainer);
  },

  createPTCell(element, obtained) {
    const cell = document.createElement('div');
    cell.className = 'pt-cell' + (obtained ? ' obtained' : ' locked');
    if (obtained) {
      cell.style.borderColor = element.color || '#6c63ff';
      cell.innerHTML = `
        <span class="pt-cell-number">${element.number}</span>
        <span class="pt-cell-symbol">${element.symbol}</span>
        <span class="pt-cell-name">${element.name}</span>
      `;
      cell.addEventListener('click', () => this.showCardDetail(element));
    } else {
      cell.innerHTML = `
        <span class="pt-cell-number">${element.number}</span>
        <span class="pt-cell-symbol">?</span>
        <span class="pt-cell-name"></span>
      `;
    }
    return cell;
  },

  getPeriodicTableLayout() {
    const layout = {};
    layout[1] = {row:1,col:1}; layout[2] = {row:1,col:18};
    layout[3] = {row:2,col:1}; layout[4] = {row:2,col:2};
    for (let i = 5; i <= 10; i++) layout[i] = {row:2, col:i+8};
    layout[11] = {row:3,col:1}; layout[12] = {row:3,col:2};
    for (let i = 13; i <= 18; i++) layout[i] = {row:3, col:i};
    for (let i = 19; i <= 36; i++) layout[i] = {row:4, col:i-18};
    for (let i = 37; i <= 54; i++) layout[i] = {row:5, col:i-36};
    layout[55] = {row:6,col:1}; layout[56] = {row:6,col:2};
    for (let i = 72; i <= 86; i++) layout[i] = {row:6, col:i-69};
    layout[87] = {row:7,col:1}; layout[88] = {row:7,col:2};
    for (let i = 104; i <= 118; i++) layout[i] = {row:7, col:i-101};
    return layout;
  },

  switchZukanView(view) {
    this.zukanView = view;
    this.renderZukan();
  },

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
          <div>英語名: ${element.nameEn}</div>
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
    document.getElementById('bonus-card-display').innerHTML = this.renderElementCard(BONUS_ELEMENT, true);
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

  // ===== 元素カードHTML =====
  renderElementCard(element, obtained = false) {
    const cls = obtained ? 'element-card obtained' : 'element-card locked';
    return `
      <div class="${cls}" style="--el-color: ${element.color || '#6c63ff'}" data-number="${element.number}">
        <img class="element-card-image" src="cards/${element.number}.png" onerror="this.style.display='none'" alt="${element.name}">
        <div class="element-card-number">${element.number}</div>
        <div class="element-card-symbol" style="color: ${element.color || '#6c63ff'}">${element.symbol}</div>
        <div class="element-card-name">${element.name}</div>
        <div class="element-card-name-en">${element.nameEn}</div>
        <div class="element-card-category">${element.category}</div>
      </div>
    `;
  },

  // ===== ダイアログ =====
  confirmQuit() {
    this.showDialog('クイズを中断しますか？\n進行状況は失われます。', () => this.showStageSelect());
  },

  showDialog(message, onOk) {
    const overlay = document.getElementById('dialog-overlay');
    overlay.style.display = 'flex';
    document.getElementById('dialog-message').textContent = message;
    document.getElementById('dialog-ok').onclick = () => { overlay.style.display = 'none'; if (onOk) onOk(); };
    document.getElementById('dialog-cancel').onclick = () => { overlay.style.display = 'none'; };
  }
};

// 起動
window.addEventListener('DOMContentLoaded', () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  GameUI.showTitle();
});
