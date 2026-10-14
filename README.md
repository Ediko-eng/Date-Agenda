# Date Agenda 📅

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Ediko-eng/Date-Agenda/blob/main/LICENSE)

**Date Agenda** — also presented in-app as **Amour · Enchanting Date Planner** — is a modern, lightweight web application for planning and sharing romantic date invitations. A sender creates an invitation, the recipient opens a (animated) envelope, answers *Yes / No*, and then plans the details of the date. An integrated admin dashboard manages users, invitations, views, and login activity.

> **Backend:** the PHP API has been migrated **in place** to **Laravel 12** using a [strangler](#-migration-to-laravel) approach. The Laravel API is the primary backend, while the original flat PHP API remains as a transparent fallback. The front-end (HTML + ES-module JS) is unchanged and still served from the project root.

---

## ✨ Concept

1. **The envelope** — visitors land on a closed envelope with a heart seal.
2. **The question** — opening it reveals the date invitation and a *Yes / No* choice (the *No* button playfully dodges).
3. **Planning** — saying *Yes* opens a planner where the recipient chooses the place, pickup, date & time, dress code, and activity.
4. **Sharing** — invitations have a share link (`?i=…` / `#d=…`) so the receiver gets the full experience without needing an account.
5. **Management** — accounts get their own dashboard, and administrators get a full control panel with statistics.

---

## 🚀 Features

### Recipient experience
- Animated **envelope opening** and heart-burst effects.
- **Yes / No** decision with a moving "No" button.
- Receiver **date planner**: place, pickup location, date & time, dress code, activity, and a song.
- Works from a **share link** with no login required.

### Creator / sender
- Create, edit, and manage date invitations.
- Copy a **share link** for any invitation.
- Upload photos and attach a song to an invitation.
- **Sender history** and a responses table to track accepted / declined invitations.

### Accounts
- Register and sign in (username + password).
- Editable **profile** (full name, gender, birth date, address).
- Change password, sign out.

### Admin dashboard (`admin.html`)
- **Statistics:** status donut, a **professional invitations-over-time histogram** (y-axis, gridlines, real calendar dates, scrollable for long ranges), and totals.
- **Users:** list, view detail, edit, create, and delete users.
- **Invitations:** view and manage every invitation across all users.
- **Views & logins:** per-invitation view tracking and a login activity list.
- **Export CSV** of the dashboard data, including a dated daily-activity section (UTF-8 with BOM for Excel).
- Dark mode and a responsive layout.

### Platform
- **JSON API** with clean separation between user-facing and admin-only endpoints.
- **Session + signed admin cookie** so the admin panel stays logged in independently of the public site.
- **Laravel 12 backend** (Eloquent models, migrations, middleware) with a **legacy fallback** for resilience.
- **Responsive, mobile-first UI** with a light/dark theme toggle.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Structure** | HTML5 (`index.html`, `admin.html`, `account.html`) |
| **Styling** | CSS3, **Tailwind CSS** (prebuilt bundles) + custom `style.css` |
| **Client logic** | JavaScript ES modules (`script.js`, `admin.js`, `account.js`, `simple-db.js`) |
| **Backend (primary)** | **Laravel 12** (`^12.0`, 12.70.0) — controllers, Eloquent, migrations, middleware |
| **Backend (fallback)** | PHP JSON API: `user.php`, `admin.php`, `api.php`, `inc/api-core.php` |
| **Database** | MySQL / MariaDB (utf8mb4), accessed via Eloquent *and* PDO |
| **Charts** | Custom DOM/SVG rendering in `admin.js` |
| **Build tooling** | Composer (PHP); PowerShell build scripts + Tailwind configs in `build/` |

No JS bundler is required at runtime — the Tailwind CSS is pre-built and committed, and the front-end loads as native ES modules. Laravel is used purely as the API/server layer.

---

## 🏗️ Architecture

```text
Browser (HTML + JS modules)
        │  fetch(JSON)  via  simple-db.js
        ▼
┌──────────────────────────────────────────────────┐
│  Preferred backend: Laravel 12  (/public/api)     │
│  ├── AuthController            → session / auth    │
│  ├── Api\DispatchController    → ?action=… router   │
│  ├── Api\InvitationController  → invitations       │
│  ├── Api\PhotoController       → photos            │
│  ├── Api\ViewController        → views             │
│  ├── Api\UserAdminController   → users   (admin)   │
│  └── Api\LoginAdminController  → logins  (admin)   │
└───────────────────────┬───────────────────────────┘
                        │  on failure (non-JSON / HTTP 5xx)
                        ▼
┌──────────────────────────────────────────────────┐
│  Fallback backend: legacy PHP API                 │
│  ├── user.php   → user actions                    │
│  ├── admin.php  → admin actions                   │
│  └── api.php    → all actions (back-compat)       │
│            └── inc/api-core.php (dispatcher)      │
└───────────────────────┬───────────────────────────┘
                        │  PDO / Eloquent
                        ▼
                 MySQL database
```

- **`routes/web.php`** — `/` (welcome), `/api` (legacy-action dispatcher), and the `/api/*` auth routes.
- **`app/Http/Controllers/`** — the Laravel controllers that mirror the legacy actions and JSON shapes exactly.
- **`app/Http/Middleware/EnsureAdmin.php`** — the `admin` middleware guarding admin-only endpoints.
- **`inc/api-core.php`** — the original single dispatcher for the fallback entry points.

### Client data layer

`simple-db.js` is the single client-side data layer. It **prefers the Laravel API** and only falls back to the legacy endpoints when Laravel is unreachable:

- Requests go to **`public/api`** by default (resolved relative to the module URL).
- Appends **`?api=legacy`** to any page URL to force the legacy `user.php` / `admin.php` endpoints.
- Falls back **only** on a non-JSON response (server down) or an HTTP **5xx** — real application errors (validation, 403, 404) are surfaced without a fallback.

---

## 🔁 Migration to Laravel

The migration is done **in place** (strangler pattern): Laravel was merged into the existing project directory rather than replacing it, so the legacy app keeps working the whole time.

| Phase | Scope | Status |
| :--- | :--- | :--- |
| **1** | Database tables + Eloquent models (`User`, `Invitation`, `Response`, `Photo`, `View`, `Login`) | ✅ Done |
| **2** | Auth (`AuthController`), `config/dateagenda.php`, admin middleware, `/api/*` routes, CSRF exemptions | ✅ Done |
| **3** | Full API port — `Api\*` controllers + `DispatchController` mapping every legacy `?action=` | ✅ Done |
| **4** | Front-end switched to the Laravel API with transparent legacy fallback | ✅ Done |

---

## 🔌 API Reference

All endpoints receive `?action=<name>` (GET for reads, `POST` with a JSON body for writes) and return JSON: `{ "ok": true, ... }` or `{ "ok": false, "error": "…" }`.

### Laravel routes (`routes/web.php`)

| Method | Path | Purpose |
| :--- | :--- | :--- |
| `GET` | `/` | Laravel welcome page |
| `GET\|POST` | `/api` | Legacy-action dispatcher (`?action=…`) |
| `GET` | `/api/session` | Current session / admin state |
| `POST` | `/api/register` | Create an account |
| `POST` | `/api/login` · `/api/logout` | Sign in / out |
| `POST` | `/api/account` | Update the signed-in user's profile / password |
| `POST` | `/api/admin/logout` | Clear the signed admin cookie |
| `GET` | `/api/admin/ping` | Admin-only health check (guarded by `admin` middleware) |
| `GET` | `/up` | Framework health endpoint |

Admin-only actions are gated by the `admin` middleware (`EnsureAdmin`).

### Legacy actions (served by Laravel and the fallback)

| Action | Purpose |
| :--- | :--- |
| `session` | Current session / admin state |
| `register` | Create an account |
| `login` / `logout` | Sign in / out |
| `account_update` | Update the signed-in user's profile / password |
| `invitation_add` | Create an invitation |
| `invitation_get` | Fetch one invitation (by id or share token) |
| `invitation_update` | Update an invitation / respond to it |
| `invitation_delete` | Delete an invitation |
| `invitations_list` | List invitations (own, or all for admins) |
| `view_record` | Record a view of an invitation |
| `views_list` / `views_all` | View analytics (own / all) |
| `photo_add` / `photo_delete` / `photos_list` | Photo gallery per invitation |
| `users_list` / `user_detail` / `user_add` / `user_update` / `user_delete` | Admin user management |
| `logins_list` / `login_delete` / `login_clear` | Login activity management |
| `admin_logout` | Clear the signed admin cookie |

---

## 🗄️ Database

Database: **`dbdate_agenda`** (utf8mb4). The schema can be created two ways:

- **Laravel migrations** (preferred): `php artisan migrate` — defined in `database/migrations/`.
- **Legacy installer**: run `install.php` once (it also creates the database and seeds the default admin).

| Table | Contents |
| :--- | :--- |
| `users` | Accounts: username, password hash, profile fields, last login |
| `invitations` | Date invitations: place, pickup, dress code, activity, song, status, creator |
| `responses` | Accept / decline responses with a message |
| `photos` | Gallery images attached to invitations |
| `views` | Page-view analytics for invitations |
| `logins` | Sign-in activity log (IP, user agent, browser, OS, device) |

A snapshot dump (`dbdate_agenda .sql`) is available for seeding; it is excluded from git via `.gitignore`.

---

## 📁 Project Structure

```text
Date Agenda/
├── index.html              # Main app: envelope, date question & planner
├── account.html            # Account page (register / login / profile)
├── admin.html              # Admin dashboard (stats, users, invitations, logs)
├── script.js               # Main front-end logic (envelope, planner, share links)
├── admin.js                # Admin dashboard logic, charts & CSV export
├── account.js              # Account page logic
├── simple-db.js            # API client (Laravel-first, legacy fallback)
├── style.css               # Custom styles & animations
├── tailwind.css            # Prebuilt Tailwind bundle (main site)
├── tailwind-admin.css      # Prebuilt Tailwind bundle (admin)
├── tailwind-account.css    # Prebuilt Tailwind bundle (account)
├── api.php                 # Legacy back-compat API front controller (all actions)
├── user.php                # Legacy user-facing API endpoint
├── admin.php               # Legacy admin API endpoint
├── install.php             # One-time installer / schema migrations (legacy)
├── inc/
│   ├── api-core.php        # Core legacy API dispatcher & business logic
│   ├── config.php          # Local configuration (DB + admin + secrets) — gitignored
│   ├── config.sample.php   # Template for config.php
│   └── .htaccess           # Denies direct access to this folder
├── Gallery/                # Example images used by the UI
├── build/                  # Tailwind configs & PowerShell build scripts
│
├── app/                    # ★ Laravel application
│   ├── Http/
│   │   ├── Controllers/
│   │   │   ├── AuthController.php
│   │   │   ├── Api/        # Dispatch, Invitation, Photo, View, UserAdmin, LoginAdmin
│   │   │   └── Concerns/RespondsWithApi.php
│   │   └── Middleware/EnsureAdmin.php
│   ├── Models/             # User, Invitation, Response, Photo, View, Login
│   ├── Providers/AppServiceProvider.php
│   └── Support/            # Admin, ClientInfo
├── bootstrap/app.php       # App config (middleware alias, CSRF exemptions)
├── config/dateagenda.php   # Admin username, signed-cookie settings, secret
├── database/migrations/    # Laravel schema migrations
├── public/                 # Laravel web root (index.php, /api)
├── routes/web.php          # `/`, `/api`, and `/api/*` routes
├── storage/ · vendor/      # Laravel runtime & Composer dependencies
├── composer.json           # PHP dependencies (Laravel 12)
├── artisan                 # Laravel CLI
├── .env / .env.example     # Laravel environment configuration
├── .htaccess               # Apache hardening (headers, blocked paths)
├── .gitignore
├── LICENSE                 # MIT
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- **PHP 8.2+** (8.3 recommended) with the **PDO MySQL** and **mbstring** extensions.
- **Composer 2.x**.
- **MySQL / MariaDB**.
- An Apache stack (e.g. **WAMP**, XAMPP, or Laragon) — or `php artisan serve`.

### 1. Place the project
Copy this folder into your web root, e.g. `C:\wamp64\www\date-agenda`, so the front-end is served at `http://localhost/date-agenda/` and Laravel at `http://localhost/date-agenda/public/`.

### 2. Install PHP dependencies
```bash
composer install
```

### 3. Configure Laravel (`.env`)
```bash
copy .env.example .env      # Windows (use `cp` on Unix)
php artisan key:generate
```
Then edit `.env`:
```dotenv
APP_URL=http://localhost/date-agenda/public

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=dbdate_agenda
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password

# Admin
DATEAGENDA_ADMIN_USERNAME=Ediko
DATEAGENDA_ADMIN_COOKIE=amour_admin
DATEAGENDA_ADMIN_SECRET=a-long-random-secret   # signs the admin cookie
```
> `.env` is **gitignored** — never commit real credentials or secrets.

### 4. Configure the legacy fallback (optional)
Copy `inc/config.sample.php` to `inc/config.php` and fill in the same database values plus `DEFAULT_ADMIN_*` / `ADMIN_SECRET`:
```php
const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'dbdate_agenda';
const DB_USER = 'your_db_user';
const DB_PASS = 'your_db_password';

const DEFAULT_ADMIN_USER = 'Ediko';   // the super-admin account
const DEFAULT_ADMIN_PASS = 'choose-a-strong-password';

const ADMIN_COOKIE = 'amour_admin';
const ADMIN_SECRET = 'a-long-random-secret'; // signs the admin cookie
```
> `inc/config.php` is **gitignored**.

### 5. Create the database
Either import the provided dump:
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dbdate_agenda CHARACTER SET utf8mb4"
mysql -u root -p dbdate_agenda < "dbdate_agenda .sql"
```
…or let Laravel build the schema:
```bash
php artisan migrate
```
…or run the legacy installer once at `http://localhost/date-agenda/install.php` (then **delete `install.php`**).

### 6. Use it
- **App:** `http://localhost/date-agenda/`
- **Account:** `http://localhost/date-agenda/account.html`
- **Admin:** `http://localhost/date-agenda/admin.html` (sign in as `DATEAGENDA_ADMIN_USERNAME`)

---

## 🔐 Security Notes

- **Passwords** are stored using PHP's `password_hash()` (bcrypt).
- The **admin panel** uses a separate, **signed HttpOnly cookie** (HMAC-SHA256 over an expiry timestamp) so the admin stays logged in independently of the public site session.
- **Laravel sessions** are regenerated on login. The JSON API (`api` and `api/*`) is exempt from Laravel's CSRF check because the existing front-end calls it without a token; admin-only routes are still enforced by the `admin` middleware.
- **`.htaccess`** hardening: `Options -Indexes`, directory-browsing disabled, sensitive files (`.sql`, `.env`, configs, backups, dotfiles) blocked, `inc/` denied, and security headers set.
- **Keep `.env`, `inc/config.php`, and the admin secrets private.** Rotate the admin secret and database credentials for any public deployment; regenerate the admin password if a dump was ever shared.

---

## 🎨 Building the CSS (optional)

The Tailwind bundles are pre-built, but if you change markup you can rebuild them:

```powershell
./build/build.ps1
```

Configs live in `build/tailwind.config.*.js` with input `build/input.css`.

---

## 🌐 Deployment

This is a **PHP 8.2+ + MySQL** application built on **Laravel 12**.

- ✅ Works on Apache/Nginx with PHP + MySQL (WAMP, XAMPP, shared hosting, VPS). Point the web root at `public/` (or keep the legacy files at the root and serve Laravel from `/public`).
- ⚠️ **GitHub Pages only serves static files** — it will show the HTML/CSS/JS but neither the Laravel API nor the PHP fallback (login, invitations, admin) will **run**. Use it only as a static preview; deploy the full app to a PHP host.

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE).

---

<p align="center">Made with ❤️ for planning unforgettable dates.</p>
