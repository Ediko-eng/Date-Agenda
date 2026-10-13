<?php
declare(strict_types=1);

// Admin API: user management (users_*, views_all) and invitation management.
// User-only actions (register, account_update) are blocked here.
// Every admin-only action additionally enforces the admin account.
require __DIR__ . '/inc/api-core.php';

api_dispatch('admin');
