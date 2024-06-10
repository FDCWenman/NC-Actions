userApp
    .controller('lessonHistory', ['$scope', '$rootScope', 'Ajax', '$window', '$http', '$compile',
        function ($sc, $rs, $ajax, $window, $http, $compile) {
			// Angular constant
            $rs.deleteDialog = $('#dialog-lesson-log-delete');
            $rs.deleteUndoDialog = $('#dialog-lesson-log-delete-undo');
            $rs.deleteStatusChangedDialog = $('#trigger_lesson_log_delete_confirm');
            $rs.dialogTimeOut = 2000;
			$rs.showNoneMonth = false;
			$rs.teacher_none = true;
			$rs.filter_none = true;
			$rs.filter_month = typeof(getFilterMonth) !== 'undefined' && getFilterMonth ? getFilterMonth : 0;
			$rs.filter_teacher = typeof(getFilterTeacher) !== 'undefined' && getFilterTeacher ? getFilterTeacher : 0;
			$rs.filter_textbook = typeof(getFilterTextbook) !== 'undefined' ? getFilterTextbook : '';
			$rs.selectedTextbook = '';

			var pageUrl = $('#ng_const_page_url').val(), page = $('#ng_const_page').val();
            // Root scope

			// local function
			var updateLessonCount = function (totalCount, totalTime, monthCount, monthTime) {
					var totalCountEle = $('#total_count'),
						totalTimeEle = $('#total_time'),
						monthCountEle = $('#month_count'),
						monthTotalTimeEle = $('#month_time');
					totalCountEle.text(totalCount + totalCountEle.data('unit'));
					totalTimeEle.text(totalTime);
					monthCountEle.text(monthCount + monthCountEle.data('unit'));
					monthTotalTimeEle.text(monthTime);
				},
				removeLessonLog = function (target) {
					$(target).closest('.log-box').parent().remove();
				},
				showDeleteDialog = function (dialog) {
					if (!dialog) {
						console.warn('Dialog not exist');
						return;
					}
					dialog.fadeIn();
					setTimeout(function () {
						dialog.fadeOut();
					}, $rs.dialogTimeOut);
				},
				showDeleteStatusChangedDialog = function () {
					if ($rs.deleteStatusChangedDialog.length) {
						$rs.deleteStatusChangedDialog.click();
					} else {
						console.warn('deleteStatusChangedDialog not exist');
					}
				},
				displayEmptyLessonLog = function (status) {
					var emptyLessonLogContainer = $('.lesson-log-list-v2 .log_empty');
					if (status) {
						if (!emptyLessonLogContainer.is('hidden')) {
							emptyLessonLogContainer.show();
						}
					} else {
						emptyLessonLogContainer.hide();
					}
				},
				deleteOrUndoSuccessCallback = function (ajaxResponse, targetEvent, undoFlg) {
					if(!ajaxResponse || !ajaxResponse.data) {
						console.error('Invalid response');
						return;
					}
					var responseData = ajaxResponse.data,
						data = responseData.data;
					if (responseData.hasOwnProperty('deleteStatus')) {
						// Delete undo and update data
						if (responseData.deleteStatus === 'success') {
							removeLessonLog(targetEvent.target);
							if(undoFlg) {
								showDeleteDialog($rs.deleteUndoDialog);
							} else {
								showDeleteDialog($rs.deleteDialog);
							}
						} else {
							if (responseData.action && responseData.action === 'lesson_onairs_logs_delete_flg_had_been_changed') {
								showDeleteStatusChangedDialog();
							} else {
								console.warn(responseData.message);
							}
						}
					}

					var displayedLessonLog = $('.lesson-log-list-v2 li .log-box');
					if(data && !$.isEmptyObject(data)) {
						// If the entire lesson log has been deleted
						if (!displayedLessonLog.length) {
							var reload = false;
							// Delete undo tab
							if (undoFlg) {
								if (data.monthCount === '0') {
									displayEmptyLessonLog(true);
								} else if (data.monthCount !== '0' && data.totalPage < page) {
									reload = true;
								} else {
									displayEmptyLessonLog(false);
								}
							}
							// normal tab
							else {
								if (data.monthCount === '0') {
									reload = true;
								} else if (data.monthCount !== '0' && data.totalPage < page) {
									reload = true;
								}
							}
							if (reload) {
								$window.location.href = pageUrl;
							}
						}

						if (!undoFlg) {
							// - update lesson count, time & total
							var lifetimeCount = $('#lesson_total_count'),
								lifetimeTime = $('#lesson_total_time'),
								lifetimeTotalCount = $('#lifetime_month_count'),
								lifetimeTotalTime = $('#lifetime_month_time'),
								lifetimeData = data.lifetime;
							var monthCount = $('#total_lesson_month_count span'),
								monthTime = $('#total_lesson_month_time'),
								monthTotalCount = $('#total_month_count span'),
								monthTotalTime = $('#total_month_time')
								monthData = data.month;

							lifetimeCount.text(lifetimeData.count + lifetimeCount.data('unit'));
							lifetimeTime.text(lifetimeData.time);
							lifetimeTotalCount.text(lifetimeData.total_count + lifetimeTotalCount.data('unit'));
							lifetimeTotalTime.text(lifetimeData.total_time);

							monthCount.text(monthData.count);
							monthTime.text(monthData.time);
							monthTotalCount.text(monthData.total_count);
							monthTotalTime.text(monthData.total_time);
						}

						if (displayedLessonLog.length !== 0 &&
							data.htmlPaging &&
							typeof data.htmlPaging === 'string')
						{
							$('#lesson_history_paging').html(data.htmlPaging);
						}
					}
				};

            // Using in view function
			$rs.deleteLessonLog = function (event) {
				var selectedMonth = $sc.selectedMonth;
				var selectedTeacher = $sc.selectedTeacher;
				var selectedTextbook = $('.selected_item').attr('text-book-category-id');

				if ($sc.selectedTextbookOptionType == 0) {
					selectedTextbook = 0;
				}

				$ajax.restAction({
					method: 'POST',
					url: '/user/lesson-history-delete',
					data: {
						month: selectedMonth,
						teacher: selectedTeacher,
						textbook: selectedTextbook,
						lessonLog: $(event.currentTarget).data('lesson-log'),
						load_paging: true,
						page: page,
						localizeDir: typeof window.localizeDir !== 'undefined' ? window.localizeDir : ''
					}
				}).then(function (result) {
					deleteOrUndoSuccessCallback(result, event);
				});
			};
			$sc.undoDeleteLessonLog = function (event) {
				var lessonLogId = $(event.currentTarget).data('lesson-log');
				if(!lessonLogId) {
					console.error('Invalid lesson log id');
				}
				$ajax.restAction({
					method: 'POST',
					url: '/user/lesson-history-delete',
					data: {
						lessonLog: lessonLogId,
						undo: true,
						load_paging: true,
						page: page,
						month: $sc.selectedMonth,
						teacher: $sc.filter_teacher,
						textbook: $sc.filter_textbook
					}
				}).then(function (result) {
					deleteOrUndoSuccessCallback(result, event, true);
				});
			};

			if (typeof localStorage.getItem('suddenLessonFilterMonth') !== 'undefined' && localStorage.getItem('suddenLessonFilterMonth') == 9) {
				$rs.filter_month = 0;
			}

			if (
				(typeof localStorage.getItem('sudden_show_none_month') !== 'undefined' && localStorage.getItem('sudden_show_none_month') == 1) ||
				(typeof localStorage.getItem('live_show_none_month') !== 'undefined' && localStorage.getItem('live_show_none_month') == 1)
			) { $rs.showNoneMonth = true; }

			// Show Unspecified
			if($rs.filter_month == 0) {
				$rs.showNoneMonth = true
			}

			// - hide NONE on teacher filter
			if ($rs.filter_month == 0 && $rs.filter_textbook == 0) {
				$rs.teacher_none = false;
			}
			// - hide NONE on textbook filter
			if ($rs.filter_month == 0 && $rs.filter_teacher == 0) {
				$rs.filter_none = false;
			}
        }]);
