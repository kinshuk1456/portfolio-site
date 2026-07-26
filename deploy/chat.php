<?php
/**
 * chat.php — server proxy for the "Ask about my work" assistant.
 * Holds the Gemini API key server-side and grounds answers in chat-context.md.
 *
 * Deploy: upload this file + chat-context.md to your Hostinger site (e.g. /api/).
 * Set the key as an environment variable GEMINI_API_KEY, OR create a sibling
 * chat-secret.php that returns the key (see README-chat.md). Then set
 * site.json -> chat.endpoint to this file's URL (e.g. "/api/chat.php") and rebuild.
 */

// ---- Config ---------------------------------------------------------------
$MODEL        = getenv('GEMINI_MODEL') ?: 'gemini-2.0-flash';
$ALLOW_ORIGIN = getenv('CHAT_ALLOW_ORIGIN') ?: '';   // e.g. https://kinshukagarwal.com ('' = same-origin only)
$MAX_MSG_LEN  = 800;
$MAX_HISTORY  = 8;
$RL_MAX       = 15;    // requests
$RL_WINDOW    = 600;   // seconds (10 min) per IP

// ---- CORS / method --------------------------------------------------------
if ($ALLOW_ORIGIN !== '') {
  header("Access-Control-Allow-Origin: $ALLOW_ORIGIN");
  header('Vary: Origin');
  header('Access-Control-Allow-Headers: Content-Type');
  header('Access-Control-Allow-Methods: POST, OPTIONS');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
header('Content-Type: application/json; charset=utf-8');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['error' => 'method']); exit; }

// ---- API key --------------------------------------------------------------
$KEY = getenv('GEMINI_API_KEY') ?: '';
if ($KEY === '' && is_file(__DIR__ . '/chat-secret.php')) { $KEY = (string) require __DIR__ . '/chat-secret.php'; }
if ($KEY === '') { http_response_code(500); echo json_encode(['error' => 'server not configured']); exit; }

// ---- Rate limit (per IP, file-based) --------------------------------------
$ip  = $_SERVER['REMOTE_ADDR'] ?? 'x';
$rlf = sys_get_temp_dir() . '/chatrl_' . md5($ip);
$now = time();
$hits = is_file($rlf) ? array_filter(explode(',', trim(file_get_contents($rlf))), fn($t) => $t && ($now - (int)$t) < $RL_WINDOW) : [];
if (count($hits) >= $RL_MAX) { http_response_code(429); echo json_encode(['reply' => 'You’ve sent a lot of questions in a short time — give it a minute and try again.']); exit; }
$hits[] = $now;
@file_put_contents($rlf, implode(',', $hits));

// ---- Input ----------------------------------------------------------------
$body = json_decode(file_get_contents('php://input'), true) ?: [];
$message = trim((string)($body['message'] ?? ''));
if ($message === '') { echo json_encode(['reply' => 'Ask me anything about Kinshuk’s work.']); exit; }
if (mb_strlen($message) > $MAX_MSG_LEN) { $message = mb_substr($message, 0, $MAX_MSG_LEN); }

$context = is_file(__DIR__ . '/chat-context.md') ? file_get_contents(__DIR__ . '/chat-context.md') : '';
$system = "You are the assistant on Kinshuk Agarwal's portfolio site. Answer questions about "
  . "his professional background and work, grounded ONLY in the context below. Be concise "
  . "(2–4 sentences), specific, and understated. Never invent facts, metrics, dates, employers, "
  . "or job titles. If a detail isn't in the context, say you don't have it. Only discuss "
  . "Kinshuk's work; politely redirect anything off-topic.\n\n---\n" . $context;

// ---- Build Gemini request -------------------------------------------------
$contents = [];
foreach (array_slice((array)($body['history'] ?? []), -$MAX_HISTORY) as $turn) {
  $role = ($turn['role'] ?? '') === 'model' ? 'model' : 'user';
  $text = trim((string)($turn['text'] ?? ''));
  if ($text !== '') { $contents[] = ['role' => $role, 'parts' => [['text' => mb_substr($text, 0, 1500)]]]; }
}
$contents[] = ['role' => 'user', 'parts' => [['text' => $message]]];

$payload = [
  'systemInstruction' => ['parts' => [['text' => $system]]],
  'contents' => $contents,
  'generationConfig' => ['temperature' => 0.4, 'maxOutputTokens' => 400],
];

$url = "https://generativelanguage.googleapis.com/v1beta/models/{$MODEL}:generateContent?key=" . urlencode($KEY);
$ch = curl_init($url);
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
  CURLOPT_POSTFIELDS => json_encode($payload),
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 30,
]);
$res = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($res === false || $code >= 400) {
  http_response_code(502);
  echo json_encode(['reply' => 'The assistant is unavailable right now. Please try again shortly, or email kinshuk.agarwal@email.ucr.edu.']);
  exit;
}

$data = json_decode($res, true);
$reply = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
$reply = trim($reply);
if ($reply === '') { $reply = "I'm not sure how to answer that from what I know about Kinshuk's work."; }

echo json_encode(['reply' => $reply]);
