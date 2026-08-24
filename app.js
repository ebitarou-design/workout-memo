if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.error('SW error:', err));
  });
}

let currentDate = new Date();
let selectedDateStr = formatDate(new Date());

// ローカルストレージデータの読み込み
let workoutData = JSON.parse(localStorage.getItem('workout_data_v2')) || {
  "2024-10-14": [
    {
      category: "■胸 (Chest)",
      exercises: [
        {
          name: "ベンチプレス",
          sets: [
            { weight: 50, reps: 10 },
            { weight: 55, reps: 8 },
            { weight: "", reps: "" }
          ]
        }
      ]
    },
    {
      category: "■脚 (Legs)",
      exercises: [
        {
          name: "スクワット",
          sets: [
            { weight: 60, reps: 12 }
          ]
        }
      ]
    }
  ]
};

const currentMonthEl = document.getElementById('current-month');
const calendarDaysEl = document.getElementById('calendar-days');
const prevMonthBtn = document.getElementById('prev-month');
const nextMonthBtn = document.getElementById('next-month');
const selectedDateText = document.getElementById('selected-date-text');
const container = document.getElementById('workout-categories-container');
const addCategoryBtn = document.getElementById('add-category-btn');

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getFormattedDateText(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(y, parseInt(m) - 1, d);
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];
  return `${y}年${parseInt(m)}月${parseInt(d)}日(${weekDays[dateObj.getDay()]}) のトレーニング`;
}

function saveData() {
  localStorage.setItem('workout_data_v2', JSON.stringify(workoutData));
}

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
    if (workoutData[dateStr] && workoutData[dateStr].length > 0) dayEl.classList.add('has-data');

    dayEl.addEventListener('click', () => {
      selectedDateStr = dateStr;
      renderCalendar();
      renderWorkouts();
    });

    calendarDaysEl.appendChild(dayEl);
  }
}

function renderWorkouts() {
  selectedDateText.textContent = getFormattedDateText(selectedDateStr);
  container.innerHTML = '';

  const categories = workoutData[selectedDateStr] || [];

  categories.forEach((cat, catIdx) => {
    const card = document.createElement('div');
    card.className = 'category-card';

    let exercisesHtml = '';
    cat.exercises.forEach((ex, exIdx) => {
      let setsHtml = '';
      ex.sets.forEach((set, setIdx) => {
        const label = setIdx === 0 ? ex.name : `${setIdx + 1}セット目`;
        setsHtml += `
          <tr>
            <td>${label}</td>
            <td><input type="number" value="${set.weight}" placeholder="50" onchange="updateSet('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'weight', this.value)"></td>
            <td><input type="number" value="${set.reps}" placeholder="10" onchange="updateSet('${selectedDateStr}', ${catIdx}, ${exIdx}, ${setIdx}, 'reps', this.value)"></td>
            <td><button class="add-set-btn" onclick="addSet('${selectedDateStr}', ${catIdx}, ${exIdx})">＋</button></td>
          </tr>
        `;
      });

      exercisesHtml += `
        <table class="workout-table">
          <thead>
            <tr>
              <th>項目</th>
              <th>重量 (kg)</th>
              <th>回数 (Reps)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${setsHtml}
          </tbody>
        </table>
      `;
    });

    card.innerHTML = `
      <div class="category-title">${cat.category}</div>
      ${exercisesHtml}
      <button class="add-workout-btn" onclick="addExercise('${selectedDateStr}', ${catIdx})">＋ トレーニング追加</button>
    `;
    container.appendChild(card);
  });
}

window.updateSet = function(dateStr, catIdx, exIdx, setIdx, field, value) {
  workoutData[dateStr][catIdx].exercises[exIdx].sets[setIdx][field] = value;
  saveData();
};

window.addSet = function(dateStr, catIdx, exIdx) {
  workoutData[dateStr][catIdx].exercises[exIdx].sets.push({ weight: "", reps: "" });
  saveData();
  renderWorkouts();
};

window.addExercise = function(dateStr, catIdx) {
  const name = prompt("種目名を入力してください (例: ベンチプレス)", "");
  if (!name) return;
  workoutData[dateStr][catIdx].exercises.push({
    name: name,
    sets: [{ weight: "", reps: "" }]
  });
  saveData();
  renderWorkouts();
};

addCategoryBtn.addEventListener('click', () => {
  const category = prompt("部位名を入力してください (例: ■胸 (Chest))", "■");
  if (!category) return;
  if (!workoutData[selectedDateStr]) workoutData[selectedDateStr] = [];
  
  workoutData[selectedDateStr].push({
    category: category,
    exercises: []
  });
  saveData();
  renderWorkouts();
});

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

renderCalendar();
renderWorkouts();