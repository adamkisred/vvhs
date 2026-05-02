# VISWASHANTHI HIGH SCHOOL

Complete public website and admin dashboard for VISWASHANTHI HIGH SCHOOL, Allagadda.

## Project Structure

```text
viswashanthi-school/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- uploads/
|   |-- utils/
|   |-- .env
|   |-- package.json
|   `-- server.js
|-- frontend/
|   |-- admin/
|   |-- css/
|   |-- js/
|   |-- school images/
|   `-- *.html
|-- .gitignore
`-- README.md
```

## Features

- Responsive public school website
- Dynamic banners, faculty, gallery, contact details, and school settings
- Online admission form with MongoDB storage
- Admission notification email support through Nodemailer
- JWT-protected admin dashboard
- Admin tools for banners, faculty, gallery, admissions, settings, and password changes
- Image uploads served from `backend/uploads/`

## Backend Setup

```powershell
cd "C:\Users\sivan\OneDrive\Documents\WEB SCHOOLS\viswashanthi-school\backend"
npm.cmd install
Copy-Item .env.example .env
npm.cmd run dev
```

The backend defaults to:

```text
http://localhost:5000
mongodb://127.0.0.1:27017/viswashanthi_school
```

For permanent data, make sure MongoDB is running before starting the backend. For quick local testing, the app can automatically start an embedded MongoDB fallback if `MONGODB_MEMORY_FALLBACK=true`.

## Environment Variables

Update `backend/.env` for your machine or hosting provider:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/viswashanthi_school
MONGODB_MEMORY_FALLBACK=true
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=1d
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@example.com
MAIL_PASS=your-email-password
ADMISSION_RECEIVER_EMAIL=admissions@viswashanthischool.com
```

Change the default admin password immediately after first login.

## Frontend Setup

The frontend is static HTML, CSS, and JavaScript.

- Public website: `frontend/index.html`
- Admin login: `frontend/admin/login.html`

During local development, open the HTML files directly or use a static server such as VS Code Live Server. The frontend automatically uses `http://localhost:5000/api` when opened locally.

For production hosting, serve the backend API at `/api` on the same domain, or set this before the app scripts:

```html
<script>
    window.VISWASHANTHI_API_BASE = 'https://your-domain.com/api';
</script>
```

## Render Deployment

This project is now set up to deploy to Render as a single free web service:

- The backend serves the API at `/api`
- The same Express app serves the public frontend and admin pages
- Admin authentication stays on the same origin, which is better for cookies and session security

### Recommended Setup

1. Push this repository to GitHub.
2. In Render, create a new `Web Service` from the repo.
3. Render will detect [`render.yaml`](./render.yaml).
4. Add these required environment variables in Render:

```env
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_long_random_secret
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=your-email@example.com
MAIL_PASS=your-gmail-app-password
ADMISSION_RECEIVER_EMAIL=admissions@viswashanthischool.com
ALLOWED_ORIGINS=https://your-render-service.onrender.com
```

### Important Notes For Free Testing

- Use MongoDB Atlas free tier for `MONGODB_URI`. Render free web services should not use the in-memory Mongo fallback.
- Uploaded files on Render free instances are ephemeral, so images can be lost after restarts or redeploys. This setup is good for testing, not permanent media storage.
- The site root will load the public website, and the admin login will be available at `/admin/login.html`.
- After first deploy, log in and change the default admin password immediately.

## API Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`
- `PUT /api/auth/password`
- `GET /api/banner`
- `GET /api/banner/admin`
- `POST /api/banner`
- `PUT /api/banner/:id`
- `DELETE /api/banner/:id`
- `PATCH /api/banner/:id/toggle`
- `GET /api/faculty`
- `GET /api/faculty/admin`
- `POST /api/faculty`
- `PUT /api/faculty/:id`
- `DELETE /api/faculty/:id`
- `GET /api/gallery`
- `GET /api/gallery/admin`
- `POST /api/gallery`
- `DELETE /api/gallery/:id`
- `GET /api/admission`
- `POST /api/admission`
- `PATCH /api/admission/:id/status`
- `DELETE /api/admission/:id`
- `GET /api/settings`
- `GET /api/settings/admin`
- `GET /api/settings/stats`
- `PUT /api/settings`

## Notes

- Uploaded files are limited to images up to 5MB.
- Mail notifications work after valid SMTP credentials are configured.
- Admin routes require a JWT token from login.
# vvhs
