# The Spot Admission

Education & admission platform for students and parents in Gujarat/India: discover schools, colleges and universities, compare them, enquire with OTP-verified mobile numbers, apply online, book counselling, and grab last-round **spot admission** (vacant) seats. Institutions manage their own listing, courses, seats, leads and applications; the admin team approves listings and moderates everything.

Stack: **MongoDB + Express + React (Vite, Tailwind) + Node.js**.

```
server/   Express API (Mongoose models, JWT auth, OTP, uploads, tests)
client/   React SPA (public site + student / institution / admin dashboards)
```

## Features

**Public site**
- Home with search suggestions (institutions, courses, cities), categories, live spot seats, featured institutions, counselling services, testimonials, news.
- Listing for schools / colleges / all institutions with filters (type, category, city, board/university, fees, rating, ownership, facilities, hostel, verified), sorting and pagination.
- Institution page: overview, courses & fees, admission process, facilities, placements, gallery, virtual tour, map, reviews, FAQs, similar institutions, enquiry and online application.
- Compare up to 4 institutions; student shortlist.
- Spot admission seat board with filters and SMS/in-app alerts for new seats.
- Counselling (career, pre-primary, school, college admission, personalized, study abroad) and admission forms (pre-primary / school / college).
- News & articles, exams, podcasts, virtual tours, testimonials, about, contact, FAQ, privacy, terms.
- English / ગુજરાતી / हिन्दी UI strings, mobile-first layout, WhatsApp button.

**Student dashboard** – shortlist, enquiries, applications with status timeline (withdraw), counselling sessions, seat alerts, reviews, notifications, profile, mobile verification, password.

**Institution dashboard** – create or claim a listing, profile with completeness meter, submit for approval, courses/fees/seats, leads pipeline with notes + CSV export, applications with status updates, spot-admission posting and seat confirmation, reviews, analytics (views, leads per day, conversion).

**Admin panel** – stats, institution approval/rejection (remarks required)/suspension, verified & featured flags, claim requests, lead management + CSV, applications, review moderation, spot-admission moderation (publishing alerts subscribers), counselling requests (assign counsellor, meeting link, CSV), contact messages, CMS (articles/news/podcasts/virtual tours/exams), testimonials, users & roles, master data (categories, cities, boards, universities, facilities, streams), audit log.

**Business rules** – only approved listings are public; editing critical fields (name, type, city, board/university, ownership) on an approved listing sends it back for review; OTP is required for enquiries (rate-limited, hashed, expiring); repeat enquiries from the same phone to the same institution within `DUPLICATE_LEAD_HOURS` are merged; one review per user per institution, published after moderation; one active application per student/course; spot seats are decremented atomically and expire automatically.

## Getting started

Requirements: Node.js 20+, MongoDB 6+ running locally (or a MongoDB Atlas URI).

```bash
npm run install:all                 # installs server + client deps
cp server/.env.example server/.env  # then edit values
npm --prefix server run seed:demo   # master data, admin, demo accounts & listings
npm run dev:server                  # API on http://localhost:5000
npm run dev:client                  # web on http://localhost:5173 (proxies /api)
```

Demo accounts created by `seed:demo` (development only):

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@thespotadmission.local` | `Admin@12345` (or `SEED_ADMIN_PASSWORD`) |
| Institution | `institute@demo.local` | `Demo@12345` |
| Student | `student@demo.local` | `Demo@12345` |

`npm --prefix server run seed` creates master data and the admin only (no demo listings) – use this for production.

### OTP / SMS

Set `MSG91_AUTH_KEY` and `MSG91_OTP_TEMPLATE_ID` to send real SMS OTPs. Without them, in development (`OTP_DEV_ECHO=true`), the OTP is returned by the API and shown on screen so flows can be tested. In production without an SMS key, OTP sending fails safely.

### Environment variables

See `server/.env.example`. Important ones: `MONGO_URI`, `JWT_SECRET` (required and ≥32 chars in production), `CLIENT_ORIGIN`, `ADMIN_EMAILS` (emails that become admin on registration), `UPLOAD_DIR`, `MAX_UPLOAD_MB`, `DUPLICATE_LEAD_HOURS`. The client accepts optional `VITE_API_URL` (defaults to `/api`).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | ESLint for server and client |
| `npm test` | API integration + unit tests (uses `thespotadmission_test` DB, override with `TEST_MONGO_URI`) |
| `npm run build` | Production build of the client into `client/dist` |
| `npm start` | Starts the API; in `NODE_ENV=production` it also serves `client/dist` |

## Production notes

- Uploaded files are stored on local disk (`UPLOAD_DIR`). Use persistent storage or swap in S3/Cloudinary for multi-instance deployments.
- Payments (Razorpay), AI recommendations/chatbot, WhatsApp/email notifications and the mobile app are not implemented yet; notifications are stored in-app.
