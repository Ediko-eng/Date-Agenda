<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Admin account
    |--------------------------------------------------------------------------
    |
    | The username that is treated as the site administrator. Signing in with
    | this account grants access to the admin-only endpoints.
    |
    */
    'admin_username' => env('DATEAGENDA_ADMIN_USERNAME', 'Ediko'),

    /*
    |--------------------------------------------------------------------------
    | Admin cookie
    |--------------------------------------------------------------------------
    |
    | A signed, long-lived cookie keeps the admin signed in independently of
    | the public session, so registering/logging in as another user does not
    | sign the admin out.
    |
    */
    'admin_cookie' => env('DATEAGENDA_ADMIN_COOKIE', 'amour_admin'),
    'admin_cookie_ttl' => (int) env('DATEAGENDA_ADMIN_COOKIE_TTL', 2592000), // 30 days
    'admin_secret' => env('DATEAGENDA_ADMIN_SECRET'),
];
