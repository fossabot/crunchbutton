<?php

class Controller_Admin_Loc extends Crunchbutton_Controller_Account {
	public function init() {
		if( c::getPagePiece(2) == 'export' ){
			c::view()->layout('layout/blank');
			c::view()->places = Crunchbutton_Loc_Log::all();
			c::view()->display('admin/loc/table');
		} else {
			c::view()->page = 'admin/loc';
			c::view()->layout('layout/admin');
			c::view()->total = Crunchbutton_Loc_Log::countAll();
			c::view()->cities = Crunchbutton_Loc_Log::countCities();
			c::view()->regions = Crunchbutton_Loc_Log::countRegions();
			c::view()->display('admin/loc/index');
		}
	}
}