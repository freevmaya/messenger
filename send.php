<?
include('/home/config.php');
include('include/events.php');
include_once(INCLUDE_PATH.'/_dbu.php');
include_once(INCLUDE_PATH.'/_edbu2.php');
include_once(INCLUDE_PATH.'/request.php');
include_once(INCLUDE_PATH.'/fdbg.php');

$dbname = 'msghg';
$charset = 'utf8';

$origin = $_SERVER['HTTP_ORIGIN'];
$originHost = preg_replace('/http:\/\/|https:\/\//', '', $origin);

if (($host_name = @$_POST['host']) != 'auto')  $query = "SELECT COUNT(id) as `count`, id FROM `hosts` WHERE `enabled`=1 AND `date_expires`>CURDATE() AND `host` LIKE '%{$host_name}%'";
else $query = "SELECT COUNT(id) as `count`, id FROM `hosts` WHERE `enabled`=1 AND `date_expires`>CURDATE() AND `host` LIKE '%{$originHost}%'";

$allowed = DB::line($query);

if ($allowed['count'] > 0) {

	header("Access-Control-Allow-Origin: {$origin}");
	header('Access-Control-Allow-Credentials: true');
	$events = new Events('http://pjof.ru', $allowed['id']);

	$result = [];
	if ($_POST['event'] == 'get_host_id') {
		$result = ['host_id'=>$allowed['id']];
	} else if (($id = $_POST['id']) && ($uid = $_POST['uid'])) {
		if (($_POST['event'] == 'message') && ($text = @$_POST['text'])) {
			$result = $events->send($id, $uid, 'message', $text);
		} else {
			$events->broadcast($_POST['event'] , json_encode($_POST));
			$result = ['host_id'=>$allowed['id']];
		}
	}

	echo json_encode($result);
} else echo 'Not allowed for this domain';

if ($db) $db->close();
?>