<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\RespondsWithApi;
use App\Http\Controllers\Controller;

abstract class ApiController extends Controller
{
    use RespondsWithApi;
}
