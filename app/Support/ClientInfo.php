<?php

namespace App\Support;

use Illuminate\Http\Request;

/**
 * Extracts the caller's IP address and parses their user agent, mirroring the
 * behaviour of the original procedural application.
 */
class ClientInfo
{
    public static function ip(Request $request): string
    {
        foreach (['X-Forwarded-For', 'X-Client-IP'] as $header) {
            $value = $request->header($header);
            if (! $value) {
                continue;
            }
            $ip = trim(explode(',', $value)[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP)) {
                return $ip;
            }
        }

        return $request->ip() ?: '0.0.0.0';
    }

    /**
     * @return array{browser: string, os: string, device: string}
     */
    public static function parse(?string $userAgent): array
    {
        $ua = (string) $userAgent;

        $browser = 'Unknown';
        foreach (['Edg' => 'Edge', 'OPR' => 'Opera', 'Chrome' => 'Chrome', 'Firefox' => 'Firefox', 'Safari' => 'Safari', 'MSIE' => 'IE', 'Trident' => 'IE'] as $needle => $name) {
            if (stripos($ua, $needle) !== false) {
                $browser = $name;
                break;
            }
        }

        $os = 'Unknown';
        $map = ['Windows' => 'Windows', 'Android' => 'Android', 'iPhone' => 'iOS', 'iPad' => 'iOS', 'Mac OS' => 'macOS', 'Linux' => 'Linux'];
        foreach ($map as $needle => $name) {
            if (stripos($ua, $needle) !== false) {
                $os = $name;
                break;
            }
        }

        $device = 'Desktop';
        if (preg_match('/Mobile|Android|iPhone|iPad|iPod/i', $ua)) {
            $device = preg_match('/iPad|Tablet/i', $ua) ? 'Tablet' : 'Mobile';
        }

        return ['browser' => $browser, 'os' => $os, 'device' => $device];
    }
}
