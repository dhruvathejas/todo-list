# todo-list
Something that remembers, what you need to remember.

A small, dependency-free todo app. Todos are saved in your browser's localStorage.

## Run

Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Features

- Add, complete, and delete todos
- Tap ✏️ (or double-click the text) to change a todo (Enter to save, Esc to cancel, empty to delete); tap 🗑️ to delete it
- Give a todo an optional date with 📅; late, today, and this-week todos are highlighted. Tap the date to change or clear it
- Set an editor name to attribute each todo's creation and most recent change
- Filter by All / Active / Completed
- Clear all completed todos at once
- Light and dark themes follow your system setting

Older todos created before attribution was added show `Unknown` as their creator.
Editor names are stored in the browser alongside todos; this is attribution, not
account authentication or a shared activity history.
