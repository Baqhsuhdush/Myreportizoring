# Myreportizoring
Fizika Lab ⚛️ — The Fizika Lab educational platform for physics is a modern serverless platform for studying school physics (grades 7–11). Students watch video lessons, take notes in a notebook, complete tests and tasks, send photos of their notes for the teacher to review, and watch video tutorials.
The project is built on the modern serverless infrastructure of Cloudflare (Workers, D1, R2, Pages), which guarantees high performance, no costs for server maintenance, and scalability.

Note: This platform is under development. The information about the lessons has not been updated.

🚀 Technology stack: Backend: Cloudflare Workers + Hono (TypeScript) Database: Cloudflare D1 (Serverless SQLite) File storage: Cloudflare R2 (storage of photo notes) Frontend: React 18, TypeScript, Vite, React Router v6 Authorization: Secure session cookies (HttpOnly, SameSite, Secure) + Web Crypto PBKDF2-SHA256 Notifications: Web Push API (VAPID) 📋 Structure and logic of lessons according to the technical requirements. Each lesson consists of 5 mandatory components:

Video lesson: A video recording from YouTube (supported formats: youtube.com/watch?v=..., youtu.be/..., shorts, embed). Summary: A text instruction specifying what the student should write down in their notebook. Test / Tasks: A link to Google Docs / Google Forms with test questions for self‑assessment. Video analysis of the test: a YouTube video with a detailed explanation of the solutions. Note submission zone: uploading photos of the student’s notebook (up to 10 photos, uploading to Cloudflare R2). 🔒 Progress and lesson blocking system. The first lesson of the first section is open immediately after the student’s registration is approved. Lesson N + 1 is blocked until the student uploads a photo of the note for lesson N and the teacher sets the status to “Success”. The next section is blocked until the teacher accepts the notes for all lessons in the previous section. If the status is “Failure,” the student sees the teacher’s comment and the form for retaking the summary. 📂 Project structure: Physics_Lab/ ├── backend/ # Cloudflare Workers API │ ├── src/ │ │ ├── db/ │ │ │ ├── schema.sql # Database schema for D1 │ │ │ ├── seed.sql # Initial data (classes 7-11, teacher, lessons) │ │ │ └── queries/ # Queries for D1 (users, lessons, conspects, etc.) │ │ ├── middleware/ # Auth and role-based middleware │ │ ├── routes/ # REST API endpoints (auth, classes, sections, lessons, conspects, admin, push) │ │ ├── services/ # Services (progress lock, r2 upload, web push) │ │ ├── utils/ # Password hashing, sessions, validators │ │ └── index.ts # Entry point of the Hono application │ ├── package.json │ ├── tsconfig.json │ └── wrangler.toml # Cloudflare Workers configuration, D1 and R2 │ ├── frontend/ # React Single Page Application (SPA) │ ├── src/ │ │ ├── api/ # API clients for interacting with the backend │ │ ├── components/ # UI components (VideoPlayer, ConspectUploader, layout) │ │ ├── context/ # Authorization context (AuthContext) │ │ ├── hooks/ # Custom hooks (useAuth, usePushNotifications) │ │ ├── pages/ # Application pages │ │ │ ├── admin/ # Teacher's panel (AdminDashboard, StudentRequests, ConspectReview, LessonsManage) │ │ │ ├── auth/ # Login and registration with class selection │ │ │ └── student/ # Student pages (Classes, Sections, LessonsList, LessonPage, ConspectUpload) │ │ ├── styles/ # CSS design system (tokens, layout, auth, global) │ │ ├── App.tsx # Routing and protected routes │ │ └── main.tsx │ ├── package.json │ ├── tsconfig.json │ └── vite.config.ts └── readme.md 🛠️ Local development launch

Prerequisites: Installed Node.js (version 18 or higher).
Launching Backend (Cloudflare Workers + D1 locally): cd backend npm install
Initializing local D1 database and loading demo data
npm run db:init:local

Create backend/.dev.vars from backend/.dev.vars.example and specify
TEACHER_EMAIL and TEACHER_PASSWORD for local login
Launching local API server on port 8787
npm run dev 3. Launching Frontend (Vite) In a separate terminal window:
cd frontend npm install

Launching frontend on http://localhost:5173
npm run dev Open in browser: http://localhost:5173.

🔑 Teacher access. The repository does not and should not contain a shared teacher password. The only administrator account is created automatically upon first login from two Cloudflare secrets. Public registration creates only students.

Before the first login, set the secrets in the backend folder:

npx wrangler secret put TEACHER_EMAIL --env production

Specify the teacher’s personal email address
npx wrangler secret put TEACHER_PASSWORD --env production

Set a unique password with a length of at least 12 characters. After the production deployment, log in to /login using these email and password. On the first login, an account with the teacher role will be created; all pages /admin and the admin panel API remain inaccessible to students. Changing TEACHER_PASSWORD will safely change the teacher’s password on the next login. 

☁️ Step‑by‑step guide to deploying to Cloudflare (Production) Step 1. Authorize in Cloudflare CLI: cd backend npx wrangler login. Step 2. Create a Cloudflare D1 database: npx wrangler d1 create fizika-lab-db. The command will output database_id. Copy it..

In the backend/wrangler.toml file, replace REPLACE_WITH_D1_DATABASE_ID with the obtained ID:

[[d1_databases]] binding = "DB" database_name = "fizika-lab-db" database_id = "YOUR_DATABASE_ID"

[[env.production.d1_databases]] binding = "DB" database_name = "fizika-lab-db" database_id = "YOUR_DATABASE_ID" Step 3. Applying the schema and initial data to Production D1

Creating tables
npx wrangler d1 execute fizika-lab-db --remote --file=src/db/schema.sql

Loading initial classes and sections
npx wrangler d1 execute fizika-lab-db --remote --file=src/db/seed.sql If the database was created before this update, apply the restriction once to the single teacher’s account. Upon the first login, the old demo email and password will be replaced with values from the secrets:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0001_single_teacher.sql To apply protection against re‑sending a summary to an already created database, also run:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0002_one_active_conspect.sql To enable transferring students between classes while retaining access to previous materials, also apply:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0003_student_class_history.sql And the restriction on repeated mass transfer within one academic year:

npx wrangler d1 execute fizika-lab-db --remote --file=migrations/0004_class_promotion_runs.sql Step 4. Creating a Cloudflare R2 storage bucket: npx wrangler r2 bucket create fizika-lab-conspects Step 5. Configuring Worker secrets. Set the session secret key in Cloudflare Workers: npx wrangler secret put SESSION_SECRET --env production 
Enter a random long string, for example: a 64‑character key.
npx wrangler secret put TEACHER_EMAIL --env production
npx wrangler secret put TEACHER_PASSWORD --env production (Optional for Push notifications):

npx wrangler secret put VAPID_PUBLIC_KEY --env production npx wrangler secret put VAPID_PRIVATE_KEY --env production Step 6. Deploy Backend (Cloudflare Workers) npm run deploy:production Cloudflare will output the URL of your backend, for example: https://fizika-lab-backend-prod.<your-subdomain>.workers.dev.

In backend/wrangler.toml, specify the URL of your future frontend in FRONTEND_ORIGIN (or configure a single domain).

Step 7. Frontend deployment (Cloudflare Pages) cd ../frontend npm run build npx wrangler pages deploy dist --project-name fizika-lab Done! Your website will be published at https://fizika-lab.pages.dev (or on your own domain).

👩‍🏫 Guide for the teacher (Administrator) Log in:

Go to the login page /login. Enter the email and password specified in TEACHER_EMAIL and TEACHER_PASSWORD. The system will automatically redirect you to the Control Panel.
Текст требований к конспекту.
Ссылка на Google Docs с тестом.
Ссылка на видеоразбор теста с YouTube.
