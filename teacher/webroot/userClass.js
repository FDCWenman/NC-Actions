var ajaxRequest = false;

userApp
.controller('userClass', ['$scope','$compile', '$timeout', '$http', '$rootScope', '$interval', 'Ajax', 'HttpRetryService', function($sc, $compile, $timeout, $http, $rs, $interval, $ajax, HttpRetryService) {

		$sc.textbookType = _textbookType;
		$sc.textbookCategoryId = 0;
		$sc.lessonLocalizeDir = '';

		//Set lessonlocalizedir 
		setLessonLocalizeDir();
		
		windowPostMessageListener();

		$sc.classModalTextbookSelect = function(event) {
			var target = $(event.currentTarget);
			if (target.hasClass('disabled')) {
				return false;
			}
			var teacherId = target.attr('teacher_id');
			var connectId = target.attr('connect-id');
			$('#dialog_textbook_preview .btnLessonOrReserve').addClass("disable");
			$('#dialog_textbook_preview .iframe_textbook').attr('src', '');
			var spinner = '<p align="center"><i class="fa fa-spinner fa-spin"></i></p>';
			var lessonLocalizeDir = ''; 
			
			//set to empty if lessonLocalizeDir is undefined
			if (typeof window.lessonLocalizeDir != 'undefined') { 
				lessonLocalizeDir = window.lessonLocalizeDir;
			}
			
			// close all modal, then show textbook previews
			util.closeAllModal(function(){ setTimeout(function(){ $('#trigger_modal_textbook_preview').click(); }, 500); });

			$rs.optionDataTextbookGen = {
				modalId: 'dialog_textbook_preview',
				teacher_id: teacherId,
				connectId: connectId,
				lessonLocalizeDir: lessonLocalizeDir,
				preset: true
			}

			$rs.updateTextbookOptionGeneral($rs.optionDataTextbookGen);
			return;



			$http({
				method: 'POST',
				url: '/user/class/getAllTextbookOption/',
				data: {
					teacher_id: teacherId,
					connectId: connectId,
					lessonLocalizeDir: lessonLocalizeDir,
					preset: true
				},
				beforeSend: function(){
					// Loading spinner
					$("#dialog_textbook_preview .col_selector").html(spinner);
				}
			}).then(function(result) {
				var data = result.data;

				$('#dialog_textbook_preview .col_selector').html($compile(data.option)($sc)).promise().done(function() {
					$timeout(function() {
						$('#dialog_textbook_preview .btn_close').addClass('hidden');
						$("#dialog_textbook_preview .btn_change_textbook").hide();
						$("#dialog_textbook_preview .btnLessonOrReserve").attr('teacher_id', teacherId);
						$("#dialog_textbook_preview .btnLessonOrReserve").attr('textbook_category_id', data.textbook_category_id);
						$('#dialog_textbook_preview .btnLessonOrReserve').removeClass("disable");
						$('#dialog_textbook_preview .iframe_textbook').attr('src', data.textbook_default);
					}, 1);
				});
			});
		}

		// set default textbook during class
		$sc.selectDefaultTextbook = function(event) {
			var target = $(event.currentTarget);
			if (textbookMinuteTimer == false || target.hasClass('disable')) {
				return false;
			}
			textbookMinuteTimer = false;
			textbookModalSelected = true;
			var error = 0;
			var teacherId = target.attr('teacher_id');
			var _textbookCategoryId = 0;
			var chapterEngString = '';
			var fromTextbookPreviewModal = false;
			var is_callan_unli_option = 0;
			// check if it is from text preview modal
			var textbookPreviewModalId = target.parents('.modal_window').attr('id');
			if (textbookPreviewModalId == 'dialog_textbook_preview') {
				fromTextbookPreviewModal = true;
				var textbookCategoryId = '';
				var textbookChapterId = '';
				var connectId = $("#dialog_textbook_preview .iframe_textbook").attr("connect-id");
				var classData = $('#dialog_textbook_preview ' + textbookCategoryId + ' .selected_item').select();
				var chapterData = $('#dialog_textbook_preview ' + textbookChapterId + ' .selected_item').select();
				_textbookCategoryId = $("#dialog_textbook_preview .iframe_textbook").attr('textbook-category-id');
			// first modal
			} else {
				var connectId = target.attr('connect-id');
				_textbookCategoryId = $("#dialog_connected .selectDefaultTextbook").attr('textbookcategoryid');
				is_callan_unli_option = $("#dialog_connected .selectDefaultTextbook").attr('is_callan_unli_option');
			}

			if (!teacherId) {
				if ($("#dialog_connected .selectDefaultTextbook").attr('teacher_id')) {
					teacherId = $("#dialog_connected .selectDefaultTextbook").attr('teacher_id');
				} else {
					teacherId = connect.config.teacherID;
				}
			}

			if	( (typeof connecId == 'undefined') || (typeof teacherId == 'undefined') )
			{
				error = 1;
			}

			/*  pass to a temporary object */
			var textbookData = {
				connectId : connectId,
				teacher_id : teacherId,
				textbook_category_id : _textbookCategoryId,
				is_callan_unli_option : is_callan_unli_option
			};
			angular.element(document.getElementById('ui_sub_panel_memo')).scope().changeTextbookConnectId(connectId);
			var retryUpdateTextbook = $http({
				method: 'POST',
				url: '/user/class/setDefaultTextbook/',
				data: textbookData
			});

			HttpRetryService.again(retryUpdateTextbook).then(
				function(res) {
					var data = res.data;
					//remove empty div textbook to prevent duplicate
					$('#page_contents--textbook').remove();
					$("#main_table #main_left").prepend(data.html);

					// chat teacher about book info
					if (textbookPreviewModalId == 'dialog_textbook_preview') {
						var classStr = $.trim(classData.find('.title').text());
						var chapterStr = $.trim(chapterData.find('.title').text());
						var chapterEngStr = chapterEngString;
						var chapterEngVal = chapterEngString;
					} else {
						var classStr = $("#tblTeachingMaterial .txtBookTitle").text();
						var chapterStr = $("#tblTeachingMaterial .txtBookChapter").text();
						var chapterEngStr = $("#tblTeachingMaterial .txtBookChapter").data('chapter-eng');
						var chapterEngVal = $("#tblTeachingMaterial .txtBookChapter").data('chapter-validate');
					}
					var classStrEng = data.english_name;

					var chapterNameEng = data.chapterNameEng;
					var chapterName = data.chapterName;
					var classNameEng = data.classNameEng;
					var className = data.className;
					var categoryNameEng = data.categoryNameEng;
					var categoryName = data.categoryName;

					var msgData = {jpn : "", eng : ""};
					msgData.jpn = "The Student chose textbook " + encodeURI(categoryName) + " " + encodeURI(className) + " : " +encodeURI(chapterName);
					if(typeof chapterNameEng == 'string' && chapterNameEng.length > 0) {
						msgData.eng = "The Student chose textbook " + encodeURI(categoryNameEng) + " " + encodeURI(classNameEng) + " : " +encodeURI(chapterNameEng);
					}
					var jsonText = JSON.stringify(msgData);
					/* if has disabled */
					if ($('#text_chat_submit').hasClass('disabled') === false) {
						$('#chatSpamControl').val(connectId);
						$('#text_chat').val(jsonText);
						$('#text_chat_submit').click();
					}

					/* add chat message */
					var noCameraString = "カメラOFFでスタートしました。<br/>";
					var cameraChecker = $('#check_use_camera').attr('checked');

					/* disable textbook timer */
					if (typeof textbookMinuteTimer !== 'undefined') { textbookMinuteTimer = false; }

					/* initialize peers */
					if (typeof connect !== 'undefined') {
						connect.resetCall();
						connect.resetPeer();
						connect.initializePeer();

						/* set hasbook, to enable initializePeer when teacher refreshes */
						if (typeof hasBook !== 'undefined') { hasBook = 1; }

						/* override enabled camera */
						if (typeof startCall !== 'undefined' && $.isFunction(startCall)) { startCall(); }
					}

					/* show btn refresh reminder */
					if (typeof showRefreshMessage !== 'undefined' && $.isFunction(showRefreshMessage)) { showRefreshMessage(); }

					var lessonLocalizeDir = ''; 
					//set to empty if lessonLocalizeDir is undefined
					if (typeof window.lessonLocalizeDir != 'undefined') { 
						lessonLocalizeDir = window.lessonLocalizeDir;
					}
					textbookData.studentLocalizeDir = lessonLocalizeDir;

					/* extend textbook data */
					connect.config = _.extend(connect.config, {textbook: textbookData});

					/* Update Request Lesson Time */
					$sc.updateRequestLessonTime(function(){
						/* send selecting textbook */
						eventCommon.sendCommand({ command: 'studentSelectedTextbook', content: connect.config, mode: 'to' });
					});
				},
				function(){
					// disable side menu
					$("#btn_sub_panel_textbook_select").addClass("disable");
					// set to check onairs if connection is disconnected
					$("#selectedConnectId").val(connectId);
					$("#onAirBlankCheckerFlag").val(0);
					textbookConnectionChecker();
				});
			// set temporary variables
			$("#selectedConnectId").val(connectId);
		}

		// update walkthrough flg
		$sc.updateWalkthroughFlg = function(event) {
			var target = $(event.currentTarget);
			if (target.hasClass('update_walkthrough')) {
				$http({
					method: 'POST',
					url: '/user/class/updateUserWalkthrougFlg'
				});
			}
		}

		// select textbook from class menu
		function menuClassTextbookSelect() {

			var textbookType = (typeof $sc.textbookType != 'undefined')? $sc.textbookType : 2 ;
			var count = $('#dialog_in-class-select-textbook .textbook_select_menu_area').length;
			var spinner = '<p align="center" style="line-height: 250px;"><i class="fa fa-spinner fa-spin fa-3x"></i></p>';
			var lessonLocalizeDir = ''; 

			//set to empty if lessonLocalizeDir is undefined
			if (typeof window.lessonLocalizeDir != 'undefined') { 
				lessonLocalizeDir = window.lessonLocalizeDir;
				localizeDir = window.lessonLocalizeDir;
			}

			if (count == 0) {
				$rs.optionDataTextbookGen = {
					teacher_id: teacherId,
					connect_id: $("#selectedConnectId").val(),
					lessonLocalizeDir: lessonLocalizeDir,
					localizeDir: lessonLocalizeDir,
					memberType: connect.config.memberType || 'student',
					modalId: 'dialog_in-class-select-textbook',
					guest_viewer: connect.config.isGuest,
				};

				$rs.updateTextbookOptionGeneral($rs.optionDataTextbookGen);
				return;
				
				ajaxRequest = $http({
					method: 'POST',
					url: "/" + lessonLocalizeDir + '/class/getAllTextbookOptionClass/',
					data: $rs.optionDataTextbookGen,
					beforeSend: function() {
						// Loading spinner
						$("#dialog_in-class-select-textbook ").html(spinner);
						
					}
				}).then(function(res) {
					var data = res.data;
					$('#dialog_in-class-select-textbook').html($compile(data.option)($sc)).promise().done(function() {
						$timeout(function() {
							if (counselorTeacher == 1) {
								$('#dialog_in-class-select-textbook .tr_textbook_course div.selected_item').removeClass('disabled');
								$('#dialog_in-class-select-textbook .tr_textbook_curriculum  div.selected_item').removeClass('disabled');
								$('#dialog_in-class-select-textbook .tr_textbook_chapter div.selected_item').removeClass('disabled');
								$('#dialog_in-class-select-textbook .btnLessonOrReserve').removeClass('disable');
								$('#dialog_in-class-select-textbook .btnLessonOrReserve').attr('disabled', false);
								return;
							}
							//set textbook type for callan reservation
							if (data.textbook_type != 0) {
								$rs.textbookType = data.textbook_type;
							}
							//enable button if not for reservation only or member type is viewer
							if ( data.reservation_flg != 1 || connect.config.memberType == 'viewer') {
								$('#dialog_in-class-select-textbook .btnLessonOrReserve').removeClass('disable').attr('disabled', false);
							} else {

									$('#ui_sub_panel_textbook_select .tr_textbook_course div.selected_item').addClass('disabled');
									$('#ui_sub_panel_textbook_select .tr_textbook_curriculum  div.selected_item').addClass('disabled');
									$('#ui_sub_panel_textbook_select .tr_textbook_chapter div.selected_item').addClass('disabled');
									$('#ui_sub_panel_textbook_select .tr_textbook_type div.selected_item').addClass('disabled');

									$('#ui_sub_panel_textbook_select .tr_textbook_type .tab_nav_list .list_item a').addClass('disabled').attr("style", "pointer-events:none;");
									$('#ui_sub_panel_textbook_select .tr_textbook_sub_cat div.selected_item').addClass('disabled');

									$('#dialog_in-class-select-textbook .tr_textbook_course div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_curriculum  div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_chapter div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_type div.selected_item').addClass('disabled');

									$('#dialog_in-class-select-textbook .tr_textbook_course div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_curriculum  div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_chapter div.selected_item').addClass('disabled');
									$('#dialog_in-class-select-textbook .tr_textbook_type div.selected_item').addClass('disabled');

									$('#dialog_in-class-select-textbook .tr_textbook_type .tab_nav_list .list_item a').addClass('disabled').attr("style", "pointer-events:none;");
									$('#dialog_in-class-select-textbook .tr_textbook_sub_cat div.selected_item').addClass('disabled');

							}
							
							//- disabling for normal student only
							if (connect.config.memberType != 'viewer') {
								//course
								if (textbookType == 1){
									var reservationFlg = $(".tb_selector-course .tr_textbook_course .selected_item").attr('reservation-flg');
										if ( reservationFlg == 1 ) { // for reservation flag
											$(".tb_selector-course .tr_textbook_course .selected_item").attr("style", "pointer-events:none;");
											$(".tb_selector-course .tr_textbook_curriculum .selected_item").attr("style", "pointer-events:none;");
										}
								}
								//category
								if (textbookType == 2) {
									var reservationFlg = $(".tb_selector-series .tr_textbook_class .selected_item").attr('reservation-flg');
									if ( reservationFlg == 1 ) { // for reservation flag
											$(".tb_selector-course .tr_textbook_class .selected_item").attr("style", "pointer-events:none;");
											$(".tb_selector-course .tr_textbook_chapter .selected_item").attr("style", "pointer-events:none;");
										}
								}
							}

						}, 1);
					});
					
				});
			}
		}
		//end menuClassTextbookSelect
		$sc.classSideMenuSelectTextbook = function(event) {
			var target = $(event.currentTarget);
			if (target.hasClass('disable')) {
				return false;
			}
			var parent = target.parents('.dialog_in-class-select-textbook').attr('id');
			parent = $rs.concatModalId(parent);
			var tbSelector = tbSelector1 = '';
			var textbookType = $rs.textbookType;

			
			trTextbook =  parent + ' .tb_selector-course .tr_textbook_course';
			tbSelector =  parent + ' .tb_selector-course .tr_textbook_curriculum';
			trTextbook1 = ' .tr_textbook_curriculum';

			var connectId = $(parent + " .iframe_textbook").attr('connect-id');
			var textbookCategoryName = $(parent + " .tb_ttl").text().trim();
			var textbookCategoryNameEng = $(parent + " .tb_ttl").text().trim();			
			var textbookSubcategoryName = $(parent +' .iframe_textbook').text().trim();
			var textbookSubcategoryNameEng = $(parent +' .iframe_textbook').text().trim();
			var textbookName = $(parent + ' .iframe_textbook').attr('chapter-name').trim();
			var textbookNameEng = $(tbSelector + ' .selected_item').attr('chapter-eng');
			var textBookCategoryId = $(trTextbook + ' .selected_item').attr('text-book-category-id');
			var textBookCategoryType = $(parent + ' .iframe_textbook').attr('category-type');

			if ($(parent +' .chapter-info .subcategory-name').length > 0) {
				textbookSubcategoryName = $(parent +' .chapter-info .subcategory-name').text().trim();
				textbookSubcategoryNameEng = $(parent +' .chapter-info .subcategory-name').attr('data-subcategory-name-eng').trim();
			}
			if ($(parent +' .chapter-info .chapter-eng').length > 0) {
				textbookNameEng = $(parent +' .chapter-info .chapter-eng').attr('data-chapter-name-eng').trim();
			}
			if ($(parent + " .head .tb_ttl").length > 0) {
				textbookCategoryNameEng = $(parent + " .head .tb_ttl").attr('data-ttl-eng').trim();
			}

			console.log(textbookCategoryName)
			console.log(textbookSubcategoryName)

			$(tbSelector + ' .selected_item div').addClass('done');
			$(tbSelector + ' .options ul li.on div').addClass('done');
			$http({
				method: 'POST',
				url: '/user/textbook/getJapanDate',
			}).then(function(res) {
				var data = res.data;
				$(tbSelector + ' .selected_item div .datetime').html('<i class="fa fa-check fa-fw"></i>'+ data);
				$(tbSelector + ' .options ul li.on div .datetime').html('<i class="fa fa-check fa-fw"></i>'+ data);
			}).finally(function() {

				changeTextbookChatObjParam = {
					connect_id : connectId,
					textbook_category_name : textbookCategoryName,
					textbook_category_name_eng : textbookCategoryNameEng,
					textbook_subcategory_name : textbookSubcategoryName,
					textbook_subcategory_name_eng : textbookSubcategoryNameEng,
					textbook_name : textbookName,
					textbook_name_eng : textbookNameEng,
					textBook_category_id : textBookCategoryId,
					textbook_category_type : textBookCategoryType
				}

				console.log(changeTextbookChatObjParam);
				changeTextbookChat(changeTextbookChatObjParam).then(function() {
				});
			});
		}

		/* show first teaching material modal */
		$sc.showModalConnected = function() {
			util.closeAllModal(function(){ $timeout(function(){ $('#trigger_modal_connected').click(); }, 500); });
		}

		function changeTextbookChat( objParam ) {
				connectId = (typeof objParam.connect_id !== 'undefined' ) ? objParam.connect_id : null;
				textbookCategoryName = (typeof objParam.textbook_category_name !== 'undefined' ) ? objParam.textbook_category_name : null;
				textbookCategoryNameEng = (typeof objParam.textbook_category_name_eng !== 'undefined' ) ? objParam.textbook_category_name_eng : null;
				textbookSubcategoryName = (typeof objParam.textbook_subcategory_name !== 'undefined' ) ? objParam.textbook_subcategory_name : null;
				textbookSubcategoryNameEng = (typeof objParam.textbook_subcategory_name_eng !== 'undefined' ) ? objParam.textbook_subcategory_name_eng : null;
				textbookName = (typeof objParam.textbook_name !== 'undefined' ) ? objParam.textbook_name : null;
				textbookNameEng = (typeof objParam.textbook_name_eng !== 'undefined' ) ? objParam.textbook_name_eng : null;
				textBookCategoryId = (typeof objParam.textBook_category_id !== 'undefined' ) ? objParam.textBook_category_id : null;
				textBookCategoryType = (typeof objParam.textbook_category_type !== 'undefined' ) ? objParam.textbook_category_type : null;

				var currentConnectId = parseInt($('#textbook-iframe').attr('connect-id'));
				var currentChapterId = parseInt($('#textbook-iframe').attr('data-chapterid'));
				var currentClassId = parseInt($('#textbook-iframe').attr('data-classid'));
				
				var chapterNameEngCTC = textbookNameEng ? textbookNameEng.trim() : "";
				var chapterNameCTC = textbookName ? textbookName.trim() : "";
				var classNameEngCTC = textbookSubcategoryNameEng ? textbookSubcategoryNameEng.trim() : "";
				var classNameCTC = textbookSubcategoryName ? textbookSubcategoryName.trim() : "";
				var categoryNameEngCTC = textbookCategoryNameEng ? textbookCategoryNameEng.trim() : "";
				var categoryNameCTC = textbookCategoryName ? textbookCategoryName.trim() : "";

				var lessonLocalizeDir = '';
				//set to empty if lessonLocalizeDir is undefined
				if (typeof window.lessonLocalizeDir != 'undefined') { 
					lessonLocalizeDir = window.lessonLocalizeDir;
				}

				if ( $('#chatSpamControl').val() != connectId || $("#textbook-iframe").attr('data-file') == "pdf" ) {
					angular.element(document.getElementById('ui_sub_panel_memo')).scope().changeTextbookConnectId(connectId);
					let tbUpdateUrlParam = '';
					let connectCnf = connect.config;
					let isSpViewer = (typeof isSpView != 'undefined' && isSpView == 1) ? 1 : 0;
					if (connectCnf.hasOwnProperty('isGuest') && connect.config.isGuest == 1) {
						tbUpdateUrlParam = '?guest_viewer=1';
					}
					var retryUpdateTextbook = $http({
						method: 'POST',
						url: '/user/Class/updateTextBook' + tbUpdateUrlParam,
						data: {
							connectId: connectId,
							studentLocalizeDir: lessonLocalizeDir,
							defTeacherIdLesson: teacherId,
							memberType: connect.config.memberType || 'student',
							currentConnectId: currentConnectId,
							isSpGuestViewer: connect.config.isGuest,
							isSpViewer: isSpViewer
						}
					});

					HttpRetryService.again(retryUpdateTextbook).then(
						function(res) {
							var data = res.data;

							chapterNameEngCTC = data.chapterNameEng;
							chapterNameCTC = data.chapterName;
							classNameEngCTC = data.classNameEng;
							classNameCTC = data.className;
							categoryNameEngCTC = data.categoryNameEng;
							categoryNameCTC = data.categoryName;
							var callanLevelCheck = (typeof data.textbookCallanLevelCheck !== 'undefined') ? data.textbookCallanLevelCheck : null;

							var url = res.data.url;
							if (url != '') {
								$("#textbook-iframe").attr('src', url);

								var checkUrl = url.search("instructor");

								if (checkUrl > 0) {
									$("#textbook-iframe").attr('data-file','pdf');
								} else {
									$("#textbook-iframe").attr('data-file','html');
								}

								/* send emit to teacher when the student selects a book from the side menu */
								if (typeof eventCommon !== 'undefined' && $.isFunction(eventCommon.sendCommand)) {
									/* set textbook data */
									var sideMenuTBData = {
										connectId: connectId,
										textbook_category_id: textBookCategoryId,
										textbook_category_type: textBookCategoryType,
										callan_level_check: callanLevelCheck
									};

									/* extend textbook data */
									// connect.config.userLessonlocalizeDir = lessonLocalizeDir;
									connect.config = _.extend(connect.config, {sideMenuTBData: sideMenuTBData});

									/* send command */
									eventCommon.sendCommand({ command: 'studentSelectedSideMenuTextbook', content: connect.config, mode: 'to' });
								}
							} else {
								alert('教科書使用できません。');
							}
						},
						function() {
							alert('エラーが発生しました。しばらくしてからもう一度お試しください。');
						});
					$("#selectedConnectId").val(connectId);
				}

				//check the current textbook type
				var textbookSelectorType =  $("#dialog_in-class-select-textbook .tr_textbook_course .options ul li.on").attr("textbook-type");
				if (textbookSelectorType == 'course') {
					var currentTextbookType = 1;
				} else {
					var currentTextbookType = 2;
				}

				if ( $('#chatSpamControl').val() != connectId) {
					//- textbook change won't trigger for viewer
					if (connect.config.memberType != 'viewer') {
						$('#chatSpamControl').val(connectId);

						var msgData = {jpn : "", eng : ""};

						msgData.jpn = "The Student chose textbook <a href=\'javascript: void(0);\' data-connectId=\'"+ connectId +"\' style=\'text-decoration:underline\' onClick=\'msgViewTextbookFunc($(this))\' oncontextmenu = \'return false\' data-msgviewtextbook=\'"+ connectId +"\' data-url=\'"+ connectId +"\' > "  + encodeURI(categoryNameCTC) + "  " + encodeURI(classNameCTC) + " : " + encodeURI(chapterNameCTC) + "</a>";

						if ( ( typeof categoryNameEngCTC == 'string' && categoryNameEngCTC.length > 0 ) && ( typeof classNameEngCTC == 'string' && classNameEngCTC.length > 0 ) ) {
							msgData.eng = "The Student chose textbook <a href=\'javascript: void(0);\' data-connectId=\'"+ connectId +"\' style=\'text-decoration:underline\' onClick=\'msgViewTextbookFunc($(this))\'  oncontextmenu = \'return false\' data-msgviewtextbook=\'"+ connectId +"\' data-url=\'"+ connectId +"\'>" + encodeURI(categoryNameEngCTC) + "  " + encodeURI(classNameEngCTC) + " : " + encodeURI(chapterNameEngCTC) + "</a>";
						}	
						

						var jsonText = JSON.stringify(msgData);
						$('#text_chat').val(jsonText);
						$('#text_chat_submit').click();
					}
					
					$sc.textbookType = currentTextbookType;
					$sc.textbookCategoryId = textBookCategoryId;
				}


				$('#selected_item .lesson_text').addClass('done');
				$('#options li.on .lesson_text').addClass('done');
			}
			function textbookConnectionChecker() {
				var onAirBlankCheckerFlag = $("#onAirBlankCheckerFlag").val();
				var selectedConnectId = $("#selectedConnectId").val();
				var chatHash = connect.config.chatHash;
				if (onAirBlankCheckerFlag == "0") {
				var promiseStop = $interval(function(){
						$http({
							method: 'POST',
							url: '/user/class/checkLesonOnairDisconnection/',
							data: {
								teacher_id: teacherId,
								connectId: selectedConnectId,
								chatHash: chatHash
							}
						}).then(function(result) {
							var success = result.data.success;
							var link = result.data.link;
							var connectId = result.data.connectId;
							var chapterId = result.data.chapterId;
							var htmlDir = result.data.htmlDir;

							var categoryId = result.data.categoryId;
							var categoryTypeId = result.data.categoryTypeId;

							var textbookName = result.data.textbookName;
							var jpnName = result.data.subCatOrCatName;
							var engName = result.data.subCatOrCatNameEng;

							var categoryNameTCC = result.data.categoryName;
							var categoryNameEngTCC = result.data.categoryNameEng;
							var subCategoryNameTCC = result.data.subCategoryName;
							var subCategoryNameEngTCC = result.data.subCategoryNameEng;
							var textbookNameTCC = result.data.textbookName;
							var textbookNameEngTCC = result.data.textbookNameEng;
							
							if (
								success == 1 &&
								typeof connect !== 'undefined' &&
								typeof connect.socket !== 'undefined' &&
								connect.socket.connected === true
							) {
								$("#onAirBlankCheckerFlag").val("");
								$("#btn-refresh").click(); // rel
								$("#textbook-iframe").attr({
									"connect-id":connectId,
									"data-chapterid":chapterId,
									"html-dir":htmlDir,
									"src":link,
								});

								// global this var
								var jsonText = '{"eng" : "The Student chose textbook ' + encodeURI(categoryNameEngTCC) + ' ' + encodeURI(subCategoryNameEngTCC) + ' : ' + encodeURI(textbookNameEngTCC) + '","jpn" : "The Student chose textbook ' + encodeURI(categoryNameTCC) + ' ' + encodeURI(subCategoryNameTCC) + ' : ' + encodeURI(textbookNameTCC) +'"}';

								/* set message format */
								var messageContent = {
									content:{
										params:{ message: jsonText, info:{memberType:"student"}}
									},
									loaded:true
								};

								// append message
								eventStudent.js_sendMessage(messageContent);

								// set scope
								$sc.textbookType = categoryTypeId;
								$sc.textbookCategoryId = categoryId;

								/* set hasbook, to enable initializePeer when teacher refreshes */
								if (typeof hasBook !== 'undefined') { hasBook = 1; }

								// ---- teacher side
								var textbookData = {
									connectId : selectedConnectId,
									teacher_id : teacherId,
									textbookName: jsonText,
									textbookRecovery: true,
									textbook_category_id: categoryId
								};

								// extend textbook data
								connect.config = _.extend(connect.config, {textbook: textbookData});

								// send selecting textbook
								eventCommon.sendCommand({ command: 'studentSelectedTextbook', content: connect.config, mode: 'to' });

								// end interval
								$interval.cancel(promiseStop);

								// after reconnection success remove disable classs side menu
								$("#btn_sub_panel_textbook_select").removeClass("disable");
							};
						}, function(result){
							console.log(result);
						});
					},10000);
				}
			}
			/* update lesson request time */
			$sc.updateRequestLessonTime = function(callback) {
				var ngRequestLessonTimeMin = (typeof strgRequestLessonTime.requestLessonTimeMin == 'undefined') ? 25 : strgRequestLessonTime.requestLessonTimeMin;
				var ngRequestLessonTimeSec = (typeof strgRequestLessonTime.requestLessonTimeSec == 'undefined') ? 1500 : strgRequestLessonTime.requestLessonTimeSec;
				var isReservation = (typeof requestLessonTimeNotVisible == 'undefined') ? true : requestLessonTimeNotVisible;
				var lessonTimeObj = {};
				if (isReservation) {
					if (typeof callback !== "undefined" && $.isFunction(callback)) {
						callback();
					}
					return;
				}
				lessonTimeObj.url = '/user/Class/updateRequestLessonTime';
				lessonTimeObj.method = 'POST';
				lessonTimeObj.data = {
					request_time : ngRequestLessonTimeSec,
					chat_hash : connect.config.chatHash,
					teacher_id: connect.config.teacherID
				};
				$ajax.restAction(lessonTimeObj).then(function(res) {
					var rqLessonTimeNotification = res.data.request_lesson_time_notification;
					
					if (!res.data.success) {
						ngRequestLessonTimeMin = 25;
						ngRequestLessonTimeSec = 1500;
					}

					//if null request lesson time notification
					if (rqLessonTimeNotification === null || typeof rqLessonTimeNotification === 'undefined') {
						rqLessonTimeNotification = ngRequestLessonTimeMin;
					}

					localStorage.setItem('requestLessonTime', JSON.stringify({
						'requestLessonTimeMin' : ngRequestLessonTimeMin,
						'requestLessonTimeSec' : ngRequestLessonTimeSec,
						'requestLessonNotification' : rqLessonTimeNotification
					}));

					localStorage.setItem('requestLessonTimeNotify', rqLessonTimeNotification);

					var display = 'cnt_time'; 
					eventCommon.getStartChatTime(display, 1);

					/*  check 5 mins lesson extension button state */
					eventCommon.checkButtonState();

					// update lesson extension settings based on updated lesson request time
					validateMaxExtendTime(10, window.lesson_extension_slider, 0, 1);

				}).finally(function(){
					if (typeof callback !== "undefined" && $.isFunction(callback)) {
						callback();
					}
				});
			}
		function setLessonLocalizeDir() {
			var lessonLocalizeDir = ''; 
			if (typeof window.lessonLocalizeDir != 'undefined') { 
				lessonLocalizeDir = window.lessonLocalizeDir;
			}
			$sc.lessonLocalizeDir = lessonLocalizeDir
			localStorage.setItem('lessonLocalizeDir', lessonLocalizeDir);
		}

		$sc.updateTextbookFromNextOrPrevButton = function(connectId) {
			//set to empty if lessonLocalizeDir is undefined
			if (typeof window.lessonLocalizeDir != 'undefined') { 
				lessonLocalizeDir = window.lessonLocalizeDir;
			}
				var chapterNameEngCTC = '';
				var chapterNameCTC = '';
				var classNameEngCTC = '';
				var classNameCTC = '';
				var categoryNameEngCTC = '';
				var categoryNameCTC = '';

			if ( $('#chatSpamControl').val() != connectId || $("#textbook-iframe").attr('data-file') == "pdf" ) {
				angular.element(document.getElementById('ui_sub_panel_memo')).scope().changeTextbookConnectId(connectId);
				let tbUpdateUrlParam = '';
				let connectCnf = connect.config;
				let isSpViewer = (typeof isSpView != 'undefined' && isSpView == 1) ? 1 : 0;
				if (connectCnf.hasOwnProperty('isGuest') && connect.config.isGuest == 1) {
					tbUpdateUrlParam = '?guest_viewer=1';
				}
				$http({
					method: 'POST',
					url: '/user/class/updateTextBook/' + tbUpdateUrlParam,
					data: {
						connectId: connectId,
						studentLocalizeDir: lessonLocalizeDir,
						defTeacherIdLesson: teacherId,
						memberType: connect.config.memberType || 'student',
						isSpGuestViewer: connect.config.isGuest,
						isSpViewer: isSpViewer
					}
				}).then(
					function(res) {
						var url = res.data.url;
						var chapterName = res.data.chapterName;
						var chapterNameEng = res.data.chapterNameEng;
						var className = res.data.className;
						var classNameEng = res.data.classNameEng;
						var textBookCategoryId = res.data.textBookCategoryId
						var textbookType = res.data.textbookType
						var textbookCategoryType = res.data.textbookCategoryType
						var callanLevelCheck = (typeof res.data.textbookCallanLevelCheck !== 'undefined') ? res.data.textbookCallanLevelCheck : null;
						
						chapterNameEngCTC = res.data.chapterNameEng;
						chapterNameCTC = res.data.chapterName;
						classNameEngCTC = res.data.classNameEng;
						classNameCTC = res.data.className;
						categoryNameEngCTC = res.data.categoryNameEng;
						categoryNameCTC = res.data.categoryName;

						if (url != '') {
							$("#textbook-iframe").attr('src', url);

							var checkUrl = url.search("instructor");

							if (checkUrl > 0) {
								$("#textbook-iframe").attr('data-file','pdf');
							} else {
								$("#textbook-iframe").attr('data-file','html');
							}

							/* send emit to teacher when the student selects a book from the side menu */
							if (typeof eventCommon !== 'undefined' && $.isFunction(eventCommon.sendCommand)) {
								/* set textbook data */
								var sideMenuTBData = {
									connectId: connectId,
									textbook_category_id: textBookCategoryId,
									textbook_category_type: textbookCategoryType,
									callan_level_check: callanLevelCheck
								};

								/* extend textbook data */
								// connect.config.userLessonlocalizeDir = lessonLocalizeDir;
								connect.config = _.extend(connect.config, {sideMenuTBData: sideMenuTBData});

								/* send command */
								eventCommon.sendCommand({ command: 'studentSelectedSideMenuTextbook', content: connect.config, mode: 'to' });
							}

							//- textbook change won't trigger for viewer
							if (connect.config.memberType != 'viewer') {
								var msgData = {jpn : "", eng : ""};
								msgData.jpn = "The Student chose textbook <a href=\'javascript: void(0)\' data-connectId=\'"+ connectId +"\'>" + encodeURI(categoryNameCTC) + "  " + encodeURI(classNameCTC) + " : " + encodeURI(chapterNameCTC) + "</a>";
								if ( ( typeof categoryNameEngCTC == 'string' && categoryNameEngCTC.length > 0 ) && ( typeof classNameEngCTC == 'string' && classNameEngCTC.length > 0 ) ) {
									msgData.eng = "The Student chose textbook <a href=\'javascript: void(0)\' data-connectId=\'"+ connectId +"\'>" + encodeURI(categoryNameEngCTC) + "  " + encodeURI(classNameEngCTC) + " : " + encodeURI(chapterNameEngCTC) + "</a>";
								}

								var jsonText = JSON.stringify(msgData);
								$('#text_chat').val(jsonText);
								$('#text_chat_submit').click();
								$('#chatSpamControl').val(connectId);
							}

							$sc.textbookType = textbookType;
							$sc.textbookCategoryId = textBookCategoryId;

						} else {
							alert('教科書使用できません。');
						}
					},
					function() {
						alert('エラーが発生しました。しばらくしてからもう一度お試しください。');
					});
				
				$("#selectedConnectId").val(connectId);
			}
		}	

		//Listen prev, next and change material buttons from textbook preview iframe
		function windowPostMessageListener() {
			var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
			var eventer = window[eventMethod];
			var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

			eventer(messageEvent,function(e) {
				var data = e.data;
				switch(data.functionToCall) {
					case 'changeChapter':
						var selectedConnectId = $("#selectedConnectId").val();
						//If selected connect_id is not equal to connect_id from next/prev  
						if (selectedConnectId != data.connect_id) {
							//Disable all buttons from textbook preview iframe
							var pc_pnc_button = document.getElementById('textbook-iframe').contentDocument.querySelectorAll('.pc_pnc_button');
							if (pc_pnc_button.length > 0) {
								pc_pnc_button.forEach(btn => {
									btn.classList.add('disabled');
								});
								//Update the modal select textbook for current textbook selected from next and prev button 
								$('#dialog_in-class-select-textbook').html('');
								$sc.updateTextbookFromNextOrPrevButton(data.connect_id);
							}
						}
						break;
					case 'select':
						var trigger_btn = $("#trigger_modal_in-class-select-textbook");
						trigger_btn[0].click();
						menuClassTextbookSelect();

						break;
					default:
						return;
				}
			}, false);
		}	

		// update walkthrough flg
		$sc.selectCustomTextbookModal = function(event) {
			var trigger_btn = $("#trigger_modal_in-class-select-textbook");
			trigger_btn[0].click();
			$('.chat_area_sec').hide();
			$('#textbook-iframe').show();
			menuClassTextbookSelect();
		}

}]);
