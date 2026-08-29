// 種目マスターデータ
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

let workoutData = JSON.parse(localStorage.getItem('workout_memo_data')) ||
                  JSON.parse(localStorage.getItem('workout_data_v3')) ||
                  JSON.parse(localStorage.getItem('workout_data')) || {};

let customMaster = JSON.parse(localStorage.getItem('workout_memo_custom_master')) || {};
let weightChartInstance = null;

// DOM要素
const currentMonthEl = document.getElementById('current-month');
const calendarDaysEl = document.getElementById('calendar-days');
const calendarBody = document.getElementById('calendar-body');
const toggleCalendarBtn = document.getElementById('toggle-calendar-btn');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const selectedDateText = document.getElementById('selected-date-text');
const copyClipboardBtn = document.getElementById('copy-clipboard-btn');
const container = document.getElementById('workout-categories-container');
const categorySelect = document.getElementById('category-select');
const addCategoryBtn = document.getElementById('add-category-btn');

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  renderCalendar();
  renderWorkouts();
  initSettings();
  initChartControls();
});

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function saveData() {
  localStorage.setItem('workout_memo_data', JSON.stringify(workoutData));
}

function saveCustomMaster() {
  localStorage.setItem('workout_memo_custom_master', JSON.stringify(customMaster));
}

// ナビゲーション切り替え
function initNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const targetBtn = e.currentTarget;
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
      
      targetBtn.classList.add("active");
      const targetId = targetBtn.dataset.target;
      document.getElementById(targetId).classList.add("active");

      if (targetId === "view-chart") renderChart();
      if (targetId === "view-calendar") { renderCalendar(); renderWorkouts(); }
      if (targetId === "view-settings") renderCustomList();
    });
  });
}

// カレンダー描画（🔥スタンプ対応）
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
    
    let cellContent = `<span>${date}</span>`;
    if (workoutData[dateStr] && workoutData[dateStr].length > 0) {
      cellContent += `<span class="stamp">🔥</span>`;
    }
    dayEl.innerHTML = cellContent;

    if (dateStr === selectedDateStr) dayEl.classList.add('active');

    dayEl.addEventListener('click', () => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderWorkouts();
    });

    calendarDaysEl.appendChild(dayEl);
  }
}

// カレンダー開閉
toggleCalendarBtn.addEventListener('click', () => {
  if (calendarBody.classList.contains('hidden')) {
    calendarBody.classList.remove('hidden');
    toggleCalendarBtn.textContent = "▲ 縮小";
  } else {
    calendarBody.classList.add('hidden');
    toggleCalendarBtn.textContent = "▼ 展開";
  }
});

// 前回の記録を取得する関数
function getPreviousRecord(exerciseName, currentDateStr) {
  const dates = Object.keys(workoutData).filter(d => d < currentDateStr).sort().reverse();
  for (let d of dates) {
    for (let cat of workoutData[d]) {
      for (let ex of cat.exercises) {
        if (ex.name === exerciseName && ex.sets.length > 0) {
          const validSets = ex.sets.filter(s => s.weight > 0 || s.reps > 0);
          if (validSets.length > 0) {
            const maxSet = validSets.reduce((prev, curr) => (parseFloat(curr.weight) > parseFloat(prev.weight)) ? curr : prev, validSets[0]);
            return { date: d, weight: maxSet.weight, reps: maxSet.reps };
          }
        }
      }
    }
  }
  return null;
}

// ワークアウト画面描画
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
      const prevRecord = getPreviousRecord(ex.name, selectedDateStr);
      const hintHtml = prevRecord 
        ? `<div class="prev-hint">💡 前回 (${prevRecord.date}): ${prevRecord.weight}kg × ${prevRecord.reps}回</div>`
        : `<div class="prev-hint">💡 過去の記録なし</div>`;

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
          ${hintHtml}
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

    const defaultEx = EXERCISE_MASTER[cat.category] || [];
    const customEx = customMaster[cat.category] || [];
    const combinedEx = Array.from(new Set([...defaultEx, ...customEx]));

    const options = combinedEx.map(item => `<option value="${item}">${item}</option>`).join('');

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

// 値操作
window.changeVal = function(dateStr, catIdx, exIdx, setIdx, field, delta) {
  let val = parseFloat(workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field]) || 0;
  val = Math.max(0, val + delta);
  workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field] = val;
  saveData();
  renderWorkouts();
};

window.updateSet = function(dateStr, catIdx, exIdx, setIdx, field, value) {
  workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field] = parseFloat(value) || 0;
  saveData();
};

window.addSet = function(dateStr, catIdx, exIdx) {
  const sets = workoutData[dateStr][catIdx].exercises[exIdx].sets;
  const lastSet = sets[sets.length - 1] || { weight: 0, reps: 0 };
  sets.push({ weight: lastSet.weight, reps: lastSet.reps });
  saveData();
  renderWorkouts();
};

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

// 種目追加（プルダウン＋手入力対応）
window.addExerciseFromSelect = function(dateStr, catIdx) {
  const select = document.getElementById(`ex-select-${catIdx}`);
  let name = select.value;
  if (!name) return;

  const categoryName = workoutData[dateStr][catIdx].category;

  if (name === "__custom__") {
    name = prompt("種目名を入力してください", "");
    if (!name) return;
    name = name.trim();

    if (!customMaster[categoryName]) customMaster[categoryName] = [];
    if (!customMaster[categoryName].includes(name)) {
      customMaster[categoryName].push(name);
      saveCustomMaster();
    }
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
  renderCalendar();
  renderWorkouts();
});

// Geminiコピペ機能
copyClipboardBtn.addEventListener('click', () => {
  const categories = workoutData[selectedDateStr] || [];
  if (categories.length === 0) {
    alert("コピーするトレーニング記録がありません。");
    return;
  }

  const [y, m, d] = selectedDateStr.split('-');
  const dateObj = new Date(y, parseInt(m) - 1, d);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  
  let text = `【Workout-memo】\n${y}年${parseInt(m)}月${parseInt(d)}日(${weekDays[dateObj.getDay()]}) のトレーニング記録\n\n`;

  categories.forEach(cat => {
    if (cat.exercises.length > 0) {
      text += `■ ${cat.category}\n`;
      cat.exercises.forEach(ex => {
        text += `・${ex.name}\n`;
        ex.sets.forEach((s, idx) => {
          text += `  ${idx + 1}セット目: ${s.weight}kg × ${s.reps}回\n`;
        });
      });
      text += `\n`;
    }
  });

  navigator.clipboard.writeText(text.trim()).then(() => {
    alert("Gemini貼り付け用のテキストをコピーしました！");
  }).catch(() => {
    alert("コピーに失敗しました。");
  });
});

// 月移動
prevMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
nextMonthBtn.addEventListener('click', () => { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

// 📊 チャート処理
function initChartControls() {
  const partSelect = document.getElementById("chart-part-select");
  const exSelect = document.getElementById("chart-exercise-select");

  const categories = Object.keys(EXERCISE_MASTER);
  partSelect.innerHTML = categories.map(p => `<option value="${p}">${p}</option>`).join("");
  updateChartExOptions();

  partSelect.addEventListener("change", () => {
    updateChartExOptions();
    renderChart();
  });
  exSelect.addEventListener("change", renderChart);
}

function updateChartExOptions() {
  const part = document.getElementById("chart-part-select").value;
  const exSelect = document.getElementById("chart-exercise-select");
  const defaultEx = EXERCISE_MASTER[part] || [];
  const customEx = customMaster[part] || [];
  const combined = Array.from(new Set([...defaultEx, ...customEx]));

  exSelect.innerHTML = combined.map(e => `<option value="${e}">${e}</option>`).join("");
}

function renderChart() {
  const exName = document.getElementById("chart-exercise-select").value;
  if (!exName) return;

  const dates = Object.keys(workoutData).sort();
  const chartData = [];
  const labels = [];
  let maxWeightOverall = 0;

  dates.forEach(d => {
    if (workoutData[d]) {
      workoutData[d].forEach(cat => {
        cat.exercises.forEach(ex => {
          if (ex.name === exName) {
            const validSets = ex.sets.filter(s => s.weight > 0);
            if (validSets.length > 0) {
              const dayMax = Math.max(...validSets.map(s => parseFloat(s.weight)));
              labels.push(d.slice(5));
              chartData.push(dayMax);
              if (dayMax > maxWeightOverall) maxWeightOverall = dayMax;
            }
          }
        });
      });
    }
  });

  document.getElementById("chart-summary").innerText = `🏆 最高重量 (MAX): ${maxWeightOverall} kg`;

  const ctx = document.getElementById("weightChart").getContext("2d");
  if (weightChartInstance) weightChartInstance.destroy();

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${exName} (最高重量 kg)`,
        data: chartData,
        borderColor: '#2e7d32',
        backgroundColor: 'rgba(46, 125, 50, 0.15)',
        fill: true,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false, grid: { color: '#e0e0e0' } },
        x: { grid: { color: '#e0e0e0' } }
      }
    }
  });
}

// ⚙️ バックアップ & 設定
function initSettings() {
  document.getElementById("btn-export").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      workoutData: workoutData,
      customMaster: customMaster
    }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workout_backup_${selectedDateStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  document.getElementById("import-file").addEventListener("change", (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.workoutData) {
          workoutData = imported.workoutData;
          if (imported.customMaster) customMaster = imported.customMaster;
          saveData();
          saveCustomMaster();
          alert("データを復元しました！");
          location.reload();
        }
      } catch (err) {
        alert("ファイルの読み込みに失敗しました。");
      }
    };
    if (e.target.files[0]) fileReader.readAsText(e.target.files[0]);
  });
}

function renderCustomList() {
  const listEl = document.getElementById("custom-exercise-list");
  listEl.innerHTML = "";
  Object.keys(customMaster).forEach(cat => {
    customMaster[cat].forEach(ex => {
      const li = document.createElement("li");
      li.innerHTML = `<span>■ ${cat}: ${ex}</span>`;
      listEl.appendChild(li);
    });
  });
}