const STORAGE_KEY = "todo-list.todos";

const form = document.getElementById("new-todo-form");
const input = document.getElementById("new-todo");
const list = document.getElementById("todo-list");
const footer = document.getElementById("footer");
const count = document.getElementById("count");
const clearCompleted = document.getElementById("clear-completed");
const filterButtons = document.querySelectorAll("[data-filter]");

let todos = load();
let filter = "all";

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
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
  list.replaceChildren(...visibleTodos().map(renderTodo));

  const remaining = todos.filter((t) => !t.completed).length;
  count.textContent = `${remaining} item${remaining === 1 ? "" : "s"} left`;
  footer.hidden = todos.length === 0;
  clearCompleted.hidden = remaining === todos.length;

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
    update(todos.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)))
  );

  const title = document.createElement("span");
  title.className = "title";
  title.textContent = todo.title;
  title.title = "Double-click to edit";
  title.addEventListener("dblclick", () => startEditing(li, title, todo));

  const del = document.createElement("button");
  del.type = "button";
  del.className = "delete";
  del.textContent = "✕";
  del.setAttribute("aria-label", `Delete "${todo.title}"`);
  del.addEventListener("click", () => update(todos.filter((t) => t.id !== todo.id)));

  li.append(checkbox, title, del);
  return li;
}

function startEditing(li, title, todo) {
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
      update(todos.map((t) => (t.id === todo.id ? { ...t, title: value } : t)));
    } else {
      update(todos.filter((t) => t.id !== todo.id));
    }
  };

  edit.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  edit.addEventListener("blur", () => finish(true));

  li.replaceChild(edit, title);
  edit.focus();
  edit.select();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = input.value.trim();
  if (!value) return;
  update([...todos, { id: crypto.randomUUID(), title: value, completed: false }]);
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
