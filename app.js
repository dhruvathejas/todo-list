const STORAGE_KEY = "todo-list.todos";
const EDITOR_KEY = "todo-list.editor";

const form = document.getElementById("new-todo-form");
const input = document.getElementById("new-todo");
const editorName = document.getElementById("editor-name");
const editorAvatar = document.getElementById("editor-avatar");
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

let todos = load();
let filter = "all";

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

function render() {
  const visible = visibleTodos();
  list.replaceChildren(...visible.map(renderTodo));

  const remaining = todos.filter((t) => !t.completed).length;
  const completed = todos.length - remaining;
  count.textContent = `${remaining} item${remaining === 1 ? "" : "s"} left`;
  footer.hidden = todos.length === 0;
  clearCompleted.hidden = remaining === todos.length;
  emptyState.hidden = visible.length > 0;
  emptyTitle.textContent = todos.length === 0
    ? "Nothing on your list yet"
    : filter === "active" ? "All caught up!" : "No completed tasks yet";
  emptyMessage.textContent = todos.length === 0
    ? "Add a task above and take it one step at a time."
    : filter === "active" ? "You’ve made it through everything on your list."
      : "Finish a task and it will find its way here.";
  progressLabel.textContent = `${completed} of ${todos.length} done`;
  progressBar.style.width = `${todos.length ? (completed / todos.length) * 100 : 0}%`;

  filterButtons.forEach((b) => b.classList.toggle("selected", b.dataset.filter === filter));
}

function renderTodo(todo) {
  const li = document.createElement("li");
  li.className = "todo" + (todo.completed ? " completed" : "");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = todo.completed;
  checkbox.setAttribute("aria-label", `Mark "${todo.title}" as ${todo.completed ? "active" : "completed"}`);
  checkbox.addEventListener("change", () =>
    update(todos.map((t) => (t.id === todo.id
      ? { ...t, completed: checkbox.checked, updatedBy: currentEditor() }
      : t)))
  );

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = todo.title;
  title.title = "Double-click to edit";
  title.addEventListener("dblclick", () => startEditing(title, todo));

  const attribution = document.createElement("span");
  attribution.className = "attribution";
  const creator = todo.createdBy || "Unknown";
  const lastEditor = todo.updatedBy || creator;
  attribution.textContent = `Added by ${creator} · Changed by ${lastEditor}`;

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete";
  del.textContent = "×";
  del.setAttribute("aria-label", `Delete "${todo.title}"`);
  del.addEventListener("click", () => update(todos.filter((t) => t.id !== todo.id)));

  const content = document.createElement("div");
  content.className = "todo-content";
  content.append(title, attribution);

  li.append(checkbox, content, del);
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
  update([...todos, {
    id: crypto.randomUUID(),
    title: value,
    completed: false,
    createdBy: actor,
    updatedBy: actor,
  }]);
  input.value = "";
});

clearCompleted.addEventListener("click", () => update(todos.filter((t) => !t.completed)));

filterButtons.forEach((b) =>
  b.addEventListener("click", () => {
    filter = b.dataset.filter;
    render();
  })
);

render();
