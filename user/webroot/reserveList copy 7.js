userApp
.controller('reserveList', ['$scope', '$rootScope', '$compile', '$http', '$templateCache', '$window',
	function($sc, $rs, $compile, $http, $tc, $window) {
	
	$tc.removeAll();

	$rs.loadingTextbook = false;
	$rs.updatingTextbook = false;
	$rs.disableEiken = false;
	$rs.modalId = "#dialog_reserved_lesson_textbook_preset";
	$rs.bookedId = 0;
	$rs.connectId = 0;
	$rs.callanHalf = 0;

	/**
	 * fetch textbooks
	 */
	$sc.updateTextbookOption = function(event) {
		// set var
		var isSubstituteTeacher = parseInt(event.currentTarget.getAttribute("data-is_substitute_teacher"));
		var btn = $(event.currentTarget);

		$rs.eiken_message = false;
		var teacherId = parseInt(event.currentTarget.getAttribute("data-id"));
		$rs.connectId = parseInt(event.currentTarget.getAttribute("data-connect-id"));
		$rs.bookedId = parseInt(event.currentTarget.getAttribute("data-booked-id"));
		$rs.callanHalf = parseInt(event.currentTarget.getAttribute("data-callan-halfprice"));
		$rs.live_flg = parseInt(event.currentTarget.getAttribute("data-live"));

		if(btn.hasClass('disable')){
			return;
		}

		//set modal details
		$($rs.modalId + " img#img-id").attr("src", event.currentTarget.getAttribute("data-image"));
		$($rs.modalId + " img#img-id").attr("alt", event.currentTarget.getAttribute("data-name"));
		$($rs.modalId + " span#name").html(event.currentTarget.getAttribute("data-name"));
		$($rs.modalId + " span#jp_name").html(event.currentTarget.getAttribute("data-jpname"));
		$($rs.modalId + " .date-wrap #date").html(event.currentTarget.getAttribute("data-date_new"));
		//enable save textbook on open
		$($rs.modalId + " a#change_textbook").removeClass('disabled');
		$rs.disableEiken = false;
		//set teacher value for textbook
		$("#teacherIdInput").val(teacherId);

        // NJ-18824
        var textbookImg = $("#booked-detail-" + $rs.bookedId + " a.data_textbook_img").attr('textbook-img');
        var textbookCategoryName = $("#booked-detail-" + $rs.bookedId + " span.update_category_name").text();
        var subCategoryName = $("#booked-detail-" + $rs.bookedId + " span.update_sub_category_name").text();
        var chapterName = $("#booked-detail-" + $rs.bookedId + " span.update_chapter_name").attr('textbook_chapter_orig');

        $($rs.modalId + ' #textbook-img').attr('src', textbookImg);
        $($rs.modalId + ' #category-name').text(textbookCategoryName);
        $($rs.modalId + ' #subcategory-name').text(subCategoryName);
        $($rs.modalId + ' #chapter-name').text(chapterName);

		//if still on request do nothing
		if ($rs.loadingTextbook) {
			console.log('Textbook still loading.');
			return;
		}

        $http({
            method: 'POST',
            url: '/user/lesson-reservation/substitute_lesson_started',
            data: {
                booked_id: $rs.bookedId,
                is_substitute_teacher: isSubstituteTeacher,
            },
            beforeSend: function(){
				$rs.loadingTextbook = true;
			}
        }).then(function(result) {
            var data = result.data;

            // substitute lesson already started (0-6 mins)
			if(typeof data.substitute_lesson_started !== 'undefined' && data.substitute_lesson_started){

				// disable change textbook 
				btn.attr('disabled', true).addClass('disable');
				$rs.loadingTextbook = false;

				return;
			}            

            $rs.optionDataTextbookGen = {
                modalId: 'dialog_reserved_lesson_textbook_preset',
                teacher_id: teacherId,
				connect_id: $rs.connectId,
				callan_half: $rs.callanHalf,
				booked_id: $rs.bookedId,
				is_substitute_teacher: isSubstituteTeacher,
				localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : "",
				live_flag: $rs.live_flg
            }
            
            $("#trigger_modal_reserved_lesson_textbook_preset").click();
            $('#dialog_reserved_lesson_textbook_preset .textbook_option').html('');
            $rs.updateTextbookOptionGeneral($rs.optionDataTextbookGen);
        });
	};

	/**
	* reservation-list update textbook 
	*/
	$rs.saveTextbook = function() {
		if ($rs.updatingTextbook) {
			console.log('Still updating textbooks.');
			return;
		}
		//eiken is disabled
		if ($rs.disableEiken) {
			console.log('Textbook eiken disabled.');
			return;
		}
		var connectId = "";
		var categoryImage = "";
		var categoryName = "";
		var chapterName = "";
        var bookType = $($rs.modalId + ' .iframe_textbook').attr('textbook-type');
		var categoryType = $($rs.modalId + ' .iframe_textbook').attr('category-type');

        connectId = $($rs.modalId + " .iframe_textbook").attr('connect-id');
        categoryImage = $($rs.modalId + " .tb_icon_wrap img").attr('src');
        categoryName = $($rs.modalId + " .tb_ttl").attr('sub-category-name');
		chapterName = $($rs.modalId + " .iframe_textbook").attr('chapter-name');
		
		if (connectId == $rs.connectId) {
			console.log('Same textbook.');
			return;
		}
		//update reservation connect_id
		$http({
			method: 'POST',
			url: '/user/lesson-reservation/update-reservation/',
			data: {
				booked_id: $rs.bookedId,
				connect_id: connectId,
				localizeDir: typeof window.localizeDir !== "undefined" ? window.localizeDir : ""
			},
			beforeSend: function(){
				$rs.updatingTextbook = true;
			}
		}).then(function(result) {
			if (result.data.success) {
				//update reservation list detail

				var categoryName = "";
				var subCategoryName = "";
				var chapterNameDisplay = "";
				var chapterNameOrigDisplay = "";
                var textbookType = "";

				categoryName = (typeof result.data.textbook_category_name !== "undefined") ? result.data.textbook_category_name : categoryName;
				subCategoryName = (typeof result.data.textbook_subcategory_name !== "undefined") ? result.data.textbook_subcategory_name : subCategoryName;
				chapterNameDisplay = (typeof result.data.textbook_name !== "undefined") ? result.data.textbook_name : chapterNameDisplay;
				chapterNameOrigDisplay = (typeof result.data.chapter_name_orig !== "undefined") ? result.data.chapter_name_orig : chapterNameOrigDisplay;
                textbookType = (typeof result.data.textbook_type !== "undefined") ? result.data.textbook_type : 1;

                if ($rs.useScope === 'scheduleListController') {
                    $rs.$emit('callUpdateTeacherSlot', {
                        'result': result.data,
                        'categoryType': categoryType,
                        'connectId': connectId,
                        'categoryName': categoryName,
                        'subCategoryName': subCategoryName,
                        'chapterName': chapterNameDisplay
                    });
                } else {
                    $("#booked-detail-" + $rs.bookedId + " span.update_category_name").html(categoryName);
                    $("#booked-detail-" + $rs.bookedId + " span.update_sub_category_name").html(subCategoryName);
                    $("#booked-detail-" + $rs.bookedId + " span.update_chapter_name").attr('textbook_chapter_orig',chapterNameOrigDisplay).html(chapterNameDisplay);

                    //hide modify textbook button if callan
                    if ($rs.callanHalf == 1 && (categoryType == 2 || categoryType == 5 || categoryType == 6)) {
                        $("#booked-detail-" + $rs.bookedId + " a.booked-detail").remove();
                    } else {
                        //update page book detail connect_id
                        $("#booked-detail-" + $rs.bookedId + " a.booked-detail").attr("data-connect-id", connectId);
                    }

                    //update textbook link
                    $(`#booked-detail-${$rs.bookedId} .t_link`).attr('href', `/textbook/page-detail/${textbookType}/${connectId}`);
                    // update textbook image
                    if (typeof $rs.optionDataTextbookGen.modalId !== 'undefined' && $rs.optionDataTextbookGen.modalId !== '') {
                        var modalTextbookImg = $('#'+$rs.optionDataTextbookGen.modalId + ' .view_detail').find('img').attr('src');
                        $(`#booked-detail-${$rs.bookedId} .t_link`).attr('textbook-img', modalTextbookImg);
                    }
                }
			} else {
				$window.location.reload();
			}
			$rs.updatingTextbook = false;
		});
	};
    $rs.$on('callUpdateTextbookOption', function (event, data) {
        $sc.updateTextbookOption(data);
    });
}])
//end of reserve List scope
.controller('scheduleList', ['$scope', '$rootScope', '$interval', '$compile', '$http', '$templateCache', '$window',
    function($sc, $rs, $interval, $compile, $http, $tc, $window) {
        $rs.useScope = null;
        $sc.TEN_MINUTES_IN_SEC = 600;
        $sc.clock = 0;
        $sc.previousSyncTime = 0;
        $rs.cancledModal = '#dialog_schedule_cancel';
        
        var showModalDetailCb = function (event, slotStatus) {
            var btn = $(event.currentTarget);
            if (slotStatus.slot && slotStatus.slot.status && slotStatus.slot.status !== 'reserved') {
                $('#trigger_modal_reservation_already_cancelled').click();
                return;
            }
            if(btn.hasClass('disable')){
                return;
            }

            //set modal details
            var modalId = btn.data('href');
            $(modalId + " .func_dropdown_wrap").removeClass('on');
            $(modalId + " .teacher_profile").attr("href", btn.data('profile'));
            $(modalId + " .teacher_data img").attr("src", btn.data('image'));
            $(modalId + " .teacher_data .name").text(btn.data('name'));
            $(modalId + " .lesson_data .date").text(btn.data('date-display'));
            $(modalId + " .lesson_data .time").text(btn.data('time-display'));
            $(modalId + " .lesson_data .lesson_number").text(btn.data('lesson-number'));
            $(modalId + " .lesson_data .update_category_name").text(btn.data('textbook-name'));
            $(modalId + " .lesson_data .update_sub_category_name").text(btn.data('textbook-sub-name'));
            $(modalId + " .lesson_data .update_chapter_name").text(btn.data('chapter-name'));

            // Set target data into google calendar button
            $(modalId + " .add-calendar").attr('teacher_name', btn.data('name'))
                .attr('start_time', $rs.getModifiedTime(btn.data('calendar_datetime_ref'), true))
                .attr('data-teacher_id', btn.data('id'))
                .attr('end_time', $rs.getModifiedTime(btn.data('calendar_datetime_ref'), false));

            // Set target data into Change button and canceled button
            $(modalId + " .dropdown_btn").data('target', btn.data('booked-id'))
                .attr('data-id', btn.data('booked-id')).data('id', btn.data('booked-id'))
                .data('teacher', btn.data('id')).data('date', btn.data('calendar-start'))
                .data('is_substitute_teacher', btn.data('is_substitute_teacher'))
                .data('is_normal_substitute', btn.data('is_normal_substitute'));
            if (btn.data('can-cancel') === 1) {
                $(modalId + " .btn_cancel").removeClass('disable').addClass('btn_check_if_refundable');
            } else {
                $(modalId + " .btn_cancel").addClass('disable').removeClass('btn_check_if_refundable');
            }

            if (btn.data('can-change') === 1) {
                $(modalId + " .btn_change").removeClass('disable');
            } else {
                $(modalId + " .btn_change").addClass('disable');
            }
            let eventSynchedFlag = btn.data('event_synched_flag');
            if ( eventSynchedFlag == 1 ) {
                $(modalId + " #add-calendar_1").hide();
                $(modalId + " #add-calendar_2").show();
            } else {
                $(modalId + " #add-calendar_2").hide();
                $(modalId + " #add-calendar_1").show();
            }

            $(btn.data('modal-trigger')).click();
        };
        
        var redirectionToAppointmentCb = function (event, slotStatus) {
            var reservableIcon = $(event.currentTarget),
                url = reservableIcon.data('href');
            if (slotStatus.slot && slotStatus.slot.status && slotStatus.slot.status === 'reserved') {
                $('#trigger_modal_reservation_already_fixed').click();
            } else {
                $window.location.href = url;    
            }
        };
        
        $sc.showModalDetail = function (event) {
            var slotStatus = $(event.currentTarget).data('slot-status');
            if(slotStatus === 'lesson_request'){ return; }
            
            $sc.checkSlotStatus(event, showModalDetailCb);
        };
        $sc.updateTeacherSlot = function (data) {
            //update page book detail connect_id
            var teacherSlot = $('.teacher-box[data-booked-id="'+ $rs.bookedId +'"]')
                .attr("data-textbook-name", data.categoryName)
                .data('textbook-name', data.categoryName)
                .attr("data-textbook-sub-name", data.subCategoryName)
                .data('textbook-sub-name', data.subCategoryName)
                .attr("data-chapter-name", data.chapterName)
                .data('chapter-name', data.chapterName)
                .attr("data-connect-id", data.connectId)
                .data('connect-id', data.connectId);
            
            if ($rs.callanHalf == 1 && (data.categoryType == 2 || data.categoryType == 5 || data.categoryType == 6)) {
                teacherSlot.data('can-change', 0).attr('can-change', 0).data('can-cancel', 0).attr('can-cancel', 0);
            }
            $rs.useScope = null;
        };

        $rs.changeSlot = function (event) {
            if ($(event.currentTarget).hasClass('disable')) {
                return;
            }
            var target = $(event.currentTarget).data('target');
            event.currentTarget = $('.teacher-box[data-booked-id="'+ target +'"]').get(0);
            $rs.useScope = 'scheduleListController';
            $rs.$emit('callUpdateTextbookOption', event);
        };

        $rs.fillCanceledModalData = function (event) {
            var target = $(event.currentTarget).data('target'),
                teacherSlot = $('.teacher-box[data-booked-id="'+ target +'"]');
            
            $($rs.cancledModal + ' .reserve_content p.time').text(teacherSlot.data('canceled_time'));
            $($rs.cancledModal + ' .reserve_content p.name').text(teacherSlot.data('name'));
        };
        
        $sc.syncUserTime = function () {
            var userTime = moment($("#user_current_time").text(), 'YYYY/MM/DD HH:mm:ss');
            if (!userTime || $sc.previousSyncTime === (userTime.unix() + $sc.TEN_MINUTES_IN_SEC)) {
                return;
            }

            $sc.previousSyncTime = (userTime.unix() + $sc.TEN_MINUTES_IN_SEC);
            $sc.clock = $sc.previousSyncTime;
        };
        
        $sc.changeSlotStatus = function (userTimestamp) {
            var userDateTime = moment(userTimestamp, 'X'),
                month = userDateTime.format('MM'),
                date = userDateTime.format('DD'),
                hours = userDateTime.format('HH'),
                minutes = userDateTime.format('mm'),
                target_class = month + date + hours + minutes,
                slot = $('.lesson-rsv-schedule-list .' + target_class);
            if (slot.length) {
                slot.addClass('closed').removeClass(target_class).children('a').remove();
            }    
        };

        $sc.checkSlotStatus = function (event, callback) {
            $http({
                method: 'POST',
                url: '/user/lesson-reservation/check-slot',
                data: {
                    check_date: $(event.currentTarget).data('slot-time'),
                }
            }).then(function (result) {
                if (result && result.data && typeof callback === 'function') {
                    callback(event, result.data);
                } else {
                    $window.location.reload();
                }
            });
        };
        
        $sc.redirectionToAppointment = function (event) {
            $sc.checkSlotStatus(event, redirectionToAppointmentCb);
        };

        $rs.getLessonSchedules = function(data = null){
            var postdata = {}
            // - check family ids 
            if(localStorage.getItem("family_user_ids") !== null){
                var validate_family_user_ids = ls_family_user_ids = JSON.parse(localStorage.getItem("family_user_ids"));
                ls_family_user_ids.forEach((f_id) => {
                    let fam_id_chkbx = document.getElementById("fam_" + f_id);
                    if(fam_id_chkbx !== null){
                        fam_id_chkbx.checked = true;
                    } else {
                        // - remove if fam id is not exist in checkbox elements
                        let f_idx = validate_family_user_ids.indexOf(f_id);
                        validate_family_user_ids.splice(f_idx, 1);
                    }
                });
                postdata['family_user_ids'] = validate_family_user_ids;

            } else if(typeof window.current_user_id !== 'undefined'){
                postdata['family_user_ids'] = [window.current_user_id];
                
            }

            $.ajax({
                url: '/LessonReservation/getLessonSchedule',
                type: 'POST',
                data: postdata,
                dataType: 'json',
                beforeSend: function() {
                    $('#loader-img').show();
                    $('.lesson_schedule').hide()
                },
                success: function(response) {
                    $('.lesson_schedule').html($compile(response)($sc));
                    $('.lesson_schedule').show()
                },
                complete: function() {
                    $('#loader-img').hide();
                }
            });
        };
        $rs.getLessonSchedules();

        
        $interval(function () {
            $sc.syncUserTime();
            
            $sc.clock++;
            $sc.changeSlotStatus($sc.clock);
        }, 1000);

        $rs.$on('callUpdateTeacherSlot', function (event, data) {
            $sc.updateTeacherSlot(data);
        });
    }]); 