<?php

namespace App\Enums;

enum IntakeStatus: string
{
    case Pending = 'pending';
    case AwaitingDetails = 'awaiting_details';
    case Completed = 'completed';
}
