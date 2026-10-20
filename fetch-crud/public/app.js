const API_URL = '/books';

const form = document.getElementById('bookForm');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');

// id книги, которая сейчас редактируется
let editingId = null;

function setStatus(text, type) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = type || '';
}

// Общая обёртка над fetch: проверка ответа и разбор JSON
async function request(url, options = {}) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers }
    });
  } catch (err) {
    throw new Error('Сервер недоступен. Запустите его командой npm start');
  }
  if (!response.ok) {
    throw new Error('Ошибка сервера: ' + response.status + ' ' + response.statusText);
  }
  return response.json();
}

// Read: список с поиском, фильтрами и сортировкой (параметры json-server)
async function loadBooks() {
  const [sortField, sortOrder] = document.getElementById('sort').value.split(':');
  const params = new URLSearchParams({ _sort: sortField, _order: sortOrder });

  const search = document.getElementById('search').value.trim();
  const genre = document.getElementById('genreFilter').value;
  const read = document.getElementById('readFilter').value;
  if (search) params.set('q', search);
  if (genre) params.set('genre', genre);
  if (read) params.set('read', read);

  try {
    const books = await request(API_URL + '?' + params);
    renderBooks(books);
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

// Жанры для фильтра и подсказок берутся из всех книг
async function loadGenres() {
  try {
    const books = await request(API_URL);
    const genres = [...new Set(books.map(b => b.genre).filter(Boolean))].sort();
    const filter = document.getElementById('genreFilter');
    const selected = filter.value;

    filter.innerHTML = '<option value="">Все</option>';
    document.getElementById('genres').innerHTML = '';
    genres.forEach(genre => {
      filter.append(new Option(genre, genre));
      document.getElementById('genres').append(new Option(genre));
    });
    filter.value = genres.includes(selected) ? selected : '';
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

// Сначала жанры: если выбранный жанр исчез, фильтр сбрасывается до запроса списка
async function refresh() {
  await loadGenres();
  await loadBooks();
}

function renderBooks(books) {
  const tbody = document.getElementById('bookList');
  tbody.innerHTML = '';

  books.forEach(book => {
    const tr = document.createElement('tr');
    tr.classList.toggle('read', book.read);

    const readCell = document.createElement('td');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = book.read;
    checkbox.title = 'Отметить прочитанной';
    checkbox.onchange = () => toggleRead(book, checkbox.checked);
    readCell.append(checkbox);

    const actions = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Изменить';
    editBtn.onclick = () => startEdit(book);
    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.onclick = () => confirmDelete(book, deleteBtn);
    actions.append(editBtn, deleteBtn);

    tr.append(readCell, cell(book.title), cell(book.author), cell(book.year || '—'), cell(book.genre || '—'), actions);
    tbody.append(tr);
  });

  document.getElementById('count').textContent = books.length;
}

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text;
  return td;
}

function readForm() {
  const title = document.getElementById('title').value.trim();
  const author = document.getElementById('author').value.trim();
  const yearValue = document.getElementById('year').value;
  const year = yearValue ? Number(yearValue) : null;

  if (!title || !author) {
    throw new Error('Заполните название и автора');
  }
  if (year !== null && (!Number.isInteger(year) || year < 1 || year > new Date().getFullYear())) {
    throw new Error('Год должен быть от 1 до ' + new Date().getFullYear());
  }

  return {
    title,
    author,
    year,
    genre: document.getElementById('genre').value.trim(),
    read: document.getElementById('read').checked
  };
}

// Create (POST) и Update (PUT)
form.addEventListener('submit', async e => {
  e.preventDefault();

  let book;
  try {
    book = readForm();
  } catch (err) {
    setStatus(err.message, 'error');
    return;
  }

  submitBtn.disabled = true;
  try {
    if (editingId === null) {
      const created = await request(API_URL, { method: 'POST', body: JSON.stringify(book) });
      setStatus('Книга «' + created.title + '» добавлена', 'success');
    } else {
      const updated = await request(API_URL + '/' + editingId, { method: 'PUT', body: JSON.stringify(book) });
      setStatus('Книга «' + updated.title + '» обновлена', 'success');
    }
    resetForm();
    await refresh();
  } catch (err) {
    setStatus(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
  }
});

// Update (PATCH): изменение одного поля
async function toggleRead(book, read) {
  try {
    await request(API_URL + '/' + book.id, { method: 'PATCH', body: JSON.stringify({ read }) });
    setStatus('«' + book.title + '»: ' + (read ? 'прочитана' : 'не прочитана'), 'success');
    await loadBooks();
  } catch (err) {
    setStatus(err.message, 'error');
    await loadBooks();
  }
}

function startEdit(book) {
  editingId = book.id;
  document.getElementById('title').value = book.title;
  document.getElementById('author').value = book.author;
  document.getElementById('year').value = book.year || '';
  document.getElementById('genre').value = book.genre || '';
  document.getElementById('read').checked = book.read;
  document.getElementById('formTitle').textContent = 'Редактирование книги';
  submitBtn.textContent = 'Сохранить';
  cancelBtn.hidden = false;
  setStatus('');
  document.getElementById('title').focus();
}

function resetForm() {
  editingId = null;
  form.reset();
  document.getElementById('formTitle').textContent = 'Добавить книгу';
  submitBtn.textContent = 'Добавить';
  cancelBtn.hidden = true;
}

cancelBtn.addEventListener('click', () => {
  resetForm();
  setStatus('');
});

// Delete: удаление по второму нажатию, чтобы не удалить случайно
function confirmDelete(book, button) {
  // Второе нажатие засчитывается не раньше чем через 400 мс — двойной клик не удаляет
  if (button.dataset.confirm) {
    if (Date.now() - button.dataset.confirm > 400) deleteBook(book);
    return;
  }
  button.dataset.confirm = Date.now();
  button.textContent = 'Точно удалить?';
  setTimeout(() => {
    delete button.dataset.confirm;
    button.textContent = 'Удалить';
  }, 3000);
}

async function deleteBook(book) {
  try {
    await request(API_URL + '/' + book.id, { method: 'DELETE' });
    if (editingId === book.id) resetForm();
    setStatus('Книга «' + book.title + '» удалена', 'success');
    await refresh();
  } catch (err) {
    setStatus(err.message, 'error');
  }
}

// Поиск с задержкой, чтобы не отправлять запрос на каждый символ
let searchTimer;
document.getElementById('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadBooks, 300);
});
['genreFilter', 'readFilter', 'sort'].forEach(id =>
  document.getElementById(id).addEventListener('change', loadBooks)
);

refresh();
