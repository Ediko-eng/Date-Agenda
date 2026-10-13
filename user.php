<?php
declare(strict_types=1);

// User-facing API: accounts, invitations, views.
// Admin-only actions (users_*, views_all) are blocked here.
require __DIR__ . '/inc/api-core.php';

api_dispatch('user');
