<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class PitchDeck extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'pptx_url',
        'status',
        'task_id',
        'options',
        'pdf_url'
    ];

    protected $casts = [
        'options' => 'array',
    ];

    const STATUS_PENDING = 'PENDING';
    const STATUS_SUCCESS = 'SUCCESS';
    const STATUS_FAILED = 'FAILED';

    public function user()
    {
        return $this->belongsTo(User::class);
    }
    
    public function getAddedAgoTextAttribute()
    {
        $diff = $this->created_at->diffForHumans(null, true);
        return __('Added :time ago', ['time' => $diff]);
    }
}
