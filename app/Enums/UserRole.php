<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Agent = 'agent';
    case Admin = 'admin';

    public function isStaff(): bool
    {
        return $this === self::Agent || $this === self::Admin;
    }
}
