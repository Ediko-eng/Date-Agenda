<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Invitation extends Model
{
    protected $table = 'invitations';

    protected $primaryKey = 'id';

    public $incrementing = false;

    protected $keyType = 'string';

    /** The table only tracks created_at. */
    const UPDATED_AT = null;

    protected $fillable = [
        'id',
        'user_id',
        'date',
        'location',
        'pickup_location',
        'dress_code',
        'activity',
        'song_url',
        'status',
        'photos',
        'created_by',
        'creator_name',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'date' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function response()
    {
        return $this->hasOne(Response::class, 'invitation_id');
    }

    /**
     * Uploaded gallery photos. Named to avoid clashing with the
     * `photos` longtext column on this table.
     */
    public function photoUploads()
    {
        return $this->hasMany(Photo::class, 'invitation_id');
    }

    public function views()
    {
        return $this->hasMany(View::class, 'invitation_id');
    }
}
