<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class View extends Model
{
    protected $table = 'views';

    /** The creation timestamp column is named viewed_at. */
    const CREATED_AT = 'viewed_at';

    /** The table only tracks viewed_at. */
    const UPDATED_AT = null;

    protected $fillable = [
        'invitation_id',
        'ip',
        'user_agent',
        'referer',
        'browser',
        'os',
        'device',
        'viewer',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'viewed_at' => 'datetime',
        ];
    }

    public function invitation()
    {
        return $this->belongsTo(Invitation::class, 'invitation_id');
    }
}
