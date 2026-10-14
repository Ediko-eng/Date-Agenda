<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('views')) {
            return;
        }

        Schema::create('views', function (Blueprint $table) {
            $table->id();
            $table->string('invitation_id', 24)->index();
            $table->string('ip', 45);
            $table->string('user_agent', 512)->default('');
            $table->string('referer', 512)->default('');
            $table->string('browser', 40)->default('');
            $table->string('os', 40)->default('');
            $table->string('device', 20)->default('');
            $table->string('viewer', 64)->default('');
            $table->timestamp('viewed_at')->useCurrent();

            $table->foreign('invitation_id')->references('id')->on('invitations')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('views');
    }
};
