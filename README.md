# Date Agenda 📅

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/Ediko-eng/Date-Agenda/blob/main/LICENSE)

**Date Agenda** — also presented in-app as **Amour · Enchanting Date Planner** — is a modern, lightweight web application for planning and sharing romantic date invitations. A sender creates an invitation, the recipient opens a (animated) envelope, answers *Yes / No*, and then plans the details of the date. An integrated admin dashboard manages users, invitations, views, and login activity.

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
- **Statistics:** status donut chart, acceptance/decline trend chart, and totals.
- **Users:** list, view detail, edit, create, and delete users.
- **Invitations:** view and manage every invitation across all users.
- **Views & logins:** per-invitation view tracking and a login activity list.
- **Export CSV** of the dashboard data (UTF-8 with BOM for Excel).
- Dark mode and a responsive layout.

### Platform
- **JSON API** with clean separation between user-facing and admin-only endpoints.
- **Session + signed admin cookie** so the admin panel stays logged in independently of the public site.
- **Responsive, mobile-first UI** with a light/dark theme toggle.

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Structure** | HTML5 (`index.html`, `admin.html`, `account.html`) |
| **Styling** | CSS3, **Tailwind CSS** (prebuilt bundles) + custom `style.css` |
| **Client logic** | JavaScript ES modules (`script.js`, `admin.js`, `account.js`, `simple-db.js`) |
| **Backend** | PHP (JSON API): `user.php`, `admin.php`, `api.php`, `inc/api-core.php` |
| **Database** | MySQL / MariaDB via **PDO** (utf8mb4) |
| **Charts** | Custom canvas/SVG rendering in `admin.js` |
| **Build tooling** | PowerShell build scripts + Tailwind configs in `build/` |

No framework or bundler is required at runtime — the Tailwind CSS is pre-built and committed.

---

## 🏗️ Architecture

```text
Browser (HTML + JS modules)
        │  fetch(JSON)
        ▼
┌───────────────────────────────────────────┐
│  PHP JSON API                              │
│  ├── user.php   → user actions             │
│  ├── admin.php  → admin actions            │
│  └── api.php    → all actions (legacy)     │
│            └──────────┬────────────────────┘
│                       ▼                     │
│              inc/api-core.php (dispatcher)  │
│                       │ PDO                 │
└───────────────────────┼─────────────────────┘
                        ▼
                 MySQL database
```

- **`user.php`** — public/account actions (`register`, `login`, invitations, views, account updates). Admin-only actions are blocked here.
- **`admin.php`** — user management and all-invitation/analytics actions; every admin action additionally enforces the admin account.
- **`api.php`** — back-compatibility front controller that serves every action so older cached clients keep working.
- **`inc/api-core.php`** — the single dispatcher, validation, and business logic for all three entry points.

### Client data layer
`simple-db.js` is the client-side data layer. It detects the current page and routes calls automatically: `admin.html` talks to `admin.php`, while `index.html` and `account.html` talk to `user.php`.

---

## 🔌 API Reference

All endpoints receive `?action=<name>` (GET for reads, `POST` with a JSON body for writes) and return JSON: `{ "ok": true, ... }` or `{ "ok": false, "error": "…" }`.

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

Database: **`dbdate_agenda`** (utf8mb4). Tables are created and migrated automatically by `install.php`.

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
├── simple-db.js            # API client (routes to user.php / admin.php)
├── style.css               # Custom styles & animations
├── tailwind.css            # Prebuilt Tailwind bundle (main site)
├── tailwind-admin.css      # Prebuilt Tailwind bundle (admin)
├── tailwind-account.css    # Prebuilt Tailwind bundle (account)
├── api.php                 # Back-compat API front controller (all actions)
├── user.php                # User-facing API endpoint
├── admin.php               # Admin API endpoint
├── install.php             # One-time installer / schema migrations
├── inc/
│   ├── api-core.php        # Core API dispatcher & business logic
│   ├── config.php          # Local configuration (DB + admin + secrets) — gitignored
│   ├── config.sample.php   # Template for config.php
│   └── .htaccess           # Denies direct access to this folder
├── Gallery/                # Example images used by the UI
├── build/                  # Tailwind configs & PowerShell build scripts
├── .htaccess               # Apache hardening (headers, blocked paths)
├── .gitignore
├── LICENSE                 # MIT
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
- **PHP 7.4+** (8.x recommended) with the **PDO MySQL** extension.
- **MySQL / MariaDB**.
- An Apache stack (e.g. **WAMP**, XAMPP, or Laragon) — or any server with PHP.

### 1. Place the project
Copy this folder into your web root, e.g. `C:\wamp64\www\date-agenda`, so it is served at `http://localhost/date-agenda/`.

### 2. Configure
Copy `inc/config.sample.php` to `inc/config.php` and fill in your values:

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

> `inc/config.php` is **gitignored** — never commit real credentials or secrets.

### 3. Create the database
Either import the provided dump:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dbdate_agenda CHARACTER SET utf8mb4"
mysql -u root -p dbdate_agenda < "dbdate_agenda .sql"
```

…or let the installer build the schema for you.

### 4. Run the installer
Open **`http://localhost/date-agenda/install.php`** once. It creates the database/tables, applies migrations, and seeds the default admin account. Then **delete `install.php`**.

### 5. Use it
- **App:** `http://localhost/date-agenda/`
- **Account:** `http://localhost/date-agenda/account.html`
- **Admin:** `http://localhost/date-agenda/admin.html` (sign in as `DEFAULT_ADMIN_USER`)

---

## 🔐 Security Notes

- **Passwords** are stored using PHP's `password_hash()` (bcrypt).
- The **admin panel** uses a separate, **signed HttpOnly cookie** (HMAC-SHA256 over an expiry timestamp) so the admin stays logged in independently of the public site session.
- **Sessions** are regenerated on login; a **CSRF token** guards state-changing form flows.
- **`.htaccess`** hardening: `Options -Indexes`, directory-browsing disabled, sensitive files (`.sql`, `.env`, configs, backups, dotfiles) blocked, `inc/` denied, and security headers set.
- **Keep `inc/config.php` and `ADMIN_SECRET` private.** Rotate `ADMIN_SECRET` and database credentials for any public deployment; regenerate the admin password if a dump was ever shared.

---

## 🎨 Building the CSS (optional)

The Tailwind bundles are pre-built, but if you change markup you can rebuild them:

```powershell
./build/build.ps1
```

Configs live in `build/tailwind.config.*.js` with input `build/input.css`.

---

## 🌐 Deployment

This is a **PHP + MySQL** application. It needs a server that runs PHP.

- ✅ Works on Apache/Nginx with PHP + MySQL (WAMP, XAMPP, shared hosting, VPS).
- ⚠️ **GitHub Pages only serves static files** — it will show the HTML/CSS/JS but the PHP API (login, invitations, admin) will **not** run. Use it only as a static preview; deploy the full app to a PHP host.

---

## 📄 License

Released under the **MIT License** — see [LICENSE](LICENSE).

---

<p align="center">Made with ❤️ for planning unforgettable dates.</p>
