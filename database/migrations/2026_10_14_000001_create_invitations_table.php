<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('invitations')) {
            return;
        }

        Schema::create('invitations', function (Blueprint $table) {
            $table->string('id', 24)->primary();
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->dateTime('date')->nullable();
            $table->string('location', 255)->default('');
            $table->string('pickup_location', 255)->default('');
            $table->string('dress_code', 50)->default('');
            $table->string('activity', 255)->default('');
            $table->string('song_url', 500)->default('');
            $table->string('status', 20)->default('pending');
            $table->longText('photos')->nullable();
            $table->string('created_by', 50)->nullable();
            $table->string('creator_name', 100)->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invitations');
    }
};
