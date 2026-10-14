<?php

use App\Http\Controllers\AuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::prefix('api')->group(function () {
    Route::get('/session', [AuthController::class, 'session']);
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/account', [AuthController::class, 'accountUpdate']);
    Route::post('/admin/logout', [AuthController::class, 'adminLogout']);

    Route::middleware('admin')->group(function () {
        Route::get('/admin/ping', fn () => response()->json(['ok' => true, 'admin' => true]));
    });
});
