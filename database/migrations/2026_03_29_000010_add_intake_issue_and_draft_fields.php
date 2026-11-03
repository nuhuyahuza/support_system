<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('conversations', function (Blueprint $table) {
            $table->string('intake_phone')->nullable()->after('intake_status');
            $table->unsignedInteger('intake_data_size')->nullable()->after('intake_phone');
        });

        Schema::table('support_intakes', function (Blueprint $table) {
            $table->text('issue')->nullable()->after('data_size');
        });
    }

    public function down(): void
    {
        Schema::table('support_intakes', function (Blueprint $table) {
            $table->dropColumn('issue');
        });

        Schema::table('conversations', function (Blueprint $table) {
            $table->dropColumn(['intake_phone', 'intake_data_size']);
        });
    }
};
