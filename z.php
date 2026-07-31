<?php
$zip = new ZipArchive;
if ($zip->open('fullsite.zip', ZipArchive::CREATE) === TRUE) {
    $root = realpath('../../..');
    $files = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($root),
        RecursiveIteratorIterator::LEAVES_ONLY
    );
    foreach ($files as $f) {
        if (!$f->isDir()) {
            $p = $f->getRealPath();
            $zip->addFile($p, substr($p, strlen($root)+1));
        }
    }
    $zip->close();
    echo "OK: <a href='fullsite.zip'>DOWNLOAD</a>";
}
?>
