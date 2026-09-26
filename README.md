# Myreportizoring
Fizika Lab ⚛️ — Образовательная платформа по физике
Fizika Lab — современная серверлесс-платформа для изучения школьной физики (7–11 классы). Ученики смотрят видеоуроки, пишут конспекты в тетрадь, выполняют тесты и задачи, отправляют фото конспектов на проверку учительнице и смотрят видеоразборы.

Проект построен на современной бессерверной инфраструктуре Cloudflare (Workers, D1, R2, Pages), что гарантирует высокую скорость работы, отсутствие расходов на поддержку серверов и масштабируемость.

Примечание
Данная платформа находится в разработке. Информация по урокам не дополнена.

🚀 Стек технологий
Backend: Cloudflare Workers + Hono (TypeScript)
База данных: Cloudflare D1 (Serverless SQLite)
Файловое хранилище: Cloudflare R2 (хранение фото конспектов)
Frontend: React 18, TypeScript, Vite, React Router v6
Авторизация: Безопасные сессионные Cookie (HttpOnly, SameSite, Secure) + Web Crypto PBKDF2-SHA256
Уведомления: Web Push API (VAPID)
📋 Структура и логика уроков по ТЗ
Каждый урок состоит из 5 обязательных компонентов:

Видеоурок: Видеозапись с YouTube (поддерживаются форматы youtube.com/watch?v=..., youtu.be/..., shorts, embed).
Конспект: Текстовая инструкция, что именно ученик должен записать в тетрадь.
Тест / Задачи: Ссылка на Google Docs / Google Forms с вопросами теста для самопроверки.
Видеоразбор теста: YouTube-видео с подробным объяснением решений.
Зона отправки конспекта: Загрузка фотографий тетради ученика (до 10 фото, загрузка в Cloudflare R2).
🔒 Система прогресса и блокировки уроков
Первый урок первого раздела открыт сразу после одобрения регистрации ученика.
Урок 
N
+
1
 заблокирован до тех пор, пока ученик не загрузит фото конспекта по уроку 
N
 и учительница не поставит статус «Успех».
Следующий раздел заблокирован, пока учительница не примет конспекты по всем урокам предыдущего раздела.
При статусе «Провал» ученик видит комментарий учительницы и форму для пересдачи конспекта.
📂 Структура проекта
Physics_Lab/
├── backend/                  # Cloudflare Workers API
│   ├── src/
│   │   ├── db/
│   │   │   ├── schema.sql    # Схема базы данных D1
│   │   │   ├── seed.sql      # Начальные данные (классы 7-11, учитель, уроки)
│   │   │   └── queries/      # Запросы к D1 (users, lessons, conspects и т.д.)
│   │   ├── middleware/       # Auth и Role-based middleware
│   │   ├── routes/           # REST API эндпоинты (auth, classes, sections, lessons, conspects, admin, push)
│   │   ├── services/         # Сервисы (progress lock, r2 upload, web push)
│   │   ├── utils/            # Хэширование паролей, сессии, валидаторы
│   │   └── index.ts          # Точка входа Hono-приложения
│   ├── package.json
│   ├── tsconfig.json
│   └── wrangler.toml         # Конфигурация Cloudflare Workers, D1 и R2
│
├── frontend/                 # React Single Page Application (SPA)
│   ├── src/
│   │   ├── api/              # API-клиенты для взаимодействия с бэкендом
│   │   ├── components/       # UI компоненты (VideoPlayer, ConspectUploader, layout)
│   │   ├── context/          # Контекст авторизации (AuthContext)
│   │   ├── hooks/            # Пользовательские хуки (useAuth, usePushNotifications)
│   │   ├── pages/            # Страницы приложения
│   │   │   ├── admin/        # Панель учительницы (AdminDashboard, StudentRequests, ConspectReview, LessonsManage)
│   │   │   ├── auth/         # Вход и регистрация с выбором класса
│   │   │   └── student/      # Страницы ученика (Classes, Sections, LessonsList, LessonPage, ConspectUpload)
│   │   ├── styles/           # CSS дизайн-система (tokens, layout, auth, global)
│   │   ├── App.tsx           # Роутинг и защищённые маршруты
│   │   └── main.tsx
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── readme.md
🛠️ Локальный запуск для разработки
1. Предварительные требования
Установленный Node.js (версия 18 или выше).
2. Запуск Backend (Cloudflare Workers + D1 локально)
cd backend
npm install

# Инициализация локальной базы D1 и загрузка демо-данных
npm run db:init:local

# Создайте backend/.dev.vars из backend/.dev.vars.example и укажите
# TEACHER_EMAIL и TEACHER_PASSWORD для локального входа

# Запуск локального сервера API на порту 8787
npm run dev
3. Запуск Frontend (Vite)
В отдельном окне терминала:

cd frontend
npm install

# Запуск фронтенда на http://localhost:5173
npm run dev
Откройте в браузере: http://localhost:5173.

🔑 Доступ учительницы
В репозитории нет и не должно быть общего пароля учительницы. Единственная администраторская учётная запись создаётся автоматически при первом входе из двух секретов Cloudflare. Публичная регистрация создаёт только учеников.

Перед первым входом задайте секреты в папке backend:

npx wrangler secret put TEACHER_EMAIL --env production
# укажите личный email учительницы
npx wrangler secret put TEACHER_PASSWORD --env production
# задайте уникальный пароль длиной не менее 12 символов
После production-деплоя войдите на /login с этими email и паролем. При первом входе создастся аккаунт с ролью teacher; все страницы /admin и API админ-панели остаются недоступны ученикам. Смена TEACHER_PASSWORD безопасно сменит пароль учительницы при следующем входе.

☁️ Пошаговое руководство по развертыванию в Cloudflare (Production)
Шаг 1. Авторизация в Cloudflare CLI
cd backend
npx wrangler login
Шаг 2. Создание базы данных Cloudflare D1
npx wrangler d1 create fizika-lab-db
Команда выведет database_id. Скопируйте его.

В файле backend/wrangler.toml замените REPLACE_WITH_D1_DATABASE_ID на полученный ID:

[[d1_databases]]
binding = "DB"
database_name = "fizika-lab-db"
database_id = "ВАШ_DATABASE_ID"

[[env.production.d1_databases]]
binding = "DB"
database_name = "fizika-lab-db"
database_id = "ВАШ_DATABASE_ID"
Шаг 3. Применение схемы и начальных данных в Production D1
# Создание таблиц
npx wrangler d1 execute fizika-lab-db --remote --file=src/db/schema.sql

# Загрузка начальных классов и разделов
npx wrangler d1 execute fizika-lab-db --remote --file=src/db/seed.sql
Если база была создана до этого обновления, один раз примените ограничение на единственный аккаунт учительницы. При первом входе старый демонстрационный email и пароль будут заменены значениями из секретов:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0001_single_teacher.sql
Чтобы применить защиту от повторной отправки конспекта к уже созданной базе, выполните также:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0002_one_active_conspect.sql
Чтобы включить перевод учеников между классами с сохранением доступа к прошлым материалам, примените также:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0003_student_class_history.sql
И ограничение от повторного массового перевода в одном учебном году:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0004_class_promotion_runs.sql
Шаг 4. Создание хранилища Cloudflare R2
npx wrangler r2 bucket create fizika-lab-conspects
Шаг 5. Настройка секретов Worker
Задайте секретный ключ сессий в Cloudflare Workers:

npx wrangler secret put SESSION_SECRET --env production
# Введите случайную длинную строку, например: 64-значный ключ
npx wrangler secret put TEACHER_EMAIL --env production
npx wrangler secret put TEACHER_PASSWORD --env production
(Опционально для Push-уведомлений):

npx wrangler secret put VAPID_PUBLIC_KEY --env production
npx wrangler secret put VAPID_PRIVATE_KEY --env production
Шаг 6. Деплой Backend (Cloudflare Workers)
npm run deploy:production
Cloudflare выведет URL вашего бэкенда, например: https://fizika-lab-backend-prod.<ваш-поддомен>.workers.dev.

В backend/wrangler.toml укажите URL вашего будущего фронтенда в FRONTEND_ORIGIN (или настройте единый домен).

Шаг 7. Деплой Frontend (Cloudflare Pages)
cd ../frontend
npm run build
npx wrangler pages deploy dist --project-name fizika-lab
Готово! Ваш сайт будет опубликован на https://fizika-lab.pages.dev (или на вашем собственном домене).

👩‍🏫 Руководство для учительницы (Администратора)
Вход в систему:

Перейдите на страницу входа /login.
Введите email и пароль, заданные в TEACHER_EMAIL и TEACHER_PASSWORD.
Система автоматически перенаправит вас в Панель управления (/admin).
Заявки и доступы учеников (/admin/requests):

Новые ученики регистрируются с указанием имени, фамилии, email и класса.
Во вкладке хранится история всех заявок: ожидающих, одобренных и отклонённых.
Нажмите «Открыть доступ» или «Закрыть доступ», чтобы изменить решение в любой момент. При закрытии доступа активные сессии ученика завершаются.
В карточке ученика можно выбрать другой класс и нажать «Изменить класс». Старый класс останется доступен ученику как пройденный.
Кнопка «Перевести всех на следующий класс» переводит только учеников с открытым доступом; 11-классники не изменяются.
Проверка конспектов (/admin/conspects):

Ученики отправляют фото рукописных конспектов из тетради.
В панели отображается имя ученика, название урока и галерея фотографий.
Нажмите на любую фотографию, чтобы увеличить её на весь экран для детального чтения.
Напишите комментарий ученику и нажмите:
«Принять» (Успех): Ученику автоматически открывается следующий урок по программе.
«Отклонить» (Провал): Ученик получает замечание и должен исправить/дослать конспект.
Все работы, включая уже проверенные, доступны в разделе «Архив конспектов» (/admin/conspects/archive). Учительница может удалить там ненужные фото из R2. У принятой работы сохранится отметка о прохождении урока, поэтому доступ ученика к следующим урокам не изменится.

Управление темами и уроками (/admin/classes):

Выберите класс (7, 8, 9, 10 или 11).
Создавайте новые разделы (темы) или редактируйте существующие.
Внутри раздела добавляйте уроки:
Номер параграфа (например, §14).
Название урока.
Ссылка на видеоурок с YouTube.
Текст требований к конспекту.
Ссылка на Google Docs с тестом.
Ссылка на видеоразбор теста с YouTube.
