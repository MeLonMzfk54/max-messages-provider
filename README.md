# MAX Messages

Веб-приложение для отправки и получения текстовых сообщений в мессенджере MAX через [GREEN-API](https://green-api.com/max).

Интерфейс выполнен по мотивам [web.max.ru](https://web.max.ru/).

## Требования

- [Node.js](https://nodejs.org/) 18 или новее
- Аккаунт и авторизованный инстанс MAX в [личном кабинете GREEN-API](https://console.green-api.com/)

## Локальный запуск

```bash
npm install
npm run dev
```

После запуска откройте в браузере адрес из терминала, обычно:

```
http://127.0.0.1:5173/
```

Сборка production-версии:

```bash
npm run build
npm run preview
```

## Подготовка GREEN-API

1. Создайте инстанс MAX в личном кабинете и авторизуйте его по QR-коду в приложении MAX.
2. Скопируйте `idInstance` и `apiTokenInstance`. При необходимости также скопируйте `apiUrl`.
3. Для получения входящих через HTTP API поле `webhookUrl` должно быть пустым, а получение входящих сообщений — включено. При входе приложение проверяет эти настройки и при необходимости включает их само.

## Использование

1. Откройте приложение и введите `idInstance` и `apiTokenInstance`.
2. Нажмите «Новый чат» и укажите номер получателя в международном формате, например `79991234567`.
3. Отправьте текстовое сообщение.
4. Ответ из MAX появится в том же чате.

## Реализация

- Отправка: [SendMessage](https://green-api.com/v3/docs/api/sending/SendMessage/)
- Получение: [ReceiveNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/ReceiveNotification/) и [DeleteNotification](https://green-api.com/v3/docs/api/receiving/technology-http-api/DeleteNotification/)
- Стек: React, TypeScript, Vite

В режиме разработки запросы к GREEN-API проксируются через Vite (`/green-api/...`), чтобы обойти ограничения CORS.
