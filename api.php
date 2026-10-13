<?php
declare(strict_types=1);

// Back-compat front controller. New code should call user.php or admin.php:
//   - user.php  : end-user accounts, invitations and views
//   - admin.php : admin user management + all-invitation view
// This file keeps serving every action so older cached clients keep working.
require __DIR__ . '/inc/api-core.php';

api_dispatch('all');
