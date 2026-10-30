<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            Schema::disableForeignKeyConstraints();

            Schema::rename('users', 'users_old');

            // SQLite keeps original index names after rename; drop them to avoid collisions.
            $indexes = DB::select("PRAGMA index_list('users_old')");
            foreach ($indexes as $index) {
                if (! str_starts_with($index->name, 'sqlite_autoindex_')) {
                    DB::statement('DROP INDEX IF EXISTS "'.$index->name.'"');
                }
            }

            Schema::create('users', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('email')->nullable()->unique();
                $table->string('phone')->nullable()->unique();
                $table->timestamp('email_verified_at')->nullable();
                $table->string('password')->nullable();
                $table->string('role')->default('customer');
                $table->boolean('is_online')->default(false);
                $table->timestamp('last_seen_at')->nullable();
                $table->rememberToken();
                $table->text('two_factor_secret')->nullable();
                $table->text('two_factor_recovery_codes')->nullable();
                $table->timestamp('two_factor_confirmed_at')->nullable();
                $table->timestamps();
            });

            $oldColumns = collect(Schema::getColumnListing('users_old'));
            $newColumns = collect(Schema::getColumnListing('users'));
            $shared = $oldColumns->intersect($newColumns)->values()->all();
            $columnList = implode(', ', $shared);

            if ($columnList !== '') {
                DB::statement("INSERT INTO users ({$columnList}) SELECT {$columnList} FROM users_old");
            }

            Schema::drop('users_old');
            Schema::enableForeignKeyConstraints();

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->string('phone')->nullable()->unique()->after('email');
            $table->string('role')->default('customer')->after('password');
            $table->boolean('is_online')->default(false)->after('role');
            $table->timestamp('last_seen_at')->nullable()->after('is_online');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['phone', 'role', 'is_online', 'last_seen_at']);
        });
    }
};
