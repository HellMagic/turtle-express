
$(function	()	{

	// Cookie validation
	if(jQuery.type($.cookie('skin_color')) != 'undefined')	{
	
		$('aside').removeClass('skin-1');
		$('aside').removeClass('skin-2');
		$('aside').removeClass('skin-3');
		$('aside').removeClass('skin-4');
		$('#top-nav').removeClass('skin-1');
		$('#top-nav').removeClass('skin-2');
		$('#top-nav').removeClass('skin-3');
		$('#top-nav').removeClass('skin-4');
		
		$('aside').addClass($.cookie('skin_color'));
		$('#top-nav').addClass($.cookie('skin_color'));
	}
	else	{	
		$('aside').removeClass('skin-1');
		$('aside').removeClass('skin-2');
		$('aside').removeClass('skin-3');
		$('aside').removeClass('skin-4');
		$('#top-nav').removeClass('skin-1');
		$('#top-nav').removeClass('skin-2');
		$('#top-nav').removeClass('skin-3');
		$('#top-nav').removeClass('skin-4');
	}
	
	//Skin color
	$('.theme-color').click(function()	{
		//Cookies for storing theme color
		$.cookie('skin_color', $(this).attr('id'));
		
		$('aside').removeClass('skin-1');
		$('aside').removeClass('skin-2');
		$('aside').removeClass('skin-3');
		$('aside').removeClass('skin-4');
		$('#top-nav').removeClass('skin-1');
		$('#top-nav').removeClass('skin-2');
		$('#top-nav').removeClass('skin-3');
		$('#top-nav').removeClass('skin-4');
		
		$('aside').addClass($(this).attr('id'));
		$('#top-nav').addClass($(this).attr('id'));
	});
	
	// Delete values stored in cookies 
	// uncomment code to activate
	//	$.removeCookie('theme_color');
	//
	
	$('.login-link').click(function(e) {
		e.preventDefault();
		href = $(this).attr('href');
		
		$('.login-wrapper').addClass('fadeOutUp');

		setTimeout(function() {
			window.location = href;
		}, 900);
			
		return false;	
	});
	
	//Submenu
	$('aside li').hover(
       function(){ $(this).addClass('open') },
       function(){ $(this).removeClass('open') }
	)
	
	//scroll to top of the page
	$("#scroll-to-top").click(function()	{
		$("html, body").animate({ scrollTop: 0 }, 600);
		 return false;
	});

	//Toggle Menu
	$('#sidebarToggle').click(function()	{
		$('#wrapper').toggleClass('sidebar-display');
	});
	
	$('#inboxMenuToggle').click(function()	{
		$('#inboxMenu').toggleClass('menu-display');
	});
	
	$('#sizeToggle').click(function()	{
		$('#wrapper').toggleClass('sidebar-mini');
	});
	
	//Collapse panel
	$('.collapse-toggle').click(function()	{
	
		$(this).parent().toggleClass('active');
	
		var parentElm = $(this).parent().parent().parent().parent();
		
		var targetElm = parentElm.find('.panel-body');
		
		targetElm.toggleClass('collapse');
	});
		
	//Check all	checkboxes
	$('#chk-all').click(function()	{
		if($(this).is(':checked'))	{
			$('.inbox-panel').find('.chk-item').each(function()	{
				$(this).prop('checked', true);
				$(this).parent().parent().addClass('selected');
			});
		}
		else	{
			$('.inbox-panel').find('.chk-item').each(function()	{
				$(this).prop('checked' , false);
				$(this).parent().parent().removeClass('selected');
			});
		}
	});
	
	$('.chk-item').click(function()	{
		if($(this).is(':checked'))	{
			$(this).parent().parent().addClass('selected');		
		}
		else	{
			$(this).parent().parent().removeClass('selected');
		}
	});
	
	$('.chk-row').click(function()	{
		if($(this).is(':checked'))	{
			$(this).parent().parent().parent().addClass('selected');		
		}
		else	{
			$(this).parent().parent().parent().removeClass('selected');
		}
	});
	
	//Hover effect on touch device
	$('.image-wrapper').bind('touchstart', function(e) {
		$('.image-wrapper').removeClass('active');
		$(this).addClass('active');
    });
	
	//Colorbox 
	$('.gallery-zoom').colorbox({
		rel:'gallery',
		maxWidth:'90%',
		width:'800px'
	});
	
	$('.image-zoom').colorbox({
		maxWidth:'90%',
		width:'800px'
	});
	
	//Dropdown menu with hover
	$('.hover-dropdown').hover(
       function(){ $(this).addClass('open') },
       function(){ $(this).removeClass('open') }
	)

	//upload file
	$('.upload-demo').change(function()	{
		var filename = $(this).val().split('\\').pop();
		$(this).parent().find('span').attr('data-title',filename);
		$(this).parent().find('label').attr('data-title','Change file');
		$(this).parent().find('label').addClass('selected');
	});

	$('.remove-file').click(function()	{
		$(this).parent().find('span').attr('data-title','No file...');
		$(this).parent().find('label').attr('data-title','Select file');
		$(this).parent().find('label').removeClass('selected');

		return false;
	});	

	//theme setting
	$("#theme-setting-icon").click(function()	{ 
		if($('#theme-setting').hasClass('open'))	{
			$('#theme-setting').removeClass('open');
			$('#theme-setting-icon').removeClass('open');
		}
		else	{
			$('#theme-setting').addClass('open');
			$('#theme-setting-icon').addClass('open');
		}

		return false;
	});
	
	//to do list
	$('.task-finish').click(function()	{
		if($(this).is(':checked'))	{
			$(this).parent().parent().addClass('selected');					
		}
		else	{
			$(this).parent().parent().removeClass('selected');
		}
	});

	//Delete Tasks
	$('.task-del').click(function()	{			
		var activeList = $(this).parent().parent();

		activeList.addClass('removed');
				
		setTimeout(function() {
			activeList.remove();
		}, 1000);
			
		return false;
	});
});

$(window).load(function() {
	
	// Fade out the overlay div
	$('#overlay').fadeOut(800);
	
	$('body').removeAttr('class');
	$('body').removeAttr('style');

	//Enable animation
	$('#wrapper').removeAttr('class');
});

$(window).scroll(function(){
		
	 var position = $(window).scrollTop();
	
	 //Display a scroll to top button
	 if(position >= 200)	{
		$('#scroll-to-top').attr('style','bottom:8px;');	
	 }
	 else	{
		$('#scroll-to-top').removeAttr('style');
	 }
});
