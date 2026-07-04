<?php
/**
 * PHP-скрипт для отправки цен из админки Fauna на Vercel Serverless Function.
 * 
 * Как использовать:
 * 1. Замените YOUR_VERCEL_URL на URL вашего сайта (например, https://farmcraftcalculator.infy.uk)
 * 2. Вставьте этот код в админку Fauna как вебхук, который срабатывает после обновления цен
 * 3. Убедитесь, что $prices содержит актуальные данные о ценах
 */

// === НАСТРОЙКИ ===
$vercel_url = 'https://YOUR_VERCEL_URL.vercel.app'; // ЗАМЕНИТЕ на ваш URL
$endpoint = $vercel_url . '/api/prices';

// === ДАННЫЕ О ЦЕНАХ ===
// Замените на актуальные данные из Fauna
// Формат: { "itemName": { "buy": 100, "sell": 50 }, ... }
$prices = [
    // Пример:
    // "Board" => ["buy" => 10, "sell" => 5],
    // "Nails" => ["buy" => 25, "sell" => 12],
    // "Rope"  => ["buy" => 50, "sell" => 25],
];

// === ОТПРАВКА ===
$json = json_encode($prices, JSON_UNESCAPED_UNICODE);

// Вариант 1: через file_get_contents (рекомендуется, если allow_url_fopen включён)
$options = [
    'http' => [
        'method'  => 'POST',
        'header'  => "Content-Type: application/json\r\n",
        'content' => $json,
        'timeout' => 30,
        'ignore_errors' => true,
    ],
];
$context = stream_context_create($options);
$response = @file_get_contents($endpoint, false, $context);

if ($response === false) {
    echo "❌ Ошибка: не удалось отправить запрос.\n";
    echo "Проверьте URL и соединение с интернетом.\n";
    exit(1);
}

$result = json_decode($response, true);
if ($result && $result['success']) {
    echo "✅ Цены успешно обновлены!\n";
    echo "   Сохранено предметов: " . $result['itemCount'] . "\n";
    echo "   Хранилище: " . $result['storage'] . "\n";
} else {
    echo "❌ Ошибка сервера:\n";
    echo "   " . ($result['error'] ?? 'Неизвестная ошибка') . "\n";
    exit(1);
}

// === ВАРИАНТ 2: через curl (если file_get_contents не работает) ===
// Раскомментируйте этот блок и закомментируйте вариант 1, если нужно
/*
$ch = curl_init($endpoint);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $json,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 30,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($error) {
    echo "❌ Ошибка curl: $error\n";
    exit(1);
}

$result = json_decode($response, true);
if ($httpCode === 200 && $result && $result['success']) {
    echo "✅ Цены успешно обновлены!\n";
    echo "   Сохранено предметов: " . $result['itemCount'] . "\n";
    echo "   Хранилище: " . $result['storage'] . "\n";
} else {
    echo "❌ Ошибка (HTTP $httpCode): " . ($result['error'] ?? 'Неизвестная ошибка') . "\n";
    exit(1);
}
*/
