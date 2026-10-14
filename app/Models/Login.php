<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Login extends Model
{
    protected $table = 'logins';

    /** The creation timestamp column is named logged_at. */
    const CREATED_AT = 'logged_at';

    /** The table only tracks logged_at. */
    const UPDATED_AT = null;

    protected $fillable = [
        'user_id',
        'username',
        'ip',
        'user_agent',
        'browser',
        'os',
        'device',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'logged_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
