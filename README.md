# Diploma Backend

REST API за мобилна апликация за управление на резервации и събития.

## Технологии
- Node.js 20+, TypeScript
- Express 4
- SQLite (better-sqlite3)
- JWT автентикация (jsonwebtoken) + bcryptjs
- Zod за валидация

## Инсталация

```bash
npm install
cp .env.example .env     # при нужда промени JWT_SECRET
npm run seed             # създава демо потребители и събития
npm run dev              # стартира на http://localhost:4000
```

## Демо акаунти (след `npm run seed`)

| Роля        | Имейл               | Парола     |
|-------------|---------------------|------------|
| Организатор | organizer@demo.bg   | demo1234   |
| Потребител  | user@demo.bg        | demo1234   |

## API ендпойнти

### Автентикация
- `POST /api/auth/register` – регистрация
- `POST /api/auth/login` – вход
- `GET /api/auth/me` – текущ потребител

### Събития
- `GET /api/events` – всички активни бъдещи събития
- `GET /api/events/mine` – моите събития (организатор)
- `GET /api/events/:id` – детайли
- `POST /api/events` – създаване (организатор)
- `PUT /api/events/:id` – редактиране (собственик)
- `DELETE /api/events/:id` – отмяна (собственик)
- `GET /api/events/:id/reservations` – резервации за събитие (организатор)

### Резервации
- `POST /api/reservations` – нова резервация
- `GET /api/reservations/mine` – моите резервации
- `DELETE /api/reservations/:id` – отказ

## База данни
SQLite файл в `./data/app.db`. Може да се отвори с [DB Browser for SQLite](https://sqlitebrowser.org/) за демонстрация пред комисията.
