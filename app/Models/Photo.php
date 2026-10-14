<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Photo extends Model
{
    protected $table = 'photos';

    /** The table only tracks created_at. */
    const UPDATED_AT = null;

    protected $fillable = [
        'invitation_id',
        'data',
        'uploaded_by',
        'caption',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function invitation()
    {
        return $this->belongsTo(Invitation::class, 'invitation_id');
    }
}
