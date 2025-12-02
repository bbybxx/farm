<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (!$data || !isset($data['query'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit();
}

$postData = json_encode($data);

$context = stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => $postData
    ]
]);

// LEGACY FILE - Consider using Vercel serverless functions instead
// Configure API endpoint via environment variable
// IMPORTANT: Set GRAPHQL_API_ENDPOINT in your environment
$apiEndpoint = getenv('GRAPHQL_API_ENDPOINT') ?: 'https://YOUR_API_ENDPOINT_HERE/graphql';
$response = file_get_contents($apiEndpoint, false, $context);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch data']);
    exit();
}

echo $response;
?>
