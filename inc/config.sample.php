<?php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

const DB_HOST = '127.0.0.1';
const DB_PORT = 3306;
const DB_NAME = 'dbdate_agenda';
const DB_USER = 'your_db_user';
const DB_PASS = 'your_db_password';

const DEFAULT_ADMIN_USER = 'Ediko';
const DEFAULT_ADMIN_PASS = 'change-me';

// The admin panel keeps its own signed, HttpOnly cookie so that signing out or
// registering another account on the public site never knocks the admin out.
const ADMIN_COOKIE = 'amour_admin';
const ADMIN_SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
// Secret used to sign the admin cookie. Regenerate this for your own deployment.
// Generate one with: php -r "echo bin2hex(random_bytes(32));"
const ADMIN_SECRET = 'replace-with-a-random-64-char-hex-string';
