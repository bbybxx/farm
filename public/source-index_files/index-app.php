// animatePages:false,
var hide_alerts = document.getElementById("hide_alerts");
if (hide_alerts !== null) {
	var myApp = new Framework7({ bbfix:true, fastClicks:false, cache:false, swipeBackPage:true, notificationHold:7000, pushState: true, onAjaxStart: function(xhr) { myApp.showIndicator(); }, onAjaxComplete: function(xhr) { myApp.hideIndicator(); } });
} else {
	var myApp = new Framework7({ bbfix:true, fastClicks:false, cache:false, swipeBackPage:true, pushState: true, onAjaxStart: function(xhr) { myApp.showIndicator(); }, onAjaxComplete: function(xhr) { myApp.hideIndicator(); } });
}

var $$=Dom7;
var leftView=myApp.addView('.view-left',{dynamicNavbar:true});
var mainView=myApp.addView('.view-main',{dynamicNavbar:true});
var farmstatusint;
var fishingint;
var autofishingint;
var fishingtmout;
var mbchecktimer;
var currentScroll = 0;

$$(document).on('pageInit', function (e) {
    var page = e.detail.page;

	gtag('event', 'page_view', {
		"page_title": page.name,
	});
	//console.log(page.name);

	clearInterval(farmstatusint);
    clearInterval(mbchecktimer);
	clearInterval(fishingint);
	clearInterval(autofishingint);

	var alert_rng = Math.floor(Math.random() * 3);
	if (alert_rng == 1) {
		checkForAlerts();
	}

    if (page.name == 'register') {
        $.getScript("js/register.js");
        $.getScript("https://www.google.com/recaptcha/api.js");
    } else if (page.name == 'login') {
        $.getScript("js/login.js");
    } else if (page.name == 'forgot') {
        $.getScript("js/forgot.js");
    } else if (page.name == 'wiki') {
        $.getScript("js/wiki.js");
        new ClipboardJS('.sharelink');
    } else if (page.name == 'profile') {
        $.getScript("js/profile.js");
		new ClipboardJS('.sharelink');
    } else if (page.name == 'index-1') {
		getStats();
        $.getScript("js/index.js");
    } else if (page.name == 'logout') {
        $.getScript("js/logout.js");
    } else if (page.name == 'settings') {
        $.getScript("js/settings.js");
    } else if (page.name == 'settings_userinfo') {
		$.getScript("js/settings_userinfo.js");
	} else if (page.name == 'settings_password') {
		$.getScript("js/settings_password.js");
	} else if (page.name == 'settings_bio') {
		$.getScript("js/settings_bio.js");
	} else if (page.name == 'settings_options') {
		$.getScript("js/settings_options.js");
	} else if (page.name == 'settings_emblems') {
		$.getScript("js/settings_emblems.js");
	} else if (page.name == 'settings_colors') {
		$.getScript("js/settings_colors.js");
	} else if (page.name == 'settings_country') {
		$.getScript("js/settings_country.js");
	} else if (page.name == 'message') {
        $.getScript("js/message.js");
    } else if (page.name == 'messages') {
        $.getScript("js/messages.js");
    } else if (page.name == 'members') {
        $.getScript("js/members.js");
    } else if (page.name == 'sendmessage') {
        $.getScript("js/sendmessage.js");
    } else if (page.name == 'setupfarm') {
        $.getScript("js/setupfarm.js");
    } else if (page.name == 'farm') {
		$.getScript("js/farm.php");
	} else if (page.name == 'store') {
		$.getScript("js/store.js");
	} else if (page.name == 'market') {
		$.getScript("js/market.js");
	} else if (page.name == 'fishing') {
		delete fishingint;
		$.getScript("js/fishing.js");
	} else if (page.name == 'perks') {
		$.getScript("js/perks.js");
	} else if (page.name == 'workshop') {
		$.getScript("js/workshop.js");
	} else if (page.name == 'area') {
		$.getScript("js/area.js");
	} else if (page.name == 'coop') {
		$.getScript("js/coop.js");
	} else if (page.name == 'bank') {
		$.getScript("js/bank.js");
	} else if (page.name == 'bankhistory') {
    	$.getScript("js/apexcharts.min.js");
    	setTimeout(function(){ $.getScript("js/bankhistory.php"); }, 300);
	} else if (page.name == 'advstats') {
		$.getScript("js/apexcharts.min.js");
		setTimeout(function(){ $.getScript("js/advstats.php"); }, 300);
	} else if (page.name == 'supply') {
		$.getScript("js/supply.js");
	} else if (page.name == 'namechicken') {
		$.getScript("js/namechicken.js");
	} else if (page.name == 'hab') {
		$.getScript("js/hab.js");
	} else if (page.name == 'orchard') {
		$.getScript("js/orchard.js");
	} else if (page.name == 'troutfarm') {
		$.getScript("js/troutfarm.js");
	} else if (page.name == 'inventory') {
		$.getScript("js/inventory.js");
	} else if (page.name == 'pasture') {
		$.getScript("js/pasture.js");
	} else if (page.name == 'namecow') {
		$.getScript("js/namecow.js");
	} else if (page.name == 'flea') {
		$.getScript("js/flea.js");
	} else if (page.name == 'support') {
		$.getScript("js/support.js");
	} else if (page.name == 'xfarm') {
		$.getScript("js/xfarm.php");
	} else if (page.name == 'vineyard') {
		$.getScript("js/vineyard.js");
	} else if (page.name == 'charter') {
		$.getScript("js/charter.js");
	} else if (page.name == 'viewcharter') {
		$.getScript("js/viewcharter.js");
	} else if (page.name == 'expedition') {
		$.getScript("js/expedition.js");
	} else if (page.name == 'viewexpedition') {
		$.getScript("js/viewexpedition.js");
	} else if (page.name == 'cellar') {
		$.getScript("js/cellar.js");
	} else if (page.name == 'farmsettings') {
		$.getScript("js/farmsettings.js");
	} else if (page.name == 'resetaccount') {
		$.getScript("js/resetaccount.js");
	} else if (page.name == 'steakmarket') {
		$.getScript("js/steakmarket.js");
	} else if (page.name == 'sawmill') {
		$.getScript("js/sawmill.js");
	} else if (page.name == 'ironworks') {
		$.getScript("js/ironworks.js");
	} else if (page.name == 'hayfield') {
		$.getScript("js/hayfield.js");
	} else if (page.name == 'quarry') {
		$.getScript("js/quarry.js");
	} else if (page.name == 'postoffice') {
		$.getScript("js/postoffice.js");
	} else if (page.name == 'mailbox') {
		$.getScript("js/mailbox.js");
	} else if (page.name == 'claim') {
		$.getScript("js/claim.js");
	} else if (page.name == 'farmhouse') {
		$.getScript("js/farmhouse.js");
	} else if (page.name == 'storehouse') {
		$.getScript("js/storehouse.js");
	} else if (page.name == 'quest') {
		$.getScript("js/quest.js");
	} else if (page.name == 'quests') {
		$.getScript("js/quests.js");
	} else if (page.name == 'changename') {
		$.getScript("js/changename.js");
	} else if (page.name == 'autocraft') {
		$.getScript("js/autocraft.js");
	} else if (page.name == 'changebait') {
		$.getScript("js/changebait.js");
	} else if (page.name == 'location') {
		$.getScript("js/location.js");
	} else if (page.name == 'item') {
		$.getScript("js/item.js");
    	new ClipboardJS('.sharelink');

		$.when(
			$.getScript( "js/transformJS.js" ),
			$.getScript( "js/jquery.bobble.js?12" ),
			$.Deferred(function( deferred ){
				$( deferred.resolve );
			})
		).done(function(){
			$(".bobble").bobble();
		});
	} else if (page.name == 'iosiap') {
		$.getScript("js/iosiap.js");
	} else if (page.name == 'andiap') {
		$.getScript("js/andiap.js");
	} else if (page.name == 'mastery') {
		$.getScript("js/mastery.js");
	} else if (page.name == 'pets') {
		$.getScript("js/pets.js");
	} else if (page.name == 'pet') {
		$.getScript("js/pet.js");
	} else if (page.name == 'namepet') {
		$.getScript("js/namepet.js");
	} else if (page.name == 'feedmill') {
		$.getScript("js/feedmill.js");
	} else if (page.name == 'flourmill') {
		$.getScript("js/flourmill.js");
	} else if (page.name == 'well') {
		$.getScript("js/well.js");
	} else if (page.name == 'explore') {
		$.getScript("js/explore.js");
	} else if (page.name == 'tent') {
		$.getScript("js/tent.js");
	} else if (page.name == 'locksmith') {
		$.getScript("js/locksmith.js");
	} else if (page.name == 'pigpen') {
		$.getScript("js/pigpen.js");
	} else if (page.name == 'namepig') {
		$.getScript("js/namepig.js");
	} else if (page.name == 'manageperks') {
		$.getScript("js/manageperks.js");
	} else if (page.name == 'allpetitems') {
		$.getScript("js/allpetitems.js");
	} else if (page.name == 'pen') {
		$.getScript("js/pen.js");
	} else if (page.name == 'nameraptor') {
		$.getScript("js/nameraptor.js");
	} else if (page.name == 'craftitems') {
		$.getScript("js/craftitems.js");
	} else if (page.name == 'xworkshop') {
		$.getScript("js/xworkshop.js");
	} else if (page.name == 'comm') {
		$.getScript("js/comm.js");
	} else if (page.name == 'spin') {
		$.getScript("js/winwheel.min.js?2");
    	setTimeout(function(){ $.getScript("js/spin2.js?3"); }, 200);
	} else if (page.name == 'crack') {
		$.getScript("js/crack.js");
	} else if (page.name == 'daily') {
		$.getScript("js/daily.php");
	} else if (page.name == 'tower') {
		$.getScript("js/tower.js");
	} else if (page.name == 'gallery') {
		$.getScript("js/gallery.js");
	} else if (page.name == 'mbshop') {
		$.getScript("js/mbshop.js");
	} else if (page.name == 'chatalerts') {
		$.getScript("js/chatalerts.js");
	} else if (page.name == 'exchange') {
		$.getScript("js/exchange.js");
	} else if (page.name == 'cardshop') {
		$.getScript("js/cardshop.js");
	} else if (page.name == 'steelworks') {
		$.getScript("js/steelworks.js");
	} else if (page.name == 'tickets') {
		$.getScript("js/tickets.js");
	} else if (page.name == 'craftworks') {
		$.getScript("js/craftworks.js");
	} else if (page.name == 'rfc') {
		$.getScript("js/rfc.js");
	} else if (page.name == 'rfcranks') {
		$.getScript("js/rfcranks.js");
	} else if (page.name == 'soap') {
		$.getScript("js/soap.js");
	} else if (page.name == 'eventshop') {
		$.getScript("js/eventshop.js");
	} else if (page.name == 'schoolhouse') {
		$.getScript("js/schoolhouse.js");
	} else if (page.name == 'quiz') {
		$.getScript("js/quiz.js");
	} else if (page.name == 'progress') {
		$.getScript("js/progress.js");
		setTimeout(function(){ $.getScript("js/confetti.js"); }, 200);
	} else if (page.name == 'rewards') {
		$.getScript("js/rewards.js");
	} else if (page.name == 'kitchen') {
		$.getScript("js/kitchen.js");
	} else if (page.name == 'oven') {
		$.getScript("js/oven.js");
	} else if (page.name == 'npclevels') {
		$.getScript("js/npclevels.js");
	} else if (page.name == 'edituser') {
		$.getScript("js/edituser.js");
	} else if (page.name == 'story') {
		$.getScript("js/story.js");
	} else if (page.name == 'editstory') {
		$.getScript("js/editstory.js");
	} else if (page.name == 'poll') {
		$.getScript("js/poll.js");
	} else if (page.name == 'admdb') {
		$.getScript("js/admdb.js");
	} else if (page.name == 'about') {
		$.getScript("js/about.js");
	} else if (page.name == 'delaccount') {
		$.getScript("js/delaccount.js");
	} else if (page.name == 'templeitem') {
		$.getScript("js/templeitem.js");
	} else if (page.name == 'testui') {
		$.getScript("js/testui.js");
	} else if (page.name == 'everything') {
		$.getScript("js/everything.js");
	} else if (page.name == 'bmerc') {
		$.getScript("js/bmerc.js");
	} else if (page.name == 'town') {
		$.getScript("js/town.js");
	} else if (page.name == 'townhall') {
		$.getScript("js/townhall.js");
	} else if (page.name == 'mining') {
		$.getScript("js/mining.js");
	} else if (page.name == 'mine') {
		$.getScript("js/mine.js");
	} else if (page.name == 'ICE-Machine') {
		$.getScript("js/event_december.js");
	} else if (page.name == 'sleep') {
		$.getScript("js/sleep.js");
		setTimeout(function(){ $.getScript("js/confetti.js"); }, 200);
	} else if (page.name == 'Pinata') {
		$.getScript("js/event_pinata.js");
	} else if (page.name == 'Bottle-Rocket-Brawl') {
		$.getScript("js/event_brb.js");
	} else if (page.name == 'Snowball-Fight') {
		$.getScript("js/event_brb.js");
	} else if (page.name == 'popwlog') {
		$.getScript("js/popwlog.js");
	} else if (page.name == 'wikidelete'){
		$.getScript("js/wikidelete.js");
	} else if (page.name == 'friends'){
		$.getScript("js/friends.js");
	} else if (page.name == 'Event-Calendar'){
		$.getScript("js/event_calendar.php");
	} else if (page.name == 'Edit-Event' || page.name == 'Add-Event'){
		$.getScript("js/edit_event.php");
	} else if (page.name == 'Borgen-s-Treasure-Hut'){
		$.getScript("js/borgenstreasurehut.js");
		setTimeout(function(){ $.getScript("js/confetti.js"); }, 200);
	} else if (page.name == 'grapejuicevat'){
		$.getScript("js/grapejuicevat.js");
	} else if (page.name == 'logs'){
		$.getScript("js/logs.js");
	}

	scrollToQueryString();
	// track
  // ---

	//$("#actions").slideDown("fast");

});

function scrollToQueryString(){
	const hash = window.location.hash;

    const queryStringStartIndex = hash.indexOf('?');

    let targetId = null;

    if (queryStringStartIndex !== -1) {
        const hashQueryString = hash.substring(queryStringStartIndex + 1);

        const hashParams = new URLSearchParams(hashQueryString);
        const scrollTo = hashParams.get('scrollTo');
        if ($('#'+scrollTo).length > 0) {
            $('.page-content').animate({scrollTop:$("#"+scrollTo).offset().top - 50}, 1000);
        }
    }
}
function getRandomizer(bottom, top) {
    return Math.floor( Math.random() * ( 1 + top - bottom ) ) + bottom;
}

function startBgMusic() {
	//bgm = document.getElementById("bg");

	var bgdiv = document.getElementById("bgm");

	if (bgdiv !== null) {
		var bgm = new Audio('mp3/bg.mp3');

		if (bgm != null) {
			bgm.loop=true;
			bgm.volume=0.05;
			bgm.play();
		}
	}
}

function playSound(obj) {
	snd = document.getElementById(obj);
	if (snd != null) snd.play();
}

// always need this
$.getScript("js/index.js");

$$(".mainlink").click(function() {
	window.location = "index.php";
});

$$(".hideshsaleannouncement").click(function() {
  myApp.showIndicator();
  $.ajax({
	url: "worker.php?go=hideshsaleannouncement",
	  method: "POST"
  })
  .done(function(data) {
	  window.location = "index.php";
   });
});

$$(".hidehomeannouncement").click(function() {
  myApp.showIndicator();
  $.ajax({
	url: "worker.php?go=hidehomeannouncement",
	  method: "POST"
  })
  .done(function(data) {
	  window.location = "index.php";
   });
});

$$(".hidedykrefannouncement").click(function() {
  myApp.showIndicator();
  $.ajax({
	url: "worker.php?go=hidedykrefannouncement",
	  method: "POST"
  })
  .done(function(data) {
	  window.location = "index.php";
   });
});

$$(".hidestarterpackannouncement").click(function() {
  myApp.showIndicator();
  $.ajax({
	url: "worker.php?go=hidestarterpackannouncement",
	  method: "POST"
  })
  .done(function(data) {
	  window.location = "index.php";
   });
});

var is_beta = $('#is_beta').html();

// ios/android crop notif call
function cropNotification(crop, seconds) {
	if (seconds > 0) {

		// ios
		try {
			window.webkit.messageHandlers.usernameCallback.postMessage("present-notif-crop-"+crop+"|"+seconds);
		} catch(err) {

		}

		// android
		try {
			//console.log('try android notification');
			androidjsinterface.callbackAndroid("present-notif-crop-"+crop+"|"+seconds);
		} catch(err) {

		}
	}
}

// ios/android notif cancel
function cancelCropNotifications() {
	// ios
	try {
		window.webkit.messageHandlers.usernameCallback.postMessage("cancel-notif-crops-ALL");
	} catch(err) {

	}

	// android
	try {
		//console.log('try android cancel notification');
		androidjsinterface.callbackAndroid("cancel-notif-crops-ALL");
	} catch(err) {

	}
}

// ios notif call
function mealNotification(meal, seconds) {
	if (seconds > 0) {
		try {
			window.webkit.messageHandlers.usernameCallback.postMessage("present-notif-meal-"+meal+"|"+seconds);
		} catch(err) {

		}
	}
}

// ios notif cancel
function cancelMealNotifications() {
	try {
		window.webkit.messageHandlers.usernameCallback.postMessage("cancel-notif-meals-ALL");
	} catch(err) {

	}
}

// testing
$$(".testbtnaln").click(function() {
	try {
		androidjsinterface.callbackAndroid("-testLN-");
  	  } catch(err) {
	  //console.log('Cannot reach native code');
	}
});

// ------------------------------------------ //

// this version is used by ios when it changes theme
// it will check the user setting for theme sync
function setDarkMode() {
	var dark_mode = $('#dark_mode').html();
	var themelightdarksync = $('#themelightdarksync').html();
	if (themelightdarksync == 1 && dark_mode == 0) {
		$.ajax({
			url: "worker.php?go=setdarkmode",
	  		method: "POST"
  		})
  		.done(function(data) {
	  		window.location = "index.php";
   		});
	}
}

// this version is used by ios when it changes theme
// it will check the user setting for theme sync
function setLightMode() {
	var dark_mode = $('#dark_mode').html();
	var themelightdarksync = $('#themelightdarksync').html();
	if (themelightdarksync == 1 && dark_mode == 1) {
		$.ajax({
			url: "worker.php?go=setlightmode",
			method: "POST"
		})
		.done(function(data) {
			window.location = "index.php";
		});
	}
}

// this is used by the button at the bottom of Home
$$(".godark").click(function() {
  myApp.showIndicator();
  	$.ajax({
		url: "worker.php?go=setdarkmode",
		method: "POST"
	})
	.done(function(data) {
		window.location = "index.php";
	});
});

// this is used by the button at the bottom of Home
$$(".golight").click(function() {
  myApp.showIndicator();
  $.ajax({
	  url: "worker.php?go=setlightmode",
		method: "POST"
	})
	.done(function(data) {
		window.location = "index.php";
	});
});

// ------------------------------------------ //

$$('.panel-right').on('open', function () {
    doCWFC("chatlastcheck", "");
    $("#openchatbtn").removeClass("button-highlight");
    $("#openchatbtn").hide();
});

$$('.panel-right').on('close', function () {
	doCWFC("chatlastcheck", "");
    $("#openchatbtn").removeClass("button-highlight");
    $("#openchatbtn").show();
});


function scrollTo(target) {
	$('.page-content').animate({
        scrollTop: $("#"+target).offset().top
    }, 500);
}

function scrollToDiv(div) {
	$('.page-content').animate({scrollTop:$("#"+div).offset().top - 100}, 500);
}

// chat
$('#chat_txt_mobile').keypress(function(event) {
    if (event.keyCode == 13) {

       text = $(this).val();
       room = $("#chatroom_mobile").val();

       $('#chat_txt_mobile').val("");
	   $('#chat_txt_mobile').focus();

	   $.ajax({
	    	url: "worker.php?go=addchat&text="+encodeURIComponent(text)+"&room="+encodeURIComponent(room),
			method: "POST"
	    })
		.done(function(data) {
			$("#openchatbtn").removeClass("button-highlight");
			getChatD();
	  	});

    }
});

$('#chat_txt_desktop').keypress(function(event) {
    if (event.keyCode == 13) {

       text = $(this).val();
       room = $("#chatroom_desktop").val();

       //console.log(room)

       $('#chat_txt_desktop').val("");
	   $('#chat_txt_desktop').focus();

	   $.ajax({
	    	url: "worker.php?go=addchat&text="+encodeURIComponent(text)+"&room="+encodeURIComponent(room),
			method: "POST"
	    })
		.done(function(data) {
			getChatD();
	  	});

    }
});

$('.cclink').click(function() {
  var room = $( this ).data('channel');

  if (room == "custom") {
		// ask them
		myApp.prompt('Enter a channel name', 'Custom Chat',
	      function (value) {

		      var room = value.trim();
		      //console.log(room);
		      if (room) {
		        $("#chatroom_desktop").val(room);
				    $("#chatroom_mobile").val(room);
            $(".chatroom").val(room);
				    getChatD();

            $('.cclink').removeClass('cclinkselected');
            $('.cccustom').addClass('cclinkselected');

			    } else {
				    $("#chatroom_desktop").val("global");
				    $("#chatroom_mobile").val("global");
            $(".chatroom").val("global");
				    getChatD();

            $('.cclink').removeClass('cclinkselected');
            $('.ccglobal').addClass('cclinkselected');
			    }
	      },
	      function (value) {
	        // cancel
	        $("#chatroom_desktop").val("global");
			    $("#chatroom_mobile").val("global");
          $(".chatroom").val("global");
			    getChatD();

          $('.cclink').removeClass('cclinkselected');
          $('.ccglobal').addClass('cclinkselected');
	      }
		);
	} else {

    // synch
    $("#chatroom_desktop").val(room);
    $("#chatroom_mobile").val(room);
    $(".chatroom").val(room);

    $('.cclink').removeClass('cclinkselected');
    $(this).addClass('cclinkselected');

  }

  getChatD();
});

// old select
$('.chatroom').change(function(e) {
	var room = $( this ).val();

	if (room == "custom") {
		// ask them
		myApp.prompt('Enter a channel name', 'Custom Chat',
	      function (value) {

		      var room = value.trim();
		      //console.log(room);
		      if (room) {
		        $('.chatroom').append('<option val="'+value+'" style="color: white; background-color: black">'+value+'</option>');
		        $("#chatroom_desktop").val(value);
				$("#chatroom_mobile").val(value);
				getChatD();
			  } else {
				$("#chatroom_desktop").val("global");
				$("#chatroom_mobile").val("global");
				getChatD();
			  }
	      },
	      function (value) {
	        // cancel
	        $("#chatroom_desktop").val("global");
			    $("#chatroom_mobile").val("global");
			    getChatD();
	      }
		);
	}

	// synch
	$("#chatroom_desktop").val(room);
	$("#chatroom_mobile").val(room);

	getChatD();
});

function claimChat(id) {
	$.ajax({
		url: "worker.php?go=claimchat&id="+id,
		method: "POST"
	})
	.done(function(data) {
		getChat();
	});
}

function setChatRoom(room) {


  if (room == "staff") {
    $('.cclink').removeClass('cclinkselected');
    $('.ccstaff').addClass('cclinkselected');
  }

	// change them
	$("#chatroom_desktop").val(room);
	$("#chatroom_mobile").val(room);
	getChatD();

	//console.log("room is now "+room);
}

function getChatD() {
	setTimeout(function() { getChat() }, 25);
}

function checkAllReady() {
	$('.ready').each(function() {
		var id = $(this).data('id');
		getReadyCount(id);
	});
}

function getReadyCount(id) {
	var randomnumber=Math.floor(Math.random()*500000);
	$('.ready'+id).load('worker.php?cachebuster='+randomnumber+'&go=readycount&id='+id, function() {
		//console.log(id);
	});
}

function getChat() {
	var randomnumber=Math.floor(Math.random()*500000);

	room = $(".chatroom").val();
  $('.cclink').removeClass('cclinkselected');
  $('.cc'+room).addClass('cclinkselected');

	if($("#chatzoneDesktop").is(":visible")){
	    $('#chatzoneDesktop').load('worker.php?cachebuster='+randomnumber+'&go=getchat&room='+encodeURIComponent(room), function() {
	    linkCQD();
		});
	} else {
		$('#chatzoneMobile').load('worker.php?cachebuster='+randomnumber+'&go=getchat&room='+encodeURIComponent(room), function() {
      linkCQM();
		});
	}
}

function linkCQD() {
	$('.cq').click(function() {
		var un = $(this).data('username');
		$("#chat_txt_desktop").val("@"+un+": ");
		$("#chat_txt_desktop").focus();
		//console.log(un);
	});
}

function linkCQM() {
	$('.cq').click(function() {
		var un = $(this).data('username');
		$("#chat_txt_mobile").val("@"+un+": ");
		$("#chat_txt_mobile").focus();
		//console.log(un);
	});
}

function checkChat() {

	room = $(".chatroom").val();

	$.ajax({
    	url: "worker.php?go=newchatscount&room="+encodeURIComponent(room),
		method: "POST"
    })
	.done(function(data) {
    	if (data != "0") {
	    	$("#openchatbtn").addClass("button-highlight");
    	}
  	});

	  gtag('event', 'check_chat', {
		  "page_title": room,
	  });
}


function delChat(id) {
	$.ajax({
    	url: "worker.php?go=delchat&id="+id,
		method: "POST"
    })
	.done(function(data) {
    	getChatD();
  	});
}

function undelChat(id) {
	$.ajax({
    	url: "worker.php?go=undelchat&id="+id,
		method: "POST"
    })
	.done(function(data) {
    	getChatD();
  	});
}

function flagChat(id) {

  method = "flagchat";
  if (id > 0) {

		var buttons = [
			{
				text: 'Alert staff about this chat message?',
				label: true
			},
			{
				text: 'Yes',
				onClick: function () {

					$.ajax({
						url: "worker.php?go="+method+"&id="+id,
						  method: "POST"
					})
					.done(function(data) {

						//console.log('success', data);

						switch(data) {

							case "success":

									myApp.alert("Staff has been alerted!", 'Success!');

								break;
						}

					  });

				}
			},
			{
				text: 'Cancel',
				color: 'red',
				onClick: function () {

				}
			},
		];
		myApp.actions(buttons);
	}

}


function getStats() {
	var randomnumber=Math.floor(Math.random()*500000);

	$('#statszone').load('worker.php?cachebuster='+randomnumber+'&go=getstats', function() {

	});
}

function doCWFC(content, options) {

	var randomnumber=Math.floor(Math.random()*500000);

	$.ajax({
    	url: "worker.php?go="+content+""+options,
		method: "POST"
    })
	.done(function(data) {
    	// console.log('success', data)
    	//return data;
  	});

	//return "";
}

function checkForAlerts() {
	$.ajax({
    	url: "worker.php?go=alerts",
		method: "POST"
    })
	.done(function(data) {
    	if (data != "none") {
	    	alertUser(data);
    	}
  	});
}

function alertUser(text) {

	myApp.addNotification({
        title: 'FARM RPG',
        message: text,
        onClose: function () {
            //myApp.alert('Notification closed');
        }
    });
}

function refreshThisAndPreviousPage(){
	mainView.router.refreshPreviousPage();
	mainView.router.refreshPage();
}

var myPhotoBrowserPopupDark = myApp.photoBrowser({
    photos : [
        'https://game.destinyrpg.com/img/screen1.jpg',
        'https://game.destinyrpg.com/img/screen2.jpg',
        'https://game.destinyrpg.com/img/screen3.jpg',
        'https://game.destinyrpg.com/img/screen4.jpg',
        'https://game.destinyrpg.com/img/screen5.jpg'
    ],
    theme: 'light',
    type: 'standalone'
});
$$('.pb-popup-dark-desktop').on('click', function () {
    myPhotoBrowserPopupDark.open();
});

var myPhotoBrowserPopupDark2 = myApp.photoBrowser({
    photos : [
        'https://farmrpg.com/img/screenshots/00.png',
        'https://farmrpg.com/img/screenshots/01.png',
        'https://farmrpg.com/img/screenshots/02.png',
        'https://farmrpg.com/img/screenshots/03.png',
        'https://farmrpg.com/img/screenshots/04.png',
        'https://farmrpg.com/img/screenshots/05.png',
        'https://farmrpg.com/img/screenshots/06.png'
    ],
    theme: 'light',
    type: 'standalone'
});
$$('.pb-popup-mobile').on('click', function () {
    myPhotoBrowserPopupDark2.open();
});

function sendUsernameToNative(name) {
  //This function will send the name to native.
  try {
    window.webkit.messageHandlers.usernameCallback.postMessage(name);
  } catch(err) {
    //console.log('Cannot reach native code');
  }
}

function sendUserIDToNative(user_id) {
  try {
	window.webkit.messageHandlers.usernameCallback.postMessage("userid-"+user_id);
  } catch(err) {
	//console.log('Cannot reach native code');
  }
}

function sendDMToNative(value) {
  //This function will send the name to native.
  try {
	window.webkit.messageHandlers.usernameCallback.postMessage("dark-mode-"+value);
  } catch(err) {
	//console.log('Cannot reach native code');
  }
}
var dark_mode = $('#dark_mode').html();
sendDMToNative(dark_mode);

var logged_in_username = $('#logged_in_username').html();
sendUsernameToNative(logged_in_username);

var logged_in_userid = $('#logged_in_userid').html();
sendUserIDToNative(logged_in_userid);

function sendMusicToNative(option) {
  //This function will send the name to native.
  try {
    window.webkit.messageHandlers.usernameCallback.postMessage("start-background-music-"+option);
  } catch(err) {
    //console.log("Cannot reach native code / start-background-music-"+option);
  }

  // android
  if (is_beta == 1) {
	  try {
		  //console.log('try android music');
		  androidjsinterface.callbackAndroid("start-background-music-"+option);
	  } catch(err) {

	  }
  }
}

var music_option = $('#music').html();
if (music_option > 0) {
  sendMusicToNative(music_option);
} else {
  sendMusicToNative("off");
}

function toggleAQPpos() {
  if ($('.aqp').css("top") == "27.5px") {
    $('.aqp').css("top","90px");
  } else {
    $('.aqp').css("top","27.5px");
  }
}

var chat_option = $('#chat').html();
if (chat_option > 0) {
  setInterval(checkChat, 70000);
  setInterval(getChat, 40000);
  getChat();
}

setInterval(checkForAlerts, 90000);
setInterval(getStats, 700000);
setInterval(checkAllReady, 70000);
getStats();

function checkSnowToggle() {
	var isSnowing = localStorage.getItem("snowingthm3");
	if (isSnowing == "yes") {
		$('.fasnowon').show();
		$('.fasnowoff').hide();
	} else {
		$('.fasnowon').hide();
		$('.fasnowoff').show();
	}
}

var isSnowing = localStorage.getItem("snowingthm3");
$('.fasnowon').hide();
$('.fasnowoff').hide();
//console.log(isSnowing);
if (localStorage.getItem("snowingthm3") === null) {
  //$('.view-main').snowfall({round : true, minSize: 1, maxSize:3, shadow : true, maxSpeed: 1});
  //isSnowing = true;
}
if (isSnowing == "yes") {
  $('.view-main').snowfall({round : true, minSize: 1, maxSize:3, shadow : true, maxSpeed: 1});
}
checkSnowToggle();

if (navigator.userAgent && typeof screen != 'undefined' && screen.width) {
    var isAndroid12 = navigator.userAgent.includes('Android 12'),
    isOneOfSamsungDevices = navigator.userAgent.includes('SM-');


		if (isAndroid12 && isOneOfSamsungDevices) {
      var content = 'user-scalable=no, width=' + screen.width;
      if (document.querySelector){
        var viewport = document.querySelector('meta[name=viewport]');
        viewport.setAttribute('content', content);
      }else{
        addMeta('viewport', content);
      }
    }
}

$$(".playnowbtn").click(function() {

	method = "playnow";

    $.ajax({
    url: "worker.php?go="+method,
      method: "POST"
    })
    .done(function(data) {
        switch(data) {
          case "regoff":
            myApp.alert('Registration is currently disabled.  Check later.', 'Sorry!');
            break;
           case "success":
              window.location = "index.php";
            break;
        }
     });
});

var cdtimer = setInterval(() => {
	for (const elm of document.querySelectorAll(`[data-countdown-to]`)) {
  	const countdownTo = luxon.DateTime.fromISO(elm.dataset.countdownTo, {zone: "America/Chicago"})
    let delta = countdownTo.diffNow().shiftTo("hours", "minutes", "seconds").normalize()
    if (delta.hours === 0) {
      delta = delta.shiftTo("minutes", "seconds").normalize()
    }
    if (delta.hours === 0 && delta.minutes === 0) {
      delta = delta.shiftTo("seconds").normalize()
    }
    // Round down seconds. Otherwise things like seconds=59.9 shows as 60 and it looks silly.
    delta = delta.set({ seconds: delta.seconds - (delta.seconds % 1) })


    if (delta.toMillis() > 0) {
      elm.innerText = delta.toHuman({ unitDisplay: "short", maximumFractionDigits: 0 })
    } else {
      elm.innerText = "Completed"

      if ($(elm).data('refresh') == 1) {
        setTimeout(function(){
          currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
          mainView.router.refreshPage();
         }, 700);

        $(elm).remove();
      }
    }


  }
}, 800)


function showEffect(img, target, options = {}) {
  var harvest_animations = $('#harvest_animations').html();
  if (options.force || harvest_animations == 1) {
  	const contentArea = (typeof target === 'string' || target instanceof String) ? document.getElementById(target) : target;
  	const rect = contentArea.getBoundingClientRect();
  	const width = rect.width - 100;
  	const height = rect.height;
  	const qty = options.qty || rect.width / 20;
  	for (let i = 0; i < qty; i++) {
		const elm = document.createElement("img");
		elm.setAttribute("class", "harvest-floater");
		if (img.startsWith("/img")) {
			elm.setAttribute("src", img);
		} else {
			elm.setAttribute("src", "/img/"+img+".png");
		}
		elm.addEventListener("animationend", function() {
	  	elm.remove();
		});
		// Roll for location and timing.
		const x = Math.random() * width;
		const y = rect.y + (Math.random() * height);
		const floaterSize = 30 + (Math.random() * 70);
		const duration = Math.random() + 1;
		elm.style.zIndex = "999";
		elm.style.left = `${x}px`;
		elm.style.top = `${y}px`;
		elm.style.animationDuration = `${duration}s`;
		elm.style.width = `${floaterSize}px`;
		elm.style.height = `${floaterSize}px`;
		contentArea.after(elm);
  	}
  }
}

/**
 * POST a request to worker.php.
 * @param {string} action
 * @param {Record<string, string | number | boolean>} params
 */
async function fetchWorker(action, params={}) {
	params.go = action;
	const qs = new URLSearchParams(params).toString();
	let resp = await fetch(`worker.php?${qs}`, {method: 'POST'});
	if (!resp.ok) {
		throw `Error ${resp.status} from worker: ${await resp.text()}`;
	}
	return resp;
}

/**
 * An async-compatible version of myApp.actions().
 * @template T
 * @param {{text: string, label?: boolean, color?: string, onClick?: (() => T)}[]} buttons
 * @returns {Promise<T>}
 */
function actionsAsync(...buttons) {
	return new Promise((resolve, reject) =>
		myApp.actions(buttons.map(button => {
			const originalOnClick = button.onClick || (() => null);
			button.onClick = () => {
				try {
					resolve(originalOnClick());
				} catch (error) {
					reject(error);
				}
			};
			return button;
		}))
	);
}

/**
 * An async-compatbile version of myApp.alert().
 * @param {string} text
 * @param {string} title
 * @returns {Promise<boolean>}
 */
function alertAsync(text, title) {
	return new Promise(resolve =>
		myApp.alert(text, title, () => resolve(true))
	);
}

/**
 * A simple confirmation prompt.
 * @param {string} label
 */
function actionsConfirm(label) {
	return actionsAsync(
		{
			text: label,
			label: true,
		},
		{
			text: 'Yes',
			onClick: () => true,
		},
		{
			text: 'Cancel',
			color: 'red',
			onClick: function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
				return false;
			}
		},
	)
}

const animateCSS = (element, animation, prefix = 'animate__') =>
	// We create a Promise and return it
	new Promise((resolve, reject) => {
	const animationName = `${prefix}${animation}`;
	const node = document.querySelector(element);

	if (node !== null) {
		node.classList.add(`${prefix}animated`, animationName);

		// When the animation ends, we clean the classes and resolve the Promise
		function handleAnimationEnd(event) {
		event.stopPropagation();
		node.classList.remove(`${prefix}animated`, animationName);
		resolve('Animation ended');
		}

		node.addEventListener('animationend', handleAnimationEnd, {once: true});
	}
});


// for use on input fields that need commas, just add class="addcommas" to the input field
$(document).on('input', '.addcommas', function() {
	let originalValue = this.value;
    let caretPos = this.selectionStart;
    let originalBeforeCaret = originalValue.substring(0, caretPos);
    let unformattedBeforeCaret = removeCommas(originalBeforeCaret);
    let unformattedValue = removeCommas(originalValue);
    let formattedValue = addCommas(unformattedValue);
    this.value = formattedValue;

    let newCaretPos = addCommas(unformattedBeforeCaret).length;

    if (formattedValue.length > originalValue.length && formattedValue[newCaretPos -1] === ',')
    {
            newCaretPos = newCaretPos; // Do nothing!
    }

    this.setSelectionRange(newCaretPos, newCaretPos);
});

function addCommas(value) {
  // Remove anything that is not a digit
  let cleanedValue = value.replace(/[^0-9]/g, '');

  // Add commas
  return cleanedValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function removeCommas(formattedValue) {
  return formattedValue.replace(/,/g, '');
}
//Quick meals
$(document).on('click', '.usemealbtn', function() {
	method = $(this).data('method');
    var id = $(this).data('id');
    var amt = 1;
    var name = $(this).data('name');
    var amt_onhand = $(this).data('onhand');
    var description = $(this).data('description');

    console.log(id + ' ' + amt + ' ' + amt_onhand);

    if (id > 0 && amt <= amt_onhand && amt > 0) {
        var buttons = [
        {
            text: 'Use ' + amt + 'x ' + name + '?</br></br>' + description,
            label: true
        },
        {
            text: 'Yes',
            onClick: function () {

                $.ajax(
                    {
                        url: "worker.php?go=" + method + "&id=" + id + "&amt=" + amt + "&count=" + amt,
                        method: "POST"
                       }
                )
                .done(
                    function (data) {
                        switch (data) {
                            case "limit":
                                myApp.alert(
                                    "You have reached your limit on Active Effects.  You can increase this at the Farm Supply in Town.",
                                    'Sorry!',
                                    function () {
                                        // save current scroll before page refresh
                                        currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();

                                        // refreshes both this page and prev page
                                        mainView.router.refreshPage();
                                    }
                                );
                      break;
                            case "error":
                                myApp.alert(
                                    "You can't use this item again right now",
                                    'Sorry!',
                                    function () {
                                        // save current scroll before page refresh
                                        currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();

                                        // refreshes both this page and prev page
                                        mainView.router.refreshPage();
                                    }
                                );
                               break;
                            case "success":
                                // save current scroll before page refresh
								currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();

								// refreshes both this page and prev page
								mainView.router.refreshPage();

								getQuickMeals();
                               break;
							default: <!-- this is the return from using a count based meal -->
								data = JSON.parse(data);
								if (data.error) {
									myApp.alert(
											"You can't use this item again right now",
											'Sorry!',
											function () {
												// save current scroll before page refresh
												currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();

												// refreshes both this page and prev page
												mainView.router.refreshPage();
											}
										);
									} else {
										// save current scroll before page refresh
										currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();

										// refreshes both this page and prev page
										mainView.router.refreshPage();

										getQuickMeals();
									}
							break;
                        } // end switch

                    }
                );

            }
        },
        {
            text: 'Cancel',
            color: 'red',
            onClick: function () {

            }
        },
        ];
        myApp.actions(buttons);
    }

    return false;
}
);

$(document).on('click', '#closemealsbtn', function() {
	myApp.closeModal('.meal-picker');
});

$(document).on('click', '#refresh-quick-meals', function() {
	getQuickMeals();
});

$(document).on('click', '#mealsbtn', function() {
	getQuickMeals();
    myApp.pickerModal('.meal-picker');
  });

  $(document).ready(function() {
	getQuickMeals();
  });

function getQuickMeals() {
	let pagewidth = window.innerWidth;
	myApp.showIndicator();
	var randomnumber=Math.floor(Math.random()*500000);
	$('#meal-picker-content').load('worker.php?cachebuster='+randomnumber+'&go=get_quick_meal_display&pagewidth='+pagewidth+'', function() {
		let activemeals = $("#meal-info").data("active-meals");
		panelheight = Math.ceil($('#meal-picker-content').height()) + 98;
		$(".meal-picker").animate({height: panelheight+"px"}, 500);
		// if(activemeals > 0) {
		//	$("#mealsbtn").addClass("button-highlight");
		//	}else{
		//	$("#mealsbtn").removeClass("button-highlight");
		//}
	});

	myApp.hideIndicator();
}

var holdHomeTimer;
var isHoldingHome;
$("#homebtn").on("touchstart", function() {
//console.log("Button held");
	isHoldingHome = true;
	holdHomeTimer = setTimeout(function() {
		if (isHoldingHome) {
			var buttons = [
				{
					text: 'Achievements',
					onClick: function () {
						mainView.router.loadPage("achievements.php");
					}
				},
				{
					text: 'Game Updates',
					onClick: function () {
						mainView.router.loadPage("about.php");
					}
				},
				{
					text: 'Locksmith',
					onClick: function () {
						mainView.router.loadPage("locksmith.php");
					}
				},
				{
					text: 'Friendship Levels',
					onClick: function () {
						mainView.router.loadPage("npclevels.php");
					}
				},
				{
					text: 'Temple of Reward',
					onClick: function () {
						mainView.router.loadPage("temple.php");
					}
				},
				{
					text: 'Help Needed',
					onClick: function () {
						mainView.router.loadPage("quests.php");
					}
				},
				{
					text: 'Daily Chores',
					onClick: function () {
						mainView.router.loadPage("daily.php");
					}
				},
				{
					text: 'Cancel',
					color: 'red',
					onClick: function () {

					}
				},
			];
			myApp.actions(buttons);
		}
	}, 550);
});

$("#homebtn").on("touchend", function() {
	isHoldingHome = false;
	clearTimeout(holdHomeTimer);
});


// ----------- back and scroll events ----------------- //

// event for new refresh page to set its new scroll
$$(mainView.container).on(
	'page:init',
	function (e) {
		if (currentScroll > 0) {
			$$(mainView.activePage.container).find('.page-content').scrollTop(currentScroll);
			currentScroll = 0;
		}
	}
);

myApp.onPageAfterBack(
	'item',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				var page = $('.page-on-center').data("page");
				if (page != "locksmith") {
					mainView.router.refreshPage();
				}
			},
			350
		);
	}
)

myApp.onPageAfterBack(
	'story',
	function (page) {
		var id = $("#storyid").html();
		setTimeout(
			function () {
				mainView.router.reloadPage("storylaunch.php?id=" + id);
				},
			500
		);
	}
)

myApp.onPageAfterBack(
	'mailbox',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'crack',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'cardshop',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'temple',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'quest',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			600
		);
	}
);

myApp.onPageAfterBack(
	'postoffice',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'coop',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'pasture',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'pigpen',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'storehouse',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'farmhouse',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'pen',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'cellar',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'hab',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'orchard',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'troutfarm',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'vineyard',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'sawmill',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'ironworks',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'steelworks',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'hayfield',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'quarry',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'flourmill',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'feedmill',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'bank',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'pets',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'pet',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

function goToAnimalsTab() {
    var userid = $("#logged_in_userid").html();
    myApp.showTab('#tab4'+userid);
}

myApp.onPageAfterBack(
	'namechicken',
	function (page) {
		setTimeout(
			function () {
				//<!-- if(mainView.activePage.name == 'profile'){
				//	goToAnimalsTab();
				//}else{ -->
					currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
					mainView.router.refreshPage();
				//<!-- } -->
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'namepig',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'namecow',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'namepet',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'nameraptor',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'rfc',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'expedition',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'charter',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'viewcharter',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'daily',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'perks',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'mastery',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'npclevels',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'store',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'soap',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'viewexpedition',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'viewcharter',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'well',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'mbshop',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'mining',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'kitchen',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'oven',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'cookbook',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'changebait',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'wiki',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'area',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'templeitem',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'rewards',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'Edit-Event',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'Add-Event',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'flea',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'supply',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'grapejuicevat',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'location',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);

myApp.onPageAfterBack(
	'locksmith',
	function (page) {
		setTimeout(
			function () {
				currentScroll = $$(mainView.activePage.container).find('.page-content').scrollTop();
				mainView.router.refreshPage();
			},
			350
		);
	}
);
