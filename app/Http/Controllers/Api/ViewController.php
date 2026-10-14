<?php

namespace App\Http\Controllers\Api;

use App\Models\Invitation;
use App\Models\View;
use App\Support\ClientInfo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ViewController extends ApiController
{
    public function store(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', '');
        if ($id === '') {
            return $this->fail('Missing invitation id.');
        }

        $userAgent = (string) $request->userAgent();
        $meta = ClientInfo::parse($userAgent);

        $viewer = (string) $request->cookie('viewer_id');
        if (! preg_match('/^[a-f0-9]{16}$/', $viewer)) {
            $viewer = bin2hex(random_bytes(8));
            cookie()->queue(cookie('viewer_id', $viewer, 525600, '/', null, $request->isSecure(), true, false, 'lax'));
        }

        View::create([
            'invitation_id' => $id,
            'ip' => ClientInfo::ip($request),
            'user_agent' => mb_substr($userAgent, 0, 512),
            'referer' => mb_substr((string) $request->headers->get('referer', ''), 0, 512),
            'browser' => $meta['browser'],
            'os' => $meta['os'],
            'device' => $meta['device'],
            'viewer' => $viewer,
        ]);

        return $this->ok();
    }

    public function index(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', $request->query('id', ''));
        if ($id === '') {
            return $this->fail('Missing invitation id.');
        }

        $invitation = Invitation::find($id);
        if (! $invitation) {
            return $this->fail('Invitation not found.', 404);
        }
        if (! $this->ownsInvitation($request->user(), $invitation) && ! $this->isAdmin($request)) {
            return $this->fail('Not allowed.', 403);
        }

        $views = View::where('invitation_id', $id)->orderByDesc('viewed_at')->get();

        $rows = $views->map(fn (View $view) => [
            'id' => (int) $view->id,
            'invitation_id' => $view->invitation_id,
            'ip' => $view->ip,
            'user_agent' => $view->user_agent,
            'referer' => $view->referer,
            'browser' => $view->browser,
            'os' => $view->os,
            'device' => $view->device,
            'viewer' => $view->viewer,
            'viewed_at' => optional($view->viewed_at)->toDateTimeString(),
        ])->all();

        $unique = [];
        foreach ($views as $view) {
            $unique[$view->viewer ?: $view->ip] = true;
        }

        return $this->ok([
            'views' => $rows,
            'total' => count($rows),
            'unique' => count($unique),
        ]);
    }

    public function all(Request $request): JsonResponse
    {
        $rows = DB::select('SELECT invitation_id, COUNT(*) AS total, COUNT(DISTINCT COALESCE(NULLIF(viewer, ""), ip)) AS uniques, MAX(viewed_at) AS last_view
                            FROM views GROUP BY invitation_id');

        $map = [];
        foreach ($rows as $row) {
            $map[$row->invitation_id] = $row;
        }

        return $this->ok(['counts' => $map]);
    }
}
