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
const todayDate = document.getElementById("todayDate");

let tasks = JSON.parse(localStorage.getItem("tasks")) || [];

// сегодняшняя дата сверху
todayDate.textContent = new Date().toLocaleDateString("ru-RU", {
  weekday: "long",
  day: "numeric",
  month: "long"
});

function saveTasks() {
  localStorage.setItem("tasks", JSON.stringify(tasks));
}

timeToggle.addEventListener("change", function () {
  timeFields.classList.toggle("hidden", !timeToggle.checked);
});

function updateProgress() {
  const total = tasks.length;
  const doneCount = tasks.filter(function (t) {
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

function renderTasks() {
  taskList.innerHTML = "";

  const sorted = [...tasks].sort(function (a, b) {
    if (!a.start && !b.start) return 0;
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });

  sorted.forEach(function (task) {
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
      renderTasks();
    });

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-btn";
    deleteButton.textContent = "🗑";
    deleteButton.addEventListener("click", function () {
      tasks = tasks.filter(function (t) {
        return t !== task;
      });
      saveTasks();
      renderTasks();
    });

    li.appendChild(textBox);
    li.appendChild(deleteButton);
    taskList.appendChild(li);
  });

  updateProgress();
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

  tasks.push({ text: text, start: start, end: end, done: false });
  saveTasks();
  renderTasks();

  taskInput.value = "";
  startInput.value = "";
  endInput.value = "";
  timeToggle.checked = false;
  timeFields.classList.add("hidden");
});

renderTasks();