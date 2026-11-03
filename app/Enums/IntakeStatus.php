<?php

namespace App\Enums;

enum IntakeStatus: string
{
    case Pending = 'pending';
    case AwaitingDetails = 'awaiting_details';
    case AwaitingIssue = 'awaiting_issue';
    case AwaitingOtherIssue = 'awaiting_other_issue';
    case Completed = 'completed';
}
