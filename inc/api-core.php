<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function out(array $payload, int $code = 200): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $code = 400): void
{
    out(['ok' => false, 'error' => $message], $code);
}

function admin_cookie_valid(): bool
{
    $raw = $_COOKIE[ADMIN_COOKIE] ?? '';
    if (!is_string($raw) || $raw === '') return false;
    $parts = explode('.', $raw, 2);
    if (count($parts) !== 2) return false;
    [$exp, $sig] = $parts;
    if (!ctype_digit($exp) || (int) $exp < time()) return false;
    return hash_equals(hash_hmac('sha256', $exp, ADMIN_SECRET), $sig);
}

function set_admin_cookie(): void
{
    $exp = time() + ADMIN_SESSION_TTL;
    $sig = hash_hmac('sha256', (string) $exp, ADMIN_SECRET);
    setcookie(ADMIN_COOKIE, $exp . '.' . $sig, [
        'expires'  => $exp,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
}

function clear_admin_cookie(): void
{
    setcookie(ADMIN_COOKIE, '', [
        'expires'  => time() - 42000,
        'path'     => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
    ]);
}

function is_admin(): bool
{
    $me = current_user();
    if ($me && strcasecmp((string) $me['username'], DEFAULT_ADMIN_USER) === 0) {
        return true;
    }
    return admin_cookie_valid();
}

function require_admin(): void
{
    if (!is_admin()) fail('Admin access required.', 403);
}

// Returns true when the signed-in user owns the given invitation row.
function owns_invitation(?array $row): bool
{
    $me = current_user();
    if ($me === null || $row === null) return false;
    if ($row['user_id'] !== null && (int) $row['user_id'] === (int) $me['id']) return true;
    return isset($row['created_by']) && $row['created_by'] === $me['username'];
}

function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') {
        return $_POST;
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : $_POST;
}

function publicUser(array $u): array
{
    return [
        'id'         => (int) $u['id'],
        'username'   => $u['username'],
        'full_name'  => (string) ($u['full_name'] ?? ''),
        'gender'     => (string) ($u['gender'] ?? ''),
        'birth_date' => $u['birth_date'] ?? null,
        'address'    => (string) ($u['address'] ?? ''),
    ];
}

function newToken(): string
{
    return substr(bin2hex(random_bytes(6)), 0, 10);
}

function normalizeDate($value): ?string
{
    if (!$value || !is_string($value)) return null;
    $ts = strtotime($value);
    return $ts ? date('Y-m-d H:i:s', $ts) : null;
}

// Fetch invitations joined with their accept/decline response row.
function fetch_invitations(string $where = '', array $params = []): array
{
    $sql = 'SELECT i.*,
                   r.decision       AS r_decision,
                   r.responder_name AS r_responder,
                   r.message        AS r_message,
                   r.responded_at   AS r_responded_at
            FROM invitations i
            LEFT JOIN responses r ON r.invitation_id = i.id';
    if ($where !== '') $sql .= ' ' . $where;
    $stmt = db()->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function shapeInvitation(array $r): array
{
    $photos = null;
    if (!empty($r['photos'])) {
        $photos = json_decode($r['photos'], true);
    }
    $decision = $r['r_decision'] ?? null;
    return [
        'id'          => $r['id'],
        'date'        => $r['date'],
        'location'    => $r['location'],
        'pickupLocation' => $r['pickup_location'] ?? '',
        'dressCode'   => $r['dress_code'],
        'activity'    => $r['activity'],
        'songUrl'     => $r['song_url'],
        'status'      => $decision ?: ($r['status'] ?? 'pending'),
        'acceptedBy'  => $decision === 'accepted' ? ($r['r_responder'] ?? null) : null,
        'declinedBy'  => $decision === 'declined' ? ($r['r_responder'] ?? null) : null,
        'message'     => $r['r_message'] ?? null,
        'photos'      => is_array($photos) ? $photos : [],
        'createdBy'   => $r['created_by'],
        'creatorName' => $r['creator_name'] ?? null,
        'createdAt'   => $r['created_at'],
        'respondedAt' => $r['r_responded_at'] ?? null,
    ];
}

/**
 * Dispatch the API request.
 *
 * $mode = 'user'  -> user.php  (blocks admin-only actions)
 *         'admin' -> admin.php (blocks user-only actions, e.g. register)
 *         'all'   -> api.php   (back-compat, everything)
 */
function api_dispatch(string $mode = 'all'): void
{
    $action = (string) ($_GET['action'] ?? ($_POST['action'] ?? ''));
    $in = body();

    $adminOnly = ['views_all', 'users_list', 'user_add', 'user_delete', 'user_update', 'logins_list', 'user_detail', 'login_delete', 'login_clear'];
    $userOnly  = ['register', 'account_update'];

    if ($mode === 'user' && in_array($action, $adminOnly, true)) {
        fail('Unknown action: ' . $action, 404);
    }
    if ($mode === 'admin' && in_array($action, $userOnly, true)) {
        fail('Unknown action: ' . $action, 404);
    }

    try {
        switch ($action) {

            // ---------- AUTH ----------
            case 'register': {
                $username = trim((string) ($in['username'] ?? ''));
                $password = (string) ($in['password'] ?? '');
                if ($username === '' || $password === '') fail('Username and password are required.');
                if (!preg_match('/^[A-Za-z0-9 _.\-]{3,50}$/', $username)) fail('Username must be 3-50 chars (letters, numbers, space, . _ -).');
                if (strlen($password) < 6) fail('Password must be at least 6 characters.');

                $fullName = trim((string) ($in['full_name'] ?? ''));
                $gender   = trim((string) ($in['gender'] ?? ''));
                $birthDate = trim((string) ($in['birth_date'] ?? ''));
                $address  = trim((string) ($in['address'] ?? ''));
                if (mb_strlen($fullName) > 100) fail('Full name is too long (max 100).');
                if ($gender !== '' && !in_array($gender, ['Female', 'Male', 'Other'], true)) fail('Invalid gender.');
                if ($birthDate !== '') {
                    $ts = strtotime($birthDate);
                    if ($ts === false) fail('Invalid birth date.');
                    $birthDate = date('Y-m-d', $ts);
                }
                if (mb_strlen($address) > 500) fail('Address is too long (max 500).');

                $pdo = db();
                $exists = $pdo->prepare('SELECT 1 FROM users WHERE username = ?');
                $exists->execute([$username]);
                if ($exists->fetchColumn()) fail('That username is already taken.');

                $stmt = $pdo->prepare('INSERT INTO users (username, password_hash, full_name, gender, birth_date, address)
                    VALUES (?, ?, ?, ?, ?, ?)');
                $stmt->execute([
                    $username,
                    password_hash($password, PASSWORD_DEFAULT),
                    $fullName,
                    $gender,
                    $birthDate !== '' ? $birthDate : null,
                    $address,
                ]);
                $id = (int) $pdo->lastInsertId();

                session_regenerate_id(true);
                $_SESSION['user'] = ['id' => $id, 'username' => $username];
                $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $fresh->execute([$id]);
                out(['ok' => true, 'user' => publicUser($fresh->fetch())]);
            }

            case 'login': {
                $username = trim((string) ($in['username'] ?? ''));
                $password = (string) ($in['password'] ?? '');
                $stmt = db()->prepare('SELECT * FROM users WHERE username = ? LIMIT 1');
                $stmt->execute([$username]);
                $u = $stmt->fetch();
                if (!$u || !password_verify($password, $u['password_hash'])) fail('Invalid username or password.', 401);
                session_regenerate_id(true);
                $_SESSION['user'] = ['id' => (int) $u['id'], 'username' => $u['username']];

                if (strcasecmp((string) $u['username'], DEFAULT_ADMIN_USER) === 0) {
                    set_admin_cookie();
                }

                $pdo = db();
                $pdo->prepare('UPDATE users SET last_login_at = NOW() WHERE id = ?')->execute([(int) $u['id']]);
                $meta = parse_user_agent((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''));
                $pdo->prepare('INSERT INTO logins (user_id, username, ip, user_agent, browser, os, device) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    ->execute([
                        (int) $u['id'],
                        mb_substr((string) $u['username'], 0, 64),
                        client_ip(),
                        mb_substr((string) ($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 512),
                        $meta['browser'], $meta['os'], $meta['device'],
                    ]);

                out(['ok' => true, 'user' => publicUser($u)]);
            }

            case 'logout': {
                $_SESSION = [];
                if (ini_get('session.use_cookies')) {
                    $p = session_get_cookie_params();
                    setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
                }
                session_destroy();
                out(['ok' => true]);
            }

            case 'session': {
                $isAdmin = is_admin();
                $me = current_user();
                if (!$me) {
                    out(['ok' => true, 'user' => null, 'is_admin' => $isAdmin, 'admin_user' => $isAdmin ? DEFAULT_ADMIN_USER : null]);
                }
                $stmt = db()->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
                $stmt->execute([$me['id']]);
                $row = $stmt->fetch();
                $u = $row ? publicUser($row) : null;
                if ($u) $u['is_admin'] = strcasecmp((string) $u['username'], DEFAULT_ADMIN_USER) === 0;
                out(['ok' => true, 'user' => $u, 'is_admin' => $isAdmin, 'admin_user' => $isAdmin ? DEFAULT_ADMIN_USER : null]);
            }

            case 'admin_logout': {
                clear_admin_cookie();
                $me = current_user();
                if ($me && strcasecmp((string) $me['username'], DEFAULT_ADMIN_USER) === 0) {
                    $_SESSION = [];
                    if (ini_get('session.use_cookies')) {
                        $p = session_get_cookie_params();
                        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
                    }
                    session_destroy();
                }
                out(['ok' => true]);
            }

            case 'account_update': {
                $me = current_user();
                if (!$me) fail('Not signed in.', 401);
                $cur = (string) ($in['current_password'] ?? '');
                $newUsername = trim((string) ($in['username'] ?? ''));
                $newPassword = (string) ($in['new_password'] ?? '');

                $pdo = db();
                $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
                $stmt->execute([$me['id']]);
                $u = $stmt->fetch();
                if (!$u) fail('Account not found.', 404);
                if (!password_verify($cur, $u['password_hash'])) fail('Current password is incorrect.', 403);

                if ($newUsername !== '' && $newUsername !== $u['username']) {
                    if (!preg_match('/^[A-Za-z0-9 _.\-]{3,50}$/', $newUsername)) fail('Username must be 3-50 chars (letters, numbers, space, . _ -).');
                    $dupe = $pdo->prepare('SELECT 1 FROM users WHERE username = ? AND id <> ?');
                    $dupe->execute([$newUsername, $me['id']]);
                    if ($dupe->fetchColumn()) fail('That username is already taken.');
                    $upd = $pdo->prepare('UPDATE users SET username = ? WHERE id = ?');
                    $upd->execute([$newUsername, $me['id']]);
                    $_SESSION['user']['username'] = $newUsername;
                }

                if ($newPassword !== '') {
                    if (strlen($newPassword) < 6) fail('New password must be at least 6 characters.');
                    $upd = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
                    $upd->execute([password_hash($newPassword, PASSWORD_DEFAULT), $me['id']]);
                }

                if (array_key_exists('full_name', $in) || array_key_exists('gender', $in)
                    || array_key_exists('birth_date', $in) || array_key_exists('address', $in)) {
                    $fullName  = trim((string) ($in['full_name'] ?? ''));
                    $gender    = trim((string) ($in['gender'] ?? ''));
                    $birthDate = trim((string) ($in['birth_date'] ?? ''));
                    $address   = trim((string) ($in['address'] ?? ''));
                    if (mb_strlen($fullName) > 100) fail('Full name is too long (max 100).');
                    if ($gender !== '' && !in_array($gender, ['Female', 'Male', 'Other'], true)) fail('Invalid gender.');
                    if ($birthDate !== '') {
                        $ts = strtotime($birthDate);
                        if ($ts === false) fail('Invalid birth date.');
                        $birthDate = date('Y-m-d', $ts);
                    }
                    if (mb_strlen($address) > 500) fail('Address is too long (max 500).');
                    $upd = $pdo->prepare('UPDATE users SET full_name = ?, gender = ?, birth_date = ?, address = ? WHERE id = ?');
                    $upd->execute([$fullName, $gender, $birthDate !== '' ? $birthDate : null, $address, $me['id']]);
                }

                $fresh = $pdo->prepare('SELECT * FROM users WHERE id = ?');
                $fresh->execute([$me['id']]);
                out(['ok' => true, 'user' => publicUser($fresh->fetch())]);
            }

            // ---------- INVITATIONS ----------
            case 'invitations_list': {
                $me = current_user();
                $wantAll = (string) ($_GET['scope'] ?? '') === 'all';
                $isAdmin = is_admin();
                if ($wantAll && $isAdmin) {
                    $rows = fetch_invitations('ORDER BY i.created_at DESC');
                } elseif ($me) {
                    $rows = fetch_invitations('WHERE i.user_id = ? OR i.created_by = ? ORDER BY i.created_at DESC',
                        [(int) $me['id'], (string) $me['username']]);
                } else {
                    $rows = [];
                }
                out(['ok' => true, 'invitations' => array_map('shapeInvitation', $rows)]);
            }

            case 'invitation_get': {
                $rows = fetch_invitations('WHERE i.id = ? LIMIT 1', [(string) ($in['id'] ?? '')]);
                out(['ok' => true, 'invitation' => $rows ? shapeInvitation($rows[0]) : null]);
            }

            case 'invitation_add': {
                $data = (array) ($in['data'] ?? []);
                $id = (string) ($data['id'] ?? '') ?: newToken();
                $me = current_user();

                $pdo = db();
                $creatorName = mb_substr((string) ($data['creatorName'] ?? ''), 0, 100);
                if ($creatorName === '' && !empty($me['id'])) {
                    $us = $pdo->prepare('SELECT full_name, username FROM users WHERE id = ? LIMIT 1');
                    $us->execute([$me['id']]);
                    $urow = $us->fetch();
                    if ($urow) $creatorName = (string) (($urow['full_name'] ?? '') !== '' ? $urow['full_name'] : $urow['username']);
                }
                $stmt = $pdo->prepare('INSERT INTO invitations
                    (id, user_id, date, location, dress_code, activity, song_url, status, created_by, creator_name, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())');
                $stmt->execute([
                    $id,
                    $me['id'] ?? null,
                    normalizeDate($data['date'] ?? null),
                    mb_substr((string) ($data['location'] ?? ''), 0, 255),
                    mb_substr((string) ($data['dressCode'] ?? ''), 0, 50),
                    mb_substr((string) ($data['activity'] ?? ''), 0, 255),
                    mb_substr((string) ($data['songUrl'] ?? ''), 0, 500),
                    (string) ($data['status'] ?? 'pending'),
                    mb_substr((string) ($data['createdBy'] ?? ($me['username'] ?? 'anonymous')), 0, 50),
                    $creatorName !== '' ? $creatorName : null,
                ]);
                out(['ok' => true, 'id' => $id]);
            }

            case 'invitation_update': {
                $id = (string) ($in['id'] ?? '');
                $patch = (array) ($in['patch'] ?? []);
                if ($id === '') fail('Missing invitation id.');

                $pdo = db();

                // Only the owner (or admin) may edit the invitation itself.
                // Anyone holding the link may still record their RSVP response.
                $ownerStmt = $pdo->prepare('SELECT * FROM invitations WHERE id = ? LIMIT 1');
                $ownerStmt->execute([$id]);
                $ownerRow = $ownerStmt->fetch();
                if (!$ownerRow) fail('Invitation not found.', 404);
                $isOwner = owns_invitation($ownerRow) || is_admin();

                $responseKeys = ['status', 'acceptedBy', 'declinedBy', 'message', 'respondedAt'];
                $planKeys     = ['pickupLocation', 'date', 'location', 'dressCode', 'activity', 'photos'];

                if (!$isOwner) {
                    $allowed = array_merge($responseKeys, $planKeys);
                    foreach (array_keys($patch) as $k) {
                        if (!in_array($k, $allowed, true)) fail('You can only send a response to this invitation.', 403);
                    }
                }

                // ---- Accept/decline -> responses table ----
                $hasResponsePayload = false;
                foreach ($responseKeys as $k) {
                    if (array_key_exists($k, $patch)) { $hasResponsePayload = true; break; }
                }

                if ($hasResponsePayload) {
                    $decision  = null;
                    $responder = null;

                    if (isset($patch['status']) && in_array($patch['status'], ['accepted', 'declined'], true)) {
                        $decision = $patch['status'];
                    } elseif (array_key_exists('status', $patch) && $patch['status'] === 'pending') {
                        // Explicit reset: drop the stored response.
                        $pdo->prepare('DELETE FROM responses WHERE invitation_id = ?')->execute([$id]);
                        $pdo->prepare('UPDATE invitations SET status = ? WHERE id = ?')->execute(['pending', $id]);
                    } else {
                        // Message / respondedAt / acceptedBy / declinedBy only: reuse the stored decision if any.
                        $ex = $pdo->prepare('SELECT * FROM responses WHERE invitation_id = ? LIMIT 1');
                        $ex->execute([$id]);
                        $cur = $ex->fetch();
                        if ($cur) {
                            $decision  = $cur['decision'];
                            $responder = $cur['responder_name'];
                        } elseif (!empty($patch['acceptedBy'])) {
                            $decision = 'accepted';
                        } elseif (!empty($patch['declinedBy'])) {
                            $decision = 'declined';
                        }
                    }

                    if ($decision !== null) {
                        if (array_key_exists('acceptedBy', $patch)) {
                            $responder = $patch['acceptedBy'];
                        } elseif (array_key_exists('declinedBy', $patch)) {
                            $responder = $patch['declinedBy'];
                        }
                        $message     = array_key_exists('message', $patch) ? (string) $patch['message'] : null;
                        $respondedAt = normalizeDate($patch['respondedAt'] ?? null) ?? date('Y-m-d H:i:s');
                        $me          = current_user();
                        $userId      = $me['id'] ?? null;

                        $up = $pdo->prepare('INSERT INTO responses
                                (invitation_id, user_id, decision, responder_name, message, responded_at)
                            VALUES (?, ?, ?, ?, ?, ?)
                            ON DUPLICATE KEY UPDATE
                                user_id = VALUES(user_id),
                                decision = VALUES(decision),
                                responder_name = VALUES(responder_name),
                                message = VALUES(message),
                                responded_at = VALUES(responded_at)');
                        $up->execute([$id, $userId, $decision, $responder, $message, $respondedAt]);
                        $pdo->prepare('UPDATE invitations SET status = ? WHERE id = ?')->execute([$decision, $id]);
                    }
                }

                // ---- Plan / invitation fields -> invitations table ----
                $map = [
                    'date'           => 'date',
                    'location'       => 'location',
                    'pickupLocation' => 'pickup_location',
                    'dressCode'      => 'dress_code',
                    'activity'       => 'activity',
                    'songUrl'        => 'song_url',
                ];

                $sets = [];
                $vals = [];
                foreach ($patch as $key => $value) {
                    if ($key === 'photos') {
                        $sets[] = 'photos = ?';
                        $vals[] = is_string($value) ? $value : json_encode($value);
                        continue;
                    }
                    if (!isset($map[$key])) continue;
                    $col = $map[$key];
                    $vals[] = $col === 'date'
                        ? normalizeDate($value)
                        : (is_scalar($value) || $value === null ? $value : json_encode($value));
                    $sets[] = "$col = ?";
                }
                if ($sets) {
                    $vals[] = $id;
                    $pdo->prepare('UPDATE invitations SET ' . implode(', ', $sets) . ' WHERE id = ?')->execute($vals);
                }

                if (!$sets && !$hasResponsePayload) fail('Nothing to update.');
                out(['ok' => true]);
            }

            case 'invitation_delete': {
                $id = (string) ($in['id'] ?? '');
                $owner = db()->prepare('SELECT * FROM invitations WHERE id = ? LIMIT 1');
                $owner->execute([$id]);
                $row = $owner->fetch();
                if (!$row) fail('Invitation not found.', 404);
                if (!owns_invitation($row) && !is_admin()) fail('Not allowed.', 403);
                $stmt = db()->prepare('DELETE FROM invitations WHERE id = ?');
                $stmt->execute([$id]);
                out(['ok' => true]);
            }

            // ---------- PHOTOS (shared album) ----------
            case 'photo_add': {
                $id   = (string) ($in['id'] ?? '');
                $data = (string) ($in['data'] ?? '');
                if ($id === '' || $data === '') fail('Missing photo data.');
                if (strlen($data) > 16000000) fail('That photo is too large.');
                if (!preg_match('#^data:image/(png|jpe?g|gif|webp);base64,#i', $data)) fail('Invalid image format.');
                $exists = db()->prepare('SELECT 1 FROM invitations WHERE id = ? LIMIT 1');
                $exists->execute([$id]);
                if (!$exists->fetchColumn()) fail('Invitation not found.', 404);
                $stmt = db()->prepare('INSERT INTO photos (invitation_id, data, uploaded_by) VALUES (?, ?, ?)');
                $stmt->execute([
                    $id,
                    $data,
                    mb_substr((string) ($in['by'] ?? ''), 0, 64),
                ]);
                out(['ok' => true, 'id' => (int) db()->lastInsertId()]);
            }

            case 'photos_list': {
                $id = (string) ($in['id'] ?? '');
                if ($id === '') fail('Missing invitation id.');
                $stmt = db()->prepare('SELECT id, invitation_id, data, uploaded_by, created_at FROM photos WHERE invitation_id = ? ORDER BY created_at ASC, id ASC');
                $stmt->execute([$id]);
                out(['ok' => true, 'photos' => $stmt->fetchAll()]);
            }

            case 'photo_delete': {
                $pid = (int) ($in['id'] ?? 0);
                if ($pid <= 0) fail('Missing photo id.');
                $stmt = db()->prepare('SELECT 1 FROM photos WHERE id = ? LIMIT 1');
                $stmt->execute([$pid]);
                if (!$stmt->fetchColumn()) fail('Photo not found.', 404);
                db()->prepare('DELETE FROM photos WHERE id = ?')->execute([$pid]);
                out(['ok' => true]);
            }

            // ---------- VIEWS ----------
            case 'view_record': {
                $id = (string) ($in['id'] ?? '');
                if ($id === '') fail('Missing invitation id.');
                $ua = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');
                $meta = parse_user_agent($ua);
                $viewer = $_COOKIE['viewer_id'] ?? '';
                if (!preg_match('/^[a-f0-9]{16}$/', (string) $viewer)) {
                    $viewer = bin2hex(random_bytes(8));
                    setcookie('viewer_id', $viewer, ['expires' => time() + 31536000, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax']);
                }
                $stmt = db()->prepare('INSERT INTO views (invitation_id, ip, user_agent, referer, browser, os, device, viewer)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([
                    $id,
                    client_ip(),
                    mb_substr($ua, 0, 512),
                    mb_substr((string) ($_SERVER['HTTP_REFERER'] ?? ''), 0, 512),
                    $meta['browser'], $meta['os'], $meta['device'], $viewer,
                ]);
                out(['ok' => true]);
            }

            case 'views_list': {
                $id = (string) ($in['id'] ?? '');
                $owner = db()->prepare('SELECT * FROM invitations WHERE id = ? LIMIT 1');
                $owner->execute([$id]);
                $row = $owner->fetch();
                if (!$row) fail('Invitation not found.', 404);
                if (!owns_invitation($row) && !is_admin()) fail('Not allowed.', 403);
                $stmt = db()->prepare('SELECT * FROM views WHERE invitation_id = ? ORDER BY viewed_at DESC');
                $stmt->execute([$id]);
                $views = $stmt->fetchAll();
                $unique = [];
                foreach ($views as $v) $unique[$v['viewer'] ?: $v['ip']] = true;
                out(['ok' => true, 'views' => $views, 'total' => count($views), 'unique' => count($unique)]);
            }

            case 'views_all': {
                require_admin();
                $rows = db()->query('SELECT invitation_id, COUNT(*) AS total, COUNT(DISTINCT COALESCE(NULLIF(viewer, ""), ip)) AS uniques, MAX(viewed_at) AS last_view
                                     FROM views GROUP BY invitation_id')->fetchAll();
                $map = [];
                foreach ($rows as $r) $map[$r['invitation_id']] = $r;
                out(['ok' => true, 'counts' => $map]);
            }

            // ---------- USERS (admin) ----------
            case 'users_list': {
                require_admin();
                $rows = db()->query('SELECT u.*,
                        (SELECT COUNT(*) FROM invitations i WHERE i.user_id = u.id OR i.created_by = u.username) AS invites,
                        (SELECT COUNT(*) FROM logins l WHERE l.user_id = u.id) AS login_count
                    FROM users u ORDER BY u.id ASC')->fetchAll();
                foreach ($rows as &$row) { unset($row['password_hash']); }
                unset($row);
                out(['ok' => true, 'users' => $rows]);
            }

            case 'user_detail': {
                require_admin();
                $id = (int) ($in['id'] ?? 0);
                if ($id <= 0) fail('Missing user id.');
                $pdo = db();
                $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ? LIMIT 1');
                $stmt->execute([$id]);
                $u = $stmt->fetch();
                if (!$u) fail('User not found.', 404);
                unset($u['password_hash']);
                $username = (string) $u['username'];

                $invites = $pdo->prepare('SELECT id, created_at, date, status, location, activity, dress_code
                    FROM invitations WHERE user_id = ? OR created_by = ? ORDER BY created_at DESC LIMIT 100');
                $invites->execute([$id, $username]);
                $invitationRows = $invites->fetchAll();

                $responses = $pdo->prepare('SELECT invitation_id, decision, responder_name, message, responded_at
                    FROM responses WHERE user_id = ? ORDER BY responded_at DESC LIMIT 100');
                $responses->execute([$id]);
                $responseRows = $responses->fetchAll();

                $photos = $pdo->prepare('SELECT id, invitation_id, caption, created_at
                    FROM photos WHERE uploaded_by = ? ORDER BY created_at DESC LIMIT 100');
                $photos->execute([$username]);
                $photoRows = $photos->fetchAll();

                $logins = $pdo->prepare('SELECT ip, browser, os, device, logged_at
                    FROM logins WHERE user_id = ? ORDER BY logged_at DESC LIMIT 100');
                $logins->execute([$id]);
                $loginRows = $logins->fetchAll();

                $countRow = $pdo->prepare('SELECT
                        (SELECT COUNT(*) FROM invitations WHERE user_id = ? OR created_by = ?) AS invitations,
                        (SELECT COUNT(*) FROM invitations WHERE (user_id = ? OR created_by = ?) AND status = "accepted") AS accepted,
                        (SELECT COUNT(*) FROM invitations WHERE (user_id = ? OR created_by = ?) AND status = "declined") AS declined,
                        (SELECT COUNT(*) FROM responses WHERE user_id = ?) AS responses,
                        (SELECT COUNT(*) FROM photos WHERE uploaded_by = ?) AS photos,
                        (SELECT COUNT(*) FROM logins WHERE user_id = ?) AS logins');
                $countRow->execute([$id, $username, $id, $username, $id, $username, $id, $username, $id]);
                $counts = $countRow->fetch();

                out([
                    'ok' => true,
                    'user' => $u,
                    'counts' => [
                        'invitations' => (int) $counts['invitations'],
                        'accepted'    => (int) $counts['accepted'],
                        'declined'    => (int) $counts['declined'],
                        'responses'   => (int) $counts['responses'],
                        'photos'      => (int) $counts['photos'],
                        'logins'      => (int) $counts['logins'],
                    ],
                    'invitations' => $invitationRows,
                    'responses'   => $responseRows,
                    'photos'      => $photoRows,
                    'logins'      => $loginRows,
                ]);
            }

            case 'logins_list': {
                require_admin();
                $limit = (int) ($in['limit'] ?? ($_GET['limit'] ?? 200));
                if ($limit < 1) $limit = 200;
                if ($limit > 500) $limit = 500;
                $userId = (int) ($in['user_id'] ?? ($_GET['user_id'] ?? 0));
                if ($userId > 0) {
                    $stmt = db()->prepare('SELECT * FROM logins WHERE user_id = ? ORDER BY logged_at DESC LIMIT ' . $limit);
                    $stmt->execute([$userId]);
                } else {
                    $stmt = db()->query('SELECT * FROM logins ORDER BY logged_at DESC LIMIT ' . $limit);
                }
                out(['ok' => true, 'logins' => $stmt->fetchAll()]);
            }

            case 'login_delete': {
                require_admin();
                $id = (int) ($in['id'] ?? 0);
                if ($id <= 0) fail('Missing login id.');
                $stmt = db()->prepare('DELETE FROM logins WHERE id = ?');
                $stmt->execute([$id]);
                out(['ok' => true]);
            }

            case 'login_clear': {
                require_admin();
                db()->exec('DELETE FROM logins');
                out(['ok' => true]);
            }


            case 'user_add': {
                require_admin();
                $username = trim((string) ($in['username'] ?? ''));
                $password = (string) ($in['password'] ?? '');
                if ($username === '' || $password === '') fail('Username and password are required.');
                if (strlen($password) < 6) fail('Password must be at least 6 characters.');
                $exists = db()->prepare('SELECT 1 FROM users WHERE username = ?');
                $exists->execute([$username]);
                if ($exists->fetchColumn()) fail('That username already exists.');
                $stmt = db()->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
                $stmt->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
                out(['ok' => true, 'id' => (int) db()->lastInsertId()]);
            }

            case 'user_delete': {
                require_admin();
                $id = (int) ($in['id'] ?? 0);
                if ($id <= 0) fail('Missing user id.');
                $target = db()->prepare('SELECT username FROM users WHERE id = ?');
                $target->execute([$id]);
                $targetName = $target->fetchColumn();
                if ($targetName !== false && strcasecmp((string) $targetName, DEFAULT_ADMIN_USER) === 0) {
                    fail('The admin account cannot be deleted.');
                }
                $stmt = db()->prepare('DELETE FROM users WHERE id = ?');
                $stmt->execute([$id]);
                out(['ok' => true]);
            }

            case 'user_update': {
                require_admin();
                $id = (int) ($in['id'] ?? 0);
                $newUsername = trim((string) ($in['username'] ?? ''));
                $newPassword = (string) ($in['password'] ?? '');
                if ($id <= 0) fail('Missing user id.');
                $pdo = db();
                if ($newUsername !== '') {
                    $dupe = $pdo->prepare('SELECT 1 FROM users WHERE username = ? AND id <> ?');
                    $dupe->execute([$newUsername, $id]);
                    if ($dupe->fetchColumn()) fail('That username already exists.');
                    $pdo->prepare('UPDATE users SET username = ? WHERE id = ?')->execute([$newUsername, $id]);
                }
                if ($newPassword !== '') {
                    if (strlen($newPassword) < 6) fail('Password must be at least 6 characters.');
                    $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?')->execute([password_hash($newPassword, PASSWORD_DEFAULT), $id]);
                }
                out(['ok' => true]);
            }

            default:
                fail('Unknown action: ' . $action, 404);
        }
    } catch (Throwable $e) {
        fail('Server error: ' . $e->getMessage(), 500);
    }
}
