const http = require('http');
const path = require('path');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3030;
const POST_INTERVAL = 10000;
const MAX_MESSAGE_LENGTH = 500;

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// WebSocket: чат через Socket.io
let online = 0;

io.on('connection', socket => {
  online++;
  io.emit('online', online);

  // Данные клиента проверяются по типу: String() на объекте может бросить исключение и уронить процесс
  socket.on('join', name => {
    socket.data.name = ((typeof name === 'string' && name.trim()) || 'Гость').slice(0, 30);
    socket.broadcast.emit('system', socket.data.name + ' вошёл в чат');
  });

  socket.on('message', (text, ack) => {
    text = typeof text === 'string' ? text.trim() : '';
    if (!text || text.length > MAX_MESSAGE_LENGTH) {
      if (typeof ack === 'function') ack({ ok: false, error: 'Сообщение пустое или длиннее ' + MAX_MESSAGE_LENGTH + ' символов' });
      return;
    }
    io.emit('message', { name: socket.data.name || 'Гость', text, time: new Date().toISOString() });
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('disconnect', () => {
    online--;
    io.emit('online', online);
    if (socket.data.name) io.emit('system', socket.data.name + ' вышел из чата');
  });
});

// Server-Sent Events: лента новых постов
const sseClients = new Set();
let postId = 0;

function sendPost(post) {
  const data = 'id: ' + post.id + '\nevent: post\ndata: ' + JSON.stringify(post) + '\n\n';
  sseClients.forEach(res => res.write(data));
}

function createPost(title, author) {
  return { id: ++postId, title, author, time: new Date().toISOString() };
}

app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  });
  res.flushHeaders();
  // Интервал переподключения для EventSource
  res.write('retry: 3000\n\n');

  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

// Публикация поста вручную — он сразу уходит всем подписчикам SSE
app.post('/posts', (req, res) => {
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : '';
  if (!title) {
    res.status(400).json({ error: 'Заголовок поста не может быть пустым' });
    return;
  }
  const post = createPost(title.slice(0, 200), 'Пользователь');
  sendPost(post);
  res.status(201).json(post);
});

// Автоматические «новые посты» по таймеру
const AUTO_TITLES = [
  'Вышла новая версия браузера',
  'Как работает Fetch API',
  'WebSocket или SSE: что выбрать',
  'Десять советов по JavaScript',
  'Обзор возможностей HTML5',
  'Сервер прислал свежую новость'
];

setInterval(() => {
  const title = AUTO_TITLES[Math.floor(Math.random() * AUTO_TITLES.length)];
  sendPost(createPost(title, 'Сервер'));
}, POST_INTERVAL);

// Комментарий раз в 15 секунд, чтобы прокси не закрывали неактивное соединение
setInterval(() => {
  sseClients.forEach(res => res.write(': ping\n\n'));
}, 15000);

// Битый JSON в запросе — ответ 400 вместо HTML со стеком ошибки
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.status === 400 ? 'Некорректный JSON' : 'Ошибка сервера' });
});

server.listen(PORT, () => {
  console.log('Сервер запущен: http://localhost:' + PORT);
});
