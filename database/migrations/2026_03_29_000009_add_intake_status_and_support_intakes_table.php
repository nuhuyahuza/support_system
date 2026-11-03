<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('intake_status')->default('pending')->after('ai_active');
        });

        Schema::create('support_intakes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->string('phone');
            $table->unsignedInteger('data_size');
            $table->timestamps();

            $table->index('conversation_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_intakes');

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn('intake_status');
        });
    }
};
