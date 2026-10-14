<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('responses')) {
            return;
        }

        Schema::create('responses', function (Blueprint $table) {
            $table->string('invitation_id', 24)->primary();
            $table->unsignedInteger('user_id')->nullable()->index();
            $table->enum('decision', ['accepted', 'declined']);
            $table->string('responder_name', 100)->nullable();
            $table->text('message')->nullable();
            $table->timestamp('responded_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('invitation_id')->references('id')->on('invitations')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('responses');
    }
};
