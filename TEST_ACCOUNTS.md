# Test accounts

All passwords are the same: **`demo1234`**

Re-create the data any time with:

```bash
cd diploma-backend
npm run seed
```

---

## Organizers (role: `organizer`)

| Email                          | Name              | What they organize                                  |
| ------------------------------ | ----------------- | --------------------------------------------------- |
| `organizer@demo.bg`            | Организатор Демо  | Demo catch-all — concert in Varna, crafts festival  |
| `maria.popova@artsofia.bg`     | Мария Попова      | Cultural — philharmonic, theatre, museum night      |
| `ivan.dimitrov@techbg.bg`      | Иван Димитров     | Tech — React Native workshop, DevBG, Sofia JS       |
| `elena.todorova@sportbg.bg`    | Елена Тодорова    | Sports — Sofia marathon, yoga in the park           |

## Users (role: `user`)

| Email                          | Name              | Notes                                       |
| ------------------------------ | ----------------- | ------------------------------------------- |
| `user@demo.bg`                 | Потребител Демо   | Demo catch-all — has lots of reservations   |
| `georgi.petrov@gmail.com`      | Георги Петров     | Reservations across concerts, tech, Varna   |
| `ana.kovacheva@gmail.com`      | Анна Ковачева     | Group bookings (4 seats philharmonic)       |
| `nikolay.stoyanov@abv.bg`      | Николай Стоянов   | Tech-leaning bookings                       |
| `svetla.angelova@gmail.com`    | Светла Ангелова   | Theatre, yoga                               |
| `petar.iliev@yahoo.com`        | Петър Илиев       | Theatre, marathon                           |
| `tsvetelina.geneva@abv.bg`     | Цветелина Генева  | Has a cancelled reservation (philharmonic)  |
| `dimitar.kostov@gmail.com`     | Димитър Костов    | Mix of bookings                             |

---

## What's in the data

- **12 events** — 10 active future events, 1 past event ("Травиата"), 1 cancelled ("Hackathon: AI for Good").
- Locations across София, Варна, Пловдив.
- Mix of capacities (40 → 3000) so the "available seats" UI varies.
- Multi-seat reservations and one cancelled reservation to exercise both states.

## Quick smoke tests

- **Login as `user@demo.bg`** → "Моите резервации" should show several entries (incl. group bookings).
- **Login as `ivan.dimitrov@techbg.bg`** → "Мои събития" shows 3 events; the React Native workshop is near capacity.
- **Login as `elena.todorova@sportbg.bg`** → see the marathon (3000 cap) and yoga session in "Мои".
