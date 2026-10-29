// ===== Элементы страницы =====
const taskInput = document.getElementById("taskInput");
const timeToggle = document.getElementById("timeToggle");
const timeFields = document.getElementById("timeFields");
const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");
const addButton = document.getElementById("addButton");
const taskList = document.getElementById("taskList");
const emptyText = document.getElementById("emptyText");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");

const dayLabel = document.getElementById("dayLabel");
const dateInput = document.getElementById("dateInput");
const prevDay = document.getElementById("prevDay");
const nextDay = document.getElementById("nextDay");
const todayBtn = document.getElementById("todayBtn");

const weekList = document.getElementById("weekList");
const statsBox = document.getElementById("statsBox");

// ===== Работа с датами =====
// превращаем дату в строку вида 2026-10-29
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

// превращаем строку 2026-10-29 обратно в дату
function fromISO(s) {
  const parts = s.split("-").map(Number);
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

// прибавляем (или отнимаем) дни
function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

const todayISO = toISO(new Date());
let currentDate = todayISO;

// красивое название дня
function dayName(iso) {
  if (iso === todayISO) return "Сегодня";
  if (iso === addDays(todayISO, 1)) return "Завтра";
  if (iso === addDays(todayISO, -1)) return "Вчера";
  return fromISO(iso).toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long"
  });
}

// ===== Данные =====
let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// старые задачи без даты становятся задачами на сегодня
tasks.forEach(function (t) {
  if (!t.date) {
    t.date = todayISO;
  }
});

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

function sortByTime(list) {
  return [...list].sort(function (a, b) {
    if (!a.start && !b.start) return 0;
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });
}

// ===== Вкладки =====
function showTab(name) {
  document.getElementById("dayTab").classList.toggle("hidden", name !== "day");
  document.getElementById("weekTab").classList.toggle("hidden", name !== "week");
  document.getElementById("statsTab").classList.toggle("hidden", name !== "stats");

  document.querySelectorAll(".tab").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.tab === name);
  });

  if (name === "day") renderDay();
  if (name === "week") renderWeek();
  if (name === "stats") renderStats();
}

document.querySelectorAll(".tab").forEach(function (btn) {
  btn.addEventListener("click", function () {
    showTab(btn.dataset.tab);
  });
});

// ===== Вкладка «День» =====
function setDate(iso) {
  currentDate = iso;
  renderDay();
}

prevDay.addEventListener("click", function () {
  setDate(addDays(currentDate, -1));
});

nextDay.addEventListener("click", function () {
  setDate(addDays(currentDate, 1));
});

todayBtn.addEventListener("click", function () {
  setDate(todayISO);
});

dateInput.addEventListener("change", function () {
  if (dateInput.value) {
    setDate(dateInput.value);
  }
});

timeToggle.addEventListener("change", function () {
  timeFields.classList.toggle("hidden", !timeToggle.checked);
});

function renderDay() {
  dayLabel.textContent = dayName(currentDate);
  dateInput.value = currentDate;
  todayBtn.classList.toggle("hidden", currentDate === todayISO);

  taskList.innerHTML = "";

  const dayTasks = sortByTime(
    tasks.filter(function (t) {
      return t.date === currentDate;
    })
  );

  dayTasks.forEach(function (task) {
    const li = document.createElement("li");
    if (task.done) {
      li.classList.add("completed");
    }

    const textBox = document.createElement("div");
    textBox.className = "task-text";

    if (task.start) {
      const badge = document.createElement("span");
      badge.className = "time-badge";
      badge.textContent = task.end ? task.start + "–" + task.end : task.start;
      textBox.appendChild(badge);
    }

    const label = document.createElement("span");
    label.className = "task-label";
    label.textContent = task.text;
    textBox.appendChild(label);

    textBox.addEventListener("click", function () {
      task.done = !task.done;
      saveTasks();
      renderDay();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "🗑";
    deleteButton.addEventListener("click", function () {
      tasks = tasks.filter(function (t) {
        return t !== task;
      });
      saveTasks();
      renderDay();
    });

    li.appendChild(textBox);
    li.appendChild(deleteButton);
    taskList.appendChild(li);
  });

  // прогресс за выбранный день
  const total = dayTasks.length;
  const doneCount = dayTasks.filter(function (t) {
    return t.done;
  }).length;

  if (total === 0) {
    progressText.textContent = "Нет задач";
    progressBar.style.width = "0%";
  } else {
    const percent = Math.round((doneCount / total) * 100);
    progressText.textContent = "Выполнено " + doneCount + " из " + total + " (" + percent + "%)";
    progressBar.style.width = percent + "%";
  }

  emptyText.classList.toggle("hidden", total > 0);
}

addButton.addEventListener("click", function () {
  const text = taskInput.value.trim();

  if (text === "") {
    return;
  }

  let start = "";
  let end = "";
  if (timeToggle.checked) {
    start = startInput.value;
    end = endInput.value;
  }

  tasks.push({
    text: text,
    date: currentDate,
    start: start,
    end: end,
    done: false
  });
  saveTasks();
  renderDay();

  taskInput.value = "";
  startInput.value = "";
  endInput.value = "";
  timeToggle.checked = false;
  timeFields.classList.add("hidden");
});

// ===== Вкладка «Неделя» =====
function renderWeek() {
  weekList.innerHTML = "";

  // находим понедельник той недели, которую смотрим
  const dayOfWeek = (fromISO(currentDate).getDay() + 6) % 7;
  const monday = addDays(currentDate, -dayOfWeek);

  for (let i = 0; i < 7; i++) {
    const iso = addDays(monday, i);
    const dayTasks = sortByTime(
      tasks.filter(function (t) {
        return t.date === iso;
      })
    );
    const doneCount = dayTasks.filter(function (t) {
      return t.done;
    }).length;

    const card = document.createElement("div");
    card.className = "week-card";
    if (iso === todayISO) {
      card.classList.add("today");
    }

    const head = document.createElement("div");
    head.className = "week-head";

    const title = document.createElement("span");
    title.textContent = dayName(iso);

    const count = document.createElement("span");
    count.className = "week-count";
    count.textContent = dayTasks.length > 0 ? doneCount + "/" + dayTasks.length : "";

    head.appendChild(title);
    head.appendChild(count);
    card.appendChild(head);

    if (dayTasks.length === 0) {
      const empty = document.createElement("p");
      empty.className = "week-empty";
      empty.textContent = "Свободный день";
      card.appendChild(empty);
    } else {
      dayTasks.forEach(function (t) {
        const row = document.createElement("div");
        row.className = "week-task";
        if (t.done) {
          row.classList.add("completed");
        }
        row.textContent = (t.start ? t.start + " " : "") + t.text;
        card.appendChild(row);
      });
    }

    // клик по карточке открывает этот день
    card.addEventListener("click", function () {
      currentDate = iso;
      showTab("day");
    });

    weekList.appendChild(card);
  }
}

// ===== Вкладка «Статистика» =====
function renderStats() {
  const total = tasks.length;
  const doneCount = tasks.filter(function (t) {
    return t.done;
  }).length;
  const percent = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const daysWithTasks = new Set(
    tasks.map(function (t) {
      return t.date;
    })
  ).size;

  const items = [
    { number: total, name: "Всего задач" },
    { number: doneCount, name: "Выполнено" },
    { number: total - doneCount, name: "Осталось" },
    { number: percent + "%", name: "Общий прогресс" },
    { number: daysWithTasks, name: "Дней с планами" }
  ];

  statsBox.innerHTML = "";

  items.forEach(function (item) {
    const card = document.createElement("div");
    card.className = "stat-card";

    const number = document.createElement("p");
    number.className = "stat-number";
    number.textContent = item.number;

    const name = document.createElement("p");
    name.className = "stat-name";
    name.textContent = item.name;

    card.appendChild(number);
    card.appendChild(name);
    statsBox.appendChild(card);
  });
}

// ===== Запуск =====
saveTasks();
renderDay();