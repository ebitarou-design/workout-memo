// 初期データ構造
const defaultExercises = {
  "胸": ["ベンチプレス", "ダンベルフライ", "プッシュアップ"],
  "背中": ["ラットプルダウン", "デッドリフト", "ベントオーバーロー"],
  "脚": ["スクワット", "レッグプレス", "レッグカール"],
  "肩": ["ショルダープレス", "サイドレイズ"],
  "腕": ["アームカール", "インクラインカール"]
};

let exerciseData = JSON.parse(localStorage.getItem("custom_exercises")) || defaultExercises;
let workoutLogs = JSON.parse(localStorage.getItem("workout_logs")) || {};
let selectedDate = new Date().toISOString().split("T")[0];
let weightChartInstance = null;

document.addEventListener("DOMContentLoaded", () => {
  initNav();
  renderCalendar();
  initSettings();
  initChartControls();
});

// ナビゲーション切り替え
function initNav() {
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
      
      e.target.classList.add("active");
      const targetId = e.target.dataset.target;
      document.getElementById(targetId).classList.add("active");

      if (targetId === "view-chart") renderChart();
      if (targetId === "view-calendar") renderCalendar();
    });
  });
}

// 📅 カレンダー & 🔥 スタンプ機能
function renderCalendar() {
  const grid = document.getElementById("calendar-grid");
  grid.innerHTML = "";
  
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  document.getElementById("current-month-year").innerText = `${year}年 ${month + 1}月`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const cell = document.createElement("div");
    cell.className = "day-cell";
    if (dateStr === new Date().toISOString().split("T")[0]) cell.classList.add("today");

    let cellHTML = `<span>${d}</span>`;
    // 🔥 トレーニング記録が存在する場合は🔥スタンプを表示
    if (workoutLogs[dateStr] && Object.keys(workoutLogs[dateStr]).length > 0) {
      cellHTML += `<span class="stamp">🔥</span>`;
    }
    cell.innerHTML = cellHTML;
    cell.addEventListener("click", () => selectDate(dateStr));
    grid.appendChild(cell);
  }
}

function selectDate(dateStr) {
  selectedDate = dateStr;
  document.getElementById("selected-date-text").innerText = `${dateStr} の記録`;
  renderDayWorkout();
}

// 💡 リアルタイム前回比較 ＆ 日別ワークアウト表示
function renderDayWorkout() {
  const container = document.getElementById("workout-list");
  container.innerHTML = "";
  const dayData = workoutLogs[selectedDate] || {};

  Object.keys(exerciseData).forEach(part => {
    const partDiv = document.createElement("div");
    partDiv.innerHTML = `<h4>■ ${part}</h4>`;
    
    exerciseData[part].forEach(ex => {
      const exData = dayData[ex] || [{ weight: "", reps: "" }];
      const prevRecord = getPreviousRecord(ex, selectedDate);
      
      let hintText = prevRecord 
        ? `<div class="prev-hint">💡 前回 (${prevRecord.date}): ${prevRecord.weight}kg × ${prevRecord.reps}回</div>`
        : `<div class="prev-hint">💡 過去の記録なし</div>`;

      let exHTML = `<div class="exercise-block"><strong>${ex}</strong>${hintText}`;
      exData.forEach((set, idx) => {
        exHTML += `
          <div class="set-row">
            ${idx + 1}セット目: 
            <input type="number" placeholder="kg" value="${set.weight || ''}" onchange="updateSet('${part}', '${ex}', ${idx}, 'weight', this.value)"> kg
            <input type="number" placeholder="回" value="${set.reps || ''}" onchange="updateSet('${part}', '${ex}', ${idx}, 'reps', this.value)"> 回
          </div>`;
      });
      exHTML += `<button onclick="addSet('${part}', '${ex}')">+ セット追加</button></div>`;
      partDiv.innerHTML += exHTML;
    });
    container.appendChild(partDiv);
  });
}

// 過去の最新記録を取得する関数
function getPreviousRecord(exerciseName, currentDate) {
  const dates = Object.keys(workoutLogs).filter(d => d < currentDate).sort().reverse();
  for (let d of dates) {
    if (workoutLogs[d] && workoutLogs[d][exerciseName]) {
      const validSets = workoutLogs[d][exerciseName].filter(s => s.weight && s.reps);
      if (validSets.length > 0) {
        // 最高重量のセットを抽出
        const maxSet = validSets.reduce((prev, curr) => (parseFloat(curr.weight) > parseFloat(prev.weight)) ? curr : prev);
        return { date: d, weight: maxSet.weight, reps: maxSet.reps };
      }
    }
  }
  return null;
}

function updateSet(part, exercise, setIndex, field, value) {
  if (!workoutLogs[selectedDate]) workoutLogs[selectedDate] = {};
  if (!workoutLogs[selectedDate][exercise]) workoutLogs[selectedDate][exercise] = [];
  if (!workoutLogs[selectedDate][exercise][setIndex]) workoutLogs[selectedDate][exercise][setIndex] = {};

  workoutLogs[selectedDate][exercise][setIndex][field] = value;
  localStorage.setItem("workout_logs", JSON.stringify(workoutLogs));
}

function addSet(part, exercise) {
  if (!workoutLogs[selectedDate]) workoutLogs[selectedDate] = {};
  if (!workoutLogs[selectedDate][exercise]) workoutLogs[selectedDate][exercise] = [];
  workoutLogs[selectedDate][exercise].push({ weight: "", reps: "" });
  localStorage.setItem("workout_logs", JSON.stringify(workoutLogs));
  renderDayWorkout();
}

// 📊 チャート機能 (1RM推定 / 最高重量 推移)
function initChartControls() {
  const partSelect = document.getElementById("chart-part-select");
  const exSelect = document.getElementById("chart-exercise-select");

  partSelect.innerHTML = Object.keys(exerciseData).map(p => `<option value="${p}">${p}</option>`).join("");
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
  exSelect.innerHTML = (exerciseData[part] || []).map(e => `<option value="${e}">${e}</option>`).join("");
}

function renderChart() {
  const exName = document.getElementById("chart-exercise-select").value;
  if (!exName) return;

  const dates = Object.keys(workoutLogs).sort();
  const chartData = [];
  const labels = [];
  let maxWeightOverall = 0;

  dates.forEach(d => {
    if (workoutLogs[d] && workoutLogs[d][exName]) {
      const sets = workoutLogs[d][exName].filter(s => s.weight);
      if (sets.length > 0) {
        // 日ごとの最高重量を抽出
        const dayMax = Math.max(...sets.map(s => parseFloat(s.weight) || 0));
        if (dayMax > 0) {
          labels.push(d.slice(5)); // MM-DD
          chartData.push(dayMax);
          if (dayMax > maxWeightOverall) maxWeightOverall = dayMax;
        }
      }
    }
  });

  document.getElementById("chart-summary").innerText = `🏆 自己ベスト: ${maxWeightOverall} kg`;

  const ctx = document.getElementById("weightChart").getContext("2d");
  if (weightChartInstance) weightChartInstance.destroy();

  weightChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: `${exName} (最高重量 kg)`,
        data: chartData,
        borderColor: '#4CAF50',
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        fill: true,
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: false, grid: { color: '#333' } },
        x: { grid: { color: '#333' } }
      }
    }
  });
}

// ⚙️ バックアップ & カスタム種目機能
function initSettings() {
  // バックアップ書き出し
  document.getElementById("btn-export").addEventListener("click", () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      exercises: exerciseData,
      logs: workoutLogs
    }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `workout_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  // バックアップ復元
  document.getElementById("import-file").addEventListener("change", (e) => {
    const fileReader = new FileReader();
    fileReader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.exercises && imported.logs) {
          exerciseData = imported.exercises;
          workoutLogs = imported.logs;
          localStorage.setItem("custom_exercises", JSON.stringify(exerciseData));
          localStorage.setItem("workout_logs", JSON.stringify(workoutLogs));
          alert("データを正常に復元しました！");
          location.reload();
        }
      } catch (err) {
        alert("ファイルの読み込みに失敗しました。正しいJSONファイルか確認してください。");
      }
    };
    if (e.target.files[0]) fileReader.readAsText(e.target.files[0]);
  });

  // カスタム種目追加 UI
  const customPartSel = document.getElementById("custom-part-select");
  customPartSel.innerHTML = Object.keys(exerciseData).map(p => `<option value="${p}">${p}</option>`).join("");
  
  document.getElementById("btn-add-exercise").addEventListener("click", () => {
    const part = customPartSel.value;
    const newEx = document.getElementById("custom-exercise-input").value.trim();
    if (newEx && !exerciseData[part].includes(newEx)) {
      exerciseData[part].push(newEx);
      localStorage.setItem("custom_exercises", JSON.stringify(exerciseData));
      document.getElementById("custom-exercise-input").value = "";
      alert(`${part} に 「${newEx}」 を追加しました！`);
      initChartControls();
    }
  });
}