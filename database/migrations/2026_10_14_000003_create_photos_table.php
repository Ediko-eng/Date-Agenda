<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('photos')) {
            return;
        }

        Schema::create('photos', function (Blueprint $table) {
            $table->id();
            $table->string('invitation_id', 24)->index();
            $table->longText('data');
            $table->string('uploaded_by', 64)->default('');
            $table->string('caption', 255)->default('');
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('invitation_id')->references('id')->on('invitations')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photos');
    }
};
