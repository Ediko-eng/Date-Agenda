<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\AuthController;
use App\Support\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Maps the legacy `?action=` API calls onto controller methods so the
 * existing frontend keeps working during the migration.
 */
class DispatchController extends ApiController
{
    /** @var array<string, array{0: class-string, 1: string}> */
    protected array $routes = [
        // Auth
        'session' => [AuthController::class, 'session'],
        'register' => [AuthController::class, 'register'],
        'login' => [AuthController::class, 'login'],
        'logout' => [AuthController::class, 'logout'],
        'account_update' => [AuthController::class, 'accountUpdate'],
        'admin_logout' => [AuthController::class, 'adminLogout'],

        // Invitations
        'invitations_list' => [InvitationController::class, 'index'],
        'invitation_get' => [InvitationController::class, 'show'],
        'invitation_add' => [InvitationController::class, 'store'],
        'invitation_update' => [InvitationController::class, 'update'],
        'invitation_delete' => [InvitationController::class, 'destroy'],

        // Photos
        'photo_add' => [PhotoController::class, 'store'],
        'photos_list' => [PhotoController::class, 'index'],
        'photo_delete' => [PhotoController::class, 'destroy'],

        // Views
        'view_record' => [ViewController::class, 'store'],
        'views_list' => [ViewController::class, 'index'],
        'views_all' => [ViewController::class, 'all'],

        // Users (admin)
        'users_list' => [UserAdminController::class, 'index'],
        'user_detail' => [UserAdminController::class, 'show'],
        'user_add' => [UserAdminController::class, 'store'],
        'user_update' => [UserAdminController::class, 'update'],
        'user_delete' => [UserAdminController::class, 'destroy'],

        // Logins (admin)
        'logins_list' => [LoginAdminController::class, 'index'],
        'login_delete' => [LoginAdminController::class, 'destroy'],
        'login_clear' => [LoginAdminController::class, 'clear'],
    ];

    /** @var list<string> */
    protected array $adminOnly = [
        'views_all',
        'users_list',
        'user_add',
        'user_delete',
        'user_update',
        'logins_list',
        'user_detail',
        'login_delete',
        'login_clear',
    ];

    public function handle(Request $request): JsonResponse
    {
        $action = (string) ($request->query('action') ?? $request->input('action', ''));

        if (! isset($this->routes[$action])) {
            return $this->fail('Unknown action: '.$action, 404);
        }

        if (in_array($action, $this->adminOnly, true) && ! Admin::check($request)) {
            return $this->fail('Admin access required.', 403);
        }

        [$controller, $method] = $this->routes[$action];

        return app($controller)->{$method}($request);
    }
}
