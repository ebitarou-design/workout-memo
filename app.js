if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error(err));
  });
}

// 種目マスターデータ (腹・有酸素運動を追加)
const EXERCISE_MASTER = {
  "胸 (Chest)": ["ベンチプレス", "インクラインダンベルプレス", "チェストフライ", "ダンベルフライ", "ディップス"],
  "背中 (Back)": ["デッドリフト", "ラットプルダウン", "ベントオーバーロー", "懸垂(チンニング)", "シーテッドロー"],
  "脚 (Legs)": ["スクワット", "レッグプレス", "レッグエクステンション", "レッグカール", "ブルガリアンスクワット"],
  "肩 (Shoulders)": ["ショルダープレス", "サイドレイズ", "フロントレイズ", "リアレイズ"],
  "腕 (Arms)": ["アームカール", "ダンベルカール", "インクラインカール", "ライイング・トライセプス・エクステンション", "ケーブルプッシュダウン"],
  "腹 (Abs)": ["クランチ", "レッグレイズ", "アブローラー", "シットアップ", "プランク"],
  "有酸素運動 (Cardio)": ["ランニング", "トレッドミル", "エアロバイク", "傾斜ウォーキング", "クロストレーナー"]
};

let currentDate = new Date();
let selectedDateStr = formatDate(new Date());

// 過去データ保持用のフォールバック対応
let workoutData = JSON.parse(localStorage.getItem('workout_memo_data')) ||
                  JSON.parse(localStorage.getItem('workout_data_v3')) ||
                  JSON.parse(localStorage.getItem('workout_data')) || {};

let appSettings = JSON.parse(localStorage.getItem('workout_memo_settings')) || { timerAuto: true, timerSec: 120 };

let timerInterval = null;

// DOM要素
const currentMonthEl = document.getElementById('current-month');
const calendarDaysEl = document.getElementById('calendar-days');
const calendarBody = document.getElementById('calendar-body');
const toggleCalendarBtn = document.getElementById('toggle-calendar-btn');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const selectedDateText = document.getElementById('selected-date-text');
const container = document.getElementById('workout-categories-container');
const categorySelect = document.getElementById('category-select');
const addCategoryBtn = document.getElementById('add-category-btn');

// 設定 DOM
const settingsModal = document.getElementById('settings-modal');
const settingsToggleBtn = document.getElementById('settings-toggle-btn');
const navSettings = document.getElementById('nav-settings');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const timerToggle = document.getElementById('timer-toggle');
const timerSeconds = document.getElementById('timer-seconds');

// タイマー DOM
const floatingTimer = document.getElementById('floating-timer');
const timerDisplay = document.getElementById('timer-display');
const stopTimerBtn = document.getElementById('stop-timer-btn');

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function saveData() {
  localStorage.setItem('workout_memo_data', JSON.stringify(workoutData));
  localStorage.setItem('workout_data_v3', JSON.stringify(workoutData));
}

function saveSettings() {
  appSettings.timerAuto = timerToggle.checked;
  appSettings.timerSec = parseInt(timerSeconds.value, 10);
  localStorage.setItem('workout_memo_settings', JSON.stringify(appSettings));
}

// カレンダー描画
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  currentMonthEl.textContent = `${year}年 ${month + 1}月`;
  calendarDaysEl.innerHTML = '';

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendarDaysEl.appendChild(document.createElement('div'));
  }

  for (let date = 1; date <= lastDate; date++) {
    const dayEl = document.createElement('div');
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    dayEl.textContent = date;

    if (dateStr === selectedDateStr) dayEl.classList.add('active');
    
    if (workoutData[dateStr] && workoutData[dateStr].length > 0) {
      dayEl.classList.add('has-data');
    }

    dayEl.addEventListener('click', () => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderWorkouts();
    });

    calendarDaysEl.appendChild(dayEl);
  }
}

// カレンダー折りたたみ
toggleCalendarBtn.addEventListener('click', () => {
  if (calendarBody.classList.contains('hidden')) {
    calendarBody.classList.remove('hidden');
    toggleCalendarBtn.textContent = "▲ 縮小";
  } else {
    calendarBody.classList.add('hidden');
    toggleCalendarBtn.textContent = "▼ 展開";
  }
});

// ワークアウト描画
function renderWorkouts() {
  const [y, m, d] = selectedDateStr.split('-');
  const dateObj = new Date(y, parseInt(m) - 1, d);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  selectedDateText.textContent = `${y}年${parseInt(m)}月${parseInt(d)}日(${weekDays[dateObj.getDay()]}) のトレーニング`;
  
  container.innerHTML = '';
  const categories = workoutData[selectedDateStr] || [];

  categories.forEach((cat, catIdx) => {
    const card = document.createElement('div');
    card.className = 'category-card';

    let exercisesHtml = '';
    cat.exercises.forEach((ex, exIdx) => {
      let setsHtml = '';
      ex.sets.forEach((set, setIdx) => {
        setsHtml += `
          <tr>
            <td>${setIdx + 1}セット目</td>
            <td>
              <div class="step-control">
                <button class="step-btn" onclick="changeVal('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'weight', -0.25)">-</button>
                <input type="number" step="0.25" value="${set.weight}" onchange="updateSet('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'weight', this.value)">
                <button class="step-btn" onclick="changeVal('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'weight', 0.25)">+</button>
              </div>
            </td>
            <td>
              <div class="step-control">
                <button class="step-btn" onclick="changeVal('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'reps', -1)">-</button>
                <input type="number" value="${set.reps}" onchange="updateSet('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'reps', this.value)">
                <button class="step-btn" onclick="changeVal('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'reps', 1)">+</button>
              </div>
            </td>
            <td><button class="del-btn" onclick="deleteSet('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx})">✕</button></td>
          </tr>
        `;
      });

      exercisesHtml += `
        <div class="exercise-block">
          <div class="exercise-header">
            <span class="exercise-title">${ex.name}</span>
            <button class="del-btn" onclick="deleteExercise('${selectedDateStr}', ${catIdx}, ${exIdx})">種目削除</button>
          </div>
          <table class="workout-table">
            <thead>
              <tr>
                <th>セット</th>
                <th>重量(kg) [±0.25]</th>
                <th>回数 [±1]</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${setsHtml}</tbody>
          </table>
          <div class="action-btn-group">
            <button class="sub-btn" onclick="addSet('${selectedDateStr}', ${catIdx}, ${exIdx})">＋ セット追加</button>
            <button class="sub-btn" onclick="copyLastRecord('${selectedDateStr}', ${catIdx}, ${exIdx}, '${ex.name}')">前回の記録をコピー</button>
          </div>
        </div>
      `;
    });

    const options = (EXERCISE_MASTER[cat.category] || []).map(item => `<option value="${item}">${item}</option>`).join('');

    card.innerHTML = `
      <div class="category-header">
        <span class="category-title">■ ${cat.category}</span>
        <button class="del-btn" onclick="deleteCategory('${selectedDateStr}', ${catIdx})">部位削除</button>
      </div>
      ${exercisesHtml}
      <div class="add-exercise-wrapper">
        <select id="ex-select-${catIdx}" class="form-select">
          <option value="">-- 種目を選択 --</option>
          ${options}
          <option value="__custom__">＋ 直接手入力</option>
        </select>
        <button class="action-btn-primary" onclick="addExerciseFromSelect('${selectedDateStr}', ${catIdx})">種目追加</button>
      </div>
    `;
    container.appendChild(card);
  });
}

// データ調整
window.changeVal = function(dateStr, catIdx, exIdx, setIdx, field, delta) {
  let val = parseFloat(workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field]) || 0;
  val = Math.max(0, val + delta);
  workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field] = val;
  saveData();
  renderWorkouts();
  triggerTimer();
};

window.updateSet = function(dateStr, catIdx, exIdx, setIdx, field, value) {
  workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field] = value;
  saveData();
  triggerTimer();
};

window.addSet = function(dateStr, catIdx, exIdx) {
  const sets = workoutData[dateStr][catIdx].exercises[exIdx].sets;
  const lastSet = sets[sets.length - 1] || { weight: 0, reps: 0 };
  sets.push({ weight: lastSet.weight, reps: lastSet.reps });
  saveData();
  renderWorkouts();
  triggerTimer();
};

// 前回記録コピー
window.copyLastRecord = function(dateStr, catIdx, exIdx, exerciseName) {
  let foundSets = null;
  const dates = Object.keys(workoutData).sort().reverse();
  
  for (let d of dates) {
    if (d >= dateStr) continue;
    for (let c of workoutData[d]) {
      for (let e of c.exercises) {
        if (e.name === exerciseName && e.sets.length > 0) {
          foundSets = JSON.parse(JSON.stringify(e.sets));
          break;
        }
      }
      if (foundSets) break;
    }
    if (foundSets) break;
  }

  if (foundSets) {
    workoutData[dateStr][catIdx].exercises[exIdx].sets = foundSets;
    saveData();
    renderWorkouts();
  } else {
    alert("前回の記録が見つかりませんでした。");
  }
};

// 削除処理
window.deleteSet = function(dateStr, catIdx, exIdx, setIdx) {
  if (confirm("このセットを削除しますか？")) {
    workoutData[dateStr][catIdx].exercises[exIdx].sets.splice(setIdx, 1);
    saveData();
    renderWorkouts();
  }
};

window.deleteExercise = function(dateStr, catIdx, exIdx) {
  if (confirm("この種目を削除しますか？")) {
    workoutData[dateStr][catIdx].exercises.splice(exIdx, 1);
    saveData();
    renderWorkouts();
  }
};

window.deleteCategory = function(dateStr, catIdx) {
  if (confirm("この部位エリアを削除しますか？")) {
    workoutData[dateStr].splice(catIdx, 1);
    if (workoutData[dateStr].length === 0) delete workoutData[dateStr];
    saveData();
    renderCalendar();
    renderWorkouts();
  }
};

// 種目追加
window.addExerciseFromSelect = function(dateStr, catIdx) {
  const select = document.getElementById(`ex-select-${catIdx}`);
  let name = select.value;
  if (!name) return;

  if (name === "__custom__") {
    name = prompt("種目名を入力してください", "");
    if (!name) return;
  }

  workoutData[dateStr][catIdx].exercises.push({
    name: name,
    sets: [{ weight: 0, reps: 0 }]
  });
  saveData();
  renderWorkouts();
};

addCategoryBtn.addEventListener('click', () => {
  const category = categorySelect.value;
  if (!category) return;

  if (!workoutData[selectedDateStr]) workoutData[selectedDateStr] = [];
  workoutData[selectedDateStr].push({ category: category, exercises: [] });
  
  categorySelect.value = "";
  saveData();
  renderWorkouts();
});

// タイマー起動
function triggerTimer() {
  if (!appSettings.timerAuto) return;
  clearInterval(timerInterval);
  
  let timeLeft = appSettings.timerSec;
  floatingTimer.classList.remove('hidden');
  
  updateTimerText(timeLeft);

  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      floatingTimer.classList.add('hidden');
    } else {
      updateTimerText(timeLeft);
    }
  }, 1000);
}

function updateTimerText(sec) {
  const m = String(Math.floor(sec / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  timerDisplay.textContent = `${m}:${s}`;
}

stopTimerBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  floatingTimer.classList.add('hidden');
});

// 設定モーダル処理
function openSettings() {
  timerToggle.checked = appSettings.timerAuto;
  timerSeconds.value = appSettings.timerSec;
  settingsModal.classList.remove('hidden');
}

settingsToggleBtn.addEventListener('click', openSettings);
navSettings.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
closeSettingsBtn.addEventListener('click', () => {
  saveSettings();
  settingsModal.classList.add('hidden');
});

// 月移動
prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

// 初期化
renderCalendar();
renderWorkouts();