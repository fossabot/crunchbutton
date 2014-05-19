<?php

class Controller_api_community_list extends Crunchbutton_Controller_Rest {
	public function init() {

		switch ( $this->method() ) {

			case 'get':

				switch ( c::getPagePiece( 3 ) ) {
					// other lists can be added here!

					// Simple list returns just the name and id
					case 'simple':
					default:
						$communities = Crunchbutton_Community::active();
						$export = [];
						foreach( $communities as $community ){
							$export[] = array( 'id_community' => $community->id_community, 'name' => $community->name );
						}				
						echo json_encode( $export );		
						break;
				}

			break;

			default:
				echo json_encode( [ 'error' => 'invalid object' ] );
			break;
		}
	
	}
}