<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserAdminController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $rows = DB::select('SELECT u.*,
                (SELECT COUNT(*) FROM invitations i WHERE i.user_id = u.id OR i.created_by = u.username) AS invites,
                (SELECT COUNT(*) FROM logins l WHERE l.user_id = u.id) AS login_count
            FROM users u ORDER BY u.id ASC');

        foreach ($rows as $row) {
            unset($row->password_hash);
        }

        return $this->ok(['users' => $rows]);
    }

    public function show(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('Missing user id.');
        }

        $user = DB::selectOne('SELECT * FROM users WHERE id = ? LIMIT 1', [$id]);
        if (! $user) {
            return $this->fail('User not found.', 404);
        }
        unset($user->password_hash);
        $username = (string) $user->username;

        $invitations = DB::select('SELECT id, created_at, date, status, location, activity, dress_code
            FROM invitations WHERE user_id = ? OR created_by = ? ORDER BY created_at DESC LIMIT 100', [$id, $username]);

        $responses = DB::select('SELECT invitation_id, decision, responder_name, message, responded_at
            FROM responses WHERE user_id = ? ORDER BY responded_at DESC LIMIT 100', [$id]);

        $photos = DB::select('SELECT id, invitation_id, caption, created_at
            FROM photos WHERE uploaded_by = ? ORDER BY created_at DESC LIMIT 100', [$username]);

        $logins = DB::select('SELECT ip, browser, os, device, logged_at
            FROM logins WHERE user_id = ? ORDER BY logged_at DESC LIMIT 100', [$id]);

        $counts = DB::selectOne('SELECT
                (SELECT COUNT(*) FROM invitations WHERE user_id = ? OR created_by = ?) AS invitations,
                (SELECT COUNT(*) FROM invitations WHERE (user_id = ? OR created_by = ?) AND status = "accepted") AS accepted,
                (SELECT COUNT(*) FROM invitations WHERE (user_id = ? OR created_by = ?) AND status = "declined") AS declined,
                (SELECT COUNT(*) FROM responses WHERE user_id = ?) AS responses,
                (SELECT COUNT(*) FROM photos WHERE uploaded_by = ?) AS photos,
                (SELECT COUNT(*) FROM logins WHERE user_id = ?) AS logins',
            [$id, $username, $id, $username, $id, $username, $id, $username, $id]);

        return $this->ok([
            'user' => $user,
            'counts' => [
                'invitations' => (int) $counts->invitations,
                'accepted' => (int) $counts->accepted,
                'declined' => (int) $counts->declined,
                'responses' => (int) $counts->responses,
                'photos' => (int) $counts->photos,
                'logins' => (int) $counts->logins,
            ],
            'invitations' => $invitations,
            'responses' => $responses,
            'photos' => $photos,
            'logins' => $logins,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $username = trim((string) $request->input('username', ''));
        $password = (string) $request->input('password', '');

        if ($username === '' || $password === '') {
            return $this->fail('Username and password are required.');
        }
        if (strlen($password) < 6) {
            return $this->fail('Password must be at least 6 characters.');
        }
        if (User::where('username', $username)->exists()) {
            return $this->fail('That username already exists.');
        }

        $user = User::create([
            'username' => $username,
            'password_hash' => Hash::make($password),
        ]);

        return $this->ok(['id' => (int) $user->id]);
    }

    public function update(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        $newUsername = trim((string) $request->input('username', ''));
        $newPassword = (string) $request->input('password', '');

        if ($id <= 0) {
            return $this->fail('Missing user id.');
        }

        $user = User::find($id);
        if (! $user) {
            return $this->fail('User not found.', 404);
        }

        if ($newUsername !== '') {
            if (User::where('username', $newUsername)->where('id', '<>', $id)->exists()) {
                return $this->fail('That username already exists.');
            }
            $user->username = $newUsername;
        }

        if ($newPassword !== '') {
            if (strlen($newPassword) < 6) {
                return $this->fail('Password must be at least 6 characters.');
            }
            $user->password_hash = Hash::make($newPassword);
        }

        $user->save();

        return $this->ok();
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('Missing user id.');
        }

        $user = User::find($id);
        if ($user && \App\Support\Admin::isAdminUsername($user->username)) {
            return $this->fail('The admin account cannot be deleted.');
        }

        if ($user) {
            $user->delete();
        }

        return $this->ok();
    }
}
