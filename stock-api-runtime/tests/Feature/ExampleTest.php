<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_homepage_returns_successful_response(): void
    {
        $response = $this->get('/');

        $response->assertOk();
    }

    public function test_protected_settings_endpoint_requires_authentication(): void
    {
        $response = $this->getJson('/api/settings');

        $response->assertUnauthorized();
    }
}
