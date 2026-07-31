<?php
$zip = new ZipArchive();
$zipname = 'site.zip';
if ($zip->open($zipname, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== TRUE) {
    die("Failed to create zip");
}
$srcDir = '/home4/websisrj/public_html/hillwoodsschool.com';
$files = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($srcDir, RecursiveDirectoryIterator::SKIP_DOTS),
    RecursiveIteratorIterator::LEAVES_ONLY
);
foreach ($files as $name => $file) {
    $filePath = $file->getRealPath();
    $localPath = substr($filePath, strlen($srcDir) + 1);
    if (filesize($filePath) > 0) {
        $zip->addFile($filePath, $localPath);
    }
}
$zip->close();
echo "Zip created: " . $zipname . " (" . filesize($zipname) . " bytes)";
?>
