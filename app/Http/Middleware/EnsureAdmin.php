<?php

namespace App\Http\Middleware;

use App\Support\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdmin
{
    /**
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (! Admin::check($request)) {
            return response()->json(['ok' => false, 'error' => 'Admin access required.'], 403);
        }

        return $next($request);
    }
}
