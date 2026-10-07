const TODOS_KEY = 'todos.v1';
const FILTER_KEY = 'todos.filter';
const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

const state = { todos: [], filter: 'all' };

const $ = (id) => document.getElementById(id);
const listEl = $('list');

function load() {
  try {
    const todos = JSON.parse(localStorage.getItem(TODOS_KEY));
    if (Array.isArray(todos)) state.todos = todos;
  } catch {}
  try {
    const f = localStorage.getItem(FILTER_KEY);
    if (['all', 'active', 'done'].includes(f)) state.filter = f;
  } catch {}
}

function save() {
  try {
    localStorage.setItem(TODOS_KEY, JSON.stringify(state.todos));
    localStorage.setItem(FILTER_KEY, state.filter);
  } catch {}
}

function commit() {
  save();
  render();
}

function addTodo(text, due, priority) {
  state.todos.push({
    id: crypto.randomUUID(),
    text,
    done: false,
    due: due || null,
    priority,
    createdAt: Date.now(),
  });
  commit();
}

function updateTodo(id, patch) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) Object.assign(todo, patch);
  commit();
}

function toggleTodo(id) {
  const todo = state.todos.find((t) => t.id === id);
  if (todo) updateTodo(id, { done: !todo.done });
}

function deleteTodo(id) {
  state.todos = state.todos.filter((t) => t.id !== id);
  commit();
}

function clearCompleted() {
  state.todos = state.todos.filter((t) => !t.done);
  commit();
}

function todayStr() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function compare(a, b) {
  if (a.done !== b.done) return a.done ? 1 : -1;
  if (a.priority !== b.priority) return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
  if (a.due !== b.due) {
    if (!a.due) return 1;
    if (!b.due) return -1;
    return a.due < b.due ? -1 : 1;
  }
  return a.createdAt - b.createdAt;
}

function createItem(todo, today) {
  const li = document.createElement('li');
  li.dataset.id = todo.id;
  li.className = `item ${todo.priority}`;
  if (todo.done) li.classList.add('done');
  if (todo.due && !todo.done) {
    if (todo.due < today) li.classList.add('overdue');
    else if (todo.due === today) li.classList.add('today');
  }

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = todo.done;
  check.className = 'toggle';
  check.setAttribute('aria-label', '완료');

  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = todo.text;
  text.title = '더블클릭하여 수정';

  li.append(check, text);

  if (todo.due) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = todo.due === today ? '오늘' : todo.due;
    li.append(due);
  }

  const del = document.createElement('button');
  del.className = 'del';
  del.textContent = '✕';
  del.setAttribute('aria-label', '삭제');
  li.append(del);

  return li;
}

function render() {
  const today = todayStr();
  const visible = state.todos
    .filter((t) => state.filter === 'all' || (state.filter === 'done') === t.done)
    .sort(compare);

  listEl.replaceChildren(...visible.map((t) => createItem(t, today)));
  $('empty').hidden = visible.length > 0;

  const remaining = state.todos.filter((t) => !t.done).length;
  $('count').textContent = `남은 할 일 ${remaining}개`;
  $('clear-done').hidden = !state.todos.some((t) => t.done);

  document.querySelectorAll('#filters button').forEach((b) => {
    b.classList.toggle('active', b.dataset.filter === state.filter);
  });
}

function startEdit(li) {
  const id = li.dataset.id;
  const todo = state.todos.find((t) => t.id === id);
  const textEl = li.querySelector('.text');
  if (!todo || !textEl) return;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'edit';
  input.value = todo.text;
  textEl.replaceWith(input);
  input.focus();
  input.select();

  let finished = false;
  const finish = (saveChange) => {
    if (finished) return;
    finished = true;
    const value = input.value.trim();
    if (!saveChange) return render();
    if (!value) return deleteTodo(id);
    updateTodo(id, { text: value });
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') finish(true);
    else if (e.key === 'Escape') finish(false);
  });
  input.addEventListener('blur', () => finish(true));
}

$('add-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const text = $('text-input').value.trim();
  if (!text) return;
  addTodo(text, $('due-input').value, $('priority-input').value);
  $('text-input').value = '';
  $('due-input').value = '';
  $('text-input').focus();
});

listEl.addEventListener('change', (e) => {
  if (e.target.classList.contains('toggle')) {
    toggleTodo(e.target.closest('li').dataset.id);
  }
});

listEl.addEventListener('click', (e) => {
  if (e.target.classList.contains('del')) {
    deleteTodo(e.target.closest('li').dataset.id);
  }
});

listEl.addEventListener('dblclick', (e) => {
  if (e.target.classList.contains('text')) startEdit(e.target.closest('li'));
});

$('filters').addEventListener('click', (e) => {
  const f = e.target.dataset.filter;
  if (!f) return;
  state.filter = f;
  commit();
});

$('clear-done').addEventListener('click', clearCompleted);

load();
render();
