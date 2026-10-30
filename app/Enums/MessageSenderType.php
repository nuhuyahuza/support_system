<?php

namespace App\Enums;

enum MessageSenderType: string
{
    case Customer = 'customer';
    case Agent = 'agent';
    case Ai = 'ai';
    case System = 'system';
}
