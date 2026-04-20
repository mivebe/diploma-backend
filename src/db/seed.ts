import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { db, initSchema } from './database';

initSchema();

const hash = (pw: string) => bcrypt.hashSync(pw, 10);

// Изчистване на съществуващи демо данни
db.exec('DELETE FROM reservations; DELETE FROM events; DELETE FROM users;');

// Потребители
const insertUser = db.prepare(
  'INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?,?)'
);
const organizerId = insertUser.run('organizer@demo.bg', hash('demo1234'), 'Организатор Демо', 'organizer').lastInsertRowid as number;
const userId = insertUser.run('user@demo.bg', hash('demo1234'), 'Потребител Демо', 'user').lastInsertRowid as number;

// Събития
const insertEvent = db.prepare(
  'INSERT INTO events (organizer_id, title, description, location, start_at, capacity) VALUES (?,?,?,?,?,?)'
);
const now = new Date();
const future = (days: number) => new Date(now.getTime() + days * 86400000).toISOString();

insertEvent.run(organizerId, 'Концерт в парка', 'Безплатен концерт на живо.', 'Морска градина, Варна', future(7), 50);
insertEvent.run(organizerId, 'Работилница по програмиране', 'Въведение в JavaScript.', 'ВСУ, зала 203', future(14), 20);
insertEvent.run(organizerId, 'Театрална вечер', 'Премиера на пиеса.', 'Драматичен театър', future(21), 100);

console.log('✅ Seed готов:');
console.log('   Организатор: organizer@demo.bg / demo1234');
console.log('   Потребител:  user@demo.bg / demo1234');
console.log('   3 събития добавени.');
