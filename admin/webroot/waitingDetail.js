// waitingdetails.js
userApp
.controller('waitingDetail', ['$scope', '$rootScope', 'Ajax', '$timeout', '$compile', '$http', '$templateCache', 'creditCardChecker','$interval',
	function($sc, $rs, a, $timeout, $compile, $http, $tc, creditCardChecker,$interval) {
	$tc.removeAll();

	// - declare variable
	$rs.currentReserveBtn = null;
	$sc.isFavoriteTab = false;
	$sc.offset = 0;

	// check lesson start button
	$rs.studentPriorityDelayInterval = function() {
		$interval(function() { studentPriorityDelay(); },5000); // every 5 seconds
	}	

	function studentPriorityDelay(){
		// check teacher_red_lamp_timer_obj
		let teacherIndex = 'teacherLamp'+teacherId;

		if (typeof teacher_red_lamp_timer_obj !== 'undefined' && typeof teacher_red_lamp_timer_obj[teacherIndex] != 'undefined' ) {

			let curDate = new Date(Date.now());
			let teacherDelayDate = new Date(teacher_red_lamp_timer_obj[teacherIndex].time_delay);
			if ( typeof teacher_red_lamp_timer_obj[teacherIndex].lesson_start_btn_delay != 'undefined' && teacher_red_lamp_timer_obj[teacherIndex].lesson_start_btn_delay ) {
				if( curDate > teacherDelayDate ) {
					
					// call request after lesson priority delay
					angular.element($("[ng-controller='waitingDetail']")).scope().callLessonAlertandStartButton(userId, teacherId, counselingFlg);
					console.log("call function -> callLessonAlertandStartButton() in studentPriorityDelay method");
					// set lesson_start_btn_delay to false
					teacher_red_lamp_timer_obj[teacherIndex].color = 'blue';
					teacher_red_lamp_timer_obj[teacherIndex].lesson_start_btn_delay = false;
					teacher_red_lamp_timer_obj[teacherIndex].remark = 'studentPriorityDelay : curDate > teacherDelayDate';
				}
			}
		}
	}

	// display schedule table
	$rs.scheduleTabTimer = false;
	$rs.scheduleTabTimerCounter = 0;
	$rs.scheduleTable = function() {
		// - clear timeout
		clearTimeout($rs.scheduleTabTimer);
		
		// - if max attempts reached -> show alert
		if ($rs.scheduleTabTimerCounter > 3) {
			return console.warn("Failed to load schedule table. Please reload the page.");
		}
		
		// - show spinner
		$('#reserve_table').html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');

		// - do post request
		var obj = {};
		obj.method = 'POST';
		obj.data = {
			teacherId: teacherId,
			counselingFlg: counselingFlg,
			hash16: hash16,
			reservationHideFlg: reservationHideFlg,
			timeDiff: timeDiff,
			hideLimitedPlanReservation : hideLimitedPlanReservation,
			teacherCoin: teacherCoin,
			sapuriCoin: sapuriCoin
		};
		obj.url = '/user/waiting/teacherReserveList'+'?v='+new Date().getTime();
		a.restAction(obj).then(function(res) {
			$('#reserve_table').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
			$rs.updateColor();
			// update user time
			if ($('#teacher_reserve_table').length > 0) {
				var getUserDate = $('#teacher_reserve_table').data('current_user_time');
				if (getUserDate && $('#user_current_time').length > 0) {
					$('#user_current_time').html(getUserDate);
				}
				var getOffset = $('#teacher_reserve_table').data('current_utc_offset');
				if (getOffset && $('#user_current_utc_offset').length > 0) {
					$('#user_current_utc_offset').html(getOffset);
				}

				//-- auto scroll to current time
				if (typeof scrollToCurrentTime != 'undefined' && $.isFunction(scrollToCurrentTime)) {
					scrollToCurrentTime();
				}
			}
		}, function(){
			$rs.scheduleTabTimerCounter++;
			$rs.scheduleTabTimer = setTimeout(function(){
				$rs.scheduleTable();
				
			}, 10000);
		});

	}	

	$rs.showMoreLessonHistory = function(){
		setTimeout(function() {
            $('#trigger_modal_waiting_lesson_history').click();
        }, 300);
	}

	$rs.getAlbum = function(){
		var teacherId = $('#teacherIdInput').val();

		$.ajax({
			url: '/waiting/getAlbum',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$rs.albums = data.albums;
			}
		});
	}

	$rs.getFavCount = function(){
		var teacherId = $('#teacherIdInput').val();
		$rs.favCount = false;
		$rs.isFav = 'fav_disable';
		$.ajax({
			url: '/waiting/getFavCount',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$rs.favCount = data.favCount;console.log(data.isFav);
				$rs.isFav = data.isFav == 1 ? 'fav_enable' : 'fav_disable';console.log($rs.isFav);
			}
		});
	}

	$rs.getLessonHistory = function(){
		var teacherId = $('#teacherIdInput').val();
		$.ajax({
			url: '/waiting/getLessonHistory',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$rs.lessonHistories = data.lessonHistory;
			}
		});
	}

	$rs.getStrengthRating = function(){
		var teacherId = $('#teacherIdInput').val();
		$.ajax({
			url: '/waiting/getStrengthRating',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$rs.strengthItems = data.strengthItems;
			}
		});
	}

	// display favorite schedule table
	$rs.updateFavoriteListFunc = function(angularObjparam) {

		if(typeof ajaxRequestFavoriteSlot !== 'undefined' && ajaxRequestFavoriteSlot !== null ) {
			ajaxRequestFavoriteSlot.abort();
		}

		var favoriteCategoryId = ( typeof angularObjparam.favoriteCategoryId != 'undefined' ) ? angularObjparam.favoriteCategoryId : null;
		var dateSelected = ( typeof angularObjparam.dateSelected != 'undefined' ) ? angularObjparam.dateSelected : null;

		$('.multiple_teachers_schedule_list_wrapper').addClass('teacher_loading');

		// - perform ajax
		ajaxRequestFavoriteSlot = $.ajax({
			url: '/Favorite/getFavOnlyAjax',
			type: 'POST',

			// - set data information
			data: {
				sorting: "status",
				favoriteCategoryId: favoriteCategoryId,
				dateSelected : dateSelected,
				weeklyPlan : 0,
			},

			// - in sucess add teacher list
			success: function(res){ 
				res = $.parseJSON(res);
				// - put dynamic content here
				$('.multiple_teachers_schedule_list_scroll').html($compile(res.html_list)($sc));	
				$sc.offset = res.offset;
			},

			// - what happens on error?
			error: function(){
				// show no teacher on list.
			},

			// - on complete do something!
			complete: function(){
				ajaxRequestFavoriteSlot = null;

				// - destroy and invoke again
				$(".multiple_teachers_schedule_list")
					.sortable({
					items: "li.column",
					handle: ".handle",
					placeholder: "ui-state-highlight",
					scroll: false,
					update : function (event, ui) {
						$(this).children('li.column').each(function (index) {
							if ($(this).attr('data-orderPosition') != (index+1)) {
			 					$(this).attr('data-orderPosition' , (index+1)).addClass('updated');
			 				}
						}); 
					}
				});

			}
		}).done(function(res) {   // **
			res = $.parseJSON(res);

			// disable all slots
			if ( typeof res.disable_all != 'undefined' ) {
				//Campaign
				if ( $("#favList .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				// normal
				if ( $("#favList .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				//-- live
				if ( $("#favList .sub_list_1 a[data-status='available-live']").length > 0 ) {
					$("#favList .sub_list_1 a[data-status='available-live']").attr('data-status','reserve-not-available');
				}
			}

			// disable teacher with 4 reservation slot per day
			if ( typeof res.disabled_teacher_button != 'undefined' ) {
				res.disabled_teacher_button.forEach(function (item, index) {
					// campaign
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").attr('data-status','reserve-not-available'); }
					
					// Normal
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
					
					//-- live
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-live']").length > 0 ) {
						$("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-live']").attr('data-status','reserve-not-available');
					}
					
				});
			}

			if ( typeof res.has_next != 'undefined' && res.has_next == 1 ) {
				$(".btn_more_favorite_schedule_teacher").show();
			} else {
				$(".btn_more_favorite_schedule_teacher").hide();
			}


			$('.multiple_teachers_schedule_list_wrapper').removeClass('teacher_loading');
       });

	}

	$rs.getFavTeachers = function(angularObjparam) {
		var favoriteCategoryId = ( typeof angularObjparam.favoriteCategoryId != 'undefined' ) ? angularObjparam.favoriteCategoryId : null;
		var dateSelected = ( typeof angularObjparam.dateSelected != 'undefined' ) ? angularObjparam.dateSelected : null;

		$('.multiple_teachers_schedule_list_wrapper').addClass('teacher_loading');

		$.ajax({
			url: '/Favorite/getFavTeachers',
			type: 'POST',

			// - set data information
			data: {
				sorting: "status",
				favoriteCategoryId: favoriteCategoryId,
				dateSelected : dateSelected,
				weeklyPlan : 0,
			},

			// - in sucess add teacher list
			success: function(res){ 
				res = $.parseJSON(res);

				// - put dynamic content here
				if(typeof res.html_list != 'undefined') {
					$('.multiple_teachers_schedule_list_scroll').html($compile(res.html_list)($sc));	
				}

				$sc.offset = res.offset;
				// get teacher schedule
				$rs.getFavTeacherSchedule(res.teacherIds, dateSelected);

			},

			// - what happens on error?
			error: function(){
				// show no teacher on list.
			},

			// - on complete do something!
			complete: function(complete){
				ajaxRequestFavoriteSlot = null;

				// - destroy and invoke again
				$(".multiple_teachers_schedule_list")
					.sortable({
					items: "li.column",
					handle: ".handle",
					placeholder: "ui-state-highlight",
					scroll: false,
					update : function (event, ui) {
						$(this).children('li.column').each(function (index) {
							if ($(this).attr('data-orderPosition') != (index+1)) {
			 					$(this).attr('data-orderPosition' , (index+1)).addClass('updated');
			 				}
						}); 
					}
				});

			}
		}).done(function(res) {
			res = $.parseJSON(res);
			
			// disable all slots
			if ( typeof res.disable_all != 'undefined' ) {
				//Campaign
				if ( $("#favList .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				// normal
				if ( $("#favList .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				//-- live
				if ( $("#favList .sub_list_1 a[data-status='available-live']").length > 0 ) {
					$("#favList .sub_list_1 a[data-status='available-live']").attr('data-status','reserve-not-available');
				}
			}

			// disable teacher with 4 reservation slot per day
			if ( typeof res.disabled_teacher_button != 'undefined' ) {
				res.disabled_teacher_button.forEach(function (item, index) {
					// campaign
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").attr('data-status','reserve-not-available'); }
					
					// Normal
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
					
					//-- live
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-live']").length > 0 ) {
						$("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-live']").attr('data-status','reserve-not-available');
					}
					
				});
			}

			if ( typeof res.has_next != 'undefined' && res.has_next == 1 ) {
				$(".btn_more_favorite_schedule_teacher").show();
			} else {
				$(".btn_more_favorite_schedule_teacher").hide();
			}

			$('.multiple_teachers_schedule_list_wrapper').removeClass('teacher_loading');
		});
		
	}

	$rs.getFavTeacherSchedule = function(teacherIds = [], dateSelected) {
		let teacherId = teacherIds.shift();
		
		$.ajax({
			url: '/Favorite/getFavTeacherSchedule',
			type: 'POST',

			// - set data information
			data: {
				sorting: "status",
				dateSelected : dateSelected,
				teacherId: teacherId,
				weeklyPlan: 0
			},

			// - in sucess add teacher list
			success: function(res){ 
				res = $.parseJSON(res);
				
				if(typeof res.html_list != 'undefined') {
					$(`[data-teacherid="${teacherId}"] ul`).append($compile(res.html_list)($sc));
				}

				if(teacherIds.length > 0) {
					$rs.getFavTeacherSchedule(teacherIds, dateSelected);
				}

				if(teacherIds.length < 1) {
					$('.multiple_teachers_schedule_list_wrapper').removeClass('teacher_loading');
				}
				
			},

			// - what happens on error?
			error: function(){
				// show no teacher on list.
			},
		});

	}

	// display favorite schedule table
	$rs.seeMoreFavoriteListFunc = function(angularObjparam) {

		if(typeof ajaxRequestMoreFavoriteSlot !== 'undefined' && ajaxRequestMoreFavoriteSlot !== null ) {
			ajaxRequestMoreFavoriteSlot.abort();
		}

		$('.multiple_teachers_schedule_list_wrapper').addClass('teacher_loading');

		var favoriteCategoryId = $("select.sched_category_select_inlist").val(); 
		var dateSelected = $('.multiple_teachers_schedule_list_header .date_list li a.on').attr("data-date");
		var visibleTeacherCount = $('.multiple_teachers_schedule_list_scroll ul.multiple_teachers_schedule_list li.column').length;
		// - perform ajax
		ajaxRequestMoreFavoriteSlot = $.ajax({
			url: '/Favorite/getFavTeachers',
			type: 'POST',

			// - set data information
			data: {
				sorting: "status",
				favoriteCategoryId: favoriteCategoryId,
				dateSelected : dateSelected,
				weeklyPlan : 0,
				total_teacher_count : visibleTeacherCount,
				offset: $sc.offset,
				loadMore: 1
			},

			// - in sucess add teacher list
			success: function(res){ 
				res = $.parseJSON(res);
				$sc.offset += res.res_count;
				if ( res.html_list ) {
					// - put dynamic content here
					$('.multiple_teachers_schedule_list_scroll ul.multiple_teachers_schedule_list li.column:last-child').after($compile(res.html_list)($sc));	

					// get teacher schedule
					if(res.teacherIds.length > 0) {
						$rs.getFavTeacherSchedule(res.teacherIds, dateSelected);
					}
				} else {
					// - set div wrapper attribute next is false
					$('.multiple_teachers_schedule_list_scroll').attr("next-page","false");
				}
			},

			// - what happens on error?
			error: function(){
				// show no teacher on list.
			},

			// - on complete do something!
			complete: function(){
				ajaxRequestMoreFavoriteSlot = null;

				// - destroy and invoke again
				$(".multiple_teachers_schedule_list")
					.sortable({
					items: "li.column",
					handle: ".handle",
					placeholder: "ui-state-highlight",
					scroll: false,
					update : function (event, ui) {
						$(this).children('li.column').each(function (index) {
							if ($(this).attr('data-orderPosition') != (index+1)) {
			 					$(this).attr('data-orderPosition' , (index+1)).addClass('updated');
			 				}
						}); 
					}
				});

			}
		}).done(function(res) {   // **
			res = $.parseJSON(res);

			// disable all slots
			if ( typeof res.disable_all != 'undefined' ) {
				//Campaign
				if ( $("#favList .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				// normal
				if ( $("#favList .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
			}

			// disable teacher with 4 reservation slot per day
			if ( typeof res.disabled_teacher_button != 'undefined' ) {
				res.disabled_teacher_button.forEach(function (item, index) {
					// campaign
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available-campaign']").attr('data-status','reserve-not-available'); }
					
					// Normal
					if ( $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").length > 0 ) { $("#favList li[data-teacherid='"+item+"'] .sub_list_1 a[data-status='available']").attr('data-status','reserve-not-available'); }
				});
			}

			if ( res.html_list ) {
				// scroll right pagination
				var scrollBoxScope = $(".multiple_teachers_schedule_list_scroll");
				var rightCoordinates = scrollBoxScope.get(0).scrollWidth;
				scrollBoxScope.animate({
					scrollLeft: rightCoordinates
				}, 800);
				
			}

			if ( typeof res.has_next != 'undefined' && res.has_next == 1 ) {
				$(".btn_more_favorite_schedule_teacher").show();
			} else {
				$(".btn_more_favorite_schedule_teacher").hide();
			}

			$('.multiple_teachers_schedule_list_wrapper').removeClass('teacher_loading');
       });

	}

	// favorite
	$sc.fav = function(event) {
		if (!userId) {
			location.reload();
		}
		var target = $(event.target);
		if (target.hasClass('fav_disable')) {						
			var type = 1;
			target.removeClass('fav_disable').addClass('fav_enable');
			$(".fav_enable").css({"background": "#F1890E"});
			var obj = {};
			obj.method = 'POST';
			obj.url = '/user/favorite/favorite';
			obj.data = {type:type,teacher_id:teacherId};
			a.restAction(obj).then(function(res) {
				var count = res.data;
				if (count) {
					$('.cnt_fav').show().html(count);
				} else {
					$('.cnt_fav').hide().html('');
				}
			});
			$('.fav_flash_wrap').fadeIn();
		} else {
			var type = 0;
			$('div#dialog_delete_from_fav a.confirmRemoveFavTeacher').attr({'onclick':'favTurnOff('+ teacherId +')'});
			$('#trigger_modal_delete_from_fav').click();
		}
		
	}
	
	// load more comments
	$sc.loadMoreComments = function(event) {
		var target = $(event.target);
		var page = $sc.reviewPage; // initialize page.
		target.attr('disabled', 'true');
		var obj = {};
		obj.method = 'POST';
		obj.url = '/user/waiting/loadMoreComments';
		obj.data = { page: page, teacherId: teacherId };
		a.restAction(obj).then(function(res) {
			var result = res.data;
			if (result.result == 'ok') {
				$.each(result.data, function(i, val) {
					var html = '<li>';
					html += '<div class="rating_star_wrap v_middle" style="display: inline-block;">';
					html += val.star;
					html += '</div>';
					html += '<div class="review_comment">';
					/*if (val.age != '') {
						html += '<span class="post_user">' + val.age + '歳 ' + val.gender + '</span>';
					}*/
					html += '</div>';
					html += '<span class="datetime">' + val.date + '</span><p class="desc">' + val.user_comment + '</p></li>';
					$('#review_list').append(html);
				});

				$('.btn_review_more').removeAttr('disabled');
				if (!result.lastPage) {
					 $sc.reviewPage = +$sc.reviewPage + 1;
				}else {
					$('.btn_review_more').remove();
				}
			} else {
				console.log('Error retrieving comments.');
			}
		});
	}
	
	// select schedule
	$sc.selectSchedule = function(event) {
		var target = $(event.target);
		
		//dont check credit card if user is not login
		if (target.attr('data-href') == '#dialog_login') {
			$sc.forReservation(target);
			return false;
		}
		/* execute credit card checker */
		var creditCardChecker = angular.element("body[ng-app='userApp']").scope().creditCardChecker;
		creditCardChecker.checkUserCreditCard(function(){
			if (target.hasClass('cantClick')) {
				return false;
			}
			$rs.disableLessonReservationButtons();
			if (target.hasClass('forReservation')) {
				$sc.forReservation(target);
			} else if(target.hasClass('forCancellation')) {
				$sc.forCancellation(target);
			} else {
				return false;
			}
		});
	}

	$sc.liveReservationConfirm = function(event) {
		var target = $(event.target);
		var liveFlg = (typeof target.attr('data-live') != 'undefined' && target.attr('data-live') == 1) ? 1 : 0;

		//- pass data as attribute
		$('#dialog_live_lesson_reserve_confirm .forReservation')
			.attr('id', target.attr('id'))
			.attr('data-href', '#dialog_schedule_reserve')
			.attr('data-date', target.attr('data-date').replace(/\//g,'-'))
			.attr('data-time', target.attr('data-time'))
			.attr('data-date-display', target.attr('data-date-display'))
			.attr('data-time-display', target.attr('data-time-display'))
			.attr('data-is_substitute_teacher', 0) // default 0 - for live slot
			.attr('data-live', liveFlg);

		$timeout(function() {$('#trigger_modal_live_lesson_reserve_confirm').click();},100);
	}

	$(document).on('click', '#modal_overlay', function() {
		$rs.enableLessonReservationButtons();
	});

	var isNotSupportedBrowser = function(){
		var browser = navigator.userAgent;
		var foundIE = browser.match(/(Edg|Edge)/i);
		var found = browser.match(/(Chrome|Firefox)/i);
		
		if (foundIE){
			return false;
		} else if (!found) {
			return true;
		}

		return false;
	}

	// - show cancellation alert
	$rs.showCancellationAlert = function(event) {
		//check if teacher is hide by student
		if (
			typeof isHide != 'undefined'
			&& isHide == true
		) {
			$('#trigger_dialog_schedule_reserve_duplicate_fail').click();
			return false;
		}
		// - reset on click
		$rs.currentReserveBtn = null;

		//check creditCard
		creditCardChecker.checkUserCreditCard(function(){
			if ($(event.target).attr('data-href') == '#dialog_schedule_cancel' || $(event.target).hasClass('not_available') || $(event.target).attr('data-status') == 'reserve-not-available' ) {
				$rs.checkReservationAction(event);
			} else {
				$rs.currentReserveBtn = event;
				$('#dialog_reserve_cancel_rate_alert .btn_green.close_modal').data('reservebtn', event);

				// NJ-373 : fix - show reserved cancel rate
				var this_reserved = $(event.target).attr('data-this-reserved');
				var this_cancellation_rate = $(event.target).attr('data-this-cancelled-rate');
				var last_reserved = $(event.target).attr('data-last-reserved');
				var last_cancellation_rate = $(event.target).attr('data-last-cancelled-rate');
				$("#this_month_reserved_con").text(this_reserved);
				$("#this_month_cancellation_rate_con").text(this_cancellation_rate);
				$("#last_month_reserved_con").text(last_reserved);
				$("#last_month_cancellation_rate_con").text(last_cancellation_rate);
				
				$('#trigger_modal_reserve_cancel_rate_alert').click();
			}
		});
	}

	$rs.proceedAfterCancellationAlert = function(event) {
		var data = $rs.currentReserveBtn;
		setTimeout(function() {
			$rs.checkReservationAction(data);
		}, 300);
	}

	$rs.doubleBookingAction = function(event) {
		$("#trigger_modal_double_booking").click();
	}

	//validate action for reservation add or cancel
	$rs.checkReservationAction = function(event) {

		if (checkingReservation) {
			return false;
		}
		if (isNotSupportedBrowser()) {
			return false;
		}
		checkingReservation = true;
		var target = $(event.target);
		var schedId = target.attr('id');
		var lessonDate = target.attr('data-date-display');
		var lessonTime = target.attr('data-time-display');
		var action = '';
		var substituteTeacher = 0;
		
		if ( target.hasClass('disabled') ) {
			checkingReservation = false;
			return false;
		}

		// NC-7932: Teacher favorite schedule
		if ( 
			typeof target.attr('data-teacherId') !== "undefined" &&
			typeof target.attr('data-teacherImage') !== "undefined" &&
			typeof target.attr('data-teacherJpName') !== "undefined" &&
			typeof target.attr('data-teacherCoin') !== "undefined" &&
			typeof target.attr('data-teacherName') !== "undefined"
		) {
			teacherId = target.attr('data-teacherId');
			teacherPhoto = target.attr('data-teacherImage');
			teacherName = target.attr('data-teacherName');
			teacherJapaneseName = target.attr('data-teacherJpName');
			teacherCoin = target.attr('data-teacherCoin');
			teacherCallanDiscount = target.attr('data-teacherCallanDiscount');
			counselingFlg = 0;

			$('#teacherIdInput').val(teacherId);
			$('#teacherCoin').val(teacherCoin);
			$('#teacherCallanDiscount').val(teacherCallanDiscount);

		}
		//NJ-10847 Set sapuri coin value
		if (typeof target.attr('data-sapuriCoin') !== "undefined") {
			sapuriCoin = target.attr('data-sapuriCoin');
			$('#sapuriCoin').val(sapuriCoin);
		}
		//check if not login
		if (target.attr('data-href') == '#dialog_login') {
			$sc.forReservation(target);
			checkingReservation = false;
			return false;
		}

		//- live reservation confirm
		if (target.attr('data-href') == '#dialog_schedule_reserve_confirm_live') {
			if ( target.attr('data-status') != 'reserve-not-available' ) {
				//append teacher image into modal
				$('#modal_live_rsv_tchr_img').attr('src', teacherPhoto);
				$sc.liveReservationConfirm(event);
				checkingReservation = false;
				return false;
			} else {
				//-- overwrite action
				target.attr('data-href', '#dialog_schedule_reserve');
			}
		}

		//get action add or cancel
		if (target.attr('data-href') == '#dialog_schedule_reserve') {
			action = 'add';
		} else if (target.attr('data-href') == '#dialog_schedule_cancel') {
			action = 'cancel';
			substituteTeacher = target.attr('data-is_substitute_teacher');
		} else {
			console.warn('No target selected.');
			return false;
		}

		var obj = {};
		
		let isLessonRequestType = typeof target.attr('data-lesson-request') != 'undefined' ? parseInt(target.attr('data-lesson-request')) : 0;
		let lessonRequestAccepted = typeof target.attr('data-lesson-request-accepted') != 'undefined' ? parseInt(target.attr('data-lesson-request-accepted')) : 0;
		let lessonRequestToOtherTeacher = typeof target.attr('data-other-teacher-request') != 'undefined' ? parseInt(target.attr('data-other-teacher-request')) : 0;
		//-- prompt modal if slots was already requested to another teacher
		if ( lessonRequestToOtherTeacher == 1 ) {
			checkingReservation = false;
			$("#trigger_modal_current_reserve_request_other_teacher").click();
			return;
		}

		obj.method = 'POST';
		obj.data = {
				teacherId : teacherId,
				action : action,
				lessonDate: lessonDate,
				lessonTime: lessonTime,
				substituteTeacher: substituteTeacher,
				lesson_request: isLessonRequestType,
				lesson_request_accepted: lessonRequestAccepted
			};
		obj.url = '/user/waiting/limitwarning';
		a.restAction(obj).then(function(res) {
			var result = res.data;
			if (result.status == 'NG') {
				console.warn('Something wrong in reservation rule checker.');
				return false;
			}
			//perform action from result
			switch (result.content) {
				case 1 :
					// $("#dialog_reservation_cancel_notice ul li a#reservation_modal").attr('data-schedule-id', schedId).click();
					//warning 4th reservation
					//NJ-28277 $("#trigger_modal_reservation_cancel_notice").click();
					break;
				case 2 : 
					if ( isLessonRequestType == 1 ) {
						//-- 30 lesson reservation + lesson request
						$("#trigger_modal_reserve_request_limit_30").click();
					} else {
						//-- 20 lesson reservation only
						$("#trigger_modal_reservation_limit").click();
					}					
					break;
				case 3 :
					//4 reservation only for each teacher
					if ( isLessonRequestType == 1 ) {
						let totalTeacherLessonRequest = typeof result.total_teacher_lesson_request != 'undefined' ? result.total_teacher_lesson_request : 0;
						let errorMesageText = $('#dialog_reserve_request_limit_4 .lesson_request_error').html();
						$('#dialog_reserve_request_limit_4 .lesson_request_error').html(errorMesageText.replace(/%s/g, totalTeacherLessonRequest));
						$("#trigger_modal_reserve_request_limit_4").click();
					} else {
						$("#trigger_modal_reservation_limit_teacher").click();
					}
					break;
				case 4 : 
					//cancellation limit
					$("#trigger_modal_reservation_cancel_limit").click();
					break;
				case 5 :
					// complimentary plan
					$('#trigger_modal_require_plan_changes-reservation').click();
					break;
				case 6 : // corporate light max lesson limit
					$('#trigger_dialog_schedule_reserve_corp_light_err2_modal').click();
					break;
				case 7 : 
					//-- max lesson request error
					$("#trigger_modal_reserve_request_limit_10").click();
					break;
				case 8 :
					//-- eligible for lesson request
					if ( typeof result.total_lesson_request != 'undefined' ) {
						let labelChange = $('#dialog_current_reserve_request h3').attr('data-text');
						$('#dialog_current_reserve_request h3').text(labelChange.replace("%s", result.total_lesson_request));
					}
					$('#dialog_current_reserve_request #proceedLessonRequest').attr('data-schedule-id', schedId);
					$("#trigger_modal_current_reserve_request").click();
					break;
				case 9 :
					//-- modal for reservation cancelled 
					$('#dialog_slot_reservation_failed .t_center').text(result.errorMsg);
					$("#trigger_dialog_slot_reservation_failed").click();
					break;

				case 10: 
					// -- normal light plan max lesson limit 
					$("#trigger_modal_reservation_limit_lite").click();
					break;
				default:
					//use default
					$('#dialog_schedule_cancel #cancelledCount').html(result.cancelCount);
					$sc.selectSchedule(event);
					break;
			} 
			checkingReservation = false;
		});	
	}

	//catch continue reservation
	$(document).on('click', "#dialog_reservation_cancel_notice ul li a#reservation_modal", function() {
		var scheduleTargetId = $(this).attr('data-schedule-id');
		var target = $('#' + scheduleTargetId);
		$sc.forReservation(target);
	});

	// proceed to lesson request
	$(document).on('click', "#dialog_current_reserve_request #proceedLessonRequest", function() {
		var scheduleTargetId = $(this).attr('data-schedule-id');
		var target = $('#' + scheduleTargetId);
		$sc.forReservation(target);
		console.log(target, scheduleTargetId);

	});
		
	// pop up dialog to let user login or register 
	$sc.loginDialog = function() {
		$('#dialog_login > h3').text(loginDialog_header_message);
		$('#dialog_login > p').text(loginDialog_message);
		$('#dialog_login > div > ul').html(`
			<li><a class="btn_style btn_green" href="/${window.localizeDir}/login">${loginDialog_login_btn}</a></li>
			<li><a class="btn_style btn_orange" href="/${window.localizeDir}/register">${loginDialog_register_btn}</a></li>
		`);
		$('#trigger_dialog_login').click();
	}

	// student choose a reservation
	$sc.forReservation = function(target) {
		var targetId = target.attr('id');
		var timeDiff = target.parents('#teacher_reserve_table').attr('data-time_diff');
		var liveFlg = typeof target.attr('data-live') != 'undefined' ? target.attr('data-live') : 0;
		let lessonRequestFlg = typeof target.attr('data-lesson-request') != 'undefined' ? target.attr('data-lesson-request') : 0;

		$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
		$('#dialog_schedule_reserve .textbook_option').html('<p style="text-align:center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		$rs.enableLessonReservationButtons();		
		switch(target.attr('data-href')) {
			case '#dialog_login':
				$('#dialog_login > h3').text(loginDialog_header_message);
				$('#dialog_login > p').text(loginDialog_message);
				$('#dialog_login > div > ul').html(`
					<li><a class="btn_style btn_green" href="/${window.localizeDir}/login">${loginDialog_login_btn}</a></li>
					<li><a class="btn_style btn_orange" href="/${window.localizeDir}/register">${loginDialog_register_btn}</a></li>
				`);
				$('#trigger_dialog_login').click();
				break;
			case '#dialog_schedule_reserve':
			case '#dialog_schedule_reserve_confirm_live':
				var date = target.attr('data-date') + ' ' + target.attr('data-time');
				var dateDisplay = target.attr('data-date-display') + ' ' + target.attr('data-time-display');
				var dataCallanOption = target.attr('data-callan-option-slot');
				var campaignStatus = target.attr('data-status');
				$('#dialog_schedule_reserve .btnLessonOrReserve').attr('data-status', campaignStatus);
				if (counselingFlg) {
					// reset iframe for modal reservation
					$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
					$('#dialog_schedule_reserve .lesson_settings_charge').hide();

					$sc.initializeCounselingModal();
					var counselDate = target.attr('data-date') + target.parents('tr').find('.day').text() +' ' + target.attr('data-time');
					$('#dialog_counseling_reserve #counselor_name').text(teacherName);
					$('#dialog_counseling_reserve #reserved_time').text(counselDate);
					$('#dialog_counseling_reserve_confirm #con_counselor_name').text(teacherName);
					$('#dialog_counseling_reserve_confirm #con_reserved_time').text(counselDate);
					$('#counsel_confirm').attr('data-date', target.attr('data-date').replace(/\//g,'-')).attr('date-time', date).attr('data-lsid', targetId);
					$('#trigger_modal_counseling_reserve').click();
				} else {
					$sc.checkUserCreditCard(function() {
						// reset iframe for modal reservation
						$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
						$('#dialog_schedule_reserve .lesson_settings_charge').hide();

						// update textbook options flag : lesson_now , reservation
						$sc.updateTextbookOption(liveFlg, 'reservation', function(){});

						$('#img-id').attr("src", teacherPhoto);
						$('#img-id').attr("alt", teacherName);
						$('.name').text(teacherName);
						$('.kana').text(teacherJapaneseName);
						$('.date').text(dateDisplay);
						$('.lesson_settings #chooseReservedSchedule')
							.attr("date-time", date)
							.attr('data-date', target.attr('data-date').replace(/\//g,'-'))
							.attr('data-lsid', targetId)
							.attr('data-time', target.attr('data-time'))
							.attr('data-time_diff', timeDiff)
							.attr('date-time-display', dateDisplay)
							.attr('data-callan-option-slot', dataCallanOption)
							.attr('data-live', liveFlg)
							.attr('data-lesson-request', lessonRequestFlg)
							.attr('data-bookmark-flg', 0);
						$('.reserve_point').text(reservePoint);
						$('.current_coin_int').text($('#header_cnt_coin').text());
						$('#trigger_dialog_schedule_reserve').click();
					});
				}
				break;
				default:
					console.warn('Data href doesn\'n match!');

		}
	}
	
	// student cancel the reservation
	$sc.forCancellation = function(target) {
		var targetId = target.attr('id');
		var data = {
			teacherId : teacherId,
			dateTime: target.data('date').replace(/\//g,'-') + ' ' + target.data('time') + ':00'
		};

		//-- append lesson request flag
		let lessonRequestType = target.data('lesson-request');
		if ( typeof lessonRequestType != 'undefined' && lessonRequestType == "1" ) {
			data['lesson_request'] = lessonRequestType;
		}

		var obj = {};
		obj.method = 'GET';
		obj.url = '/user/waiting/isCanCancel'+'?v='+new Date().getTime();
		obj.params = data;
		var couponFlag = 0;
		a.restAction(obj).then(function(res) {

			var result = res.data;
			if (result.res == '1') {
				location.reload();
			} else {
				var timeDiff = target.parents('#teacher_reserve_table').attr('data-time_diff');
				switch(target.attr('data-href')) {
					case '#dialog_login':
						$('#dialog_login > h3').text(loginDialog_header_message);
						$('#dialog_login > p').text(loginDialog_message);
						$('#dialog_login > div > ul').html(`
							<li><a class="btn_style btn_green" href="/login">${loginDialog_login_btn}</a></li>
							<li><a class="btn_style btn_orange" href="/register">${loginDialog_register_btn}</a></li>
						`);
						$('#trigger_dialog_login').click();
						break;
					case '#dialog_free_schedule_cancel':
						couponFlag = 1;
					case '#dialog_schedule_cancel':

						$('.cr_consumption_coin').text(typeof result.consumption_coin !== 'undefined' ? result.consumption_coin : 0);
						$('.cr_current_coin').text($('#header_cnt_coin').text());

						if (couponFlag == 1) {
							$('#dialog_schedule_cancel #dsc_confirmation_message').hide();
							$('#dialog_schedule_cancel #dscf_confirmation_message').show();
						} else {
							$('#dialog_schedule_cancel #dscf_confirmation_message').hide();
							$('#dialog_schedule_cancel #dsc_confirmation_message').show();
						}
						// not refundable expired coin MC
						if (result.isExpired != "" && result.isSubstitute == 0) {
							$('#dialog_schedule_cancel span.coin_expiration_date').text(result.isExpired);
							$('#dialog_schedule_cancel .cancel_no_coin_return_expire').show();
							$('#dialog_schedule_cancel .normal_cancel').hide();
							$('#dialog_schedule_cancel .cancel_no_coin_return').hide();
						}
						//show text for coin return or Nomral cancel
						else if (result.isRefundable == 1) {
							$('#dialog_schedule_cancel .normal_cancel').show();
							$('#dialog_schedule_cancel .cancel_no_coin_return').hide();
							$('#dialog_schedule_cancel .cancel_no_coin_return_expire').hide();
						}
						else if (result.isRefundable == 0 && result.isExpired == "") {
							$('#dialog_schedule_cancel .cancel_no_coin_return').show();
							$('#dialog_schedule_cancel .cancel_no_coin_return_expire').hide();
						}
						// not refundable
						// else if (result.isRefundable == 0 && result.isSubstitute == 0) {
						// 	$('#dialog_schedule_cancel .cancel_no_coin_return').show();
						// 	$('#dialog_schedule_cancel .cancel_no_coin_return_expire').hide();
						// 	$('#dialog_schedule_cancel .normal_cancel').hide();
						// }
						// normal cancel
						else {
							$('#dialog_schedule_cancel .normal_cancel').show();
							$('#dialog_schedule_cancel .cancel_no_coin_return').hide();
							$('#dialog_schedule_cancel .cancel_no_coin_return_expire').hide();
						}

						if ( typeof data['lesson_request'] != 'undefined' && data['lesson_request'] == 1 ) {
							//-- lesson request type
							let requestLessonTime 	= new Date(result.reservation_data.LessonSchedule.lesson_time);
							let formattedLessonTime = moment(requestLessonTime).format('YYYY/MM/DD HH:mm');
							let teacherImage = $('.teacher_top_area .name_area_cell img.circle_thumb').attr('src');

							$("#dialog_schedule_reserve_request_cancel #img-id").attr("src", teacherImage);
							$("#dialog_schedule_reserve_request_cancel .date").text(formattedLessonTime);
							$("#dialog_schedule_reserve_request_cancel .name").text(result.reservation_data.Teacher.name);
							$("#dialog_schedule_reserve_request_cancel .name-jp").text(result.reservation_data.Teacher.jp_name);
							$("#dialog_schedule_reserve_request_cancel .teacher_name").text(result.reservation_data.Teacher.name);
							$("#dialog_schedule_reserve_request_cancel .category_name").text(result.reservation_data.TextbookCategory.name);
							$("#dialog_schedule_reserve_request_cancel .sub_category_name").text(result.reservation_data.TextbookSubcategory.name);
							$("#dialog_schedule_reserve_request_cancel .chapter_name").text(result.reservation_data.Textbook.name);
							$("#dialog_schedule_reserve_request_cancel a.cancel-lesson-request")
							.attr('data-date', target.attr('data-date'))
							.attr('data-time', target.attr('data-time'))
							.attr('data-lsid', target.attr('id'))
							.attr('coupon-flag', 0)
							.attr('data-time_diff', timeDiff)
							.attr('data-lesson-request', 1)
							.attr('id', 'wCancelReservedSchedule');
							$('#trigger_modal_schedule_reserve_request_cancel').click();

						} else {
							//-- normal reservation type
							var dataDate = target.attr('data-date').replace(/\//g,'/');
							var dataWeek = target.parent('td').parent('tr').children('th').children('span').children('span.day').text();
							var dataTime  = target.attr('data-time');
							var a_dataTime = dataTime.split(':');
							if (a_dataTime[1] == '00') {
								var timeRange = dataTime + '～' + a_dataTime[0] + ':26';
							} else {
								time1 = parseInt(a_dataTime[0]) + 1;
								var timeRange = dataTime + '～' + a_dataTime[0] + ':56';
							}

							//user time display
							var dataDateDisplay = target.attr('data-date-display').replace(/\//g,'/');
							var dataTimeDisplay  = target.attr('data-time-display');
							var a_dataTimeDisplay = dataTimeDisplay.split(':');
							if (a_dataTimeDisplay[1] == '00') {
								var timeRangeDisplay = dataTimeDisplay + '～' + a_dataTimeDisplay[0] + ':26';
							} else {
								time1 = parseInt(a_dataTimeDisplay[0]) + 1;
								var timeRangeDisplay = dataTimeDisplay + '～' + a_dataTimeDisplay[0] + ':56';
							}
							var dateTimeDisplay = dataDateDisplay + dataWeek + ' ' + timeRangeDisplay;
							$('#dialog_schedule_cancel > div > .time').text(dateTimeDisplay);
							$('#dialog_schedule_cancel > div > .name').text(teacherName);
							$('#dialog_schedule_cancel > div.btn_wrap > ul > li > #cancelReservedSchedule').removeAttr('id').attr('id', 'wCancelReservedSchedule');
							$('#wCancelReservedSchedule').attr('data-date', dataDate).attr('data-time', dataTime).attr('data-lsid', targetId).attr('coupon-flag', couponFlag).attr('data-time_diff', timeDiff);
							
							// modal settings
							$rs.reservationCancelModalSettings(result.isSubstitute, result.isNormalSubstitute);
							$rs.setTeacherCancellationModalData(result.reservation_data);

							$('#trigger_dialog_schedule_cancel').click();
						}
						break;
					default:
						return false;
						break;
				}
			}
		});
	}
	
	// initialize counseling modal elements
	$sc.initializeCounselingModal = function() {
		$('.item .msg').parent('div').hide();
		$('#counseling_sheet_item-abroad_detail').hide();
		$('#ub_year').val(0);
		$('#ub_month').val(0);
		$('#ub_day').val(0);
		$('#counseling_sheet_select-occupation').val(0);
		$('#u_school_name').val('');
		$('#u_department_name').val('');
		$('input[name="counseling_sheet_radio_abroad"]').attr('checked',false);
		$('#u_country').val('');
		$('#u_period').val(0);
		$('#u_purpose').val(0);
		$('#u_english_school_career').val(0);
		$('#u_eiken').val(0);
		$('#u_toeic').val(0);
		$('#u_by_when').val(0);
		$('#u_to_do').val('');
		$('#u_lesson_plan').val(0);
		$('#u_consultation').val('');
	} 
	
	$rs.checkUserCreditCard = function(callback) {
		var obj = {};
		obj.method = 'POST';
		obj.url = '/user/api/checkUserCreditCard';
		a.restAction(obj).then(function(res) {
			var result = res.data;
			if (result.error==true) {
				// check if the user is forced to pay
				if (result.content=='force_pay') {
					window.location.href = result.url_redirect;
					return false;
				}
				// check for 30 day trial and user id - if user exists but has yet to use up all of his 30 day trial
				if (result.content=='user_does_not_exist') {
					console.log("user does not exist!");
					return false;
				}
				// check if user auth exists
				if (result.content=='user_auth_error') {
					window.location.reload();
					return false;
				}
				// check if unknown return
				if (result.content=="invalid_return") {
					console.log("the ajax returned an invalid response!");
					return false;
				}
				// check if the user is a free digestion member
				if (result.content=="user_expired") {
					window.location.href = result.url_redirect;
					return false;
				}
			}

			// - get btn status
			var campaignStatus = $('#dialog_schedule_reserve .btnLessonOrReserve').attr('data-status');

			if(campaignStatus == 'available-campaign') {
				$('#dialog_schedule_reserve .btnLessonOrReserve').attr('data-callan-option', 0);
			} else {
				$('#dialog_schedule_reserve .btnLessonOrReserve').attr('data-callan-option', result.useCallanUnliOption);
			}

			
			
			// check if the settlement has failed before
			if (result.fail==1) {
				window.location.href = result.url_redirect;
				return false;
			}
			// if charge_flag is 0
			if (result.charge==0) {
				window.location.href = result.url_redirect;
				return false;
			}
			callback();
		});
	}

	// redirect to login page
	$rs.redirectToLogin = function() {
		location.href = "/user/login/index";
	}
	
	/**
	 * fetch textbooks
	 * @param  String flag     : declares if the textbook to fetched is for lesson_now or reservation
	 * @param  Function callBack : function to be executed after the ajax call
	 * @return callback
	 */
	$sc.updateTextbookOption = function(liveFlg, flag , callBack) { // flag : lesson_now , reservation
		$('#dialog_schedule_reserve .btnLessonOrReserve').attr('disabled', true).addClass('disable');
		$('#dialog_schedule_reserve .btn_wrap').addClass('hide').hide();
		// Coin loading spinner
		$("#dialog_lesson_menu #charge_coin_int").html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');
		$("#dialog_schedule_reserve #charge_coin_int").html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');

		if (typeof $rs.optionDataTextbookGen !== 'undefined') {
			$rs.optionDataTextbookGen = {
				user_id: userId,
				teacher_id: teacherId,
				flag: flag,
				localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : "",
				live_flag: liveFlg,
				connectId: $rs.reservationTextbookConnectId,
				modalId: 'dialog_schedule_reserve'
			}
		}

		if (typeof $rs.modalBtnState !== 'undefined' && typeof $rs.modalBtnState == 'function') {
			$rs.modalBtnState('dialog_schedule_reserve');
		}
		
		$http({
			method: 'POST',
			url: '/user/waiting/getAllTextbookOption/',
			data: {
				user_id: userId,
				teacher_id: teacherId,
				flag: flag,
				localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : "",
				live_flag: liveFlg,
				connectId: $rs.reservationTextbookConnectId,
			},
			beforeSend: function(){
				// if flag is for lesson now
				if (flag == "lesson_now") {
					$('#dialog_lesson_menu #btn_link_chat').addClass('disabled');
				}

				// if flag is for reservation
				if (flag == "reservation") {
					$('#dialog_schedule_reserve .update_schedule_to').addClass('disabled');
					$('#dialog_schedule_reserve .textbook_note').addClass('hide');
					$('#dialog_schedule_reserve').find('#alert_dummy_select').addClass('hide');
				}
			}
		}).then(function(result) {
			var data = result.data;
			var textbookLiveLessonFlg = typeof data.textbook_live_lesson_flg !== "undefined" ? data.textbook_live_lesson_flg : false;
			if (!textbookLiveLessonFlg && (flag == "reservation"  && typeof data.has_reservation_connect_id && data.has_reservation_connect_id)) {
				$('#dialog_schedule_reserve').find('.btnLessonOrReserve').removeClass('disable disabled');
			}

			// check when modal is for lesson now
			if ( flag == "lesson_now" ) {
				$('#dialog_lesson_menu .textbook_option').html($compile(data.option)($sc));
				$('#dialog_lesson_menu .iframe_textbook').attr('src', data.textbook_default);
				$('#dialog_lesson_menu #btn_link_chat').removeClass('disabled');

				// check if there's no selected class category during lesson now
				if (
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_class .selected_item').attr('text-book-category-id') == "0" &&
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_class li.item').length != 0
				) {
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_class li.item:eq(0)').click();
				}

				// check if there's no selected class course during lesson now
				if (
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_course .selected_item').attr('text-book-category-id') == "0" &&
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_course li.item').length != 0
				) {
					$('#dialog_lesson_menu .tb_selector_list .tr_textbook_course li.item:eq(0)').click();
				}
				$("#dialog_lesson_menu .current_coin_int").html($("#header_cnt_coin").html());
			}

			// check when modal is for reservation
			if ( flag == "reservation" ) {
				$('#dialog_schedule_reserve .textbook_option').html($compile(data.option)($sc));
				$('#dialog_schedule_reserve .iframe_textbook').attr('src', data.textbook_default);
				$('#dialog_schedule_reserve .update_schedule_to').removeClass('disabled');

				// check if there's no selected class category during reservation
				if (
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_class .selected_item').attr('text-book-category-id') == "0" &&
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_class li.item').length != 0
				) {
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_class li.item:eq(0)').click();
				}

				// check if there's no selected class course during reservation
				if (
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_course .selected_item').attr('text-book-category-id') == "0" &&
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_course li.item').length != 0
				) {
					$('#dialog_schedule_reserve .tb_selector_list .tr_textbook_course li.item:eq(0)').click();
				}
				
				//NJ-2601
				$rs.userPresetTextbookData = data.user_preset_textbook_data;
				if (typeof data.userPresetDisplayFlg != 'undefined' && data.userPresetDisplayFlg == 0) {
					$('#dialog_schedule_reserve .textbook_note').removeClass('hide');
				}
			}

			// reset disabling
			disableTextbookSelection = false;

			// compute reserve coin
			$rs.computeReserveCoin(data.textbook_type, 'dialog_schedule_reserve');

			// perform callback function
			callBack();
			if ( data.disable_button_flag != "1" && (typeof data.userPresetDisplayFlg != 'undefined' && data.userPresetDisplayFlg == 1)) {
				$('#dialog_schedule_reserve .btnLessonOrReserve').attr('disabled', false).removeClass('disable');
			}

			if (textbookLiveLessonFlg) {
				$('#dialog_schedule_reserve').find('#alert_dummy_select').removeClass('hide');
				$('#dialog_schedule_reserve').find('.btnLessonOrReserve').attr('disabled', true).addClass('disable');
			}
		});
	}
	
	/*----------------------------------------*/
	// detail item show / hide
	/*----------------------------------------*/
	// counseling option ocuppation
	$sc.counselingOccupation = function(value) {
		if(Number(value) == 5){
			$('#counseling_sheet_item-occupation_student').show();
		}else{
			$('#counseling_sheet_item-occupation_student').hide();
		}
	}
	
	// counseling option abroad
	$sc.counselingAbroad = function(value){
		if (Number(value)) {
			$('#counseling_sheet_item-abroad_detail').show();
		} else {
			$('#counseling_sheet_item-abroad_detail').hide();
		}
	}
	
	// validate counseling data
	$sc.validateCounsel = function() {
		errorFlag = false;
		//check user occupation
		if ($('#counseling_sheet_select-occupation').val() == '0') {
			errorFlag = true;
			$('#occupation_error').show();
		} else {
			$('#occupation_error').hide();
			if ($('#counseling_sheet_select-occupation').val() != '5') {
				$('#u_school_name').val('');
				$('#u_department_name').val('');
				$('#u-student-info').hide();
			} else {
				$('#u-student-info').show();
			}
		}
		//check user experience abroad
		if ($('input[name="counseling_sheet_radio_abroad"]:checked').length == 0) {
			errorFlag = true;
			$('#ea_error').show();
		} else {
			$('#ea_error').hide();
			if ($('input[name="counseling_sheet_radio_abroad"]:checked').val() == '0') {
				$('#u_country').val('');
				$('#u_period').val('0');
				$('#u_purpose').val('0');
				$('#u-student-abroad-info').hide();
			} else {
				$('#u-student-abroad-info').show();
			}
		}
		//check user English school career
		if ($('#u_english_school_career').val() == '0') {
			errorFlag = true;
			$('#esc_error').show();
		} else {
			$('#esc_error').hide();
		}
		//check user English school career
		if ($('#u_lesson_plan').val() == '0') {
			errorFlag = true;
			$('#lp_error').show();
		} else {
			$('#lp_error').hide();
		}
		//check user English school career
		var consultation = $('#u_consultation');
		if ($.trim(consultation.val()).length == 0) {
			errorFlag = true;
			$('#consultation_error').show();
		} else {
			$('#consultation_error').hide();
		}

		if (errorFlag == false) {
			var _unselected = '未選択';
			var _blank = '未記入';
			$('#u_con_occupation').text($('#counseling_sheet_select-occupation option:selected').text());
			if ($('#u_school_name').val().length == 0) {
				$('#u_con_school_name').text(_blank);
			} else {
				$('#u_con_school_name').text($('#u_school_name').val());
			}
			if ($('#u_department_name').val().length == 0) {
				$('#u_con_department_name').text(_blank);
			} else {
				$('#u_con_department_name').text($('#u_department_name').val());
			}
			$('#u_con_experience_abroad').text($('input[name="counseling_sheet_radio_abroad"]:checked').parent('li').children('label').text());
			if ($('#u_country').val() == '') {
				$('#u_con_country').text(_blank);
			} else {
				$('#u_con_country').text($('#u_country').val());
			}
			if ($('#u_period').val() == '0') {
				$('#u_con_period').text(_unselected);
			} else {
				$('#u_con_period').text($('#u_period option:selected').text());
			}
			if ($('#u_purpose').val() == '0') {
				$('#u_con_purpose').text(_unselected);
			} else {
				$('#u_con_purpose').text($('#u_purpose option:selected').text());
			}
			$('#u_con_english_school_career').text($('#u_english_school_career option:selected').text());
			if ($('#u_eiken').val() == '0') {
				$('#u_con_eiken').text(_unselected);
			} else {
				$('#u_con_eiken').text($('#u_eiken option:selected').text());
			}
			if ($('#u_toeic').val() == '0') {
				$('#u_con_toeic').text(_unselected);
			} else {
				$('#u_con_toeic').text($('#u_toeic option:selected').text());
			}
			if ($('#u_by_when').val() == '0') {
				$('#u_con_by_when').text(_unselected);
			} else {
				$('#u_con_by_when').text($('#u_by_when option:selected').text());
			}
			if ($('#u_to_do').val().length == 0) {
				$('#u_con_to_do').text(_blank);
			} else {
				htmlEntities($('#u_to_do').val(), 'u_con_to_do')
			}
			$('#u_con_lesson_plan').text($('#u_lesson_plan option:selected').text());
			htmlEntities($('#u_consultation').val(), 'u_con_consultation')
			$('#dialog_counseling_reserve .btn_close').click();
			setTimeout(
				function() {
					$('#saveCounselingSchedule').attr('data-date', $('#counsel_confirm').attr('data-date').replace(/\//g,'-')).attr('date-time', $('#counsel_confirm').attr('date-time')).attr('data-lsid', $('#counsel_confirm').attr('data-lsid'));
					$('#trigger_modal_counseling_reserve_confirm').click();
				},
				250
			);
		}
	}
	
	// click counseling reserve edit
	$sc.counselingReserveEdit = function() {
		$timeout(function() { $('#trigger_modal_counseling_reserve').click(); }, 250);
	}
	
	// filter string
	function htmlEntities(val, id) {
		var obj = {};
		obj.method = 'GET';
		obj.url = '/user/waiting/convertString';
		obj.params = {
			_string: val,
			id_name: id
		};
		a.restAction(obj).then(function(res) {
			var a = res.data;
			//apply nl2br
			var res = (a.res + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1<br />$2');
			$('#'+a.idName).html(res);
		});
	}

	
	/*
	<!-- SMS Auth script -->
	//numbersOnly();

	$('#dialog_smsauth_send_sms').click(function() {
		var jsHost = (("https:" == document.location.protocol) ? "https://" : "http://");
		var postAuth = function(url,args){ var xhr = new XMLHttpRequest();xhr.onreadystatechange=function(){if(this.readyState == 4 && this.status == 200){
			if(this.responseText){
				//SMS送信失敗
				console.log("[Response]");console.log(this.responseText);
				if(this.responseText === 'Concurrent verifications to the same number are not allowed'){
					console.log('already sent verifi number ');
					$("#sms_aush .btn_close").click();
					$("#anchor_trigger_modal_dialog_check_number").click();
				}else{
					console.log('wrong format number');
					$("#sms_aush .btn_close").click();
					$("#anchor_trigger_modal_dialog_input_number").click();
				}
			}else{
				//SMS送信成功
				console.log("[Response]");console.log('success!!!!');
				$("#sms_aush .btn_close").click();
				$("#anchor_trigger_modal_dialog_check_number").click();
			}
		}};xhr.open('POST',url);xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');xhr.send(JSON.stringify(args));};

		postAuth(jsHost + '<?php echo $_SERVER["HTTP_HOST"] ?>' + '/api/smsAuth',{"users_api_token":"<?php echo $UserData['User']['api_token']?>","user_id":"<?php echo $UserData['User']['id']?>"});
	});

	$('#check_auth_number').click(function() {
		var jsHost = (("https:" == document.location.protocol) ? "https://" : "http://");
		var postAuth = function(url,args){ var xhr = new XMLHttpRequest();xhr.onreadystatechange=function(){if(this.readyState == 4 && this.status == 200){
			if(this.responseText){
				//認証失敗
				console.log("[Response]");console.log(this.responseText);
				$('#auth_number_err').removeClass("hide");
			}else{
				//認証成功
				console.log("[Response]");console.log('success!!!!');
				$("#dialog_check_number .btn_close").click();
			}
		}};xhr.open('POST',url);xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');xhr.send(JSON.stringify(args));};


		postAuth(jsHost + '<?php echo $_SERVER["HTTP_HOST"] ?>' + '/api/smsAuth/check',{"users_api_token":"<?php echo $UserData['User']['api_token'] ?>","code":$('#auth_number').val(),"user_id":"<?php echo $UserData['User']['id']?>"});
	});

	$('#dialog_input_phone_number').click(function() {
		$('#phone_number_input_err').addClass("hide");
		$('#phone_number_double_err').addClass("hide");
		$('#phone_number_empty_err').addClass("hide");
		var jsHost = (("https:" == document.location.protocol) ? "https://" : "http://");
		var postAuth = function(url,args){ var xhr = new XMLHttpRequest();xhr.onreadystatechange=function(){if(this.readyState == 4 && this.status == 200){
			if(this.responseText){
				//電話番号更失敗
				console.log("[Response]");console.log(this.responseText);
				if(this.responseText == "This number is already in use"){
					$('#phone_number_double_err').removeClass("hide");
				}
				if(this.responseText == "number empty"){
					$('#phone_number_empty_err').removeClass("hide");
				}
				$("#anchor_trigger_modal_dialog_input_number").click();
			}else{
				//電話番号更新成功
				console.log("[Response]");console.log('success!!!!');
				$("#phone_input_done").click();
			}
		}};xhr.open('POST',url);xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');xhr.send(JSON.stringify(args));};
		postAuth(jsHost + '<?php echo $_SERVER["HTTP_HOST"] ?>' + '/api/smsAuth/inputPhoneNumber',{"users_api_token":"<?php echo $UserData['User']['api_token']?>","phone_number": $('#phone_number_input').val(),"country_code":$('#country_code').val(),"user_id":"<?php echo $UserData['User']['id']?>"});
	});

	$('#phone_input_done').click(function() {
		var jsHost = (("https:" == document.location.protocol) ? "https://" : "http://");
		var postAuth = function(url,args){ var xhr = new XMLHttpRequest();xhr.onreadystatechange=function(){if(this.readyState == 4 && this.status == 200){
			if(this.responseText){
				if(this.responseText === "Concurrent verifications to the same number are not allowed"){
					console.log("[Response]");console.log(this.responseText);
					$("#anchor_trigger_modal_dialog_check_number").click();
				}else{
					//SMS送信失敗
					console.log("[Response]");console.log(this.responseText);
					$('#phone_number_input_err').removeClass("hide");
					$("#anchor_trigger_modal_dialog_input_number").click();
				}
			}else{
				//SMS送信成功
				console.log("[Response]");console.log('success!!!!');
				$("#anchor_trigger_modal_dialog_check_number").click();
			}
		}};xhr.open('POST',url);xhr.setRequestHeader('Content-Type','application/x-www-form-urlencoded');xhr.send(JSON.stringify(args));};

		postAuth(jsHost + '<?php echo $_SERVER["HTTP_HOST"] ?>' + '/api/smsAuth',{"users_api_token":"<?php echo $UserData['User']['api_token']?>","user_id":"<?php echo $UserData['User']['id']?>"});
	});
	*/

	$sc.setFavoriteTab = function(){
		$sc.isFavoriteTab = true;
	}
	
	$sc.init = function() {
		// - if favotab
		if (typeof isFavoriteTabAngular !== "undefined") {
			console.warn("stopping");
			return false;
		}
		
		try {
			$sc.scheduleTable();
			$rs.studentPriorityDelayInterval();
			$rs.getAlbum();
			$rs.getFavCount();
			$rs.getLessonHistory();
			$rs.getStrengthRating();
			// $rs.getTeacherReviews();
			$rs.getTeacherBadgeList();
			$rs.getTeacherOccupation();
			$rs.getTeacherFeatures();
			$rs.getSelfReviews();
			$rs.getGenerationRating();
			$rs.getReservationCancellationBreakdown();
			$rs.lessonOnlineFinish();
			$rs.getReceivableReservationPaid();
		} catch (ex) {}
	}

	/**
	 * load/refresh lesson and alert start button
	 */
	$rs.callLessonAlertandStartButton = function(studentId, teacherId, counselingFlg, teacher_status) {

		$http({
			method: 'GET',
			url: '/waiting/callLessonAlertandStartButton?r='+new Date().getTime(),
			params: { 
				studentId: studentId, 
				teacherId: teacherId, 
				counselingFlg: counselingFlg, 
				la: localizeDir, 
				overrideLocalizeDir: true,
				emergencyFlg: window.isEmergencyPage ? 1 : 0
			},
			beforeSend: function(data) {
				$('.btn_area-loader').show();
				$('.lesson-alert-area').hide();
				$('.btn_area-lesson_start').hide();
				lessonStartFirstLoaded = true;
			}
		}).then(function(res) {
			var data = res.data;

			let modals = [
				'dialog_rating',
				'dialog_rating_lesson_connect',
				'dialog_rating_lesson_text',
				'dialog_recommendTeacher',
				'dialog_appreciation_messages',
				'dialog_ss_first_lesson_finish',
				'dialog_rating_complete',
				'dialog_lesson_review',
				'dialog_schedule_reserve'
				//TODO : add all connected modal ID
			];
			/* close reservation pop-up modal when not reservation */
			if (
				!data.isReserved &&
				$.inArray($(".modal_window:visible").attr("id"), modals) === -1
			) {
				$('#dialog_lesson_reminder .btn_close').click();
			}
			/* append lesson alert and start button */
			$('.lesson-alert-area').html($compile(data.lesson_alert)($sc));
			$('.btn_area-lesson_start').html($compile(data.lesson_start_button)($sc));	
			
			if(teacher_status === 2){ // standby
				$('.teacher_latest_status lesson_status_circle lesson_status_circle--wait');
			}
		});
		
	}


	$rs.updateColor = function() {
		if (isNotSupportedBrowser()) {
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available"]')
			.attr('data-status', 'reserve-not-available');
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-live"]')
			.attr('data-status', 'reserve-not-available');
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-campaign"]')
			.attr('data-status', 'reserve-not-available');
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-request"]')
			.attr('data-status', 'not-available-request');
		}
		if (!disabledSchedule.success) {
			return false;
		}	
		if (disabledSchedule.disableAll) {
			$('.notice_max_limit').removeClass('hide');

			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available"]')
			.attr('data-status', 'reserve-not-available');
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-live"]')
			.attr('data-status', 'reserve-not-available');
			$('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-campaign"]')
			.attr('data-status', 'reserve-not-available');

		} else if (disabledSchedule.disabledDays) {
			$(disabledSchedule.disabledDays).each(function(index, data) {
				// $('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available"]')
				// .attr('data-status', 'reserve-not-available');
				// $('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-live"]')
				// .attr('data-status', 'reserve-not-available');
				// $('#teacher_reserve_table a[data-date*="'+ data +'"][data-status="available-campaign"]')
				// .attr('data-status', 'reserve-not-available');
			});
		}

		if (!disabledSchedule.disableAll) {
			$('.notice_max_limit').addClass('hide');
		}
	}

	$rs.refreshColor = function() {
		//reset color first
		$("#teacher_reserve_table tbody tr  td  a.forReservation")
		.removeClass('not_available')
		.attr('data-status', 'reserve-limit');

		$("#teacher_reserve_table tbody tr  td  a.forReservation").each(function(i, value) {
			if (!$(this).hasClass('btn_red')) {
				if ($(this).attr('data-live') == 1) {
					$(this).addClass('btn_green')
					.attr('data-status', 'available-live');
				} else if ( $(this).attr('data-lesson-request') == 1 ) {
					$(this).addClass('btn_green')
					.attr('data-status', 'available-request');
				} else if ( $(this).hasClass('on_campaign') ) {
					$(this).addClass('slot-btn-campaign-color-override');
				} else {
					$(this).addClass('btn_green')
					.attr('data-status', 'available');
				}
			} else if ( $(this).hasClass('on_campaign') ) {
				$(this)
				.addClass('btn_red')
				.attr('data-status', 'available-campaign');
			}
		});
		
		//request new disable schedule
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacherId : teacherId};
		obj.url = '/user/waiting/updatedScheduleColor';
		a.restAction(obj).then(function(res) {
			disabledSchedule = res.data;
			$rs.updateColor();
		});
	}

	$rs.getTeacherBadgeList = function() {
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacherId : teacherId};
		obj.url = '/user/waiting/teacherBadgeList';
		a.restAction(obj).then(function(res) {
			$('#course_badge_area').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
			$timeout(function() {
				let dynamicHeight = $('.compatible_textbooks .textbooks ul li')[0].clientHeight
				let textbookList_height = $('.compatible_textbooks .textbooks ul').height()
				$('.compatible_textbooks .textbooks').css('height', dynamicHeight)
				$('.compatible_textbooks .textbooks + p').click(function(){
					let scope = $('.compatible_textbooks .textbooks')
					scope.toggleClass('active')
					var numberOfListItems = $('.textbooks ul li').length;
					if(scope.hasClass('active')){
						scope.animate({height: textbookList_height}, 250, function(){
							$('.compatible_textbooks .textbooks').css('height', 'auto')
						});
						$(this).children('i').css('transform', 'rotate(180deg)');
						//$('.badgeBtn span').text('閉じる');
					}else{
						scope.animate({height: dynamicHeight}, 250)
						$(this).children('i').css('transform', '');
						//$(' .badgeBtn span').text('すべて見る(' + numberOfListItems + ')');
					}
				});				
			}, 1000);
		});
	}

	$rs.getTeacherOccupation = function() {
		$('#instructor_occupation_history').html('<p class="init_loader t_center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacherId : teacherId};
		obj.url = '/user/waiting/teacherOccupation';
		a.restAction(obj).then(function(res) {
			$('#instructor_occupation_history').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
		});
	}

	$rs.getTeacherFeatures = function() {
		$rs.feature = {};
		if ( $("#features_area").length > 0 ) {
			$.ajax({
				url: '/waiting/teacherFeatures',
				type: 'POST',
				dataType: 'json',
				data: { teacherId: teacherId },
				success: function(data) {
					var teacherFeatures = {};
					teacherFeatures.best_free_talk = typeof data.best_free_talk != 'undefined' ? parseInt(data.best_free_talk) : 0;
					teacherFeatures.good_for_first_timer = typeof data.good_for_first_timer != 'undefined' ? parseInt(data.good_for_first_timer) : 0;
					teacherFeatures.good_grammar_and_vocabulary = typeof data.good_grammar_and_vocabulary != 'undefined' ? parseInt(data.good_grammar_and_vocabulary) : 0;
					teacherFeatures.good_in_teaching_textbook = typeof data.good_in_teaching_textbook != 'undefined' ? parseInt(data.good_in_teaching_textbook) : 0;
					teacherFeatures.have_many_beginner_students = typeof data.have_many_beginner_students != 'undefined' ? parseInt(data.have_many_beginner_students) : 0;
					teacherFeatures.new = typeof data.new != 'undefined' ? parseInt(data.new) : 0;
					teacherFeatures.pronunciation = typeof data.pronunciation != 'undefined' ? parseInt(data.pronunciation) : 0;
					teacherFeatures.suitable_for_children = typeof data.suitable_for_children != 'undefined' ? parseInt(data.suitable_for_children) : 0;
					teacherFeatures.suitable_for_intermediate_or_advance_students = typeof data.suitable_for_intermediate_or_advance_students != 'undefined' ? parseInt(data.suitable_for_intermediate_or_advance_students) : 0;
					teacherFeatures.suitable_for_senior = typeof data.suitable_for_senior != 'undefined' ? parseInt(data.suitable_for_senior) : 0;
					$rs.feature = teacherFeatures;
				}
			});
		}
	}

	$rs.getSelfReviews = function() {
		if ( $("#self_review_area").length > 0 ) {
			var obj = {};
			obj.method = 'POST';
			obj.data = {teacherId : teacherId, userId: userId};
			obj.url = '/user/waiting/getSelfReviews';
			a.restAction(obj).then(function(res) {
				$('#self_review_area').append($compile(res.data)($sc));	
				$( 'a[rel*=modal]').leanModal();
			});
		}
	}

	$rs.getGenerationRating = function() {
		$('#generation_area').html('<p class="init_loader t_center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacherId : teacherId};
		obj.url = '/user/waiting/getGenerationRating';
		a.restAction(obj).then(function(res) {
			$('#generation_area').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
		});
	}

	$rs.getReservationCancellationBreakdown = function() {
		$rs.reservationAndCancelledBreakdown = {};
		$.ajax({
			url: '/waiting/getReservationCancellationBreakdown',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				var reservationAndCancelled = {};
				reservationAndCancelled.this_month_reserved = typeof data.this_month_reserved != 'undefined' ? data.this_month_reserved : 0;
				reservationAndCancelled.this_month_cancellation_rate = typeof data.this_month_cancellation_rate != 'undefined' ? data.this_month_cancellation_rate : 0;
				reservationAndCancelled.last_month_reserved = typeof data.last_month_reserved != 'undefined' ? data.last_month_reserved : 0;
				reservationAndCancelled.last_month_cancellation_rate = typeof data.last_month_cancellation_rate != 'undefined' ? data.last_month_cancellation_rate : 0;
				$rs.reservationAndCancelledBreakdown = reservationAndCancelled;
			}
		});
	}

	$rs.lessonOnlineFinish = function() {
		$.ajax({
			url: '/waiting/finishOnlineLesson',
			type: 'POST',
			dataType: 'json',
			data: { chatHash: chatHash },
			success: function(data) {
				if (data !== null && data != '') {
					lessonFinishModalPopUp(data);
				}
			}
		});
	}

	
	function lessonFinishModalPopUp(lessonData) {
		var isStudySapuriTosUser = (typeof lessonData.isStudySapuriTosUser != 'undefined') && (lessonData.isStudySapuriTosUser) ? 1 : 0;
		var campaignData = lessonData.getActiveCampaign;
		var campaignModalTrigger =  ((typeof campaignData.campaignTerm != 'undefined' && campaignData.campaignTerm) && (typeof campaignData.campaign_name != 'undefined' && campaignData.campaign_name)) ? '#trigger_modal_' + campaignData.campaign_name : '' ;
		var teacher_id = lessonData.teacherData.id;
		var hasConnectId = (typeof lessonData.lessonOnAirData.connect_id != 'undefined') && (lessonData.lessonOnAirData.connect_id) ? true : false;
		
		if (typeof lessonData.LessonOnairsLog != 'undefined') {
			var lesson_id = lessonData.lessonOnAirData.onair_id;
		} else {
			var lesson_id = lessonData.lessonOnAirData.id;
		}
		var lessonReviewStatus = lessonData.lesson_review_flg;
		var modalTriggerArr = [];
		var modalTriggerFlow = true;
		var campaign_name = lessonData.getActiveCampaign.campaign_name;
		var campaignTerm = lessonData.getActiveCampaign.campaignTerm;
		var teacherId = lessonData.teacherData.id;
		var rate = 0;
		var userComment = '';
		var ageRange = lessonData.ageRange;
		var memberType = (lessonData.memberType) ? lessonData.memberType : 'student';
		var firstSelectedDummy = (lessonData.firstSelectedDummy) ? lessonData.firstSelectedDummy : 0;
		var isDefaulTextbook = (lessonData.isDefaulTextbook) ? lessonData.isDefaulTextbook : 0;
		var showRatingFlg = lessonData.showRatingFlg;
		var textbookTeacherRecommendBool = false;
		var textbookTeacherSelectedCatID = lessonData.textbookCategoryId;
		var isLiveFlg = parseInt(lessonData.isLiveFlg);
		var rateFiveStarBool = false;
		var recommendedTextbookTeacherListShowModalFlg = 1; // display modal once
		var firstLessonRecommendedTeacher = false;
		// NJ-27983 - lesson review modal data
		var teacherImage = lessonData.teacherImage;
		var teacherName = lessonData.teacherName;
		var teacherNameJA = lessonData.teacherNameJA;
		var courseTitle = lessonData.courseTitle;
		var subCategoryLabel = lessonData.subCategoryLabel;
		var chapterTitle = lessonData.chapterTitle;
		var textbookImage = lessonData.textbookImage;
		var lessonReviewDisplay = (lessonData.lessonReviewModalOn) ? 1 : 0 ;
		var lessonHistoryExist = (lessonData.lessonHistoryExist) ? 1 : 0;
		// NJ-33170 - flag for displaying teacher rating modal in evaluation
		var allowTextbookEval = lessonData.hasOwnProperty('allowEvaluation') ? lessonData.allowEvaluation : 1

		// NJ-27983 display data of teacher and lesson on lesson review modal
		$('#dialog_lesson_review #lesson_teacher_profile').attr('src', teacherImage);
		if (typeof lessonData.lessonHistoryExist !== 'undefined' && lessonData.lessonHistoryExist == 'ja') {
			$('#dialog_lesson_review #lesson_teacher_name').html(teacherName+teacherNameJA);
		} else {
			$('#dialog_lesson_review #lesson_teacher_name').html(teacherName);
		}
		$('#dialog_lesson_review #lesson_textbook_profile').attr('src', textbookImage);
		
		var dialogRatingImageHTML = `<img src="${textbookImage}" alt="${(courseTitle) ? courseTitle : ''}" class="m_b_20">
											<figcaption class="txt-name-wrap fs_16 lh_15">
												<span class="cat-name">${(courseTitle) ? courseTitle : ''}</span>
												<span class="sub-cat-name">${(subCategoryLabel) ? subCategoryLabel : ''}</span>
												<span class="chapter-name">${(chapterTitle) ? chapterTitle : ''}</span>
											</figcaption>`;

		$('#dialog_rating_lesson_text .top_img').html(dialogRatingImageHTML);
		if (lessonData.textbookCategoryId) {
			getLastedReview({teacherId: teacherId, category_id: lessonData.textbookCategoryId})
		}
		
		
		$(function() {
			$.ajax({
				url: '/user/waiting/getLessonHistory',
				type: 'POST',
				dataType: 'json',
				data: { teacherId: teacherId },
				success: function(data) {
					var new_data = data.lessonHistory;
					$.each (new_data, function(key, index) {
						if (index.LessonOnairsLog.chat_hash == chatHash) {
							var audioLink = `/lesson-note/${index.TextbookCategory.type_id}/
										${index.TextbookConnect.id}?lesson_note=1&chat_hash=${chatHash}`;

							$('#dialog_lesson_review #lesson_book_name').html(index.categoryNameLabel);
							$('#dialog_lesson_review #lesson_level').html(index.subCategoryNameLabel);

							$('#dialog_lesson_review #lessonBookLink').attr('href', `${index.textbook_url}`).html(index.textbookNameLabel);
							$('#dialog_lesson_review #lesson_chat_id').html(index.lesson_number);
							if (index.audio_count_log > 0) {
								$('#lesson_audio_link').removeClass('disabledReviewIcon');
							} else {
								$('#lesson_audio_link').addClass('disabledReviewIcon');	
							}

							$('#dialog_lesson_review #lesson_audio_link').attr('href', (index.audio_count_log > 0) ? audioLink:'javascript:void(0)');
							$('#dialog_lesson_review #lesson_chatlog_link').attr('href', `${index.chat_logs_url}`);
							
							if (index.textbookNameLabel) {
                                $('#dialog_lesson_review #lesson_book_link').html(index.textbookNameLabel).attr('href', index.textbook_url );
                            }

							if (index.has_message_logs) {
								$('#dialog_lesson_review #lesson_memo_link').attr('href', index.message_logs_url);
							}
						}
					})
				}
			});
			// NJ-27983 end of display data of teacher and lesson on lesson review modal
			// Generate Textbook recommended teachers
			generateTextbookTeacherRecommendAjax();

			if (typeof count == 'undefined' || (count <= 1 && isNaN(count) == false)) {
				$(window).load(function() {
					$("#trigger_modal_counseling_1stlesson").click();
					$("div#dialog_counseling_1stlesson #counseling_1stLesson").on('click', function() {
						location.href = "/counseling";
					});
				});
			}

			if (showRatingFlg == 1) {
				$('.rating_bad_container, .rating_good_container').show();
			} else {
				$('.rating_bad_container, .rating_good_container').hide();
			}

			//submit rating
			$("#rating_submit").on("click", function() {
				saveEvaluation();
			});

			if (!lessonData.lessonTrouble) { //skip ajax request if lesson is lesson_system_trouble
				//check if theres a previous review via ajax
				$.ajax({
					url: "/user/waiting/getEvaluationDetail",
					type: 'post',
					dataType: 'json',
					data: {
						chat_hash: chatHash,
						member_type: memberType
					}
				}).done(function(result) {
					if (result.status) {
						$('#reviewButton > button').text(evaluatedPrompt);

						if (campaignModalTrigger != '' && memberType != 'viewer') {
							modalTriggerArr.push(campaignModalTrigger);
						}
						//Live viewer
						if (campaignModalTrigger != '' && campaignModalTrigger == "#trigger_modal_campaign_golden_week_live" && memberType == 'viewer') {
							modalTriggerArr.push(campaignModalTrigger);
						}
						
						modalDisplayFlow();

					} else {
						var dateObj = new Date(lessonData.lessonOnAirData.end_time);
						dateObj.setDate(dateObj.getDate() + 1);
						var dateModified = dateObj.toISOString().slice(0, 19).replace('T', ' ');
						var currentDate = new Date();
						$('#reviewButton').html(`<a class='btn_style btn_orange ${(dateModified < currentDate) ? 'disable' : ''}' id='instructor_rating' rel='modal' href='#dialog_rating_lesson_connect'>${instructorRateMessage}</a>`);
						$('a[rel*=modal]').leanModal();
						$('a[rel*=modal]').on('click', function(e) {
							e.preventDefault();
						});

						//auto popup lesson review modal
						if ($("#instructor_rating").length && !$("#instructor_rating").hasClass('disable') && hasConnectId) {
							if (typeof lessonData.finishLessonUser.network_review_flg != 'undefined' && lessonData.finishLessonUser.network_review_flg == 1) {
								$('#trigger_modal_rating_lesson_connect').click();
							} else {
								if (isDefaulTextbook == 1) {
									if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg == 1 && allowTextbookEval == 1) {
										$('#trigger_modal_dialog_rating').click();
									} else {
										getAppreciationModal();
									}
								} else {
									if (typeof lessonData.finishLessonUser.textbook_review_flg != 'undefined' && lessonData.finishLessonUser.textbook_review_flg == 1 && allowTextbookEval == 1) {
										$('#trigger_modal_rating_lesson_text').click();
									} else if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg == 1 && allowTextbookEval == 1) {
										$('#trigger_modal_dialog_rating').click();
									} else {
										getAppreciationModal();
									}
								}
							}
						}
					}
				});
			} else {
				if (campaignModalTrigger != '' && memberType != 'viewer') {
					modalTriggerArr.push(campaignModalTrigger);
				}
				//Live viewer
				if (campaignModalTrigger != '' && campaignModalTrigger == "#trigger_modal_campaign_golden_week_live" && memberType == 'viewer') {
					modalTriggerArr.push(campaignModalTrigger);
				}

				modalDisplayFlow();
			}

			$('#btn_modal_rating_lesson_connect_next').on('click', function() {
				if (!$(this).hasClass('disabled')) {
					setTimeout(function() {
						if (isDefaulTextbook == 1) {
							if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg == 1 && allowTextbookEval == 1) {
								$('#trigger_modal_dialog_rating').click();
							} else {
								getAppreciationModal();
							}
						} else {
							if (typeof lessonData.finishLessonUser.textbook_review_flg != 'undefined' && lessonData.finishLessonUser.textbook_review_flg == 1 && allowTextbookEval == 1) {
								$('#trigger_modal_rating_lesson_text').click();
							} else if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg == 1 && allowTextbookEval == 1) {
								$('#trigger_modal_dialog_rating').click();
							} else {
								getAppreciationModal();
							}
						}
					}, 300);

				}
			});

			$('#btn_modal_rating_lesson_text_next').on('click', function() {
				if (!$(this).hasClass('disabled')) {
					setTimeout(function() {
						if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg == 1) {
							$('#trigger_modal_dialog_rating').click();
						} else {
							$('#dialog_rating_staff #rating_submit').removeClass('disabled');
							$('#rating_submit').prop('disabled', false);
							saveEvaluation(); //.then(getAppreciationModal())
						}
					}, 300);

				}
			});

			function getAppreciationModal() {
				$.ajax({
					url: "/user/waiting/getApppreciationModal",
					type: 'post',
					data: {
						chat_hash: chatHash,
						'member_type': memberType
					}
				}).done(function(appreciationResult) {
					$result = $.parseJSON(appreciationResult);

					if ((typeof $result.appreciation_data != 'undefined' && $result.appreciation_data) &&
						(typeof $result.appreciation_done != 'undefined' && !$result.appreciation_done) &&
						(memberType != 'viewer')
					) {
						$('div#dialog_appreciation_messages .modal_inner').html($result.appreciation_data);
						ratingSubmitNextModal = '#trigger_modal_appreciation_messages';
						modalTriggerArr.push("#trigger_modal_appreciation_messages");
					} else {
						//close dialog rating
						$('#modal_overlay').css({
							'visibility': 'hidden',
							'display': 'none'
						});
						$('#dialog_rating').hide();
					}

					$('#dialog_rating').hide();

					// hide modal if recently finished lesson was a reservation
					if (lessonData.hideTextbookChangeModal === 'true') {
						setTimeout(function() {
							$('#dialog_rating_staff').addClass('hide').hide();
							$('#modal_overlay').css({
								'visibility': 'hidden',
								'display': 'none'
							});
						}, 300);
					}
					
					// Final modal
					if (lessonData.firstLesson && $reserveRecommend && memberType != 'viewer') {
						modalTriggerArr.push("#trigger_modal_ss_first_lesson_finish");
						firstLessonRecommendedTeacher = true;
					 } else if (
						memberType != 'viewer' && !firstSelectedDummy && !isDefaulTextbook && parseInt(lessonData.teacherData.counseling_flg) == 0
					) {
						if (
							lessonData.lessonOnAirData.lesson_type == 1 &&
							(typeof lessonData.finishLessonUser.next_textbook_flg) && lessonData.finishLessonUser.next_textbook_flg == 1 &&
							!lessonData.noNextTextbookModal.includes(lessonData.userMembershipIndex)
						) {
							modalTriggerArr.push("#trigger_modal_rating_complete");
						}
					}

					if (textbookTeacherRecommendBool && !isStudySapuriTosUser && !firstLessonRecommendedTeacher) {
						if (typeof lessonData.finishLessonUser.teacher_review_flg && lessonData.finishLessonUser.teacher_review_flg == 1) {
							// textbook recoomended teachers
							modalTriggerArr.push("#trigger_modal_dialog_recommend");
						}
					}

					if (!allowTextbookEval) {
						modalTriggerArr.push("#trigger_modal_lesson_review");
					}

					modalDisplayFlow();

					let scope = $(this).closest('.modal_window');
					$('.close_modal', scope).click();
				});
			}

			function saveEvaluation() {
				rate = $('#dialog_rating input[name=lesson_rate]:checked').val();
				textbook_review = $('#dialog_rating_lesson_text input[name=rating_icon]:checked').val();
				userComment = '';
				var featureRatingItems = [];

				if (rate == 1) {
					userComment = $('#user_comment').val().trim().length ? $('#user_comment').val() : '';
					if (userComment.length == 0) {
						return false;
					}
				} else {
					userComment = $('#user_comment2').val().trim().length ? $('#user_comment2').val() : '';
				}

				if (rate != 3) {
					var rankingCheckboxName = (rate < 3) ? 'rating_bad_tag' : 'rating_good_tag';
					var checkedFeatureRatingItems = $('input[name="' + rankingCheckboxName + '[]"]:checked');

					if (checkedFeatureRatingItems.length > 0) {
						// store in array
						checkedFeatureRatingItems.each(function() {
							featureRatingItems.push($(this).val());
						});
					}
				}
				// NJ-3786 - hide recommended teacher 
				if (rate == 5) {
					textbookTeacherRecommendBool = false;
					rateFiveStarBool = true;
				}

				if (!$('#rating_submit').prop('disabled')) {
					//submit rating via ajax
					let fnParam = new URLSearchParams(window.location.search).get('fn');
					let lessonFinish = lessonData.lessonOnAirData.lesson_finish;
					let lesson_finish = fnParam !== null ? 1 : lessonFinish;

					let createDateObj = new Date(lessonData.lessonOnAirData.create);
					let createTimestamp = createDateObj.getTime();
					let lessonOnAirCreate = createTimestamp / 1000;
					let teacherDateObj = new Date(lessonData.teacherData.first_lesson_date);
					let teacherTimestamp = teacherDateObj.getTime();
					let teacherFirstLesson = teacherTimestamp / 1000;
					$.ajax({
						url: "/LessonMessage/ajaxSaveEval",
						type: 'post',
						data: {
							age: ageRange,
							rate: rate,
							user_comment: userComment,
							text_comment: $('#text_comment').val(),
							lesson_id: lesson_id,
							teacher_id: lessonData.teacherData.id,
							chat_hash: chatHash,
							lesson_type: lessonData.lessonOnAirData.lesson_type,
							lesson_finish: lesson_finish,
							start_date_time: lessonData.lessonOnAirData.start_time,
							end_date_time: lessonData.lessonOnAirData.end_time,
							promote_date: lessonData.teacherData.promote_date,
							first_lesson: (lessonOnAirCreate == teacherFirstLesson) ? 1 : 0,
							rank_coin_id: lessonData.teacherData.rank_coin_id,
							referrer_id: lessonData.teacherDetailData.referrer_id,
							home_flg: lessonData.teacherData.home_flg,
							textbook_review: textbook_review,
							connect_id: lessonData.lessonOnAirData.connect_id,
							feature_rating_items: featureRatingItems,
							member_type: memberType,
							textbook_category_id: lessonData?.textbookCategoryId,
							textbook_category_type: parseInt(lessonData?.textbookCategoryType),
							
						}
					}).done(function(result) {

						$result = $.parseJSON(result);
						let appreciationBool = false;
						if ($result.redirect == true) {
							location.href = "/cs/4?" + $result.url;
						}
						if ($result.status == "ok") {
							$('#instructor_rating').text(evaluatedPrompt).addClass('disable');

							if (typeof $result.appreciation_data != 'undefined' && $result.appreciation_data) {
								appreciationBool = true;
								$('div#dialog_appreciation_messages .modal_inner').html($result.appreciation_data);
								ratingSubmitNextModal = '#trigger_modal_appreciation_messages';
								modalTriggerArr.push("#trigger_modal_appreciation_messages");
							} else {
								//close dialog rating
								$('#modal_overlay').css({
									'visibility': 'hidden',
									'display': 'none'
								});
								$('#dialog_rating').hide();
							}
						} else if ($result.status == "invalid") {
							$('#trigger_modal_rating_timeover').click();
						} else {
							console.log('Error: Submit rating.');
						}

						if (campaignModalTrigger != '' && memberType != 'viewer') {
							modalTriggerArr.push(campaignModalTrigger);
						}

						//Live viewer
						if (campaignModalTrigger != '' && campaignModalTrigger == "#trigger_modal_campaign_golden_week_live" && memberType == 'viewer') {
							modalTriggerArr.push(campaignModalTrigger);
						}
						
						if (typeof lessonData.getActiveCampaign.campaignSettings != 'undefined' && lessonData.getActiveCampaign.campaignSettings) {
							let campaignSettings = lessonData.getActiveCampaign.campaignSettings;

							campaignSettings.forEach(function (value) {
								var triggerCampaignModal = '#trigger_modal_dynamic_campaign_content_' + value.CampaignSettings.id;
								modalTriggerArr.push(triggerCampaignModal);
							  });
						}

						$('#dialog_rating').hide();

						// hide modal if recently finished lesson was a reservation
						var hideTextbookChangeModal =  lessonData.hideTextbookChangeModal;
						if (hideTextbookChangeModal === 'true') {
							setTimeout(function() {
								$('#dialog_rating_staff').addClass('hide').hide();
								$('#modal_overlay').css({
									'visibility': 'hidden',
									'display': 'none'
								});
							}, 300);
						}

						// Final modal
						if (lessonData.firstLesson && typeof lessonData.reserveRecommend != 'undefined' && 
						lessonData.reserveRecommend && memberType != 'viewer') {
							modalTriggerArr.push("#trigger_modal_ss_first_lesson_finish");
							firstLessonRecommendedTeacher = true;
						} else if (memberType != 'viewer' && !firstSelectedDummy && 
						!isDefaulTextbook && parseInt(lessonData.teacherData.counseling_flg) == 0) {
							if (lessonData.lessonOnAirData.lesson_type == 1 && typeof lessonData.finishLessonUser.next_textbook_flg != 'undefined' && 
							lessonData.finishLessonUser.next_textbook_flg == 1 && !lessonData.noNextTextbookModal.includes(lessonData.userMembershipIndex)) {
								modalTriggerArr.push("#trigger_modal_rating_complete");
							}
						}

						if (textbookTeacherRecommendBool && !isStudySapuriTosUser && !firstLessonRecommendedTeacher) {
							if (typeof lessonData.finishLessonUser.teacher_review_flg != 'undefined' && lessonData.finishLessonUser.teacher_review_flg ==1) {
								// textbook recoomended teachers
								modalTriggerArr.push("#trigger_modal_dialog_recommend");
							}
						}

						modalDisplayFlow();

						let scope = $(this).closest('.modal_window');
						$('.close_modal', scope).click();
					});

				} else {
					console.log('not submitted error');
				}

				/* fix for master */
				$(this).prop('disabled', true);
			}

			$('#bad_connection').on('click', function() {
				system_trouble = $('#dialog_rating_lesson_connect input[name=rating_icon]:checked').data("value");
				if (memberType == 'viewer') {
					system_trouble_comment = '[live viewer - skip comment input step]';
				} else if (!isStudySapuriTosUser) {
					system_trouble_comment = $('#dialog_rating_lesson_connect textarea').val() != undefined ? $('#dialog_rating_lesson_connect textarea').val().trim() : '';
				} else {
					system_trouble_comment = '[studysapuri user - skip comment input step]';
				}
				
				if (system_trouble_comment.length != 0 || system_trouble == 1) {
					if (system_trouble_comment.length == 0) {
						system_trouble_comment = '[the user did not input some comments]';
					}
					$.ajax({
						url: "/user/Waiting/reportProblem",
						type: 'post',
						data: {
							chatHash: chatHash,
							problem: system_trouble_comment,
							lesson_system_trouble: system_trouble,
							member_type: memberType
						}
					}).done(function(result) {
						if (memberType == 'viewer') {
							setTimeout(function() {
								$('#trigger_modal_rating_lesson_text').click();
							}, 300);
						}
					});
				} else {
					//Live viewer
					if (campaignModalTrigger != '' && campaignModalTrigger == "#trigger_modal_campaign_golden_week_live" && memberType == 'viewer') {
						modalTriggerArr.push(campaignModalTrigger);
					}
				}

				// Check and set campaign modal priority
				if (parseInt(lessonData.teacherData.counseling_flg) == 0) {
					if (campaignModalTrigger != '' && memberType != 'viewer') {
						modalTriggerArr.push(campaignModalTrigger);
					}

					if (memberType != 'viewer' && (!firstSelectedDummy && !isDefaulTextbook)) {
						if (lessonData.lessonOnAirData.lesson_type == 1 && (typeof lessonData.finishLessonUser.next_textbook_flg != 'undefined' && 
						lessonData.finishLessonUser.next_textbook_flg) && !lessonData.noNextTextbookModal.includes(lessonData.userMembershipIndex)) {
							modalTriggerArr.push("#trigger_modal_rating_complete");
						}
					}
				}

				// Run modal display
				modalDisplayFlow();
			});

			function showInstagramEventModal() {
				var showInstagramInterval = setInterval(function() {
					var userInstagramModalNotShow = ($.cookie("userInstagramModalNotShow_" + window.userID)) ? $.cookie("userInstagramModalNotShow_" + window.userID) : null;
					if (userInstagramModalNotShow == 'no') {
						$("#trigger_modal_rating_complete").click();
						clearInterval(showInstagramInterval);
						return;
					}
					if (!$(".modal_window").is(':visible')) {
						//generate QR
						//check if div is !empty
						if (!!$.trim($('#qr-certif_lesson').html()).length) {
							return;
						}
						$('#qr-certif_lesson').qrcode({
							width: 164,
							height: 164,
							text: `/sp/campaign/third_anniv_3-certif?token=${lessonData.userToken}`
						});
						$('#qr-certif_lesson canvas').css('margin', '0 auto');
						$("#trigger_modal_dialog_campaign_certificate_lesson").click();
						clearInterval(showInstagramInterval);
					}
				}, 1000);
			}

			$("#instagram-modal-close").on('click', function() {
				var instaDontShowChecker = $("#dontDisplayTwice2").is(':checked');
				if (instaDontShowChecker) {
					$.cookie("userInstagramModalNotShow_" + window.userID, 'no', {
						expires: 7,
						path: '/',
						secure: true
					});
				}
			});

			//- remove trigger for live viewer
			setTimeout(function() {
				if (typeof memberType != 'undefined' && memberType == 'viewer') {
					$('#dialog_rating_lesson_connect a#bad_connection').attr('href', 'javascript:void(0)');
				}
			}, 0);

		});

		function lessonReviewModalOff() {
			$.ajax({
				url: '/waiting/resetLessonReviewModal',
				type: 'POST',
				dataType: 'json',
				data: { chatHash: chatHash,userId:userId},
				success: function(data) {
					console.log('Successfully reset Lesson Review Modal');
				}
			})
		}

		function modalDisplayFlow() {
			// init modal flow settings
			modalDisplayFlowSetting();

			// set interval of modal flow settings
			var _timerModal = setInterval(function() {
				if (modalTriggerArr.length > 0) {
					modalDisplayFlowSetting();
				} else {
					clearInterval(_timerModal);
				}
			}, 2000);
		}

		function modalDisplayFlowSetting() {
			console.log("lessonReviewDisplay -> "+ ((lessonReviewDisplay) ? true: false));
			console.log("lessonHistoryExist -> "+ ((lessonHistoryExist) ? true: false));

			if (lessonReviewStatus > 0 && memberType != 'viewer' && lessonHistoryExist && lessonReviewDisplay) {
				if (!modalTriggerArr.includes('#trigger_modal_lesson_review')) {
					modalTriggerArr.push("#trigger_modal_lesson_review");
				}
			}
			// Check if modal is still ongoing display
			if ($('.modal_window').is(':visible')) {
				// Skip
				console.log('Skipping when modal is open..');
			} else {
				if (typeof modalTriggerFlow != 'undefined' && modalTriggerFlow) {
					var triggerModal = modalTriggerArr[0];
					var modalTime = 300;
					if ($("#instructor_rating").length && !$("#instructor_rating").hasClass('disable') && triggerModal == '#trigger_modal_campaign_new_year_afterlesson') {
						modalTime = 400;
					}

					if (typeof triggerModal == 'undefined' || triggerModal.length < 1) {
						if (lessonReviewStatus > 0 && memberType != 'viewer' && lessonHistoryExist && lessonReviewDisplay) {

						} else {
							const ngWaitingDetail = angular.element($("[ng-controller='waitingDetail']")).scope();
							ngWaitingDetail.callLessonAlertandStartButton(userId, teacherId, counselingFlg);
							console.log("call function -> callLessonAlertandStartButton() in performStatusPolling method");
						}
					}

					setTimeout(function() {
						if ($('.modal_window').is(':visible')) {
							// Skip
							console.log('Skipping when modal is open..');
						} else if (triggerModal == '#trigger_modal_dialog_recommend') {
							if (recommendedTextbookTeacherListShowModalFlg && !isStudySapuriTosUser) { // show modal once
								if (textbookTeacherRecommendBool && isLiveFlg == 0) { // Live lesson filter 
									$(triggerModal).click();
									recommendedTextbookTeacherListShowModalFlg = 0; // set modal show to false
								}
							}
						} else {
							$(triggerModal).click();
						}

						if (triggerModal == '#trigger_modal_lesson_review') {
							lessonReviewModalOff();
						}

						// delete index once finish triggering
						modalTriggerArr.splice(0, 1);
						console.log('Triggering -> ' + triggerModal);

						//NJ-13670 lottery draw new year campaign
						if (triggerModal == '#trigger_modal_campaign_new_year_afterlesson') {
							newYearLotteryDraw();
						}
					}, modalTime);
				}
			}
			console.log('modalTriggerFlow -> ' + modalTriggerFlow);
		}

		// NJ-3786 Generate html content
		function generateTextbookTeacherRecommendAjax(obj_param = {}) {
			// - if counseling
			if (parseInt(lessonData.teacherData.counseling_flg)) {
				return;
			}
			
			// - if avatar
			if (parseInt(lessonData.teacherData.avatar_flg) || parseInt(lessonData.teacherData.avatar_parent_flg)) {
				return;
			}

			if (isStudySapuriTosUser) {
				return;
			}

			let modalIdString = "#trigger_modal_dialog_recommend";

			let ajaxDataObjParam = {
				category_id: textbookTeacherSelectedCatID
			};
			if (typeof obj_param.connect_id != 'undefined' && obj_param.connect_id > 0) {
				ajaxDataObjParam.connect_id = obj_param.connect_id;
				ajaxDataObjParam.teacher_id = teacher_id;
			}

			$.ajax({
				url: "/user/Waiting/generateTextbookTeacherRecommendAjax",
				type: 'post',
				data: ajaxDataObjParam,
				dataType: 'JSON'
			}).done(function(data) {
				if (rateFiveStarBool === false) {
					if (typeof data.result != 'undefined' && data.result == 1) {
						$('div#dialog_recommendTeacher div.recommendedTeacher_wrap').html(''); // clear existing html
						$('div#dialog_recommendTeacher div.recommendedTeacher_wrap').html(data.html);
						textbookTeacherRecommendBool = true;
					} else {
						textbookTeacherRecommendBool = false;
					}
				}

				// Select new preset textbook
				if (typeof obj_param.select_again != 'undefined' && obj_param.select_again == 1) {
					if (textbookTeacherRecommendBool) {
						if (modalTriggerArr.indexOf(modalIdString) == -1) {
							// textbook recoomended teachers
							modalTriggerArr.push(modalIdString);
							modalDisplayFlow();
						}
					}
				}
			});

		}

		//NJ-13670 new year lottery draw
		function newYearLotteryDraw() {

			let roll_animation = document.getElementById("roll_lot");
			let win_result_lot = document.getElementById("win_result_lot");
			let fail_result_lot = document.getElementById("fail_result_lot");
			roll_animation.stop();

			setTimeout(() => {
				$.ajax({
					url: "/user/Api/lotteryDraw",
					data: {
						user_api_token: lessonData.userToken,
						device: 'PC',
						chat_hash: chatHash
					},
					type: "POST",
					beforeSend: function() {
						roll_animation.play();
					},
					success: function(data) {
						data = JSON.parse(data);
						var animateResult;
						if (!data.error) {
							let show_sec = '';
							if (data.win) {
								show_sec = '.sec_lottery_won';
								$('#reward_coin').html(data.coin);
								animateResult = win_result_lot;
							} else {
								animateResult = fail_result_lot;
								show_sec = '.sec_lottery_fail';
								let res_word = data.random_word;
								$('#ny_fail_word').html(res_word.word);
								$('#ny_fail_meaning').html(res_word.meaning);
								$('#ny_fail_sentence_ja').html(res_word.sentence_ja);
								$('#ny_fail_sentence_en').html(res_word.sentence_en);
							}
							setTimeout(() => {
								$(show_sec).show();
								$('.sec_lottery').hide();
								animateResult.stop();
								animateResult.play();
								animateResult.setLooping(true);
								setTimeout(() => {
									animateResult.pause();
								}, 500)
							}, 3000)
						} else {
							roll_animation.setLooping(true);
						}
					}
				});
			}, 500);
		}

		$(document).on('click', '#dialog_lesson_review .btn_close', function() {
			lessonStartButtonDisplay();
			lessonReviewModalOff();
		});

		// display lesson review modal
		function lessonStartButtonDisplay() {
			const ngWaitingDetail = angular.element($("[ng-controller='waitingDetail']")).scope();
			ngWaitingDetail.callLessonAlertandStartButton(userId, teacherId, counselingFlg);
			console.log("Called function -> callLessonAlertandStartButton() in waiting/detail initial method");
		}

		//Campaign Stamp
		$(document).on('click', '#trigger_modal_campaign_golden_week_lesson, #trigger_modal_campaign_golden_week_live, #trigger_modal_campaign_lesson_coin_gift_live', function(e) {
			let triggerEl = e.target
			let campaingName = '';
			let divElement = '';
			let triggerID = triggerEl.id;
			let postData = {
				user_api_token: lessonData.userToken
			}

			if (triggerID == "trigger_modal_campaign_golden_week_lesson" || triggerID == "trigger_modal_campaign_golden_week_live") {
				campaingName = 'golden_week_nc_challenge';
				divElement = (memberType == 'viewer') ? 'golden_week_live_lesson_viewer' : 'golden_week_normal_lesson';
				postData.campaign = campaingName;
				postData.chat_hash = chatHash;
				postData.memberType = memberType;
			}

			if (triggerID == "trigger_modal_campaign_lesson_coin_gift_live") {
				campaingName = 'lesson_coin_gift';
				divElement = 'lesson_coin_gift_stamp';
				postData.campaign = campaingName;
				postData.chat_hash = chatHash;
				postData.memberType = memberType;
			}

			if (!campaingName || !divElement) {
				console.log("Invalid Campaign stamp");
				return;
			}

			$.ajax({
				url: "/user/Api/campaignStamp",
				type: "POST",
				data: postData,
			}).done(function(data) {
				if (data) {
					var res = $.parseJSON(data);
					if (!res['error']) {
						$('#' + divElement).html(res.data);
					} else {
						console.log('Error getting stamp');
					}
				}
			});
		});
	}

		function getLastedReview({teacherId, category_id}) {
			if (teacherId && category_id) {
				$.ajax({
					type: 'post',
					url: '/lesson-history-the-latest-review',
					data: {teacher_id: teacherId, textbook_category_id: category_id},
					success: function (res) {
						var result = $.parseJSON(res);
						console.log(result);
						if (result.result) {
							$('.lesson-previous-info').show();
							$('#user_comment2').val(result.evaluation.user_comment);
							$('.comment_box #user_comment').val(result.evaluation.user_comment);
							const rate = result.evaluation.rate;
							$(`#dialog_rating .rating #rating_rate${rate}`).click();
							$('.user-comment-caption .time-previous').html(result.evaluation.lesson_format_time);
							$('.user-comment-caption .lesson-id-previous').html(result.evaluation.lesson_number);
						} else {
							$('.lesson-previous-info').hide();
						}
					}
				});
			}
		}

	$sc.init();
	
}]);
