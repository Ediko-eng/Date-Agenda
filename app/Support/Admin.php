<?php

namespace App\Support;

use Illuminate\Http\Request;

class Admin
{
    /**
     * Whether the current request is an authenticated admin, either because
     * the signed-in user is the admin account or because a valid signed
     * admin cookie is present.
     */
    public static function check(Request $request): bool
    {
        $user = $request->user();
        if ($user && self::isAdminUsername($user->username)) {
            return true;
        }

        return self::cookieValid($request);
    }

    public static function isAdminUsername(?string $username): bool
    {
        return strcasecmp((string) $username, (string) config('dateagenda.admin_username')) === 0;
    }

    public static function cookieValid(Request $request): bool
    {
        $raw = $request->cookie((string) config('dateagenda.admin_cookie'));
        if (! is_string($raw) || $raw === '' || ! str_contains($raw, '.')) {
            return false;
        }

        [$exp, $sig] = explode('.', $raw, 2);
        if (! ctype_digit($exp) || (int) $exp < time()) {
            return false;
        }

        return hash_equals(self::sign($exp), $sig);
    }

    public static function setCookie(): void
    {
        $ttl = (int) config('dateagenda.admin_cookie_ttl');
        $exp = time() + $ttl;
        $value = $exp . '.' . self::sign((string) $exp);

        cookie()->queue(cookie(
            (string) config('dateagenda.admin_cookie'),
            $value,
            intdiv($ttl, 60),
            '/',
            null,
            request()->isSecure(),
            true,
            false,
            'lax',
        ));
    }

    public static function clearCookie(): void
    {
        cookie()->queue(cookie(
            (string) config('dateagenda.admin_cookie'),
            '',
            -1,
            '/',
            null,
            request()->isSecure(),
            true,
            false,
            'lax',
        ));
    }

    private static function sign(string $exp): string
    {
        $secret = (string) (config('dateagenda.admin_secret') ?: config('app.key'));

        return hash_hmac('sha256', $exp, $secret);
    }
}
