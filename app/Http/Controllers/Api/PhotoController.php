<?php

namespace App\Http\Controllers\Api;

use App\Models\Invitation;
use App\Models\Photo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PhotoController extends ApiController
{
    public function index(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', $request->query('id', ''));
        if ($id === '') {
            return $this->fail('Missing invitation id.');
        }

        $photos = Photo::where('invitation_id', $id)
            ->orderBy('created_at')
            ->orderBy('id')
            ->get(['id', 'invitation_id', 'data', 'uploaded_by', 'created_at'])
            ->map(fn (Photo $photo) => [
                'id' => (int) $photo->id,
                'invitation_id' => $photo->invitation_id,
                'data' => $photo->data,
                'uploaded_by' => $photo->uploaded_by,
                'created_at' => optional($photo->created_at)->toDateTimeString(),
            ])
            ->all();

        return $this->ok(['photos' => $photos]);
    }

    public function store(Request $request): JsonResponse
    {
        $id = (string) $request->input('id', '');
        $data = (string) $request->input('data', '');

        if ($id === '' || $data === '') {
            return $this->fail('Missing photo data.');
        }
        if (strlen($data) > 16000000) {
            return $this->fail('That photo is too large.');
        }
        if (! preg_match('#^data:image/(png|jpe?g|gif|webp);base64,#i', $data)) {
            return $this->fail('Invalid image format.');
        }
        if (! Invitation::whereKey($id)->exists()) {
            return $this->fail('Invitation not found.', 404);
        }

        $photo = Photo::create([
            'invitation_id' => $id,
            'data' => $data,
            'uploaded_by' => mb_substr((string) $request->input('by', ''), 0, 64),
        ]);

        return $this->ok(['id' => (int) $photo->id]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $id = (int) $request->input('id', 0);
        if ($id <= 0) {
            return $this->fail('Missing photo id.');
        }

        $photo = Photo::find($id);
        if (! $photo) {
            return $this->fail('Photo not found.', 404);
        }

        $photo->delete();

        return $this->ok();
    }
}
