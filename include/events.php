<?
class Events {
	protected $url;
	protected $host_id;

	function __construct($url="http://localhost", $host_id) {
		$this->url = $url;
		$this->host_id = $host_id;
	}

	public function send($ch_id, $uid, $event, $params='', $type='info') {
		return $this->_send($this->url.'/pub?id='.$this->host_id.'-'.$ch_id, json_encode(array('event'=>$event, 'uid'=>$uid, 'data'=>$params, 'type'=>$type, 'time'=>date('d.m H:i:s')), JSON_UNESCAPED_UNICODE));
	}

	public function broadcast($event, $params='') {
		return $this->_send($this->url.'/pub?id='.$this->host_id.'-broadcast', json_encode(array('event'=>$event, 'data'=>$params, 'time'=>date('d.m H:i:s')), JSON_UNESCAPED_UNICODE));
	}

	public function statistic($ch_id) {
		return $this->_send($this->url.'/channels-stats?id='.$this->host_id.'-'.$ch_id, '');
	}

	public function _send($url, $data_str) {
		$ch = curl_init($url); 
        
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_POST, true);
		curl_setopt($ch, CURLOPT_POSTFIELDS, str_replace('"', '\\"', $data_str));

        $result = curl_exec($ch);
        curl_close($ch);
        return $result; 
	}
}
?>