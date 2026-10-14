<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\RespondsWithApi;
use App\Models\Login;
use App\Models\User;
use App\Support\Admin;
use App\Support\ClientInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    use RespondsWithApi;

    public function session(Request $request): JsonResponse
    {
        $user = $request->user();
        $isAdmin = Admin::check($request);

        return response()->json([
            'ok' => true,
            'user' => $user ? $this->publicUser($user) : null,
            'is_admin' => $isAdmin,
            'admin_user' => $isAdmin ? config('dateagenda.admin_username') : null,
        ]);
    }

    public function register(Request $request): JsonResponse
    {
        $username = trim((string) $request->input('username', ''));
        $password = (string) $request->input('password', '');

        if ($username === '' || $password === '') {
            return $this->fail('Username and password are required.');
        }
        if (! preg_match('/^[A-Za-z0-9 _.\-]{3,50}$/', $username)) {
            return $this->fail('Username must be 3-50 chars (letters, numbers, space, . _ -).');
        }
        if (strlen($password) < 6) {
            return $this->fail('Password must be at least 6 characters.');
        }

        $fullName = trim((string) $request->input('full_name', ''));
        $gender = trim((string) $request->input('gender', ''));
        $birthDate = trim((string) $request->input('birth_date', ''));
        $address = trim((string) $request->input('address', ''));

        if (mb_strlen($fullName) > 100) {
            return $this->fail('Full name is too long (max 100).');
        }
        if ($gender !== '' && ! in_array($gender, ['Female', 'Male', 'Other'], true)) {
            return $this->fail('Invalid gender.');
        }
        if ($birthDate !== '') {
            $ts = strtotime($birthDate);
            if ($ts === false) {
                return $this->fail('Invalid birth date.');
            }
            $birthDate = date('Y-m-d', $ts);
        }
        if (mb_strlen($address) > 500) {
            return $this->fail('Address is too long (max 500).');
        }

        if (User::where('username', $username)->exists()) {
            return $this->fail('That username is already taken.');
        }

        $user = User::create([
            'username' => $username,
            'password_hash' => Hash::make($password),
            'full_name' => $fullName,
            'gender' => $gender,
            'birth_date' => $birthDate !== '' ? $birthDate : null,
            'address' => $address,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        return response()->json(['ok' => true, 'user' => $this->publicUser($user)]);
    }

    public function login(Request $request): JsonResponse
    {
        $username = trim((string) $request->input('username', ''));
        $password = (string) $request->input('password', '');

        $user = User::where('username', $username)->first();
        if (! $user || ! Hash::check($password, $user->password_hash)) {
            return $this->fail('Invalid username or password.', 401);
        }

        Auth::login($user);
        $request->session()->regenerate();

        if (Admin::isAdminUsername($user->username)) {
            Admin::setCookie();
        }

        $user->last_login_at = now();
        $user->save();

        $meta = ClientInfo::parse($request->userAgent());
        Login::create([
            'user_id' => $user->id,
            'username' => mb_substr($user->username, 0, 64),
            'ip' => ClientInfo::ip($request),
            'user_agent' => mb_substr((string) $request->userAgent(), 0, 512),
            'browser' => $meta['browser'],
            'os' => $meta['os'],
            'device' => $meta['device'],
        ]);

        return response()->json(['ok' => true, 'user' => $this->publicUser($user)]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json(['ok' => true]);
    }

    public function adminLogout(Request $request): JsonResponse
    {
        Admin::clearCookie();

        $user = $request->user();
        if ($user && Admin::isAdminUsername($user->username)) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        return response()->json(['ok' => true]);
    }

    public function accountUpdate(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user) {
            return $this->fail('Not signed in.', 401);
        }

        $current = (string) $request->input('current_password', '');
        if (! Hash::check($current, $user->password_hash)) {
            return $this->fail('Current password is incorrect.', 403);
        }

        $newUsername = trim((string) $request->input('username', ''));
        $newPassword = (string) $request->input('new_password', '');

        if ($newUsername !== '' && $newUsername !== $user->username) {
            if (! preg_match('/^[A-Za-z0-9 _.\-]{3,50}$/', $newUsername)) {
                return $this->fail('Username must be 3-50 chars (letters, numbers, space, . _ -).');
            }
            if (User::where('username', $newUsername)->where('id', '<>', $user->id)->exists()) {
                return $this->fail('That username is already taken.');
            }
            $user->username = $newUsername;
        }

        if ($newPassword !== '') {
            if (strlen($newPassword) < 6) {
                return $this->fail('New password must be at least 6 characters.');
            }
            $user->password_hash = Hash::make($newPassword);
        }

        if ($request->hasAny(['full_name', 'gender', 'birth_date', 'address'])) {
            $fullName = trim((string) $request->input('full_name', ''));
            $gender = trim((string) $request->input('gender', ''));
            $birthDate = trim((string) $request->input('birth_date', ''));
            $address = trim((string) $request->input('address', ''));

            if (mb_strlen($fullName) > 100) {
                return $this->fail('Full name is too long (max 100).');
            }
            if ($gender !== '' && ! in_array($gender, ['Female', 'Male', 'Other'], true)) {
                return $this->fail('Invalid gender.');
            }
            if ($birthDate !== '') {
                $ts = strtotime($birthDate);
                if ($ts === false) {
                    return $this->fail('Invalid birth date.');
                }
                $birthDate = date('Y-m-d', $ts);
            }
            if (mb_strlen($address) > 500) {
                return $this->fail('Address is too long (max 500).');
            }

            $user->full_name = $fullName;
            $user->gender = $gender;
            $user->birth_date = $birthDate !== '' ? $birthDate : null;
            $user->address = $address;
        }

        $user->save();

        return response()->json(['ok' => true, 'user' => $this->publicUser($user)]);
    }
}
