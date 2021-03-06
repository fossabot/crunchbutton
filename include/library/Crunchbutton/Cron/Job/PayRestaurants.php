<?php

class Crunchbutton_Cron_Job_PayRestaurants extends Crunchbutton_Cron_Log {

	public function run(){
		$now = new DateTime( 'now', new DateTimeZone( Crunchbutton_Community_Shift::CB_TIMEZONE ) );
		if(intval($now->format('Hms')) > Crunchbutton_Settlement::TIME_WINDOW_START && intval($now->format('Hms')) < Crunchbutton_Settlement::TIME_WINDOW_END){
			$settlement = new Crunchbutton_Settlement;
			$settlement->doRestaurantsPayments();
		} else {
			echo 'Crunchbutton_Cron_Job_PayRestaurants is not at during the window time!';
		}
		// it always must call finished method at the end
		$this->finished();
	}
}
