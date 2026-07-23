<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PushToken extends Model
{
    protected $fillable = ['user_id', 'token', 'device_name'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /** Format attendu : ExponentPushToken[…] ou ExpoPushToken[…] */
    public static function looksValid(?string $token): bool
    {
        return is_string($token)
            && (str_starts_with($token, 'ExponentPushToken[') || str_starts_with($token, 'ExpoPushToken['))
            && str_ends_with($token, ']');
    }
}
