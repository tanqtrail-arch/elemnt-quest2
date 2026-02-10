// ===== UI管理 =====
const GameUI = {
  zukanView: 'grid', // 'grid' or 'periodic'

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
    const total = 118;
    const progress = document.getElementById('title-progress');
    if (cardCount > 0) {
      progress.textContent = `図鑑: ${cardCount} / ${total} 枚`;
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

  // 星テキスト（3元素分、各最大★3）
  renderStarsText(totalStars) {
    if (totalStars === 9) return '★★★★★★★★★';
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
      selectedBtn.classList.add('correct');
      Storage.addCard(result.element.number);

      // 星数を表示（1問目=★3, 2問目=★2, 3問目=★1）
      const stars = 3 - result.hintsUsed + 1;
      const starsText = '★'.repeat(stars) + '☆'.repeat(3 - stars);

      const feedback = document.createElement('div');
      feedback.className = 'feedback feedback-correct';
      feedback.innerHTML = `
        正解！ <span style="color:var(--gold)">${starsText}</span>
        <div class="feedback-element-name">${result.element.number}番 ${result.element.name} (${result.element.symbol})</div>
      `;
      document.getElementById('answer-area').appendChild(feedback);

      setTimeout(() => {
        this.showCardGet(result.element, stars);
      }, 1200);

    } else if (result.nextHint) {
      selectedBtn.classList.add('wrong');

      const feedback = document.createElement('div');
      feedback.className = 'feedback feedback-wrong';
      feedback.textContent = '残念...次のヒントを見てみよう！';
      document.getElementById('answer-area').appendChild(feedback);

      setTimeout(() => {
        this.renderQuiz();
      }, 1200);

    } else {
      selectedBtn.classList.add('wrong');
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
  showCardGet(element, stars) {
    this.showScreen('screen-card-get');
    const display = document.getElementById('card-get-display');
    display.innerHTML = this.renderElementCard(element, true);

    // 星表示
    const starsText = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    const label = document.querySelector('.card-get-label');
    if (label) {
      label.innerHTML = `元素カード獲得！ <span style="font-size:1.5rem">${starsText}</span>`;
    }

    const nextBtn = document.getElementById('card-get-next-btn');
    nextBtn.onclick = () => {
      this.proceedToNext();
    };
  },

  // ===== ステージ結果画面 =====
  showResult() {
    const result = Quiz.getStageResult();

    // 星計算: 正解した元素のhintsUsedから星を計算
    // 1問目正解=3星, 2問目=2星, 3問目=1星, 不正解=0星
    let totalStars = 0;
    result.results.forEach(r => {
      if (r.correct) {
        totalStars += (4 - r.hintsUsed); // hintsUsed=1→3星, 2→2星, 3→1星
      }
    });

    Storage.saveStageClear(result.stageId, totalStars);
    const correctElementCount = result.results.filter(r => r.correct).length;

    this.showScreen('screen-result');

    const title = document.getElementById('result-title');
    if (totalStars === 9) {
      title.textContent = 'パーフェクト！';
      title.style.color = 'var(--gold)';
    } else if (correctElementCount === 3) {
      title.textContent = 'ステージクリア！';
      title.style.color = 'var(--success)';
    } else if (correctElementCount >= 1) {
      title.textContent = 'ステージクリア';
      title.style.color = 'var(--text)';
    } else {
      title.textContent = 'もう一度挑戦しよう';
      title.style.color = 'var(--danger)';
    }

    // 各元素の星を表示
    const elementStars = result.results.map(r => {
      if (r.correct) return 4 - r.hintsUsed;
      return 0;
    });

    document.getElementById('result-score').innerHTML = `
      <div style="font-size:1.6rem;color:var(--gold);margin-bottom:8px">${this.renderStarsText(totalStars)}</div>
      ${correctElementCount} / 3 元素を獲得 (★ ${totalStars} / 9)
    `;

    // 獲得カード表示
    const cardsDiv = document.getElementById('result-cards');
    cardsDiv.innerHTML = '';
    result.results.forEach((r, i) => {
      const el = ALL_ELEMENTS.find(e => e.number === r.elementNumber);
      const wrapper = document.createElement('div');
      wrapper.style.textAlign = 'center';
      wrapper.innerHTML = `
        ${this.renderElementCard(el, r.correct, true)}
        <div style="margin-top:4px;color:var(--gold);font-size:0.9rem">
          ${'★'.repeat(elementStars[i])}${'☆'.repeat(3 - elementStars[i])}
        </div>
      `;
      if (!r.correct) {
        wrapper.querySelector('.element-card').style.opacity = '0.3';
      }
      cardsDiv.appendChild(wrapper);
    });

    // ボタン
    const resultBtns = document.getElementById('result-buttons');
    resultBtns.innerHTML = `
      <button class="btn btn-secondary btn-large" onclick="GameUI.showStageSelect()">ステージ選択へ</button>
      <button class="btn btn-accent btn-large" onclick="GameUI.startStage(${result.stageId})"
              style="background:var(--warning);color:#000">もう一度</button>
      ${result.stageId < 39 ? `<button class="btn btn-primary btn-large" onclick="GameUI.startStage(${result.stageId + 1})">次のステージへ</button>` : ''}
    `;

    // 全問正解チェック
    if (Storage.isAllPerfect() && !Storage.load().bonusObtained) {
      setTimeout(() => {
        this.showBonus();
      }, 1500);
    }
  },

  // ===== 図鑑画面 =====
  showZukan() {
    this.showScreen('screen-zukan');
    this.renderZukan();
  },

  renderZukan() {
    const data = Storage.load();
    const cardCount = Storage.getCardCount();
    document.getElementById('zukan-count').textContent = `${cardCount} / 118 枚`;

    // トグルボタンのアクティブ状態
    document.querySelectorAll('.zukan-toggle .btn').forEach(b => b.classList.remove('active'));
    const activeBtn = document.getElementById(this.zukanView === 'grid' ? 'btn-grid-view' : 'btn-periodic-view');
    if (activeBtn) activeBtn.classList.add('active');

    // ビュー切り替え
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
    const allForZukan = [...ALL_ELEMENTS, BONUS_ELEMENT];

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

  // ===== 周期表ビュー =====
  renderPeriodicTable(data, container) {
    container.innerHTML = '';

    // 周期表のレイアウト定義 [row, col] (1-indexed)
    const layout = this.getPeriodicTableLayout();

    // メインテーブル (7行 × 18列)
    const mainTable = document.createElement('div');
    mainTable.className = 'periodic-table';

    // 空セルで埋める (7行 × 18列 = 126セル)
    const cells = {};
    for (let row = 1; row <= 7; row++) {
      for (let col = 1; col <= 18; col++) {
        cells[`${row}-${col}`] = null;
      }
    }

    // 元素を配置
    ALL_ELEMENTS.forEach(el => {
      const pos = layout[el.number];
      if (pos && pos.row <= 7) {
        cells[`${pos.row}-${pos.col}`] = el;
      }
    });

    // セルを描画
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

    // ランタノイド・アクチノイド行
    const lanActContainer = document.createElement('div');
    lanActContainer.className = 'periodic-table-lan-act';

    const lanLabel = document.createElement('div');
    lanLabel.className = 'pt-section-label';
    lanLabel.textContent = 'ランタノイド';
    lanActContainer.appendChild(lanLabel);

    const lanRow = document.createElement('div');
    lanRow.className = 'pt-extra-row';
    for (let num = 57; num <= 71; num++) {
      const el = ALL_ELEMENTS.find(e => e.number === num);
      if (el) {
        const obtained = data.obtainedCards.includes(el.number);
        lanRow.appendChild(this.createPTCell(el, obtained));
      }
    }
    lanActContainer.appendChild(lanRow);

    const actLabel = document.createElement('div');
    actLabel.className = 'pt-section-label';
    actLabel.textContent = 'アクチノイド';
    lanActContainer.appendChild(actLabel);

    const actRow = document.createElement('div');
    actRow.className = 'pt-extra-row';
    for (let num = 89; num <= 103; num++) {
      const el = ALL_ELEMENTS.find(e => e.number === num);
      if (el) {
        const obtained = data.obtainedCards.includes(el.number);
        actRow.appendChild(this.createPTCell(el, obtained));
      }
    }
    lanActContainer.appendChild(actRow);

    container.appendChild(lanActContainer);
  },

  createPTCell(element, obtained) {
    const cell = document.createElement('div');
    cell.className = 'pt-cell' + (obtained ? ' obtained' : ' locked');

    const bgColor = element.color || '#6c63ff';
    if (obtained) {
      cell.style.borderColor = bgColor;
      cell.style.boxShadow = `0 0 6px ${bgColor}33`;
    }

    if (obtained) {
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

  // 周期表レイアウト（原子番号→行・列）
  getPeriodicTableLayout() {
    const layout = {};
    // 第1周期
    layout[1] = {row:1,col:1}; layout[2] = {row:1,col:18};
    // 第2周期
    layout[3] = {row:2,col:1}; layout[4] = {row:2,col:2};
    layout[5] = {row:2,col:13}; layout[6] = {row:2,col:14}; layout[7] = {row:2,col:15};
    layout[8] = {row:2,col:16}; layout[9] = {row:2,col:17}; layout[10] = {row:2,col:18};
    // 第3周期
    layout[11] = {row:3,col:1}; layout[12] = {row:3,col:2};
    layout[13] = {row:3,col:13}; layout[14] = {row:3,col:14}; layout[15] = {row:3,col:15};
    layout[16] = {row:3,col:16}; layout[17] = {row:3,col:17}; layout[18] = {row:3,col:18};
    // 第4周期
    for (let i = 19; i <= 36; i++) layout[i] = {row:4, col:i-18};
    // 第5周期
    for (let i = 37; i <= 54; i++) layout[i] = {row:5, col:i-36};
    // 第6周期 (ランタノイド57-71は別行)
    layout[55] = {row:6,col:1}; layout[56] = {row:6,col:2};
    // 57-71はランタノイド行（メインテーブルには配置しない）
    for (let i = 72; i <= 86; i++) layout[i] = {row:6, col:i-69};
    // 第7周期 (アクチノイド89-103は別行)
    layout[87] = {row:7,col:1}; layout[88] = {row:7,col:2};
    // 89-103はアクチノイド行
    for (let i = 104; i <= 118; i++) layout[i] = {row:7, col:i-101};
    return layout;
  },

  switchZukanView(view) {
    this.zukanView = view;
    this.renderZukan();
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
  renderElementCard(element, obtained = false) {
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
  // PWA Service Worker 登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  GameUI.showTitle();
});
