// ===== Помощники =====
const $ = (id) => document.getElementById(id);

// создаёт элемент: тег, класс, текст
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function toISO(d) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function fromISO(s) {
  const p = s.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]);
}
function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

const todayISO = toISO(new Date());
let currentDate = todayISO;

function dayName(iso) {
  if (iso === todayISO) return "Сегодня";
  if (iso === addDays(todayISO, 1)) return "Завтра";
  if (iso === addDays(todayISO, -1)) return "Вчера";
  return fromISO(iso).toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}
function timeText(s, e) {
  return e ? s + "–" + e : s;
}

// ===== Данные =====
function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch (e) { return []; }
}
let tasks = load("tasks");
let exams = load("exams");
let classes = load("classes");

tasks.forEach((t) => {
  if (!t.date) t.date = todayISO;
  if (!t.priority) t.priority = "mid";
});

function save() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
  localStorage.setItem("exams", JSON.stringify(exams));
  localStorage.setItem("classes", JSON.stringify(classes));
}

const PR = { high: 0, mid: 1, low: 2 };
function sortTasks(list) {
  return [...list].sort((a, b) => {
    if (a.start && b.start) return a.start.localeCompare(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return PR[a.priority] - PR[b.priority];
  });
}

// ===== Тема =====
function applyTheme() {
  const dark = localStorage.getItem("theme") === "dark";
  document.body.classList.toggle("dark", dark);
  $("themeBtn").textContent = dark ? "☀️" : "🌙";
}
$("themeBtn").onclick = () => {
  localStorage.setItem("theme", localStorage.getItem("theme") === "dark" ? "light" : "dark");
  applyTheme();
};

// ===== Серия дней и конфетти =====
function dayComplete(iso) {
  const list = tasks.filter((t) => t.date === iso);
  return list.length > 0 && list.every((t) => t.done);
}
function getStreak() {
  let iso = todayISO;
  if (!dayComplete(iso)) iso = addDays(iso, -1);
  let n = 0;
  while (dayComplete(iso)) {
    n++;
    iso = addDays(iso, -1);
  }
  return n;
}
function confetti() {
  const colors = ["#ff6b6b", "#ffd43b", "#51cf66", "#4dabf7", "#da77f2"];
  for (let i = 0; i < 50; i++) {
    const c = el("div", "confetti");
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % 5];
    c.style.animationDelay = Math.random() * 0.8 + "s";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }
}

// ===== Вкладки =====
const TABS = ["day", "week", "classes", "exams", "timer", "stats"];
function showTab(name) {
  TABS.forEach((t) => $(t + "Tab").classList.toggle("hidden", t !== name));
  document.querySelectorAll(".tab").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
  ({ day: renderDay, week: renderWeek, classes: renderClasses, exams: renderExams, timer: showTimer, stats: renderStats })[name]();
}
document.querySelectorAll(".tab").forEach((b) => {
  b.onclick = () => showTab(b.dataset.tab);
});

// ===== День =====
function setDate(iso) { currentDate = iso; renderDay(); }
$("prevDay").onclick = () => setDate(addDays(currentDate, -1));
$("nextDay").onclick = () => setDate(addDays(currentDate, 1));
$("todayBtn").onclick = () => setDate(todayISO);
$("dateInput").onchange = () => { if ($("dateInput").value) setDate($("dateInput").value); };
$("timeToggle").onchange = () => $("timeFields").classList.toggle("hidden", !$("timeToggle").checked);

function renderDay() {
  $("dayLabel").textContent = dayName(currentDate);
  $("dateInput").value = currentDate;
  $("todayBtn").classList.toggle("hidden", currentDate === todayISO);

  // пары этого дня недели
  const wd = (fromISO(currentDate).getDay() + 6) % 7;
  const dc = classes.filter((c) => c.day === wd).sort((a, b) => a.start.localeCompare(b.start));
  const box = $("dayClasses");
  box.innerHTML = "";
  box.classList.toggle("hidden", dc.length === 0);
  if (dc.length) {
    box.appendChild(el("b", null, "🎓 Пары в этот день:"));
    dc.forEach((c) => box.appendChild(el("div", null, timeText(c.start, c.end) + " " + c.name)));
  }

  // задачи
  const list = sortTasks(tasks.filter((t) => t.date === currentDate));
  $("taskList").innerHTML = "";

  list.forEach((task) => {
    const li = el("li", "p-" + task.priority);
    if (task.done) li.classList.add("completed");

    const textBox = el("div", "task-text");
    if (task.start) textBox.appendChild(el("span", "time-badge", timeText(task.start, task.end)));
    textBox.appendChild(el("span", "task-label", task.text));
    textBox.onclick = () => {
      task.done = !task.done;
      save();
      renderDay();
      if (task.done && dayComplete(currentDate)) confetti();
    };

    const edit = el("button", "small-btn", "✏️");
    edit.onclick = () => {
      const t = prompt("Исправь задачу:", task.text);
      if (t && t.trim()) {
        task.text = t.trim();
        save();
        renderDay();
      }
    };

    const del = el("button", "small-btn del", "🗑");
    del.onclick = () => {
      tasks = tasks.filter((t) => t !== task);
      save();
      renderDay();
    };

    const btns = el("div", "btns");
    btns.append(edit, del);
    li.append(textBox, btns);
    $("taskList").appendChild(li);
  });

  // прогресс
  const total = list.length;
  const done = list.filter((t) => t.done).length;
  if (total === 0) {
    $("progressText").textContent = "Нет задач";
    $("progressBar").style.width = "0%";
  } else {
    const p = Math.round((done / total) * 100);
    $("progressText").textContent = "Выполнено " + done + " из " + total + " (" + p + "%)";
    $("progressBar").style.width = p + "%";
  }
  $("cheer").classList.toggle("hidden", !(total > 0 && done === total));
  $("emptyText").classList.toggle("hidden", total > 0);
  $("carryBtn").classList.toggle("hidden", total === done);
  $("streak").textContent = "🔥 " + getStreak() + " дн. подряд";
}

function addTask() {
  const text = $("taskInput").value.trim();
  if (!text) return;
  const useTime = $("timeToggle").checked;
  tasks.push({
    text: text,
    date: currentDate,
    start: useTime ? $("startInput").value : "",
    end: useTime ? $("endInput").value : "",
    priority: $("priority").value,
    done: false
  });
  save();
  $("taskInput").value = "";
  $("startInput").value = "";
  $("endInput").value = "";
  $("priority").value = "mid";
  $("timeToggle").checked = false;
  $("timeFields").classList.add("hidden");
  renderDay();
}
$("addButton").onclick = addTask;
$("taskInput").onkeydown = (e) => { if (e.key === "Enter") addTask(); };

$("carryBtn").onclick = () => {
  const next = addDays(currentDate, 1);
  let n = 0;
  tasks.forEach((t) => {
    if (t.date === currentDate && !t.done) {
      t.date = next;
      n++;
    }
  });
  save();
  renderDay();
  alert("Перенесено задач на следующий день: " + n);
};

// ===== Неделя =====
function renderWeek() {
  $("weekList").innerHTML = "";
  const monday = addDays(currentDate, -((fromISO(currentDate).getDay() + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const iso = addDays(monday, i);
    const list = sortTasks(tasks.filter((t) => t.date === iso));
    const done = list.filter((t) => t.done).length;

    const card = el("div", "week-card clickable");
    if (iso === todayISO) card.classList.add("today");

    const head = el("div", "week-head");
    head.append(el("span", null, dayName(iso)), el("span", "muted", list.length ? done + "/" + list.length : ""));
    card.appendChild(head);

    if (list.length === 0) {
      card.appendChild(el("p", "muted", "Свободный день"));
    } else {
      list.forEach((t) => {
        const row = el("div", "week-task", (t.start ? t.start + " " : "") + t.text);
        if (t.done) row.classList.add("completed");
        card.appendChild(row);
      });
    }

    card.onclick = () => { currentDate = iso; showTab("day"); };
    $("weekList").appendChild(card);
  }
}

// ===== Пары =====
const DAYS = ["Понедельник", "Вторник", "Среда", "Четверг", "Пятница", "Суббота", "Воскресенье"];

function renderClasses() {
  const box = $("classList");
  box.innerHTML = "";

  DAYS.forEach((name, i) => {
    const list = classes.filter((c) => c.day === i).sort((a, b) => a.start.localeCompare(b.start));
    if (list.length === 0) return;

    const card = el("div", "week-card");
    card.appendChild(el("div", "week-head", name));
    list.forEach((c) => {
      const row = el("div", "class-row");
      const del = el("button", "small-btn del", "🗑");
      del.onclick = () => {
        classes = classes.filter((x) => x !== c);
        save();
        renderClasses();
      };
      row.append(el("span", null, timeText(c.start, c.end) + " " + c.name), del);
      card.appendChild(row);
    });
    box.appendChild(card);
  });

  if (!box.children.length) box.appendChild(el("p", "empty", "Расписание пустое. Добавь первую пару! 🎓"));
}

$("addClass").onclick = () => {
  const name = $("clsName").value.trim();
  const start = $("clsStart").value;
  if (!name || !start) {
    alert("Укажи предмет и время начала");
    return;
  }
  classes.push({ name: name, day: Number($("clsDay").value), start: start, end: $("clsEnd").value });
  save();
  $("clsName").value = "";
  $("clsStart").value = "";
  $("clsEnd").value = "";
  renderClasses();
};

// ===== Экзамены =====
function renderExams() {
  const ul = $("examList");
  ul.innerHTML = "";

  [...exams].sort((a, b) => a.date.localeCompare(b.date)).forEach((ex) => {
    const diff = Math.round((fromISO(ex.date) - fromISO(todayISO)) / 86400000);
    let txt = "Прошёл";
    if (diff > 0) txt = "Осталось " + diff + " дн.";
    if (diff === 0) txt = "Сегодня! 💪";

    const li = el("li", diff < 0 ? "completed" : diff <= 3 ? "p-high" : "p-low");
    const info = el("div", "task-text");
    info.appendChild(el("b", null, ex.name));
    info.appendChild(el("div", "muted", fromISO(ex.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long" }) + " · " + txt));

    const del = el("button", "small-btn del", "🗑");
    del.onclick = () => {
      exams = exams.filter((x) => x !== ex);
      save();
      renderExams();
    };
    li.append(info, del);
    ul.appendChild(li);
  });

  if (!exams.length) ul.appendChild(el("p", "empty", "Экзаменов пока нет 🙌"));
}

$("addExam").onclick = () => {
  const name = $("examName").value.trim();
  const date = $("examDate").value;
  if (!name || !date) {
    alert("Укажи название и дату");
    return;
  }
  exams.push({ name: name, date: date });
  save();
  $("examName").value = "";
  $("examDate").value = "";
  renderExams();
};

// ===== Таймер Помодоро =====
let settings = { work: 25, rest: 5 };
try {
  const saved = JSON.parse(localStorage.getItem("timerSettings"));
  if (saved && saved.work >= 1 && saved.rest >= 1) settings = saved;
} catch (e) {}

const LABELS = { work: "📖 Учёба", rest: "☕ Отдых" };
let mode = "work";
let left = settings.work * 60;
let timerId = null;
let pomodoros = 0;

$("workMin").value = settings.work;
$("restMin").value = settings.rest;

function showTimer() {
  const m = String(Math.floor(left / 60)).padStart(2, "0");
  const s = String(left % 60).padStart(2, "0");
  $("timerDisplay").textContent = m + ":" + s;
  $("timerMode").textContent = LABELS[mode];
  $("timerCount").textContent = "Завершено помидоров: " + pomodoros;
  document.title = timerId ? m + ":" + s + " · Планировщик" : "Планировщик учёбы";
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator();
    o.frequency.value = 880;
    o.connect(ctx.destination);
    o.start();
    setTimeout(() => { o.stop(); ctx.close(); }, 700);
  } catch (e) {}
}

function stopTimer() {
  clearInterval(timerId);
  timerId = null;
  $("timerStart").textContent = "▶ Старт";
}

function tick() {
  left--;
  if (left <= 0) {
    beep();
    if (mode === "work") pomodoros++;
    mode = mode === "work" ? "rest" : "work";
    left = settings[mode] * 60;
    stopTimer();
  }
  showTimer();
}

// читаем минуты из полей, проверяем и сохраняем
function applySettings() {
  let w = Math.round(Number($("workMin").value));
  let r = Math.round(Number($("restMin").value));

  if (!(w >= 1)) w = settings.work;
  if (!(r >= 1)) r = settings.rest;
  w = Math.min(w, 180);
  r = Math.min(r, 60);

  settings = { work: w, rest: r };
  $("workMin").value = w;
  $("restMin").value = r;
  localStorage.setItem("timerSettings", JSON.stringify(settings));

  // если таймер не идёт, сразу показываем новое время
  if (!timerId) {
    left = settings[mode] * 60;
  }
  showTimer();
}
$("workMin").onchange = applySettings;
$("restMin").onchange = applySettings;

$("timerStart").onclick = () => {
  if (timerId) {
    stopTimer();
  } else {
    timerId = setInterval(tick, 1000);
    $("timerStart").textContent = "⏸ Пауза";
  }
  showTimer();
};

$("timerReset").onclick = () => {
  stopTimer();
  mode = "work";
  left = settings.work * 60;
  showTimer();
};
// ===== Статистика =====
function renderStats() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const items = [
    [total, "Всего задач"],
    [done, "Выполнено"],
    [total - done, "Осталось"],
    [(total ? Math.round((done / total) * 100) : 0) + "%", "Общий прогресс"],
    ["🔥 " + getStreak(), "Серия дней"],
    [exams.length, "Экзаменов впереди"]
  ];
  $("statsBox").innerHTML = "";
  items.forEach((it) => {
    const card = el("div", "stat-card");
    card.append(el("p", "stat-number", it[0]), el("p", "stat-name", it[1]));
    $("statsBox").appendChild(card);
  });
}

// ===== Запуск =====
applyTheme();
save();
showTab("day");