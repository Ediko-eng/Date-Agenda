<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    protected $model = User::class;

    protected static ?string $password = null;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'username' => $this->faker->unique()->userName(),
            'password_hash' => static::$password ??= Hash::make('password'),
            'full_name' => $this->faker->name(),
            'gender' => $this->faker->randomElement(['Male', 'Female']),
            'birth_date' => $this->faker->date(),
            'address' => $this->faker->address(),
        ];
    }
}
