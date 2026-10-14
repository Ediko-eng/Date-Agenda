<?php

namespace App\Http\Controllers\Api;

use App\Models\Invitation;
use App\Models\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InvitationController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $me = $request->user();
        $wantAll = $request->query('scope') === 'all';

        if ($wantAll && $this->isAdmin($request)) {
            $invitations = Invitation::with('response')->orderByDesc('created_at')->get();
        } elseif ($me) {
            $invitations = Invitation::with('response')
                ->where(function ($query) use ($me) {
                    $query->where('user_id', $me->id)->orWhere('created_by', $me->username);
                })
                ->orderByDesc('created_at')
                ->get();
        } else {
            $invitations = collect();
        }

        return $this->ok([
            'invitations' => $invitations->map(fn (Invitation $i) => $this->shapeInvitation($i))->all(),
        ]);
    }

    public function show(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', $request->query('id', ''));
        $invitation = $id === '' ? null : Invitation::with('response')->find($id);

        return $this->ok([
            'invitation' => $invitation ? $this->shapeInvitation($invitation) : null,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = (array) $request->input('data', []);
        $id = (string) ($data['id'] ?? '') ?: $this->newToken();
        $me = $request->user();

        $creatorName = mb_substr((string) ($data['creatorName'] ?? ''), 0, 100);
        if ($creatorName === '' && $me) {
            $creatorName = ($me->full_name ?? '') !== '' ? $me->full_name : $me->username;
        }

        Invitation::create([
            'id' => $id,
            'user_id' => $me?->id,
            'date' => $this->normalizeDate($data['date'] ?? null),
            'location' => mb_substr((string) ($data['location'] ?? ''), 0, 255),
            'dress_code' => mb_substr((string) ($data['dressCode'] ?? ''), 0, 50),
            'activity' => mb_substr((string) ($data['activity'] ?? ''), 0, 255),
            'song_url' => mb_substr((string) ($data['songUrl'] ?? ''), 0, 500),
            'status' => (string) ($data['status'] ?? 'pending'),
            'created_by' => mb_substr((string) ($data['createdBy'] ?? ($me?->username ?? 'anonymous')), 0, 50),
            'creator_name' => $creatorName !== '' ? $creatorName : null,
        ]);

        return $this->ok(['id' => $id]);
    }

    public function update(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', '');
        $patch = (array) $request->input('patch', []);
        if ($id === '') {
            return $this->fail('Missing invitation id.');
        }

        $invitation = Invitation::find($id);
        if (! $invitation) {
            return $this->fail('Invitation not found.', 404);
        }

        $isOwner = $this->ownsInvitation($request->user(), $invitation) || $this->isAdmin($request);

        $responseKeys = ['status', 'acceptedBy', 'declinedBy', 'message', 'respondedAt'];
        $planKeys = ['pickupLocation', 'date', 'location', 'dressCode', 'activity', 'photos'];

        if (! $isOwner) {
            $allowed = array_merge($responseKeys, $planKeys);
            foreach (array_keys($patch) as $key) {
                if (! in_array($key, $allowed, true)) {
                    return $this->fail('You can only send a response to this invitation.', 403);
                }
            }
        }

        $hasResponsePayload = count(array_intersect(array_keys($patch), $responseKeys)) > 0;

        if ($hasResponsePayload) {
            $decision = null;
            $responder = null;

            if (isset($patch['status']) && in_array($patch['status'], ['accepted', 'declined'], true)) {
                $decision = $patch['status'];
            } elseif (array_key_exists('status', $patch) && $patch['status'] === 'pending') {
                Response::where('invitation_id', $id)->delete();
                $invitation->status = 'pending';
                $invitation->save();
            } else {
                $existing = Response::where('invitation_id', $id)->first();
                if ($existing) {
                    $decision = $existing->decision;
                    $responder = $existing->responder_name;
                } elseif (! empty($patch['acceptedBy'])) {
                    $decision = 'accepted';
                } elseif (! empty($patch['declinedBy'])) {
                    $decision = 'declined';
                }
            }

            if ($decision !== null) {
                if (array_key_exists('acceptedBy', $patch)) {
                    $responder = $patch['acceptedBy'];
                } elseif (array_key_exists('declinedBy', $patch)) {
                    $responder = $patch['declinedBy'];
                }

                $message = array_key_exists('message', $patch) ? (string) $patch['message'] : null;
                $respondedAt = $this->normalizeDate($patch['respondedAt'] ?? null) ?? date('Y-m-d H:i:s');
                $me = $request->user();

                Response::updateOrCreate(
                    ['invitation_id' => $id],
                    [
                        'user_id' => $me?->id,
                        'decision' => $decision,
                        'responder_name' => $responder,
                        'message' => $message,
                        'responded_at' => $respondedAt,
                    ],
                );
                $invitation->status = $decision;
                $invitation->save();
            }
        }

        $map = [
            'date' => 'date',
            'location' => 'location',
            'pickupLocation' => 'pickup_location',
            'dressCode' => 'dress_code',
            'activity' => 'activity',
            'songUrl' => 'song_url',
        ];

        $sets = false;
        foreach ($patch as $key => $value) {
            if ($key === 'photos') {
                $invitation->photos = is_string($value) ? $value : json_encode($value);
                $sets = true;
                continue;
            }
            if (! isset($map[$key])) {
                continue;
            }
            $column = $map[$key];
            $invitation->{$column} = $column === 'date'
                ? $this->normalizeDate($value)
                : (is_scalar($value) || $value === null ? $value : json_encode($value));
            $sets = true;
        }

        if ($sets) {
            $invitation->save();
        }

        if (! $sets && ! $hasResponsePayload) {
            return $this->fail('Nothing to update.');
        }

        return $this->ok();
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', '');
        $invitation = Invitation::find($id);
        if (! $invitation) {
            return $this->fail('Invitation not found.', 404);
        }
        if (! $this->ownsInvitation($request->user(), $invitation) && ! $this->isAdmin($request)) {
            return $this->fail('Not allowed.', 403);
        }

        $invitation->delete();

        return $this->ok();
    }
}
