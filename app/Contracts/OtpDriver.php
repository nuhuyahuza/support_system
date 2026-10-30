<?php

namespace App\Contracts;

interface OtpDriver
{
    public function send(string $phone, string $code): void;
}
