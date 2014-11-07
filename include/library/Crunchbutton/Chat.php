<?php

class Crunchbutton_Chat {
	public static function emit($to, $event, $payload = []) {

		if (!c::config()->site->config('chat-server')->val()) {
			throw new Exception('No chat server defined. (chat-server)');
		}
		
		if (!c::config()->site->config('chat-server-key')->val()) {
			throw new Exception('No chat server security key defined. (chat-server-key)');
		}
		
		if (!c::config()->site->config('chat-server-port')->val()) {
			throw new Exception('No chat server port defined. (chat-server-port)');
		}

		$data = json_encode([
			'to' => $to,
			'event' => $event,
			'payload' => $payload,
			'_key' => c::config()->site->config('chat-server-key')->val()
		]);

		$ch = curl_init(c::config()->site->config('chat-server')->val());
		curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
		curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
		curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
		curl_setopt($ch, CURLOPT_HTTPHEADER, [
			'Content-Type: application/json',
			'Content-Length: ' . strlen($data)
		]);

		$res = curl_exec($ch);
		return $res;	
	}
}