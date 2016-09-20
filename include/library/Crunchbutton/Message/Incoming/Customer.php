<?php

class Crunchbutton_Message_Incoming_Customer extends Cana_model {

	const ACTION_STATUS = 'status';
	const ACTION_REPLY = 'reply';
	const ACTION_HELP = 'help';

	public function __construct($params) {

		$parsed = $this->parseBody($params['body']);
		$action = $parsed['verb'];

		$phone = Phone::byPhone( $params['from'] );

		$this->phone = $phone;

		$this->order = Order::q('select * from `order` where id_phone=? AND TIMESTAMPDIFF( hour, date, NOW() ) < 24 order by id_order desc limit 1',[$phone->id_phone])->get(0);
		$this->support = Support::q('SELECT * FROM support_message sm
																		INNER JOIN support s ON s.id_support = sm.id_support
																		AND s.id_phone = ?
																		AND TIMESTAMPDIFF( hour, sm.date, NOW() ) < 24
																		ORDER BY sm.id_support_message DESC
																		LIMIT 1',[ $phone->id_phone ])->get(0);

		$response = [];

		if($this->order && $this->order->id_community){
			$params['id_community'] = $this->order->id_community;
		} else {
			$community = Community::customerCommunityByPhone($phone->phone);
			if($community){
				$params['id_community'] = $community->id_community;
			}
		}

		switch ($action) {
			case self::ACTION_REPLY:
				$response = ['msg' => $this->reply($params), 'stop' => true];
				break;

			case self::ACTION_STATUS:
				$response = ['msg' => $this->status($params), 'stop' => true];
				break;

			case self::ACTION_HELP:
				$response = ['msg' => $this->help(), 'stop' => false];
				break;
		}
		$this->response = (object) $response;
	}

	public function status() {
		if ($this->support->id_order) {
			$response .= "\nOrder: #".$this->support->id_order;
			$date = new DateTime($this->support->order()->date, new DateTimeZone(c::config()->timezone));
			$date->setTimeZone(new DateTimeZone($this->support->order()->restaurant()->timezone));
			$response .= "\nOrdered @ ".$date->format('n/j g:iA T');

			$response .= "\nRestaurant: ".$this->support->order()->restaurant()->name;

			if ($this->support->order()->status()->last()['driver']) {
				$response .= "\nDriver: ".$this->support->order()->status()->last()['driver']['name'];
				$response .= "\nStatus: ".$this->support->order()->status()->last()['status'];
			}

			$date = new DateTime($this->support->order()->status()->last()['date'], new DateTimeZone(c::config()->timezone));
			$date->setTimeZone(new DateTimeZone($this->support->order()->restaurant()->timezone));
			$response .= "\nUpdated @ ".$date->format('n/j g:iA T');
		}
		return $response;
	}

	public function reply($params) {

		if($this->support->id_support){
			$created = false;
		}

		if( !$this->support->id_support ){
			$created = true;
		}

		// when it find a ticket but it bellongs to another order
		if( $this->order && $this->support && $this->support->id_support && $this->order->id_order && $this->support->id_order != $this->order->id_order ){
			$created = true;
		}

		if ($created) {
			// create a new ticket
			$this->support = Support::createNewSMSTicket([
				'phone' => $params['from'],
				'id_community' => $params['id_community'],
				'id_order' => $this->order->id_order,
				'body' => $params['body'],
				'media' => $params['media']
			]);

		} else {

			// Open support
			if ($this->support->status == Crunchbutton_Support::STATUS_CLOSED) {
				$this->support->status = Crunchbutton_Support::STATUS_OPEN;
				$this->support->addSystemMessage('Ticket reopened by customer');
			}
			// Add the new customer message
			$this->support->addCustomerMessage([
				'name' => $this->order->name,
				'phone' => $params['from'],
				'body' => $params['body'],
				'media' => $params['media']
			]);
			$this->id_community = $params['id_community'];
			$this->support->save();
		}

		$this->log( [ 'action' => 'returning sms', 'msg' => $params['body']] );

		// build the message to send to reps
		$message = '@'.$this->support->id_support;
		if ($params['admin'] && $params['admin']->isDriver()) {
			// format as a driver message
			$message .= ' DRIVER '.$params['admin']->name;
		} elseif ($this->order->id_order) {
			$message .= ' #'.$this->order->id_order.' '.$this->order->name;

			if ($created) {
				// send a message before support
				$types = $this->order->restaurant()->notification_types();

				if (count($types) > 0) {
					$notifications = ' / RN: ' . join('/', $types);
				}

				$date = $this->order->date()->format('m/d/Y h:i A');

				$community = $this->order->restaurant()->communityNames();
				if ($community) {
					$community = ' (' . $community . ')';
				}

				$newMessageNotification =
					'New support ticket @'.$this->support->id_support."\n".
					'Last Order: #'.$this->order->id_order.' on '.$date."\n".
					'Customer: '.$this->order->name.' / '.$this->order->phone.($this->order->address ? ' / '.$this->order->address : '')."\n".
					'Restaurant: '.$this->order->restaurant()->name.$community.' / '.$this->order->restaurant()->phone.$notifications;
					// Notify reps
					$this->notifyReps($newMessageNotification, $this->support);
					return;
			}
		}

		$message .= ': '.htmlspecialchars($params['body']);
		$this->notifyReps($message, $params['media']);

		// notify reps if support is late at night
		$this->support->makeACall();
		$this->log( [ 'action' => 'sms action - support-ask', 'message' => $message] );
	}

	private function notifyReps($message, $params){
		$reps = [];
		$type = null;
		$data = ['reps'=>[]];

		// first check if the order was accepted and the driver is working
		if($this->order){
			$driver = $this->order->driver();
			if($driver->id_admin){
				$driver = Admin::o($driver->id_admin);
				if($driver->isWorking()){
					$reps[$driver->name] = $driver->phone;
					$type = Support_Action::TYPE_NOTIFICATION_SENT_TO_DRIVER;
					$data['reps'][] = ['id_admin' => $driver->id_admin];
				}
			}
		}
		// if not, send the message to other drivers
		if(!count($reps)){
			$id_community = $this->order->id_community;
			if(!$id_community && $this->phone && $this->phone->phone){
				$community = Crunchbutton_Community::customerCommunityByPhone($this->phone->phone);
				if($community->id_community){
					$id_community = $community->id_community;
				}
			}
			if($id_community){
				$community = Community::o($this->order->id_community);
				$drivers = $community->getWorkingDrivers();
				foreach ($drivers as $driver) {
					$reps[$driver->name] = $driver->phone;
					$data['reps'][] = ['id_admin' => $driver->id_admin];
					$type = Support_Action::TYPE_NOTIFICATION_SENT_TO_DRIVERS;
				}
			}
		}

		// if there is no drivers to receive it, sent it to cs
		if(!count($reps)){
			$reps = Support::getUsers();
			$data['reps'] = $reps;
			$type = Support_Action::TYPE_NOTIFICATION_SENT_TO_CS;
		}

		Support_Action::create(['id_support' => $this->support->id_support,
														'action' => Support_Action::ACTION_NOTIFICATION_SENT,
														'type' => $type,
														'data' => $data ]);
		Message_Sms::send([
			'to' => $reps,
			'message' => $message,
			'media' => $params['media'],
			'reason' => Message_Sms::REASON_SUPPORT
		]);
	}

	public function help() {
		$response =
			"Support usage: command|message\n".
			"Commands: \n".
			"    status - show status of last order\n".
			"    support - show this help\n".
			"Ex:\n".
			"    status\n".
			"    Hello there!";

		$this->log( [ 'action' => 'help requested'] );
		return $response;
	}

	public function parseBody($body) {
		$body = strtolower($body);

		$verbs = [
			self::ACTION_STATUS => [ 'status' ],
			self::ACTION_HELP => [ 'help', 'h', 'info', 'commands', '\?', 'support'],
			self::ACTION_REPLY => [ '.*' ]
		];

		foreach ($verbs[self::ACTION_HELP] as $k => $verb) {
			$help .= ($help ? '$|^' : '').'\/?'.$verb;
		}

		if (preg_match('/^'.$help.'$/',$body)) {
			return ['verb' => self::ACTION_HELP, 'order' => null];
		}

		foreach ($verbs as $verb =>  $verbList) {
			foreach ($verbList as $v) {
				if (preg_match('/^\/?('.$v.')$/', $body, $matches)) {
					return ['verb' => $verb, 'message' => $matches[3]];
				}
			}
		}

		return ['verb' => self::ACTION_REPLY, 'message' => $body];
	}

	public function log($content) {
		Log::debug( array_merge ( $content, [ 'type' => 'user-sms' ] ) );
	}
}
