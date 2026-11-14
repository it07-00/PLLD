<?php
/**
 * Copy file này thành `config.php` trên hosting iNET và điền thông tin thật.
 * KHÔNG commit `config.php` chứa mật khẩu lên Git công khai.
 */
return [
    'db_host' => 'localhost',
    'db_name' => 'ten_database_cua_ban',
    'db_user' => 'ten_user_mysql',
    'db_pass' => 'mat_khau_mysql',
    'db_charset' => 'utf8mb4',

    // Mã bảo mật dùng chung cho các máy trong đội test (tự đặt chuỗi dài ngẫu nhiên).
    // Nhập đúng mã này vào mục Cài đặt -> Đồng bộ Online trên app PLLĐ-BC.
    'api_key' => 'thay-bang-ma-bao-mat-dai-va-kho-doan',
];
