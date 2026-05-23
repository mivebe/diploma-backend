import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, initSchema } from './database';

async function main() {
  await initSchema();

  const hash = (pw: string) => bcrypt.hashSync(pw, 10);

  await db.batch(
    [
      'DELETE FROM reservations',
      'DELETE FROM events',
      'DELETE FROM users',
      "DELETE FROM sqlite_sequence WHERE name IN ('users','events','reservations')",
    ],
    'write'
  );

  const PASSWORD = 'demo1234';
  const pwHash = hash(PASSWORD);

  const organizers = [
    { email: 'organizer@demo.bg',           name: 'Организатор Демо' },
    { email: 'maria.popova@artsofia.bg',    name: 'Мария Попова' },
    { email: 'ivan.dimitrov@techbg.bg',     name: 'Иван Димитров' },
    { email: 'elena.todorova@sportbg.bg',   name: 'Елена Тодорова' },
  ];

  const users = [
    { email: 'user@demo.bg',                 name: 'Потребител Демо' },
    { email: 'georgi.petrov@gmail.com',      name: 'Георги Петров' },
    { email: 'ana.kovacheva@gmail.com',      name: 'Анна Ковачева' },
    { email: 'nikolay.stoyanov@abv.bg',      name: 'Николай Стоянов' },
    { email: 'svetla.angelova@gmail.com',    name: 'Светла Ангелова' },
    { email: 'petar.iliev@yahoo.com',        name: 'Петър Илиев' },
    { email: 'tsvetelina.geneva@abv.bg',     name: 'Цветелина Генева' },
    { email: 'dimitar.kostov@gmail.com',     name: 'Димитър Костов' },
  ];

  const organizerIds: Record<string, number> = {};
  for (const o of organizers) {
    const r = await db.execute({
      sql: 'INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)',
      args: [o.email, pwHash, o.name, 'organizer'],
    });
    organizerIds[o.email] = Number(r.lastInsertRowid);
  }
  const userIds: Record<string, number> = {};
  for (const u of users) {
    const r = await db.execute({
      sql: 'INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)',
      args: [u.email, pwHash, u.name, 'user'],
    });
    userIds[u.email] = Number(r.lastInsertRowid);
  }

  const now = new Date();
  const at = (days: number, hour = 19, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  type EventSeed = {
    organizerEmail: string;
    title: string;
    description: string;
    location: string;
    startAt: string;
    capacity: number;
    status?: 'active' | 'cancelled';
  };

  const events: EventSeed[] = [
    // Maria Popova — култура
    {
      organizerEmail: 'maria.popova@artsofia.bg',
      title: 'Концерт на София Филхармония',
      description: 'Чайковски и Рахманинов под диригентството на Найден Тодоров.',
      location: 'Зала "България", София',
      startAt: at(3, 19, 30),
      capacity: 800,
    },
    {
      organizerEmail: 'maria.popova@artsofia.bg',
      title: 'Премиера: "Вишнева градина"',
      description: 'Чехов в нова постановка на режисьора Иван Добчев.',
      location: 'Народен театър "Иван Вазов", София',
      startAt: at(10, 19, 0),
      capacity: 600,
    },
    {
      organizerEmail: 'maria.popova@artsofia.bg',
      title: 'Нощ на музеите',
      description: 'Безплатен вход в над 20 музея и галерии в столицата.',
      location: 'Различни локации, София',
      startAt: at(28, 18, 0),
      capacity: 2000,
    },
    // Ivan Dimitrov — технологии
    {
      organizerEmail: 'ivan.dimitrov@techbg.bg',
      title: 'Уъркшоп: Въведение в React Native',
      description: 'Практическа сесия — създаваме мобилно приложение от нулата.',
      location: 'SoftUni кампус, София',
      startAt: at(5, 10, 0),
      capacity: 40,
    },
    {
      organizerEmail: 'ivan.dimitrov@techbg.bg',
      title: 'Конференция DevBG 2026',
      description: 'Двудневна конференция за разработчици — AI, cloud, frontend.',
      location: 'Inter Expo Center, София',
      startAt: at(45, 9, 30),
      capacity: 500,
    },
    {
      organizerEmail: 'ivan.dimitrov@techbg.bg',
      title: 'Meetup: Sofia JS',
      description: 'Месечна среща на JavaScript общността. Доклади и нетуъркинг.',
      location: 'Betahaus, София',
      startAt: at(14, 19, 0),
      capacity: 80,
    },
    // Elena Todorova — спорт
    {
      organizerEmail: 'elena.todorova@sportbg.bg',
      title: 'Софийски маратон 2026',
      description: 'Дистанции 5км, 10км и пълен маратон. Старт от НДК.',
      location: 'НДК, София',
      startAt: at(60, 8, 0),
      capacity: 3000,
    },
    {
      organizerEmail: 'elena.todorova@sportbg.bg',
      title: 'Йога в парка',
      description: 'Сутрешна сесия на открито. Подходяща за начинаещи.',
      location: 'Борисова градина, София',
      startAt: at(2, 8, 0),
      capacity: 50,
    },
    // Demo organizer — разни
    {
      organizerEmail: 'organizer@demo.bg',
      title: 'Концерт в Морската градина',
      description: 'Безплатен концерт на живо. Български изпълнители.',
      location: 'Морска градина, Варна',
      startAt: at(7, 20, 0),
      capacity: 200,
    },
    {
      organizerEmail: 'organizer@demo.bg',
      title: 'Фестивал на занаятите',
      description: 'Изложение и работилници. Над 50 майстори от цяла България.',
      location: 'Античен театър, Пловдив',
      startAt: at(21, 11, 0),
      capacity: 1000,
    },
    // Past event — отминало
    {
      organizerEmail: 'maria.popova@artsofia.bg',
      title: 'Опера: "Травиата"',
      description: 'Класическа постановка на Верди.',
      location: 'Софийска опера и балет',
      startAt: at(-14, 19, 0),
      capacity: 700,
    },
    // Cancelled event
    {
      organizerEmail: 'ivan.dimitrov@techbg.bg',
      title: 'Hackathon: AI for Good',
      description: 'Отменено поради липса на спонсори.',
      location: 'Sofia Tech Park',
      startAt: at(30, 9, 0),
      capacity: 100,
      status: 'cancelled',
    },
  ];

  const eventIds: number[] = [];
  for (const e of events) {
    const r = await db.execute({
      sql: `INSERT INTO events (organizer_id, title, description, location, start_at, capacity, status)
            VALUES (?,?,?,?,?,?,?)`,
      args: [
        organizerIds[e.organizerEmail],
        e.title,
        e.description,
        e.location,
        e.startAt,
        e.capacity,
        e.status ?? 'active',
      ],
    });
    eventIds.push(Number(r.lastInsertRowid));
  }

  const reserve = async (
    eventIdx: number,
    userEmail: string,
    seats = 1,
    status: 'confirmed' | 'cancelled' = 'confirmed'
  ) => {
    await db.execute({
      sql: 'INSERT INTO reservations (event_id, user_id, seats, status) VALUES (?,?,?,?)',
      args: [eventIds[eventIdx], userIds[userEmail], seats, status],
    });
  };

  // 0 — Филхармония
  await reserve(0, 'user@demo.bg', 2);
  await reserve(0, 'georgi.petrov@gmail.com', 1);
  await reserve(0, 'ana.kovacheva@gmail.com', 4);
  await reserve(0, 'nikolay.stoyanov@abv.bg', 2);
  await reserve(0, 'tsvetelina.geneva@abv.bg', 1, 'cancelled');

  // 1 — Вишнева градина
  await reserve(1, 'svetla.angelova@gmail.com', 2);
  await reserve(1, 'petar.iliev@yahoo.com', 3);
  await reserve(1, 'user@demo.bg', 1);

  // 2 — Нощ на музеите
  await reserve(2, 'tsvetelina.geneva@abv.bg', 1);
  await reserve(2, 'dimitar.kostov@gmail.com', 2);

  // 3 — React Native уъркшоп
  await reserve(3, 'user@demo.bg', 1);
  await reserve(3, 'georgi.petrov@gmail.com', 1);
  await reserve(3, 'nikolay.stoyanov@abv.bg', 1);
  await reserve(3, 'petar.iliev@yahoo.com', 1);
  await reserve(3, 'dimitar.kostov@gmail.com', 1);

  // 4 — DevBG 2026
  await reserve(4, 'user@demo.bg', 1);
  await reserve(4, 'ana.kovacheva@gmail.com', 1);

  // 5 — Sofia JS meetup
  await reserve(5, 'georgi.petrov@gmail.com', 1);
  await reserve(5, 'nikolay.stoyanov@abv.bg', 1);
  await reserve(5, 'user@demo.bg', 1);

  // 6 — Маратон
  await reserve(6, 'petar.iliev@yahoo.com', 1);
  await reserve(6, 'tsvetelina.geneva@abv.bg', 1);
  await reserve(6, 'dimitar.kostov@gmail.com', 1);

  // 7 — Йога
  await reserve(7, 'svetla.angelova@gmail.com', 1);
  await reserve(7, 'ana.kovacheva@gmail.com', 2);
  await reserve(7, 'user@demo.bg', 1);

  // 8 — Концерт Варна
  await reserve(8, 'user@demo.bg', 2);
  await reserve(8, 'georgi.petrov@gmail.com', 3);

  // 9 — Фестивал на занаятите
  await reserve(9, 'tsvetelina.geneva@abv.bg', 4);

  // 10 — Травиата
  await reserve(10, 'user@demo.bg', 2);
  await reserve(10, 'svetla.angelova@gmail.com', 1);

  console.log('✅ Seed готов:');
  console.log('');
  console.log('=== Организатори ===');
  for (const o of organizers) console.log(`   ${o.email}  /  ${PASSWORD}   (${o.name})`);
  console.log('');
  console.log('=== Потребители ===');
  for (const u of users) console.log(`   ${u.email}  /  ${PASSWORD}   (${u.name})`);
  console.log('');
  console.log(`📅  ${events.length} събития (${events.filter(e => e.status === 'cancelled').length} отменени, 1 минало)`);
  const total = await db.execute('SELECT COUNT(*) as c FROM reservations');
  console.log(`🎟️   ${Number(total.rows[0].c)} резервации`);
  console.log('');
  console.log('🔑  Всички пароли са: ' + PASSWORD);
  console.log('📄  Виж TEST_ACCOUNTS.md в gatherly-backend/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
