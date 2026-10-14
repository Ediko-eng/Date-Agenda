<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Response extends Model
{
    protected $table = 'responses';

    protected $primaryKey = 'invitation_id';

    public $incrementing = false;

    protected $keyType = 'string';

    /** The creation timestamp column is named responded_at. */
    const CREATED_AT = 'responded_at';

    protected $fillable = [
        'invitation_id',
        'user_id',
        'decision',
        'responder_name',
        'message',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'responded_at' => 'datetime',
            'updated_at' => 'datetime',
        ];
    }

    public function invitation()
    {
        return $this->belongsTo(Invitation::class, 'invitation_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
