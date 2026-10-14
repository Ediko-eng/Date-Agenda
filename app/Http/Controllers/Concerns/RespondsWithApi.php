<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Invitation;
use App\Models\User;
use App\Support\Admin;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Shared JSON envelope and presentation helpers, mirroring the response
 * shapes produced by the original procedural API.
 */
trait RespondsWithApi
{
    protected function ok(array $payload = [], int $code = 200): JsonResponse
    {
        return response()->json(array_merge(['ok' => true], $payload), $code);
    }

    protected function fail(string $message, int $code = 400): JsonResponse
    {
        return response()->json(['ok' => false, 'error' => $message], $code);
    }

    protected function isAdmin(Request $request): bool
    {
        return Admin::check($request);
    }

    /**
     * @return array<string, mixed>
     */
    protected function publicUser(User $user): array
    {
        return [
            'id' => (int) $user->id,
            'username' => $user->username,
            'full_name' => (string) ($user->full_name ?? ''),
            'gender' => (string) ($user->gender ?? ''),
            'birth_date' => $user->birth_date ? $user->birth_date->format('Y-m-d') : null,
            'address' => (string) ($user->address ?? ''),
        ];
    }

    protected function newToken(): string
    {
        return substr(bin2hex(random_bytes(6)), 0, 10);
    }

    protected function normalizeDate($value): ?string
    {
        if (! $value || ! is_string($value)) {
            return null;
        }
        $ts = strtotime($value);

        return $ts ? date('Y-m-d H:i:s', $ts) : null;
    }

    protected function ownsInvitation(?User $me, ?Invitation $invitation): bool
    {
        if (! $me || ! $invitation) {
            return false;
        }
        if ($invitation->user_id !== null && (int) $invitation->user_id === (int) $me->id) {
            return true;
        }

        return $invitation->created_by !== null && $invitation->created_by === $me->username;
    }

    /**
     * @return array<string, mixed>
     */
    protected function shapeInvitation(Invitation $invitation): array
    {
        $response = $invitation->response;
        $decision = $response?->decision;

        $photos = $invitation->photos;
        if (is_string($photos) && $photos !== '') {
            $decoded = json_decode($photos, true);
            $photos = is_array($decoded) ? $decoded : [];
        } elseif (! is_array($photos)) {
            $photos = [];
        }

        return [
            'id' => $invitation->id,
            'date' => optional($invitation->date)->toDateTimeString(),
            'location' => $invitation->location,
            'pickupLocation' => $invitation->pickup_location ?? '',
            'dressCode' => $invitation->dress_code,
            'activity' => $invitation->activity,
            'songUrl' => $invitation->song_url,
            'status' => $decision ?: ($invitation->status ?? 'pending'),
            'acceptedBy' => $decision === 'accepted' ? $response?->responder_name : null,
            'declinedBy' => $decision === 'declined' ? $response?->responder_name : null,
            'message' => $response?->message,
            'photos' => $photos,
            'createdBy' => $invitation->created_by,
            'creatorName' => $invitation->creator_name,
            'createdAt' => optional($invitation->created_at)->toDateTimeString(),
            'respondedAt' => optional($response?->responded_at)->toDateTimeString(),
        ];
    }
}
