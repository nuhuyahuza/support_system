<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(string $key, mixed $default = null): mixed
    {
        $settings = Cache::remember('app_settings', 60, function () {
            return static::query()->pluck('value', 'key')->all();
        });

        if (! array_key_exists($key, $settings)) {
            return $default;
        }

        return static::castValue($settings[$key], $default);
    }

    public static function setValue(string $key, mixed $value): void
    {
        static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => is_bool($value) ? ($value ? '1' : '0') : (string) $value],
        );

        Cache::forget('app_settings');
    }

    public static function many(array $keys): array
    {
        $result = [];

        foreach ($keys as $key => $default) {
            if (is_int($key)) {
                $result[$default] = static::getValue($default);
            } else {
                $result[$key] = static::getValue($key, $default);
            }
        }

        return $result;
    }

    protected static function castValue(?string $value, mixed $default): mixed
    {
        if ($value === null) {
            return $default;
        }

        if (is_bool($default)) {
            return in_array($value, ['1', 'true', 'yes', 'on'], true);
        }

        if (is_int($default)) {
            return (int) $value;
        }

        return $value;
    }
}
