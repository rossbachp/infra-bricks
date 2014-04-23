$( document ).ready(function() {

	/* Sidebar height set */
	$('.sidebar').css('min-height',$(document).height());

	/* Secondary contact links */
	var scontacts_1 = $('#contact-list-secondary-1');
	var contact_list_1 = $('#contact-list-1');
	
	scontacts_1.hide();
	
	contact_list_1.mouseenter(function(){ scontacts_1.slideDown(); });	
	contact_list_1.mouseleave(function(){ scontacts_1.slideUp(); });

	var scontacts_2 = $('#contact-list-secondary-2');
	var contact_list_2 = $('#contact-list-2');
	
	scontacts_2.hide();
	
	contact_list_2.mouseenter(function(){ scontacts_2.slideDown(); });	
	contact_list_2.mouseleave(function(){ scontacts_2.slideUp(); });

});
