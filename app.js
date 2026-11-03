const STORAGE_KEY = "todo-list.todos";
const EDITOR_KEY = "todo-list.editor";

const form = document.getElementById("new-todo-form");
const input = document.getElementById("new-todo");
const dueInput = document.getElementById("new-todo-due");
const editorName = document.getElementById("editor-name");
const list = document.getElementById("todo-list");
const footer = document.getElementById("footer");
const count = document.getElementById("count");
const emptyState = document.getElementById("empty-state");
const emptyTitle = document.getElementById("empty-title");
const emptyMessage = document.getElementById("empty-message");
const progressLabel = document.getElementById("progress-label");
const progressBar = document.getElementById("progress-bar");
const clearCompleted = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");
const panel = document.querySelector(".task-panel");

let todos = load();
let filter = "all";
// Ids of the todo just added or just completed, so only that row animates.
let justAdded = null;
let justCompleted = null;

function loadEditor() {
  try {
    return localStorage.getItem(EDITOR_KEY) || "";
  } catch {
    return "";
  }
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function currentEditor() {
  return editorName.value.trim() || "You";
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch {
    // Storage unavailable (e.g. private mode); keep working in memory.
  }
}

function update(next) {
  todos = next;
  save();
  render();
}

function visibleTodos() {
  if (filter === "active") return todos.filter((t) => !t.completed);
  if (filter === "completed") return todos.filter((t) => t.completed);
  return todos;
}

// Deadlines are stored as "YYYY-MM-DD" and compared as local calendar days.
function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function dueStatus(due) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = parseDate(due);
  const days = Math.round((date - today) / (24 * 60 * 60 * 1000));
  if (days < 0) {
    const overdueDays = -days;
    return { state: "overdue", label: `Late by ${overdueDays} day${overdueDays === 1 ? "" : "s"}` };
  }
  if (days === 0) return { state: "today", label: "Today" };
  if (days === 1) return { state: "soon", label: "Tomorrow" };
  if (days < 7) return { state: "soon", label: `In ${days} days` };
  const sameYear = date.getFullYear() === today.getFullYear();
  const label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: sameYear ? undefined : "numeric" });
  return { state: "later", label };
}

function render() {
  const visible = visibleTodos();
  list.replaceChildren(...visible.map(renderTodo));

  const remaining = todos.filter((t) => !t.completed).length;
  const completed = todos.length - remaining;
  count.textContent = `${remaining} left`;
  footer.hidden = todos.length === 0;
  clearCompleted.hidden = remaining === todos.length;
  emptyState.hidden = visible.length > 0;
  emptyTitle.textContent = todos.length === 0
    ? "Nothing here yet"
    : filter === "active" ? "🎉 All done!" : "Nothing done yet";
  emptyMessage.textContent = todos.length === 0
    ? "Type something above and press Add."
    : filter === "active" ? "Great job!"
      : "Tap the circle when you finish something.";
  progressLabel.textContent = todos.length > 0 && remaining === 0
    ? "🎉 All done!"
    : `${completed} of ${todos.length} done`;
  progressBar.style.width = `${todos.length ? (completed / todos.length) * 100 : 0}%`;
  document.body.classList.toggle("all-done", todos.length > 0 && remaining === 0);

  filterButtons.forEach((b) => b.classList.toggle("selected", b.dataset.filter === filter));
}

function renderTodo(todo, index) {
  const li = document.createElement("li");
  li.className = "todo" + (todo.completed ? " completed" : "");
  li.classList.toggle("is-new", todo.id === justAdded);
  li.classList.toggle("just-completed", todo.id === justCompleted);
  li.style.setProperty("--i", index);
  if (todo.due && !todo.completed) li.dataset.due = dueStatus(todo.due).state;

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `Mark "${todo.title}" as ${todo.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () => {
    justCompleted = checkbox.checked ? todo.id : null;
    update(todos.map((t) => (t.id === todo.id
      ? { ...t, completed: checkbox.checked, updatedBy: currentEditor() }
      : t)));
    justCompleted = null;
  });

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = todo.title;
  title.title = "Double-click to edit";
  title.addEventListener("dblclick", () => startEditing(title, todo));

  const attribution = document.createElement("span");
  attribution.className = "attribution";
  const creator = todo.createdBy || "Unknown";
  const lastEditor = todo.updatedBy || creator;
  attribution.textContent = lastEditor === creator ? `By ${creator}` : `By ${creator} · edited by ${lastEditor}`;

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "icon-button";
  editBtn.textContent = "✏️";
  editBtn.title = "Change";
  editBtn.setAttribute("aria-label", `Change "${todo.title}"`);
  editBtn.addEventListener("click", () => startEditing(title, todo));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "icon-button delete";
  del.textContent = "🗑️";
  del.title = "Delete";
  del.setAttribute("aria-label", `Delete "${todo.title}"`);
  del.addEventListener("click", () => update(todos.filter((t) => t.id !== todo.id)));

  const content = document.createElement("div");
  content.className = "todo-content";
  const meta = document.createElement("div");
  meta.className = "meta";
  meta.append(renderDue(todo), attribution);
  content.append(title, meta);

  li.append(checkbox, content, editBtn, del);
  return li;
}

function startEditing(title, todo) {
  const edit = document.createElement("input");
  edit.className = "edit";
  edit.value = todo.title;
  edit.setAttribute("aria-label", "Edit todo");

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const value = edit.value.trim();
    if (!commit) {
      render();
    } else if (value) {
      update(todos.map((t) => (t.id === todo.id
        ? { ...t, title: value, updatedBy: currentEditor() }
        : t)));
    } else {
      update(todos.filter((t) => t.id !== todo.id));
    }
  };

  edit.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  edit.addEventListener("blur", () => finish(true));

  title.replaceWith(edit);
  edit.focus();
  edit.select();
}

function renderDue(todo) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "due";
  if (todo.due) {
    const { state, label } = dueStatus(todo.due);
    chip.classList.add(todo.completed ? "done" : state);
    chip.textContent = `📅 ${label}`;
    chip.setAttribute("aria-label", `Due: ${label}. Change date`);
  } else {
    chip.classList.add("unset");
    chip.textContent = "📅 Add date";
    chip.setAttribute("aria-label", `Add a date to "${todo.title}"`);
  }
  chip.addEventListener("click", () => editDue(chip, todo));
  return chip;
}

function editDue(chip, todo) {
  const picker = document.createElement("input");
  picker.type = "date";
  picker.className = "due-edit";
  picker.value = todo.due || "";
  picker.setAttribute("aria-label", "Deadline");

  let done = false;
  const finish = (commit) => {
    if (done) return;
    done = true;
    const due = picker.value || null;
    if (!commit || due === (todo.due || null)) {
      render();
    } else {
      update(todos.map((t) => (t.id === todo.id ? { ...t, due, updatedBy: currentEditor() } : t)));
    }
  };

  picker.addEventListener("change", () => finish(true));
  picker.addEventListener("blur", () => finish(true));
  picker.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });

  chip.replaceWith(picker);
  picker.focus();
  try {
    picker.showPicker();
  } catch {
    // showPicker is unsupported in some browsers; the focused input still works.
  }
}

editorName.value = loadEditor() || "You";
editorName.addEventListener("change", () => {
  try {
    localStorage.setItem(EDITOR_KEY, editorName.value.trim());
  } catch {
    // Keep the selected identity for this page even if storage is unavailable.
  }
  render();
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  const actor = currentEditor();
  justAdded = crypto.randomUUID();
  update([...todos, {
    id: justAdded,
    title: value,
    completed: false,
    due: dueInput.value || null,
    createdBy: actor,
    updatedBy: actor,
  }]);
  justAdded = null;
  input.value = "";
  dueInput.value = "";
});

clearCompleted.addEventListener("click", () => update(todos.filter((t) => !t.completed)));

filterButtons.forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    render();
  })
);

// Spotlight that follows the pointer across the panel.
panel.addEventListener("pointermove", (e) => {
  const rect = panel.getBoundingClientRect();
  panel.style.setProperty("--mx", `${e.clientX - rect.left}px`);
  panel.style.setProperty("--my", `${e.clientY - rect.top}px`);
});

// Stagger rows in on first load only, not on every re-render.
list.classList.add("intro");
render();
setTimeout(() => list.classList.remove("intro"), 1200);
