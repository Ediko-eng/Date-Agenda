<?php

namespace App\Http\Controllers\Api;

use App\Models\Login;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LoginAdminController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $limit = (int) $request->input('limit', $request->query('limit', 200));
        if ($limit < 1) {
            $limit = 200;
        }
        if ($limit > 500) {
            $limit = 500;
        }

        $userId = (int) $request->input('user_id', $request->query('user_id', 0));

        if ($userId > 0) {
            $logins = DB::select("SELECT * FROM logins WHERE user_id = ? ORDER BY logged_at DESC LIMIT {$limit}", [$userId]);
        } else {
            $logins = DB::select("SELECT * FROM logins ORDER BY logged_at DESC LIMIT {$limit}");
        }

        return $this->ok(['logins' => $logins]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('Missing login id.');
        }

        Login::whereKey($id)->delete();

        return $this->ok();
    }

    public function clear(Request $request): JsonResponse
    {
        DB::table('logins')->delete();

        return $this->ok();
    }
}
