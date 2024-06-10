userApp
.controller('waitingAvatarDetail', ['$scope', '$rootScope', 'Ajax', '$timeout', '$compile', '$http', '$templateCache', 'creditCardChecker',
	function($sc, $rs, a, $timeout, $compile, $http, $tc, creditCardChecker) {
	$tc.removeAll();

	// - declare variable
	$rs.currentReserveBtn = null;
	// display schedule table
	$rs.AvatarScheduleTable  = function() {
		$('#reserve_table').html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');
		var obj = {};
		obj.method = 'POST';
		obj.data = {
			userId: userId,
			teacherId: teacherId
		};
		obj.url = '/user/waiting/avatarSlots';
		a.restAction(obj).then(function(res) {
			$('#reserve_table').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
			$sc.updateColor();
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
			$(".fav_enable").css({"background-color": "#F1890E"});
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
		var target = $(event.currentTarget);
		
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
			$timeout(function() {
				$rs.enableLessonReservationButtons();
			}, 1000);
			if (target.hasClass('forReservation')) {
				$sc.forReservation(target);
			} else if(target.hasClass('forCancellation')) {
				$sc.forCancellation(target);
			} else {
				return false;
			}
		});
	}

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

	$rs.getLessonHistory = function(){
		var teacherId = $('#teacherIdInput').val();
		$.ajax({
			url: '/waiting/getLessonHistory',
			type: 'POST',
			dataType: 'json',
			data: { 
				teacherId: teacherId ,
				avatar_flg : true
			},
			success: function(data) {
				$rs.lessonHistories = data.lessonHistory;
			}
		});
	}

	$rs.getGenerationRating = function() {
		$('#generation_area').html('<p class="init_loader t_center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		var teacherId = $('#teacherIdInput').val();
		var obj = {};
		obj.method = 'POST';
		obj.data = {
			isAvatar : true,
			teacherId : teacherId
		};
		obj.url = '/user/waiting/getGenerationRating';
		a.restAction(obj).then(function(res) {
			$('#generation_area').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
		});
	}

	// - show cancellation alert
	$rs.showCancellationAlert = function(event) {
		// - reset on click
		$rs.currentReserveBtn = null;

		//check creditCard
		creditCardChecker.checkUserCreditCard(function(){
			if ($(event.target).attr('data-href') == '#dialog_schedule_cancel' || $(event.target).hasClass('not_available')) {
				$rs.checkReservationAction(event);
			} else {
				$rs.currentReserveBtn = event;
				$('#dialog_reserve_cancel_rate_alert .btn_green.close_modal').data('reservebtn', event);
				$('#trigger_modal_reserve_cancel_rate_alert').click();
			}
		});
	}

	$rs.proceedAfterCancellationAlert = function(event) {
		var data = $rs.currentReserveBtn;
		$rs.checkReservationAction(data);
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
		var target = $(event.currentTarget);
		var schedId = target.attr('id');
		currentScheduleTargetId = schedId;
		var lessonDate = target.attr('data-date');
		var lessonTime = target.attr('data-time');
		var teacher_avatar = target.attr('teacher_avatar');

		//get actual jp time
		var jpLessonDate = target.attr('data-date');
		var jpLessonTime = target.attr('data-time');
		jpLessonScheduleDateTime = jpLessonDate+" "+jpLessonTime+":00";

		var action = '';
		//check if not login
		if (target.attr('data-href') == '#dialog_login') {
			$sc.forReservation(target);
			return false;
		}
		//get action add or cancel
		if (target.attr('data-href') == '#dialog_avatar_reserve') {
			action = 'add';
		} else if (target.attr('data-href') == '#dialog_schedule_cancel') {
			action = 'cancel';
		} else {
			console.log('No target selected');
			return false;
		}

		var obj = {};
		obj.method = 'POST';
		obj.data = {action : action, lessonDate: lessonDate, teacher_avatar: teacher_avatar, lessonTime: jpLessonScheduleDateTime};
		obj.url = '/user/waiting/avatarLimit';
		a.restAction(obj).then(function(res) {
			var result = res.data;
			if (result.status == 'NG') {
				console.warn('Something wrong in reservation rule checker.');
				return false;
			}
			$sc.craContent = result.content;
			counselingDetails = result.lastDetails;
			// - perform action from result
			switch (result.content) {
				case 1 :
					$("#dialog_reservation_cancel_notice ul li a#reservation_modal").attr('data-schedule-id', schedId);
					// - warning 4th reservation
					if (result.displayNotice == 1) {
						$("#next_charge_date_container").text(result.nextChargeDate);
						$("#trigger_modal_counseling_charge_confirm").click();
					} else {
						$("#trigger_modal_reservation_cancel_notice").click();
					}
					break;
				case 2 : 
					// - 20 lesson reservation only
					$("#trigger_modal_reservation_limit").click();
					break;
				case 3 :
					// - 4 reservation only for each teacher
					$("#trigger_modal_reservation_limit_teacher").click();
					break;
				case 4 : 
					// - cancellation limit
					$("#trigger_modal_reservation_cancel_limit").click();
					break;
				case 5 : 
					// - complimentary plan
					$('#trigger_modal_require_plan_changes-purchase').click();
					break;
				case 6 : // corporate light max lesson limit
					$('#trigger_dialog_schedule_reserve_corp_light_err2_modal').click();
					break;
				case 7 : // cancel on or above lesson time
					location.reload();
					break;
				default:
					
					// - use default
					var dataDate = lessonDate.replace(/\-/g,'/');
					var dataWeek = target.parent('td').parent('tr').children('th').children('span').children('span.day').text();
					var a_dataTime = lessonTime.split(':');
					if (a_dataTime[1] == '00') {
						var timeRange = lessonTime + '～' + a_dataTime[0] + ':26';
					} else {
						time1 = parseInt(a_dataTime[0]) + 1;
						var timeRange = lessonTime + '～' + a_dataTime[0] + ':56';
					}
					var dateTime = dataDate + dataWeek + ' ' + timeRange;
					$sc.craEvent = event;
					$('#dialog_schedule_cancel > div > .time').text(dateTime);
					$('#dialog_schedule_cancel #cancelledCount').html(result.cancelCount);
					if (target.hasClass('forCancellation')) {
						$sc.selectSchedule(event);
					} else if (result.displayNotice == 1) {
						$("#next_charge_date_container").text(result.nextChargeDate);
						$("#trigger_modal_counseling_charge_confirm").click();
					} else {
						$sc.selectSchedule(event);
					}
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
		var timeDiff = target.parents('.teacher_reserve_table').attr('data-time_diff');
		var avatarFlg = 1;
		$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
		$('#dialog_schedule_reserve .textbook_option').html('<p style="text-align:center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
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
			case '#dialog_avatar_reserve':
				var date = target.data('date') + ' ' + target.data('time');
				var dateDisplay = target.data('date-display') + ' ' + target.data('time-display');
				var avatarLessonDate = target.data('date') + ' ' + target.data('time');
				if (counselingFlg) {
					// reset iframe for modal reservation
					$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
					$('#dialog_schedule_reserve .lesson_settings_charge').hide();

					$sc.initializeCounselingModal();
					var counselDate = target.data('date') + ' ' + target.data('time');
					$('#dialog_counseling_reserve #counselor_name').text(teacherName);
					$('#dialog_counseling_reserve #reserved_time').text(counselDate);
					$('#dialog_counseling_reserve_confirm #con_counselor_name').text(teacherName);
					$('#dialog_counseling_reserve_confirm #con_reserved_time').text(counselDate);
					$('#counsel_confirm').attr('data-date', target.data('date').replace(/\//g,'-')).attr('date-time', date).attr('data-lsid', targetId);
					$('#trigger_modal_counseling_reserve').click();
				} else {
					$sc.checkUserCreditCard(function() {
						// reset iframe for modal reservation
						$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
						$('#dialog_schedule_reserve .lesson_settings_charge').hide();

						// update textbook options flag : lesson_now , reservation
						$sc.updateTextbookOption('reservation', function(){});

						$('.lesson_settings #chooseReservedSchedule').attr("confirm", 'yes');
						$('.lesson_settings #chooseReservedSchedule').attr("avatar_flg", avatarFlg);
						$('#img-id').attr("src", teacherPhoto);
						$('#img-id').attr("alt", teacherName);
						$('.name').text(teacherName);
						$('.kana').text(teacherJapaneseName);
						$('.date').text(avatarLessonDate);
						$('.lesson_settings #chooseReservedSchedule').attr("date-time", date).attr('data-date', target.data('date').replace(/\//g,'-')).attr('data-lsid', targetId).attr('data-time', target.data('time')).attr('data-time_diff', timeDiff).attr('date-time-display', dateDisplay);
						$('.reserve_point').text(reservePoint);
						$('.current_coin_int').text($('#header_cnt_coin').text());
						$('#trigger_dialog_schedule_reserve').click();
					});
				}
				break;
		}

	}
	
	// student cancel the reservation
	$sc.forCancellation = function(target) {
		var targetId = target.attr('id');
		var currentTeacherId = (typeof target.attr('teacher-id') !== typeof undefined && target.attr('teacher-id') !== false) ? target.attr('teacher-id') : teacherId;
		var data = {
			teacherId : currentTeacherId,
			dateTime: target.data('date').replace(/\//g,'-') + ' ' + target.data('time') + ':00'
		};
		console.log(data);
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
				var timeDiff = target.parents('.teacher_reserve_table').attr('data-time_diff');
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
					case '#dialog_free_schedule_cancel':
						couponFlag = 1;
					case '#dialog_schedule_cancel':
					
						if (Number(couponFlag) == 1) {
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
						$('#dialog_schedule_cancel > div.btn_wrap > ul > li > #cancelReservedSchedule').removeAttr('id').attr('id', 'wCancelReservedSchedule').attr("avatar_flg", 1).attr("avatar_teacher_id", currentTeacherId);
						$('#wCancelReservedSchedule').attr('data-date', dataDate).attr('data-time', dataTime).attr('data-lsid', targetId).attr('coupon-flag', couponFlag).attr('data-time_diff', timeDiff);

						// modal settings
						$rs.reservationCancelModalSettings(result.isSubstitute, result.isNormalSubstitute);
						$rs.setTeacherCancellationModalData(result.reservation_data);

						$('#trigger_dialog_schedule_cancel').click();
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
	$sc.updateTextbookOption = function(flag , callBack) { // flag : lesson_now , reservation
		$('#dialog_schedule_reserve .btnLessonOrReserve').attr('disabled', true).addClass('disable');
		
		// Coin loading spinner
		$("#dialog_lesson_menu #charge_coin_int").html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');
		$("#dialog_schedule_reserve #charge_coin_int").html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');

		if (typeof $rs.optionDataTextbookGen !== 'undefined') {
			$rs.optionDataTextbookGen = {
				user_id: userId,
				teacher_id: teacherId,
				flag: flag,
				localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : "",
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
				connectId: $rs.reservationTextbookConnectId
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
				}
			}
		}).then(function(result) {
			var data = result.data;

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

	
	$sc.init = function() {
        var orderElement = angular.element('#ng_constant_order');
        $sc.selectedItem = orderElement.length ? orderElement.val() : '0';
		$sc.AvatarScheduleTable();
		//$rs.getTeacherReviews($sc.selectedItem);
		$rs.lessonOnlineFinish();
		$rs.getLessonHistory();
		$rs.getGenerationRating();
		$sc.getAvatarBadgeList();
		// $rs.getTeacherReviews($sc.selectedItem);
		$rs.getPrimaryDetails();
	}
	/**
	 * load/refresh lesson and alert start button
	 */
	$rs.callLessonAlertandStartButton = function(studentId, teacherId, counselingFlg, redLamp){
		$http({
			method: 'GET',
			url: '/user/waiting/callLessonAlertandStartButton?r='+new Date().getTime(),
			params: { studentId: studentId, teacherId: teacherId, counselingFlg: counselingFlg, redLamp: redLamp },
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
				if (redLamp == '1') {
					$("div.data_area div.name_area_cell span.lesson_status_circle").attr("class","").addClass("lesson_status_circle lesson_status_circle--lesson");
				}
		});
	}

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
	
	$rs.updateColor = function() {
		
		if (isNotSupportedBrowser()) {
			$(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('btn_green');
			$(".teacher_reserve_table tbody tr  td  a.forReservation").addClass('not_available');
		}
		if (!disabledSchedule.success) {
			return false;
		}	
		if (disabledSchedule.disableAll) {
			$('.notice_max_limit').removeClass('hide');
			// $(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('btn_green');
			// $(".teacher_reserve_table tbody tr  td  a.forReservation").addClass('not_available');
		} else if (disabledSchedule.disabledDays) {
			$(disabledSchedule.disabledDays).each(function(index, data) {
				// $('.teacher_reserve_table th:contains("' + data + '")').parent('tr').children('td').find('a.forReservation').addClass('not_available');
				// $('.teacher_reserve_table th:contains("' + data + '")').parent('tr').children('td').find('a.forReservation').find('div.avalable-slots').hide();
			});
		}

		if (!disabledSchedule.disableAll) {
			$('.notice_max_limit').addClass('hide');
		}
	}

	$rs.refreshColor = function() {
		//reset color first
		$(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('not_available');
		$(".teacher_reserve_table tbody tr  td  a.forReservation").each(function(i, value) {
			if (!$(this).hasClass('btn_red')) {
				$(this).addClass('btn_green');
				$(this).find('div.avalable-slots').show();
			}
		});
		
		//request new disable schedule
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacherId : teacherId};
		obj.url = '/user/waiting/getAvatarDisabledDates';
		a.restAction(obj).then(function(res) {
			disabledSchedule = res.data;
			$rs.updateColor();
		});
	}

	//NC-8746
	$sc.getAvatarSchedule = function(targetSchedId) {
		var targetSched = $('#'+targetSchedId);
		var time = targetSched.data('time');
		var date = targetSched.data('date');
		var splitDate = date.split("-");

		var obj = {};
		obj.method = 'POST';
		obj.data = {
			userId: userId,
			teacherId: teacher_avatar_id,
			ifForCancellation: true
		};
		obj.url = '/user/waiting/avatarSlots';
		a.restAction(obj).then(function(res) {
			var resData = res.data;
			var slotDay = resData[splitDate['1']+'/'+splitDate['2']];
			var slotTime = 	slotDay.slots[time];
			var openAvatar = slotTime['open_avatar'];
			$('#'+targetSchedId+' .avalable-slots span').text(openAvatar);
		});
	}

	// avatar lesson evaluation
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
		console.log(lessonData)

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
		$('#dialog_lesson_review #lesson_teacher_name').html(teacherName+teacherNameJA);
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
					system_trouble_comment = $('#dialog_rating_lesson_connect textarea').val().trim();
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
	}
	$rs.getPrimaryDetails = function() {
		$('.lessonCountContent, .reserveCountContent, .commentCount').html('<span class="init_loader t_center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></span>');
		$.ajax({
			url: '/user/waiting/getPrimaryDetails',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$('.lessonCountContent').html(data['lessonCount'])
				$('.reserveCountContent').html(data['reserveCount'])
				$('.commentCount').html(data['commentCount'])
			}
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

	$sc.getAvatarBadgeList = function() {
		$('.compatible_textbooks').html('<p class="init_loader t_center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		var obj = {};
		obj.method = 'POST';
		obj.data = {teacher_avatar_id};
		obj.url = '/user/waiting/avatarBadgeList';
		a.restAction(obj).then(function(res) {
			$('.compatible_textbooks').html($compile(res.data)($sc));
			$( 'a[rel*=modal]').leanModal();		
			
			setTimeout(function() {
				//-set css height for compatible textbooks
				let dynamicHeight = $('.compatible_textbooks .textbooks ul li')[0].clientHeight
				let textbookList_height = $('.compatible_textbooks .textbooks ul').height()
				$('.compatible_textbooks .textbooks').css('height', dynamicHeight)
				$('.compatible_textbooks .textbooks + p').click(function(){
					let scope = $('.compatible_textbooks .textbooks')
					scope.toggleClass('active')
					var numberOfListItems = $('.textbooks ul li').length;
					if(scope.hasClass('active')){
						scope.animate({height: textbookList_height}, 250);
						$(this).children('i').css('rotate', '180deg');
						//$(' .badgeBtn span').text('閉じる');
					}else{
						scope.animate({height: dynamicHeight}, 250);
						$(this).children('i').css('rotate', '');
						//$(' .badgeBtn span').text('すべて見る(' + numberOfListItems + ')');
					}
				});

				/* RATING POPUP [START] */
				let timeoutFadeIn,
					timeoutFadeOut,
					fadeFlag = false, 
					fadeInProgress = false,
					fadeOutProgress = false,
					fadeTiming = 250
				$('.compatible_textbooks li a').hover(
					function(){
						let that = this
						fadeInProgress = true
						clearTimeout(timeoutFadeIn)
						clearTimeout(timeoutFadeOut)

						if(fadeOutProgress){
							$('.rating_popup').stop(true, true).fadeOut(fadeTiming, function(){
								fadeOutProgress = false
							})
						}
						let average_rate = $(that).data('average-rate');
						let decimal = average_rate%1;
						let integer = Math.floor(average_rate);
						for (let i = 1; i <= 5; i++) {
							if (i <= integer) {
								$('.rating_popup span.star'+i).css('width', '100%');
							} else if (i == integer + 1 && decimal > 0) {
								$('.rating_popup span.star'+i).css('width', (decimal*100)+'%');
							} else {
								$('.rating_popup span.star'+i).css('width', '0%');
							}
						}

						$('.rating_popup h2').text($(that).text());
						$('.rating_popup span.average_rate').text(average_rate);
						//- rating bar
						$('.rating_popup span.rating_bar5').css('width', $(that).data('percent5')+'%');
						$('.rating_popup span.rating_bar4').css('width', $(that).data('percent4')+'%');
						$('.rating_popup span.rating_bar3').css('width', $(that).data('percent3')+'%');
						$('.rating_popup span.rating_bar2').css('width', $(that).data('percent2')+'%');
						$('.rating_popup span.rating_bar1').css('width', $(that).data('percent1')+'%');
						//- rating count
						$('.rating_popup span.count_rate5').text($(that).data('rating5'));
						$('.rating_popup span.count_rate4').text($(that).data('rating4'));
						$('.rating_popup span.count_rate3').text($(that).data('rating3'));
						$('.rating_popup span.count_rate2').text($(that).data('rating2'));
						$('.rating_popup span.count_rate1').text($(that).data('rating1'));
						//- total count
						$('.rating_popup b.total_reviews').text($(that).data('total-reviews'));
						$('.rating_popup b.total_reserved').text($(that).data('total-reserved'));

						$('.rating_popup').css({
							'top': ($(that).offset().top + $(that).height() + 20),
							'left': (($(that).offset().left - 85) - ($(that).width() / 2))
						}).fadeIn(fadeTiming, function(){
							fadeInProgress = false
						})
					},
					function(){
						clearTimeout(timeoutFadeIn)
						clearTimeout(timeoutFadeOut)

						if(fadeInProgress){
							$('.rating_popup').stop(true, true).fadeIn(fadeTiming, function(){
								fadeInProgress = false
							})
						}

						timeoutFadeOut = setTimeout(function(){
							if(!fadeFlag && !fadeInProgress){
								fadeOutProgress = true
								$('.rating_popup').stop(true, true).fadeOut(fadeTiming, function(){
									fadeOutProgress = false
								})
							}
						}, 100)
					}
				)

				$('.rating_popup').hover(
					function(){
						fadeFlag = true
					},
					function(){
						fadeFlag = false
						fadeInProgress = false
						fadeOutProgress = true
						$(this).stop(true, true).fadeOut(fadeTiming, function(){
							fadeOutProgress = false
						})
					}
				)
				/* RATING POPUP [END] */	
			}, 1000);
		});
	}	

	$sc.init();
}]);