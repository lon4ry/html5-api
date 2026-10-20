# HTML 5 API

Практические работы по дисциплине «HTML 5 API».

| Раздел | Работа | Файлы |
|---|---|---|
| 1. Введение | Отчёт: основы, отличия от HTML 4.01, поддержка браузерами | `section1-report.html` |
| 2. Геолокация и хранилище | Geolocation, LocalStorage, IndexedDB | `geo-storage.html`, `webstorage.html`, `indexeddb.html` |
| 3. Мультимедиа | Аудио и видео, Canvas-анимация, обработка изображений | `section3-multimedia.html`, `media/` |
| 4. Сеть | CRUD «Каталог книг» на Fetch API и json-server | `fetch-crud/` |
| 4. Сеть | Fetch к Fake API, чат на WebSocket, Server-Sent Events | `section4-network/` |
| 5. Файлы и устройства | Локальное файловое хранилище (localStorage) | `file-storage.html` |
| 5. Файлы и устройства | Drag-n-Drop: квадраты по цветам | `drag-n-drop.html` |
| 5. Файлы и устройства | FileReader, перетаскивание файлов, геолокация, камера | `section5-files-devices.html` |
| 6. Итоговое задание | History API, Canvas + requestAnimationFrame, Web Workers | `final-project.html` |

HTML-файлы открываются в браузере напрямую. Работы с сервером запускаются так (подробности в их README):

```bash
cd fetch-crud && npm install && npm start          # http://localhost:3000
cd section4-network && npm install && npm start    # http://localhost:3030
```
