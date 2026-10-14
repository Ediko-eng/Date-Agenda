<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('logins')) {
            return;
        }

        Schema::create('logins', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->string('username', 64)->default('');
            $table->string('ip', 45)->default('');
            $table->string('user_agent', 512)->default('');
            $table->string('browser', 40)->default('');
            $table->string('os', 40)->default('');
            $table->string('device', 20)->default('');
            $table->timestamp('logged_at')->useCurrent()->index();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('logins');
    }
};
