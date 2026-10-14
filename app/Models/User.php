<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable;

    protected $table = 'users';

    /** The table only tracks created_at. */
    const UPDATED_AT = null;

    protected $fillable = [
        'username',
        'password_hash',
        'full_name',
        'gender',
        'birth_date',
        'address',
        'last_login_at',
    ];

    protected $hidden = [
        'password_hash',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'last_login_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    public function getAuthPassword(): string
    {
        return $this->password_hash;
    }

    public function invitations()
    {
        return $this->hasMany(Invitation::class, 'user_id');
    }

    public function responses()
    {
        return $this->hasMany(Response::class, 'user_id');
    }

    public function logins()
    {
        return $this->hasMany(Login::class, 'user_id');
    }
}
