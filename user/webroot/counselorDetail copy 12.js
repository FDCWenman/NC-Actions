userApp
.controller('counselorDetail', ['$scope', '$rootScope', 'Ajax', '$timeout', '$compile', '$http', '$templateCache','$interval',
	function($sc, $rs, a, $timeout, $compile, $http, $tc, $interval) {
	$tc.removeAll();

	var myCounselingInfo = {};

	var jpLessonScheduleDateTime = '';

	var currentScheduleTargetId = '';
	var counselingTeacherId = '';
	var suddenLessonCounselingTeacherId = '';
	var counselingDetails = '';
	var counselorInterval = 30000; // 30 seconds
	var ajaxSuddenLessonRequest = '';
	$sc.craEvent = '';
	$sc.craContent = 0;

	$sc.craEvent = '';
	$sc.craContent = 0;
	$rs.hasLoadedInitialSuddenLesson = false;
	

	// display schedule table
	$rs.scheduleTable = function() {
		$('#reserve_table').html('<span class="loader"><i class="fa fa-spinner fa-spin"></i></span>');
		var obj = {};
		obj.method = 'POST';
		obj.data = {
			userId: userId
		};
		obj.url = '/user/waiting/counselorSlots';
		a.restAction(obj).then(function(res) {
			$('#reserve_table').html($compile(res.data)($sc));	
			$( 'a[rel*=modal]').leanModal();
			$sc.updateColor();
		});
	}

	$sc.init = function() {
        var orderElement = angular.element('#ng_constant_order');
        $sc.selectedItem = orderElement.length ? orderElement.val() : '0';
		$sc.scheduleTable();
		$rs.getLessonHistory();
		$rs.getTeacherReviews($sc.selectedItem);
		$rs.lessonOnlineFinish();
		if( typeof userId != 'undefined' && userId ) {
			checkCounselorTeacherAjax();
		}
		
	}

	// favorite for users
	$sc.fav = function(event) {
		if (!userId) {
			location.reload();
		}
		var target = $(event.target);
		if (target.hasClass('fav_disable')) {						
			var type = 1;
			target.removeClass('fav_disable').addClass('fav_enable').css({
				background: "#F1890E"
			});
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

	//NJ-20069
	$rs.getLessonHistory = function(){
		var teacherId = $('#teacherIdInput').val();
		$.ajax({
			url: '/waiting/getCounselorLessonHistory',
			type: 'POST',
			dataType: 'json',
			data: { teacherId: teacherId },
			success: function(data) {
				$rs.lessonHistories = data.lessonHistory;
			}
		});
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

		//get actual jp time
		var jpLessonDate = target.attr('data-jp-date');
		var jpLessonTime = target.attr('data-jp-time');
		jpLessonScheduleDateTime = jpLessonDate+" "+jpLessonTime+":00";

		var action = '';
		//check if not login
		if (target.attr('data-href') == '#dialog_login') {
			$sc.forReservation(target);
			return false;
		}
		//get action add or cancel
		if (target.attr('data-href') == '#dialog_counseling_reserve') {
			action = 'add';
		} else if (target.attr('data-href') == '#dialog_schedule_cancel') {
			action = 'cancel';
		} else {
			console.log('No target selected');
			return false;
		}

		var obj = {};
		obj.method = 'POST';
		obj.data = {action : action, lessonDate: lessonDate, lessonTime: jpLessonScheduleDateTime};
		obj.url = '/user/waiting/counselingLimit';
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

					if (result.isExpired != "" ) {
						$('#dialog_schedule_cancel span.coin_expiration_date').text(result.isExpired);
						$('#dialog_schedule_cancel .cancel_no_coin_return_expire').show();
						$('#dialog_schedule_cancel .normal_cancel').hide();
						$('#dialog_schedule_cancel .cancel_no_coin_return').hide();
					} else { // normal cancel
						$('#dialog_schedule_cancel .normal_cancel').show();
						$('#dialog_schedule_cancel .cancel_no_coin_return').hide();
						$('#dialog_schedule_cancel .cancel_no_coin_return_expire').hide();
					}

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

	// - catch continue reservation
	$(document).on('click', "#dialog_reservation_cancel_notice ul li a#reservation_modal", function() {
		var scheduleTargetId = $(this).attr('data-schedule-id');
		var target = $('#' + scheduleTargetId);
		setTimeout(
			function() {
				$sc.forReservation(target);
			}, 
			450
		);
	});

	$(document).on('click', "#counselingChargeConfirmOk", function() {
		if ($sc.craContent == 0) {
			setTimeout(
				function() {
					$sc.selectSchedule($sc.craEvent);
				},
				250
			);
		} 
		if ($sc.craContent == 1) {
			setTimeout(
				function() {
					$("#trigger_modal_reservation_cancel_notice").click();
				}, 
				450
			);
		}
	});

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
			if (target.hasClass('forReservation')) {
				$sc.forReservation(target);
			} else if(target.hasClass('forCancellation')) {
				$('#trigger_dialog_schedule_cancel').click();
			} else {
				return false;
			}
		});
	}

	// student choose a reservation
	$sc.forReservation = function(target) {
		var targetId = target.attr('id');

		$('#dialog_schedule_reserve .iframe_textbook').attr('src', '');
		$('#dialog_schedule_reserve .textbook_option').html('<p style="text-align:center"><span class="loader"><i class="fa fa-spinner fa-spin"></i></span></p>');
		switch(target.attr('data-href')) {
			case '#dialog_login':
				$('#dialog_login > h3').text('ログインが必要です');
				$('#dialog_login > p').text('こちらの機能は、ログイン後にご利用いただけます。');
				$('#dialog_login > div > ul').html('<li><a class="btn_style btn_green" href="/login">ログインはこちら</a></li><li><a class="btn_style btn_orange" href="/register">新規会員登録はこちら</a></li>');
				$('#trigger_dialog_login').click();
				break;
			case '#dialog_counseling_reserve':
				var date = target.data('date') + ' ' + target.data('time');
				var counselDate = target.data('date').replace(/\-/g,'/') + target.parents('tr').find('.day').text() +' ' + target.data('time');
				$('#dialog_counseling_reserve #reserved_time').text(counselDate);
				$('#dialog_counseling_reserve_confirm #con_reserved_time').text(counselDate);
				$('#counsel_confirm').attr('data-date', target.data('date').replace(/\//g,'-')).attr('date-time', date).attr('data-lsid', targetId);
				$sc.$apply(function () {
					$sc.cReservedTime = counselDate;
					$sc.initializeCounselingModal();
				});				
				break;
		}
	}

	$sc.c_occupationVal = '0';

	// initialize counseling modal elements
	$sc.initializeCounselingModal = function() {
		var counselingAnswersCookie = JSON.parse(readCookie('counseling_answers_cookie'));
		$('#trigger_modal_counseling_reserve').click();
		$('.item .msg').parent('div').hide();
		var	counselingAnswersObj = {};

		c_occupationVal = '0';
		counselingAbroadVal = '';
		c_schoolnameVal = '';
		c_deptnameVal = '';
		c_others_scoresVal = '';
		c_purposeVal = '0';
		c_purposeAnswerVal = '0';
		c_purposeAnswerTodoVal = '';
		c_escVal = '0';
		c_esccVal = '0';
		c_eikenVal = '0';
		c_toeicVal = '0';
		c_bywhenVal = '0';
		c_consultationVal = '0';

		if (counselingAnswersCookie) {
			counselingAnswersCookie.forEach(function(element) {
				if (typeof element.name !== 'undefined') {
					counselingAnswersObj[element.name] = element.value;
					switch(element.name) {
						case 'occupation':
							if (element.value != '') {
								c_occupationVal = element.value.toString();
							}
							break;
						case 'school_name':
							if (element.value != '') {
								c_schoolnameVal = element.value.toString();
							}
							break;
						case 'department_name':
							if (element.value != '') {
								c_deptnameVal = element.value.toString();
							}
							break;
						case 'exp_abroad':
							if (element.value != '') {
								counselingAbroadVal = element.value.toString();
							}
							break;
						case 'purpose':
							if (element.value != '') {
								c_purposeVal = element.value.toString();
							}
							break;
						case 'others_scores':
							if (element.value != '') {
								c_others_scoresVal = element.value.toString();
							}
							break;
						case 'answer_other_score':
							if (element.value != '') {
								c_purposeAnswerVal = element.value.toString();
							}
							break;
						case 'answer_other_score_todo':
							if (element.value != '') {
								c_purposeAnswerTodoVal = element.value.toString();
							}
							break;
						case 'english_school_career':
							if (element.value != '') {
								c_escVal = element.value.toString();
							}
							break;
						case 'english_school_commuter_career':
							if (element.value != '') {
								c_esccVal = element.value.toString();
							}
							break;
						case 'eiken':
							if (element.value != '') {
								c_eikenVal = element.value.toString();
							}
							break;
						case 'toeic':
							if (element.value != '') {
								c_toeicVal = element.value.toString();
							}
							break;
						case 'by_when':
							if (element.value != '') {
								c_bywhenVal = element.value.toString();
							}
							break;
						case 'consultation_details':
							if (element.value != '') {
								c_consultationVal = element.value.toString();
							}
							break;
						default:
							break;
					}
				}
			});
		} else {
			if(counselingDetails.Counseling){
				c_consultationVal = counselingDetails.Counseling.consultation_detail;
				c_occupationVal = counselingDetails.Counseling.occupation;
				c_schoolnameVal = counselingDetails.Counseling.school_name;
				c_deptnameVal = counselingDetails.Counseling.department_name;
				counselingAbroadVal = counselingDetails.Counseling.exp_abroad_flg;
				c_purposeVal = counselingDetails.Counseling.purpose;
				c_others_scoresVal = counselingDetails.Counseling.other_score;
				c_purposeAnswerVal = counselingDetails.Counseling.goal;
				c_purposeAnswerTodoVal = counselingDetails.Counseling.to_do;
				c_escVal = counselingDetails.Counseling.english_school_career;
				c_esccVal = counselingDetails.Counseling.english_physical_school_career;
				c_eikenVal = counselingDetails.Counseling.eiken;
				c_toeicVal = counselingDetails.Counseling.toeic;
				c_bywhenVal = counselingDetails.Counseling.by_when;
			}else{
				c_occupationVal = '0';
				counselingAbroadVal = '';
				c_schoolnameVal = '';
				c_deptnameVal = '';
				c_others_scoresVal = '';
				c_purposeVal = '0';
				c_purposeAnswerVal = '0';
				c_purposeAnswerTodoVal = '';
				c_escVal = '0';
				c_esccVal = '0';
				c_eikenVal = '0';
				c_toeicVal = '0';
				c_bywhenVal = '0';
				c_consultationVal = '0';
			}
		}
		$sc.c_consultationVal = c_consultationVal;
		$sc.c_occupationVal = c_occupationVal;
		//$sc.counselingOccupation($sc.c_occupationVal);
		$sc.counselingAbroadVal = counselingAbroadVal;
		//$sc.counselingAbroad($sc.counselingAbroadVal);
		$sc.c_schoolnameVal = c_schoolnameVal;
		$sc.c_deptnameVal = c_deptnameVal;
		$sc.c_purposeVal = c_purposeVal;
		$sc.c_others_scoresVal = c_others_scoresVal;
		$sc.c_escVal = c_escVal;
		$sc.c_esccVal = c_esccVal;
		$sc.c_eikenVal = c_eikenVal;
		$sc.c_toeicVal = c_toeicVal;
		$sc.c_bywhenVal = c_bywhenVal;
		$sc.c_purposeAnswerTodoVal = c_purposeAnswerTodoVal;
		$sc.c_purposeAnswerVal = c_purposeAnswerVal;
		$sc.counselingPurposeOthers($sc.c_purposeAnswerVal);
	}

	// counseling option ocuppation
	/*$sc.counselingOccupation = function(value) {
		if(Number(value) == 5){
			$('#counseling_sheet_item-occupation_student').show();
		}else{
			$('#counseling_sheet_item-occupation_student').hide();
		}
	}*/

	// counseling option abroad
	// NC4836 disable this functionality
	/*$sc.counselingAbroad = function(value){
		if (Number(value)) {
			$('#counseling_sheet_item-abroad_detail').show();
		} else {
			$('#counseling_sheet_item-abroad_detail').hide();
		}
	}*/

	// counseling option Purpose target
	$sc.counselingPurposeOthers = function(value){
		if (Number(value) == 8) {
			$('#counseling_sheet_item-purpose_other').show();
		} else {
			$('#counseling_sheet_item-purpose_other').hide();
		}
	}

	$sc.saveAndExitCounselingSheet = function() {
		var data = $('#counselingForm').serializeArray();
		var cookieData = JSON.stringify(data);
		createCookie('counseling_answers_cookie', cookieData);
	}

	$sc.validateCounselingAnswers = function(callback) {
		var data = $('#counselingForm').serializeArray();
		var error = false;
		var keys = [];
		var objData = {};
		var _unselected = '未選択';
		var _blank = '未記入';


		data.forEach(function(element) {
			if (typeof element.name !== 'undefined') {
				keys.push(element.name);
				objData[element.name] = element.value;

				switch(element.name) {
					// - required fields
					case 'occupation':
						if (!parseInt(element.value)) {
							error = true;
							$('#occupation_errmsg').show();
						} else {
							$('#occupation_errmsg').hide();
						}
						break;
					case 'english_school_career':
						if (!parseInt(element.value)) {
							error = true;
							$('#english_school_career_errmsg').show();
						} else {
							$('#english_school_career_errmsg').hide();
						}
						break;
					case 'english_school_commuter_career':
						if (!parseInt(element.value)) {
							error = true;
							$('#english_school_commuter_career_errmsg').show();
						} else {
							$('#english_school_commuter_career_errmsg').hide();
						}
						break;
					case 'consultation_details':
						if (!parseInt(element.value)) {
							$('#consultation_details_errmsg').show();
							error = true;
						} else {
							$('#consultation_details_errmsg').hide();
						}
						break;
					case 'answer_other_score':
						if (!parseInt(element.value)) {
							$('#answer_other_score_errmsg').show();
							error = true;
						} else {
							$('#answer_other_score_errmsg').hide();
						}
						break;

					default:
						// do nothing
				}
			}
		});
		if (keys.indexOf('exp_abroad') < 0) {
			$('#exp_abroad_errmsg').show();
			error = true;
		} else {
			$('#exp_abroad_errmsg').hide();
		}


		if (error) {
			console.log(error);
			return;
		}

		myCounselingInfo = objData;
		
		$sc.con_occupationVal = '';
		$sc.con_abroadVal = '';
		$sc.con_schoolnameVal = '';
		$sc.con_deptnameVal = '';
		$sc.con_purposeVal = '';
		$sc.con_others_scoresVal = '';
		$sc.con_answer_other_scoreVal = '';
		$sc.con_answer_other_score_todoVal = '';
		$sc.con_escVal = '';
		$sc.con_esccVal = '';
		$sc.con_eikenVal = '';
		$sc.con_toeicVal = '';
		$sc.con_bywhenVal = '';
		$sc.con_consultationVal = '';
		// - get selection texts
		$sc.con_occupationVal = $('#counseling_sheet_select-occupation option:selected').text();
		$sc.con_abroadVal = $('input[name="exp_abroad"]:checked').parent('li').children('label').text();
		/*if (objData.occupation == '5') {
			if (objData.school_name.length !== 0) {
				$sc.con_schoolnameVal = objData.school_name;
			}
			if (objData.department_name.length !== 0) {
				$sc.con_deptnameVal = objData.department_name;
			}
		}*/
		
		if (objData.purpose != '0') {
			$sc.con_purposeVal = $('#purpose option:selected').text();
		}
		

		if (objData.english_school_career != '0') {
			$sc.con_escVal = $('#english_school_career option:selected').text();
		}

		if (objData.others_scores != '') {
			$sc.con_others_scoresVal = $('textarea#others_scores').val();
		}

		if (objData.answer_other_score != '') {
			$sc.con_answer_other_scoreVal = $('#answer_other_score option:selected').text();
			if(objData.answer_other_score == 8){
				if (objData.answer_other_score_todo != '') {
					$sc.con_answer_other_score_todoVal = $('textarea#answer_other_score_todo').val();
				}
			}else{
				$sc.con_answer_other_score_todoVal = '';
			}
		}


		if (objData.english_school_commuter_career != '0') {
			$sc.con_esccVal = $('#english_school_commuter_career option:selected').text();
		}

		if (objData.eiken != '0') {
			$sc.con_eikenVal = $('#eiken option:selected').text();
		}

		if (objData.toeic != '0') {
			$sc.con_toeicVal = $('#toeic option:selected').text();
		}

		if (objData.by_when != '0') {
			$sc.con_bywhenVal = $('#by_when option:selected').text();
		}

		if (objData.consultation_details.length != '0') {
			$sc.con_consultationVal = $('#consultation_details option:selected').text();
		}

		$('#dialog_counseling_reserve .btn_close').click();
		setTimeout(
			function() {
				// $('#saveCounselingSchedule').attr('data-date', $('#counsel_confirm').attr('data-date').replace(/\//g,'-')).attr('date-time', $('#counsel_confirm').attr('date-time')).attr('data-lsid', $('#counsel_confirm').attr('data-lsid'));
				$('#trigger_modal_counseling_reserve_confirm').click();
			},
			450
		);
	}

	// click counseling reserve edit
	$sc.counselingReserveEdit = function() {
		$('#dialog_counseling_reserve_confirm .btn_close').click();
		$timeout(function() { $('#trigger_modal_counseling_reserve').click(); }, 250);
	}

	$sc.saveCounselingSchedule = function() {
		var obj = {};
		obj.method = 'POST';
		obj.data = {begin_at : jpLessonScheduleDateTime, counseling_data: myCounselingInfo};
		obj.url = '/user/api/counseling-reservation';
		a.restAction(obj).then(function(res) {
			var result = res.data;
			$('#dialog_counseling_reserve_confirm .btn_close').click();
			if (typeof result.created != 'undefined' && result.created == true) {
				setTimeout(
					function() {
						// NC-5126
						var startTime = $rs.getModifiedTime(jpLessonScheduleDateTime, true);
						var endTime = $rs.getModifiedTime(jpLessonScheduleDateTime, false);
						$('#dialog_counseling_reserve_complete .btn_google_counselor').attr('start_time', startTime).attr('end_time', endTime);

						$('#trigger_modal_counseling_reserve_complete').click();
						$sc.updateReservedCancelledCOlor();
						$sc.refreshSchedColor();
						eraseCookie('counseling_answers_cookie');
					},
					450
				);
			} else {
				// - perform action from result
				switch (result.error) {
					case '-1':
						// - the_begin_time_you_specified_is_already_scheduled
						$sc.openErrorMessageDialog('予約エラー', '指定された開始時間は既にスケジュールされています。');
						break;
					case '-2':
						// - reservation_is_possible_until_ten_minutes_before
						$sc.openErrorMessageDialog('予約エラー', '予約ができませんでした。予約は開始時間の10分前まで可能です。');
						break;
					case '-3':
						// - you_do_not_have_enough_coins_for_reservation
						$sc.openErrorMessageDialog('予約エラー', 'コインが不足しています。');
						break;
					case '-4':
						// - schedule_is_not_available_for_reservation
						$sc.openErrorMessageDialog('予約エラー', 'このスケジュールは予約できません。');
						break;
					case '-5':
						// - within_the_duration_of_the_campaign_period_is_you_can_only_reserve_once
						$sc.openErrorMessageDialog('予約エラー', 'キャンペーン期間中は、1回のみ予約可能です。');
						break;
					case '-10':
						// - reservation_time_has_already_passed
						$sc.openErrorMessageDialog('予約エラー', '予約時間は既に過ぎています。');
						break;
					case '-13':
						$('#trigger_dialog_schedule_reserve_corp_light_err2_modal').click();
						break;
					case '-14':
						$('#trigger_dialog_schedule_reserve_server_fail').click();
						break;
					default:
						console.log(result.error);
						break;
				}
				var errorCase = ['-1', '-2', '-4', '-10'];
				if (typeof result.error != 'undefined' && errorCase.indexOf(result.error) != -1) {
					$sc.scheduleTable();
				}
			}
		});	

	}

	$sc.cancelReservedSchedule = function() {
		var obj = {};
		obj.method = 'POST';
		obj.data = {begin_at : jpLessonScheduleDateTime};
		obj.url = '/user/api/cancel-counseling';

		a.restAction(obj).then(function(res) {
			var result = res.data;
			$('#dialog_schedule_cancel .btn_close').click();

			if (typeof result.cancelled != 'undefined' && result.cancelled == true ) {
				setTimeout(
					function() {
						$('#trigger_dialog_schedule_cancel_complete').click();
						$sc.updateReservedCancelledCOlor();
						$sc.refreshSchedColor();
					},
					450
				);
			} else {
				// - perform action from result
				switch (result.error) {
					case 0 :
						// - the_begin_time_you_specified_is_not_scheduled
						$sc.openErrorMessageDialog('キャンセルエラー', '指定された開始時間はスケジュールにありません。');
						break;
					case 2 : 
						$("#trigger_modal_reservation_cancel_limit").click();
						break;
					case 3 :
						console.log('[CANCELLATION ERROR] - Invalid date format');
						break;
					default:
						break;
				}
			}
		});	
	}

	$sc.openErrorMessageDialog = function(title, desc) {
		$('#dialog_error_message #errTitle').text(title);
		$('#dialog_error_message #errDesc').text(desc);
		$('#trigger_dialog_error_message').click();
	}

	$sc.updateReservedCancelledCOlor = function() {
		targetSched = $('#'+currentScheduleTargetId);
		if (targetSched.hasClass('forReservation')) {
			targetSched.removeClass('btn_green');
			targetSched.removeClass('forReservation');
			targetSched.addClass('reserved');
			targetSched.addClass('forCancellation');
			targetSched.attr('data-href', '#dialog_schedule_cancel');
			$('#'+currentScheduleTargetId+' .avalable-slots').hide();
		} else if(targetSched.hasClass('forCancellation')) {
			targetSched.removeClass('reserved');
			targetSched.removeClass('forCancellation');
			targetSched.addClass('btn_green');
			targetSched.addClass('forReservation');
			targetSched.attr('data-href', '#dialog_counseling_reserve');
			$sc.getCounselorSchedule();
		}

		var selecter = '.header_cnt_coin';
		var method   = 'html(value)';
		new UserAPI.getUserPoint(selecter, method);

	}

	//NC-8981
	$sc.getCounselorSchedule = function() {
		var targetSched = $('#'+currentScheduleTargetId);
		var time = targetSched.data('time');
		var date = targetSched.data('date');
		var splitDate = date.split("-");

		var obj = {};
		obj.method = 'POST';
		obj.data = {
			userId: userId,
			ifForCancellation: true
		};
		obj.url = '/user/waiting/counselorSlots';
		a.restAction(obj).then(function(res) {
			var resData = res.data;
			var slotDay = resData[splitDate['1']+'/'+splitDate['2']];
			var slotTime = 	slotDay.slots[time];
			var openCounselor = slotTime['open_counselor'];
			$('#'+currentScheduleTargetId+' .avalable-slots span').text(openCounselor);
			//Display the available slots if counseling lesson reservation is cancelled
			$('#'+currentScheduleTargetId+' .avalable-slots').show();
		});
	}

	$sc.updateColor = function() {
		if (isNotSupportedBrowser()) {
			$(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('btn_green');
			$(".teacher_reserve_table tbody tr  td  a.forReservation").addClass('not_available');
		}
		if (!disabledSchedule.success) {
			return false;
		}	
		if (disabledSchedule.disableAll) {
			$('.notice_max_limit').removeClass('hide');
			$(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('btn_green');
			$(".teacher_reserve_table tbody tr  td  a.forReservation").addClass('max_limit');
		} else if (disabledSchedule.disabledDays) {
			$(disabledSchedule.disabledDays).each(function(index, data) {
				$('.teacher_reserve_table tr#lsdate' + data).children('td').find('a.forReservation').addClass('max_limit');
				$('.teacher_reserve_table tr#lsdate' + data).children('td').find('a.forReservation').find('div.avalable-slots').hide();
			});
		}

		if (!disabledSchedule.disableAll) {
			$('.notice_max_limit').addClass('hide');
		}
	}

	$sc.refreshSchedColor = function() {
		//reset color first
		$(".teacher_reserve_table tbody tr  td  a.forReservation").removeClass('max_limit');
		$(".teacher_reserve_table tbody tr  td  a.forReservation").addClass('btn_green');
		$(".teacher_reserve_table tbody tr  td  a.forReservation").find('div.avalable-slots').show();
		//request new disable schedule
		var obj = {};
		obj.method = 'POST';
		obj.data = {userId : userId};
		obj.url = '/user/waiting/counselingGetDisabledDates';
		a.restAction(obj).then(function(res) {
			disabledSchedule = res.data;
			$sc.updateColor();
		});
	}

	$sc.counselingStartButton = 1;
	/**
	 * load/refresh counseling start button
	 */
	$rs.updateCounselingStartButton = function(userId){
		var obj = {};
		obj.method = 'POST';
		obj.data = {userId : userId};
		obj.url = '/user/waiting/checkCounselingReservationNow';
		a.restAction(obj).then(function(res) {
			data = res.data;
			if (data.status == 'OK' && typeof data.state != 'undefined') {
				$sc.counselingStartButton = data.state;
				if (data.state == 2) {
					counselingTeacherId = data.teacher_id;
				}
			}
		});
	}

	$sc.counselingDisableState = 0; // not disabled
	$rs.startCurrentReserveCounseling = function(event) {
		// var obj = {userID: userId, teacherID: counselingTeacherId};
		startClass({
			userID: userId,
			teacherID: counselingTeacherId
		});
	}

	$rs.startSuddenLessonCounseling = function(event) {
		$sc.counselingDisableState = 1; // disabled
		var buttonWrapperSelectorObj = $('#sudden_lesson_button_wrapper ul li a');
		buttonWrapperSelectorObj.removeClass().addClass('btn_style fs_19 disabled');
		startClass({
			userID: userId,
			teacherID: suddenLessonCounselingTeacherId
		});
	}

	$sc.loadingReviews = false;
	$rs.btnLoadReviewsShow = true;
	$rs.moreTeacherReviewsPage = 1;

	$sc.loadMoreReviews = function(data) {
		if ($sc.loadingReviews) {
			return;
		}
		var isLog = angular.element(data.target).data('login');
		$sc.loadingReviews = true;
		var obj = {};
		obj.method = 'POST';
		obj.data = {
			isCounseling : true,
			page: $rs.moreTeacherReviewsPage,
			order: $('#teacher-review-sort-select').length > 0 ? $('#teacher-review-sort-select').val() : 0
		};
		obj.url = '/user/waiting/loadMoreComments';
		a.restAction(obj).then(function(res) {
			data = res.data;
			
				console.log(data);
			var reviews = '';
			if (data.lastPage) {
				$rs.btnLoadReviewsShow = false;
			}

			if(typeof reviewCount !== 'undefined' && (reviewCount) && reviewCount > $('.teacher_review_area .review_list_wrap li').length){
				$rs.btnLoadReviewsShow = true;
			}

			data.data.forEach(function(element) {
				var textbookType = element.textbook.textbook_category_type_id == 1 ? 'course': 'series';
				var textbookLink = localizeUrl + `/textbook/${textbookType}/${element.textbook.textbook_category_id}`;
				reviews += '<li>';
                // Star
				reviews += '<div class="list_top"><div class="rating_star_wrap v_middle" style="display: inline-block;">'+element.star+'</div>';
				// Review date
                reviews += '<span class="datetime">' + moment(element.date).format('YYYY-MM') + '</span></div>';
                // User comment
				reviews += '<div class="list_bottom review_comment"><p class="desc">'+element.user_comment+'</p>';
				reviews += '<div class="review_btn_wrap">';
                // Textbook content
                reviews += '<div class="col_review_textbook">';
                if (element.textbook) {
                    reviews += ' <span class="chapter_title">';
                    reviews += '   <figure class="d_table">';
                    reviews += '     <a class="lesson_textbook d_cell" href="' + textbookLink + '">';
                    reviews += '         <img class="ic_textbook" src="' + element.textbook.textbook_image + '">';
                    reviews += '     </a>';
                    reviews += '     <figcaption class="textbook_name t_link">';
                    reviews += '       <a class="lesson_textbook t_link" href="' + textbookLink + '">';
                    reviews += '        ' + element.textbook.textbook_name_lv1 +'</a>';
                    reviews += '     </figcaption>';
                    reviews += '   </figure>';
                    reviews += ' </span>';
                }
                reviews += '</div>';
                // Like and translate button
                if (isLog === true) {
                    reviews += '<div class="eval_review_wrap" data-id="' + element.id + '">';
                    reviews += '<button class="btn_eval btn_like ' + (element.voted == 2 ? 'on' : '') + '" id="btnLike">';
                    reviews += '<i class="fa fa-thumbs-up" aria-hidden="true"></i>';
                    reviews += '<span class="eval_num">' + (element.like_total > 0 ? element.like_total : '') + '</span>';
                    reviews += '</button>';
                    reviews += '</div>';
                    reviews += '<button class="btn-translate" data-btnState="0" data-reviewId="' + element.id + '">翻訳する</button>';
                }
				reviews += '</div>';
				reviews += '</div>';
				//reviews += '<div class="list_bottom review_comment"><p class="desc">'+element.user_comment+'</p><button class="btn-translate" data-btnState="0" data-reviewId="'+element.id+'">翻訳する</button></div>';
				reviews += '</li>';
			});

			$('#review_list').append(reviews);
			$rs.moreTeacherReviewsPage += 1;
			$sc.loadingReviews = false;
		});
	}

	function createCookie(name, value, days) {
		var expires;

		if (days) {
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toGMTString();
		} else {
			expires = "";
		}
		document.cookie = encodeURIComponent(name) + "=" + encodeURIComponent(value) + expires + "; path=/";
	}

	function readCookie(name) {
		var nameEQ = encodeURIComponent(name) + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = ca[i];
			while (c.charAt(0) === ' ')
				c = c.substring(1, c.length);
			if (c.indexOf(nameEQ) === 0)
				return decodeURIComponent(c.substring(nameEQ.length, c.length));
		}
		return null;
	}

	function eraseCookie(name) {
		createCookie(name, "", -1);
	}

	function checkCounselorTeacherAjax() {

		// recruitment page
		if (typeof isRecruitmentPage !== 'undefined' && isRecruitmentPage == true) {
			return false;
		}

		if( ajaxSuddenLessonRequest == '' ) {
			var obj = {};
			obj.url = '/user/Waiting/checkCounselorTeacherButtonStatus';
			obj.data = { localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : "" };
			obj.method = 'POST';
			obj.timeout = 10000; // 10 seconds timeout

			ajaxSuddenLessonRequest = a.restAction(obj).then(function(res) {
				var data = res.data;
				
				var status = parseInt(data.res);
				var buttonWrapperSelectorObj = $('#sudden_lesson_button_wrapper ul li a');
				var lessonAlertWrapper = $('#counselor_daily_limit_wrapper');
				let textMessage = buttonWrapperSelectorObj.attr('message_default');

				switch (status) {
				   	case 1: // Stand by teacher
						buttonWrapperSelectorObj.html(textMessage);
						buttonWrapperSelectorObj.removeClass().addClass('btn_style btn_blue fs_19');
						buttonWrapperSelectorObj.attr('ng-click',"startSuddenLessonCounseling($event)");
						$compile(buttonWrapperSelectorObj)($sc);	
						break;
					case 2: // Ongoing Lesson
						textMessage = buttonWrapperSelectorObj.attr('message_busy');
						buttonWrapperSelectorObj.html(textMessage);
						buttonWrapperSelectorObj.removeClass().addClass('btn_style btn_lesson_status-busy fs_19');
						break;
					case 3: // Logout

						buttonWrapperSelectorObj.html(textMessage);
						buttonWrapperSelectorObj.removeClass().addClass('btn_style btn_blue fs_19');
						break;
				   default: 
				   		buttonWrapperSelectorObj.html(textMessage);
						buttonWrapperSelectorObj.removeClass().addClass('btn_style fs_19 disabled');
				}

				if( typeof data.available_teacher != 'undefined' && data.available_teacher ) {
					suddenLessonCounselingTeacherId = data.available_teacher;
				}

				if( typeof data.exceed_daily_limit != 'undefined' && data.exceed_daily_limit ) {
					if( lessonAlertWrapper.hasClass('hide') ) {
						lessonAlertWrapper.removeClass('hide');
					}
				} else {
					if( lessonAlertWrapper.hasClass('hide') ) {
						// skip
					} else {
						lessonAlertWrapper.addClass('hide');
					}
				}

				// check initial page load
				if ( $rs.hasLoadedInitialSuddenLesson == false ) {
					$rs.hasLoadedInitialSuddenLesson == true;
					// set interval every 30 seconds
					$interval(checkCounselorTeacherAjax, counselorInterval); 
				}

				// reset ajax request
				ajaxSuddenLessonRequest = '';

			});
		}

	}

	// counselor class evaluation
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
							textbook_category_type:parseInt(lessonData?.textbookCategoryType),
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