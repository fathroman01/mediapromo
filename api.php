<?php
// CORS Headers for client interaction
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json");

// Handle OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Extract route path and request method
$route = isset($_GET['route']) ? trim($_GET['route'], '/') : '';
$method = $_SERVER['REQUEST_METHOD'];

// Configuration paths
$dbDir = __DIR__ . '/data';
$dbPath = $dbDir . '/promo_media.json';
$usersPath = $dbDir . '/users.json';
$uploadDir = __DIR__ . '/uploads';

// Initialize data and upload folders
if (!is_dir($dbDir)) {
    mkdir($dbDir, 0777, true);
}
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0777, true);
}

// Seed default users if users.json is missing
if (!file_exists($usersPath)) {
    $defaultUsers = [
        [
            "id" => "user-admin",
            "username" => "admin",
            "password" => "media1234",
            "name" => "Administrator Pusat",
            "role" => "admin",
            "assignedProvinceId" => "",
            "assignedProvinceName" => "Semua",
            "assignedRegencyId" => "",
            "assignedRegencyName" => "Semua"
        ],
        [
            "id" => "user-budi",
            "username" => "budi",
            "password" => "budi",
            "name" => "Budi Santoso",
            "role" => "officer",
            "assignedProvinceId" => "31",
            "assignedProvinceName" => "DKI JAKARTA",
            "assignedRegencyId" => "3174",
            "assignedRegencyName" => "KOTA JAKARTA SELATAN"
        ],
        [
            "id" => "user-ani",
            "username" => "ani",
            "password" => "ani",
            "name" => "Ani Wijaya",
            "role" => "officer",
            "assignedProvinceId" => "36",
            "assignedProvinceName" => "BANTEN",
            "assignedRegencyId" => "3671",
            "assignedRegencyName" => "KOTA TANGERANG"
        ]
    ];
    file_put_contents($usersPath, json_encode($defaultUsers, JSON_PRETTY_PRINT));
}

// Helpers to read/write JSON files
function readJSON($path) {
    if (!file_exists($path)) {
        return [];
    }
    $content = file_get_contents($path);
    return json_decode($content, true) ?: [];
}

function writeJSON($path, $data) {
    file_put_contents($path, json_encode($data, JSON_PRETTY_PRINT));
}

function generateUUID() {
    return sprintf('%04x%04x', mt_rand(0, 0xffff), mt_rand(0, 0xffff));
}

// Helper to read/write media types dynamically
$mediaTypesPath = $dbDir . '/media_types.json';
$defaultMediaTypes = ['Banner', 'Pamflet', 'Sticker'];
if (!file_exists($mediaTypesPath)) {
    file_put_contents($mediaTypesPath, json_encode($defaultMediaTypes, JSON_PRETTY_PRINT));
}
$allowedMediaTypes = json_decode(file_get_contents($mediaTypesPath), true) ?: $defaultMediaTypes;

function normalizeMediaType($type, $allowed) {
    return in_array($type, $allowed) ? $type : 'Banner';
}

function normalizeItem($item, $allowed) {
    $item['mediaType'] = normalizeMediaType(isset($item['mediaType']) ? $item['mediaType'] : 'Banner', $allowed);
    $item['mediaType2'] = isset($item['mediaType2']) && $item['mediaType2'] ? normalizeMediaType($item['mediaType2'], $allowed) : '';
    if (isset($item['mediaItems']) && is_array($item['mediaItems'])) {
        foreach ($item['mediaItems'] as $key => $m) {
            $item['mediaItems'][$key]['type'] = normalizeMediaType(isset($m['type']) ? $m['type'] : 'Banner', $allowed);
        }
    } else {
        $item['mediaItems'] = [];
    }
    return $item;
}

// Router Logic

// 0. Media Types endpoints
if ($route === 'media-types' && $method === 'GET') {
    echo json_encode($allowedMediaTypes);
    exit;
} elseif ($route === 'media-types' && $method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $name = isset($input['name']) ? trim($input['name']) : '';
    if (!$name) {
        http_response_code(400);
        echo json_encode(["message" => "Nama tipe media wajib diisi!"]);
        exit;
    }
    foreach ($allowedMediaTypes as $t) {
        if (strtolower($t) === strtolower($name)) {
            http_response_code(400);
            echo json_encode(["message" => "Tipe media ini sudah ada!"]);
            exit;
        }
    }
    $allowedMediaTypes[] = $name;
    file_put_contents($mediaTypesPath, json_encode($allowedMediaTypes, JSON_PRETTY_PRINT));
    http_response_code(201);
    echo json_encode(["message" => "Tipe media berhasil ditambahkan!", "data" => $allowedMediaTypes]);
    exit;
} elseif (preg_match('/^media-types\/(.+)$/', $route, $matches) && $method === 'DELETE') {
    $typeName = urldecode($matches[1]);
    $builtIn = ['Banner', 'Pamflet', 'Sticker'];
    if (in_array($typeName, $builtIn)) {
        http_response_code(400);
        echo json_encode(["message" => "Tipe media bawaan tidak boleh dihapus!"]);
        exit;
    }
    $filtered = array_values(array_filter($allowedMediaTypes, fn($t) => $t !== $typeName));
    if (count($filtered) === count($allowedMediaTypes)) {
        http_response_code(404);
        echo json_encode(["message" => "Tipe media tidak ditemukan!"]);
        exit;
    }
    file_put_contents($mediaTypesPath, json_encode($filtered, JSON_PRETTY_PRINT));
    echo json_encode(["message" => "Tipe media berhasil dihapus!", "data" => $filtered]);
    exit;

} elseif ($route === 'login' && $method === 'POST') {
    // 1. POST /api/login
    $input = json_decode(file_get_contents('php://input'), true);
    $username = isset($input['username']) ? trim($input['username']) : '';
    $password = isset($input['password']) ? trim($input['password']) : '';

    $users = readJSON($usersPath);
    foreach ($users as $user) {
        if (strtolower($user['username']) === strtolower($username) && $user['password'] === $password) {
            unset($user['password']);
            echo json_encode($user);
            exit;
        }
    }
    http_response_code(401);
    echo json_encode(["message" => "Username atau password salah!"]);
    exit;

} elseif ($route === 'network-ip' && $method === 'GET') {
    // 2. GET /api/network-ip
    $host = isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost';
    $parts = explode(':', $host);
    echo json_encode([
        "localIp" => $parts[0],
        "port" => isset($parts[1]) ? intval($parts[1]) : 80
    ]);
    exit;

} elseif ($route === 'users') {
    // 3. /api/users
    $users = readJSON($usersPath);

    if ($method === 'GET') {
        // GET /api/users
        $safeUsers = [];
        foreach ($users as $u) {
            unset($u['password']);
            $safeUsers[] = $u;
        }
        echo json_encode($safeUsers);
        exit;

    } elseif ($method === 'POST') {
        // POST /api/users
        $input = json_decode(file_get_contents('php://input'), true);
        $username = isset($input['username']) ? trim($input['username']) : '';
        $password = isset($input['password']) ? trim($input['password']) : '';
        $name = isset($input['name']) ? trim($input['name']) : '';
        
        if (!$username || !$password || !$name) {
            http_response_code(400);
            echo json_encode(["message" => "Username, password, dan nama wajib diisi!"]);
            exit;
        }

        foreach ($users as $u) {
            if (strtolower($u['username']) === strtolower($username)) {
                http_response_code(400);
                echo json_encode(["message" => "Username sudah terdaftar!"]);
                exit;
            }
        }

        $newUser = [
            "id" => "user-" . generateUUID(),
            "username" => $username,
            "password" => $password,
            "name" => $name,
            "role" => "officer",
            "assignedProvinceId" => isset($input['assignedProvinceId']) ? $input['assignedProvinceId'] : '',
            "assignedProvinceName" => isset($input['assignedProvinceName']) ? $input['assignedProvinceName'] : 'Semua',
            "assignedRegencyId" => isset($input['assignedRegencyId']) ? $input['assignedRegencyId'] : '',
            "assignedRegencyName" => isset($input['assignedRegencyName']) ? $input['assignedRegencyName'] : 'Semua',
            "assignedMediaTypes" => (isset($input['assignedMediaTypes']) && is_array($input['assignedMediaTypes'])) ? $input['assignedMediaTypes'] : []
        ];

        $users[] = $newUser;
        writeJSON($usersPath, $users);

        unset($newUser['password']);
        http_response_code(201);
        echo json_encode(["message" => "Petugas baru berhasil didaftarkan!", "data" => $newUser]);
        exit;
    }

} elseif (preg_match('/^users\/([a-zA-Z0-9\-]+)$/', $route, $matches) && $method === 'PUT') {
    // PUT /api/users/:id
    $userId = $matches[1];
    if ($userId === 'user-admin') {
        http_response_code(400);
        echo json_encode(["message" => "Akun Administrator utama tidak boleh diedit!"]);
        exit;
    }

    $input = json_decode(file_get_contents('php://input'), true);
    $users = readJSON($usersPath);
    $index = -1;
    foreach ($users as $key => $u) {
        if ($u['id'] === $userId) {
            $index = $key;
            break;
        }
    }

    if ($index === -1) {
        http_response_code(404);
        echo json_encode(["message" => "User tidak ditemukan!"]);
        exit;
    }

    $username = isset($input['username']) ? trim($input['username']) : '';
    if ($username) {
        foreach ($users as $key => $u) {
            if ($key !== $index && strtolower($u['username']) === strtolower($username)) {
                http_response_code(400);
                echo json_encode(["message" => "Username sudah terdaftar!"]);
                exit;
            }
        }
        $users[$index]['username'] = $username;
    }

    if (isset($input['name'])) $users[$index]['name'] = trim($input['name']);
    if (isset($input['password']) && trim($input['password']) !== '') {
        $users[$index]['password'] = trim($input['password']);
    }

    if (isset($input['assignedProvinceId'])) $users[$index]['assignedProvinceId'] = $input['assignedProvinceId'];
    if (isset($input['assignedProvinceName'])) $users[$index]['assignedProvinceName'] = $input['assignedProvinceName'];
    if (isset($input['assignedRegencyId'])) $users[$index]['assignedRegencyId'] = $input['assignedRegencyId'];
    if (isset($input['assignedRegencyName'])) $users[$index]['assignedRegencyName'] = $input['assignedRegencyName'];
    if (isset($input['assignedMediaTypes']) && is_array($input['assignedMediaTypes'])) {
        $users[$index]['assignedMediaTypes'] = $input['assignedMediaTypes'];
    }

    writeJSON($usersPath, $users);
    $updatedUser = $users[$index];
    unset($updatedUser['password']);

    echo json_encode(["message" => "Data petugas berhasil diperbarui!", "data" => $updatedUser]);
    exit;

} elseif (preg_match('/^users\/([a-zA-Z0-9\-]+)$/', $route, $matches) && $method === 'DELETE') {
    // 4. DELETE /api/users/:id
    $userId = $matches[1];
    if ($userId === 'user-admin') {
        http_response_code(400);
        echo json_encode(["message" => "Akun Administrator utama tidak boleh dihapus!"]);
        exit;
    }

    $users = readJSON($usersPath);
    $filteredUsers = [];
    $found = false;
    foreach ($users as $u) {
        if ($u['id'] === $userId) {
            $found = true;
        } else {
            $filteredUsers[] = $u;
        }
    }

    if (!$found) {
        http_response_code(404);
        echo json_encode(["message" => "User tidak ditemukan!"]);
        exit;
    }

    writeJSON($usersPath, $filteredUsers);
    echo json_encode(["message" => "Petugas berhasil dihapus!"]);
    exit;

} elseif ($route === 'promo-media') {
    // 5. /api/promo-media
    $promoData = readJSON($dbPath);

    if ($method === 'GET') {
        // GET /api/promo-media
        $regencyFilter = isset($_GET['regency']) ? trim($_GET['regency']) : '';
        
        $normalizedData = [];
        foreach ($promoData as $item) {
            $normalizedData[] = normalizeItem($item, $allowedMediaTypes);
        }

        // Apply restricted officer region filter
        if ($regencyFilter && $regencyFilter !== 'Semua' && $regencyFilter !== 'All') {
            $regencies = array_map('trim', explode(',', $regencyFilter));
            $regenciesUpper = array_map('strtoupper', $regencies);
            $filtered = [];
            foreach ($normalizedData as $item) {
                if (isset($item['regency']) && in_array(strtoupper($item['regency']), $regenciesUpper)) {
                    $filtered[] = $item;
                }
            }
            $normalizedData = $filtered;
        }

        // Sort by newest first
        usort($normalizedData, function($a, $b) {
            return strtotime(isset($b['createdAt']) ? $b['createdAt'] : '') - strtotime(isset($a['createdAt']) ? $a['createdAt'] : '');
        });

        echo json_encode($normalizedData);
        exit;

    } elseif ($method === 'POST') {
        // POST /api/promo-media (Multipart Form-Data)
        $outletName = isset($_POST['outletName']) ? trim($_POST['outletName']) : '';
        $mediaType = isset($_POST['mediaType']) ? trim($_POST['mediaType']) : '';
        $condition = isset($_POST['condition']) ? trim($_POST['condition']) : '';

        if (!$outletName || !$mediaType || !$condition) {
            http_response_code(400);
            echo json_encode(["message" => "Nama outlet, tipe media, dan kondisi wajib diisi!"]);
            exit;
        }

        // Handle image file upload
        $photoUrl = '/uploads/placeholder-media.jpg';
        if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES['photo']['tmp_name'];
            $origName = $_FILES['photo']['name'];
            $ext = pathinfo($origName, PATHINFO_EXTENSION);
            if (!$ext) $ext = 'jpg';
            
            $uniqueFilename = 'promo-' . time() . '-' . mt_rand(100, 999) . '.' . strtolower($ext);
            $destPath = $uploadDir . '/' . $uniqueFilename;
            
            if (move_uploaded_file($tmpName, $destPath)) {
                $photoUrl = '/uploads/' . $uniqueFilename;
            }
        }

        $width = isset($_POST['width']) && $_POST['width'] !== '' ? floatval($_POST['width']) : null;
        $height = isset($_POST['height']) && $_POST['height'] !== '' ? floatval($_POST['height']) : null;
        $unit = isset($_POST['unit']) ? $_POST['unit'] : 'm';
        $dimensions = ($width !== null && $height !== null) ? "{$width} x {$height} {$unit}" : '-';

        $width2 = isset($_POST['width2']) && $_POST['width2'] !== '' ? floatval($_POST['width2']) : null;
        $height2 = isset($_POST['height2']) && $_POST['height2'] !== '' ? floatval($_POST['height2']) : null;
        $dimensions2 = ($width2 !== null && $height2 !== null) ? "{$width2} x {$height2} {$unit}" : '-';

        $mediaItemsRaw = isset($_POST['mediaItems']) ? $_POST['mediaItems'] : '';
        $mediaItems = [];
        if ($mediaItemsRaw) {
            $mediaItems = json_decode($mediaItemsRaw, true) ?: [];
        }
        foreach ($mediaItems as $key => $m) {
            $mediaItems[$key]['type'] = normalizeMediaType(isset($m['type']) ? $m['type'] : 'Banner', $allowedMediaTypes);
        }

        $safeMediaType = normalizeMediaType($mediaType, $allowedMediaTypes);
        $mediaType2 = isset($_POST['mediaType2']) ? trim($_POST['mediaType2']) : '';
        $safeMediaType2 = $mediaType2 ? normalizeMediaType($mediaType2, $allowedMediaTypes) : '';

        $newPromo = [
            "id" => "promo-" . generateUUID(),
            "outletName" => $outletName,
            "address" => isset($_POST['address']) && $_POST['address'] !== '' ? $_POST['address'] : 'Tidak ada alamat',
            "reporterName" => isset($_POST['reporterName']) && $_POST['reporterName'] !== '' ? $_POST['reporterName'] : 'Anonim',
            "mediaType" => $safeMediaType,
            "width" => $width,
            "height" => $height,
            "unit" => $unit,
            "dimensions" => $dimensions,
            "quantity" => isset($_POST['quantity']) ? intval($_POST['quantity']) : 1,
            "hasSecondMedia" => (isset($_POST['hasSecondMedia']) && ($_POST['hasSecondMedia'] === 'true' || $_POST['hasSecondMedia'] === true)),
            "mediaType2" => $safeMediaType2,
            "width2" => $width2,
            "height2" => $height2,
            "quantity2" => isset($_POST['quantity2']) ? intval($_POST['quantity2']) : 0,
            "dimensions2" => $dimensions2,
            "mediaItems" => $mediaItems,
            "condition" => $condition,
            "installationDate" => isset($_POST['installationDate']) && $_POST['installationDate'] !== '' ? $_POST['installationDate'] : date('Y-m-d'),
            "expiryDate" => isset($_POST['expiryDate']) ? $_POST['expiryDate'] : '',
            "latitude" => isset($_POST['latitude']) && $_POST['latitude'] !== '' ? floatval($_POST['latitude']) : null,
            "longitude" => isset($_POST['longitude']) && $_POST['longitude'] !== '' ? floatval($_POST['longitude']) : null,
            "province" => isset($_POST['province']) ? $_POST['province'] : '',
            "regency" => isset($_POST['regency']) ? $_POST['regency'] : '',
            "district" => isset($_POST['district']) ? $_POST['district'] : '',
            "village" => isset($_POST['village']) ? $_POST['village'] : '',
            "photoUrl" => $photoUrl,
            "notes" => isset($_POST['notes']) ? $_POST['notes'] : '',
            "createdAt" => date('c')
        ];

        $promoData[] = $newPromo;
        writeJSON($dbPath, $promoData);

        http_response_code(201);
        echo json_encode([
            "message" => "Pendataan media promo berhasil disimpan!",
            "data" => $newPromo
        ]);
        exit;
    }

} elseif (preg_match('/^promo\-media\/([a-zA-Z0-9\-]+)$/', $route, $matches)) {
    // 6. /api/promo-media/:id (PUT or DELETE)
    $promoId = $matches[1];
    $promoData = readJSON($dbPath);
    
    $index = -1;
    foreach ($promoData as $key => $item) {
        if ($item['id'] === $promoId) {
            $index = $key;
            break;
        }
    }

    if ($index === -1) {
        http_response_code(404);
        echo json_encode(["message" => "Data media promo tidak ditemukan!"]);
        exit;
    }

    if ($method === 'PUT') {
        // PUT /api/promo-media/:id
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            http_response_code(400);
            echo json_encode(["message" => "Format input salah!"]);
            exit;
        }

        $allowedUpdates = [
            'outletName', 'address', 'reporterName', 'mediaType', 
            'condition', 'installationDate', 'expiryDate', 
            'latitude', 'longitude', 'notes', 'province', 'regency', 'district', 'village',
            'width', 'height', 'unit',
            'quantity', 'hasSecondMedia', 'mediaType2', 'width2', 'height2', 'quantity2', 'conditionModifiedAt', 'conditionPhotoUrl'
        ];

        $conditionChanged = false;
        foreach ($allowedUpdates as $field) {
            if (isset($input[$field])) {
                $newVal = $input[$field];
                if (in_array($field, ['latitude', 'longitude', 'width', 'height', 'width2', 'height2'])) {
                    $newVal = $newVal !== '' && $newVal !== null ? floatval($newVal) : null;
                } elseif (in_array($field, ['quantity', 'quantity2'])) {
                    $newVal = intval($newVal);
                } elseif ($field === 'hasSecondMedia') {
                    $newVal = ($newVal === 'true' || $newVal === true);
                }

                if ($field === 'condition' && (!isset($promoData[$index]['condition']) || $promoData[$index]['condition'] !== $newVal)) {
                    $conditionChanged = true;
                }
                $promoData[$index][$field] = $newVal;
            }
        }

        if ($conditionChanged) {
            $promoData[$index]['conditionModifiedAt'] = date('c');
        }

        // Recompute dimensions
        $w = isset($promoData[$index]['width']) ? $promoData[$index]['width'] : null;
        $h = isset($promoData[$index]['height']) ? $promoData[$index]['height'] : null;
        $u = isset($promoData[$index]['unit']) ? $promoData[$index]['unit'] : 'm';
        $promoData[$index]['dimensions'] = ($w !== null && $h !== null) ? "{$w} x {$h} {$u}" : '-';

        $w2 = isset($promoData[$index]['width2']) ? $promoData[$index]['width2'] : null;
        $h2 = isset($promoData[$index]['height2']) ? $promoData[$index]['height2'] : null;
        $promoData[$index]['dimensions2'] = ($w2 !== null && $h2 !== null) ? "{$w2} x {$h2} {$u}" : '-';

        writeJSON($dbPath, $promoData);

        echo json_encode([
            "message" => "Data media promo berhasil diperbarui!",
            "data" => normalizeItem($promoData[$index], $allowedMediaTypes)
        ]);
        exit;

    } elseif ($method === 'POST') {
         // POST /api/promo-media/:id (Update with photo upload)
         $photoUrl = null;
         if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
             $tmpName = $_FILES['photo']['tmp_name'];
             $origName = $_FILES['photo']['name'];
             $ext = pathinfo($origName, PATHINFO_EXTENSION);
             if (!$ext) $ext = 'jpg';
             
             $uniqueFilename = 'promo-' . time() . '-' . mt_rand(100, 999) . '.' . strtolower($ext);
             $destPath = $uploadDir . '/' . $uniqueFilename;
             
             if (move_uploaded_file($tmpName, $destPath)) {
                 $photoUrl = '/uploads/' . $uniqueFilename;
                 
                 $isConditionPhoto = (isset($_POST['photoField']) && $_POST['photoField'] === 'conditionPhoto') || isset($_POST['condition']);
                 $targetField = $isConditionPhoto ? 'conditionPhotoUrl' : 'photoUrl';
                 
                 // Delete old file if exists
                 $oldPhoto = isset($promoData[$index][$targetField]) ? $promoData[$index][$targetField] : '';
                 if ($oldPhoto && strpos($oldPhoto, 'mock-') === false && strpos($oldPhoto, 'placeholder') === false) {
                     $oldFilename = basename($oldPhoto);
                     $oldFilePath = $uploadDir . '/' . $oldFilename;
                     if (file_exists($oldFilePath)) {
                         @unlink($oldFilePath);
                     }
                 }
                 $promoData[$index][$targetField] = $photoUrl;
             }
         }

         $allowedUpdates = [
             'outletName', 'address', 'reporterName', 'mediaType', 
             'condition', 'installationDate', 'expiryDate', 
             'latitude', 'longitude', 'notes', 'province', 'regency', 'district', 'village',
             'width', 'height', 'unit',
             'quantity', 'hasSecondMedia', 'mediaType2', 'width2', 'height2', 'quantity2', 'conditionModifiedAt', 'conditionPhotoUrl'
         ];

        $conditionChanged = false;
        foreach ($allowedUpdates as $field) {
            if (isset($_POST[$field])) {
                $newVal = $_POST[$field];
                if (in_array($field, ['latitude', 'longitude', 'width', 'height', 'width2', 'height2'])) {
                    $newVal = $newVal !== '' && $newVal !== null ? floatval($newVal) : null;
                } elseif (in_array($field, ['quantity', 'quantity2'])) {
                    $newVal = intval($newVal);
                } elseif ($field === 'hasSecondMedia') {
                    $newVal = ($newVal === 'true' || $newVal === true || $newVal === '1');
                }

                if ($field === 'condition' && (!isset($promoData[$index]['condition']) || $promoData[$index]['condition'] !== $newVal)) {
                    $conditionChanged = true;
                }
                $promoData[$index][$field] = $newVal;
            }
        }

        if ($conditionChanged) {
            $promoData[$index]['conditionModifiedAt'] = date('c');
        }

        // Recompute dimensions
        $w = isset($promoData[$index]['width']) ? $promoData[$index]['width'] : null;
        $h = isset($promoData[$index]['height']) ? $promoData[$index]['height'] : null;
        $u = isset($promoData[$index]['unit']) ? $promoData[$index]['unit'] : 'm';
        $promoData[$index]['dimensions'] = ($w !== null && $h !== null) ? "{$w} x {$h} {$u}" : '-';

        $w2 = isset($promoData[$index]['width2']) ? $promoData[$index]['width2'] : null;
        $h2 = isset($promoData[$index]['height2']) ? $promoData[$index]['height2'] : null;
        $promoData[$index]['dimensions2'] = ($w2 !== null && $h2 !== null) ? "{$w2} x {$h2} {$u}" : '-';

        writeJSON($dbPath, $promoData);

        echo json_encode([
            "message" => "Data media promo berhasil diperbarui!",
            "data" => normalizeItem($promoData[$index], $allowedMediaTypes)
        ]);
        exit;

    } elseif ($method === 'DELETE') {
        // DELETE /api/promo-media/:id
        $itemToDelete = $promoData[$index];
        
        // Delete physical photo file if it exists and is not placeholder/mock
        if (isset($itemToDelete['photoUrl']) && $itemToDelete['photoUrl'] && strpos($itemToDelete['photoUrl'], 'mock-') === false && strpos($itemToDelete['photoUrl'], 'placeholder') === false) {
            $filename = basename($itemToDelete['photoUrl']);
            $filePath = $uploadDir . '/' . $filename;
            if (file_exists($filePath)) {
                @unlink($filePath);
            }
        }

        array_splice($promoData, $index, 1);
        writeJSON($dbPath, $promoData);

        echo json_encode(["message" => "Data media promo berhasil dihapus!"]);
        exit;
    }

} elseif ($route === 'stats' && $method === 'GET') {
    // 7. GET /api/stats
    $regencyFilter = isset($_GET['regency']) ? trim($_GET['regency']) : '';
    $promoData = readJSON($dbPath);

    // Apply restricted region filtering
    if ($regencyFilter && $regencyFilter !== 'Semua' && $regencyFilter !== 'All') {
        $regencies = array_map('trim', explode(',', $regencyFilter));
        $regenciesUpper = array_map('strtoupper', $regencies);
        $filtered = [];
        foreach ($promoData as $item) {
            if (isset($item['regency']) && in_array(strtoupper($item['regency']), $regenciesUpper)) {
                $filtered[] = $item;
            }
        }
        $promoData = $filtered;
    }

    $now = time();
    $stats = [
        "totalMedia" => 0,
        "totalOutlets" => count(array_unique(array_map(function($item) { return isset($item['outletName']) ? $item['outletName'] : ''; }, $promoData))),
        "conditions" => [
            "Good" => 0,
            "Damaged" => 0,
            "Needs Replacement" => 0,
            "Missing" => 0
        ],
        "mediaTypes" => [
            "Banner" => 0,
            "Pamflet" => 0,
            "Sticker" => 0
        ],
        "expiringSoon" => 0,
        "expired" => 0
    ];

    foreach ($promoData as $item) {
        $item = normalizeItem($item, $allowedMediaTypes);
        
        if (isset($item['mediaItems']) && is_array($item['mediaItems']) && count($item['mediaItems']) > 0) {
            $totalItemQty = 0;
            foreach ($item['mediaItems'] as $m) {
                $t = isset($m['type']) ? $m['type'] : 'Banner';
                $q = isset($m['quantity']) ? intval($m['quantity']) : 1;
                $stats['totalMedia'] += $q;
                $stats['mediaTypes'][$t] = (isset($stats['mediaTypes'][$t]) ? $stats['mediaTypes'][$t] : 0) + $q;
                $totalItemQty += $q;
            }
            if (isset($stats['conditions'][$item['condition']])) {
                $stats['conditions'][$item['condition']] += $totalItemQty;
            }
        } else {
            $q1 = isset($item['quantity']) ? intval($item['quantity']) : 1;
            $q2 = (isset($item['hasSecondMedia']) && $item['hasSecondMedia'] && isset($item['quantity2'])) ? intval($item['quantity2']) : 0;
            
            $stats['totalMedia'] += ($q1 + $q2);
            if (isset($stats['conditions'][$item['condition']])) {
                $stats['conditions'][$item['condition']] += $q1;
            }
            if (isset($item['mediaType'])) {
                $stats['mediaTypes'][$item['mediaType']] = (isset($stats['mediaTypes'][$item['mediaType']]) ? $stats['mediaTypes'][$item['mediaType']] : 0) + $q1;
            }
            if (isset($item['hasSecondMedia']) && $item['hasSecondMedia'] && isset($item['mediaType2'])) {
                $stats['mediaTypes'][$item['mediaType2']] = (isset($stats['mediaTypes'][$item['mediaType2']]) ? $stats['mediaTypes'][$item['mediaType2']] : 0) + $q2;
            }
        }

        // Expiry check
        if (isset($item['expiryDate']) && $item['expiryDate']) {
            $expiry = strtotime($item['expiryDate']);
            $diffDays = ceil(($expiry - $now) / 86400);
            
            if ($diffDays < 0) {
                $stats['expired']++;
            } elseif ($diffDays <= 7) {
                $stats['expiringSoon']++;
            }
        }
    }

    echo json_encode($stats);
    exit;

} else {
    // Route not found
    http_response_code(404);
    echo json_encode(["message" => "Endpoint API tidak ditemukan!"]);
    exit;
}
