userApp
.controller('recruitUserMemo', ['$scope', '$rootScope', 'Ajax', '$timeout', '$compile', '$http',
	function($sc, $rs, a, $timeout, $compile, $http) {
		$sc.textMemo = "";
		$sc.memoLists = [];

		$sc.listOfMemos = function() {
			var lists = [];
			object = {
				method: 'POST',
				url: '/admin/RecruitLessonOnair/fetchAllMemos',
				data: connect.config
			};
			a.restAction(object)
			.then(function(result) {
				if (result.data.success == 1) {
					lists = getListOfUserMemos(result.data.data);
					$sc.memoLists = lists;
				}
			})
			.catch(function(error) { console.warn(error); });
		}

		function getListOfUserMemos(lists) {
			var listOfMemos = [];

			// loop
			for (var i = 0; i < lists.length; i++) {
				listOfMemos.push({
					memo_id: lists[i].memo_id,
					memo_text: lists[i].memo_text,
					memo_created: lists[i].memo_created,				
					user_id: lists[i].user_id,
					user_nickname: ((lists[i].teacher_name !== null && lists[i].teacher_name.length !== 0)? lists[i].user_nickname +' x' : lists[i].user_nickname),
					teacher_id: lists[i].teacher_id,
					teacher_name: lists[i].teacher_name,
					lesson_type: lists[i].lesson_type
				});
			}

			// return
			return listOfMemos;
		}

		$sc.textMemoSubmit = function(event) {
			event = event.currentTarget;
			var url = '/admin/RecruitLessonOnair/saveMemo';
			var textMemo = $sc.textMemo;
			var conInfo = (typeof connect.config =='undefined')? '' : connect.config;
			var object = {};
			var lessonOnair = null,
				userMemo = null,
				teacher = null,
				user = null;

			textMemo = textMemo.trim();

			if (textMemo.length == 0 || textMemo == null) {
				
				
				alert('メモが追加できません。');
				return false;
			}
			object = {
				method: 'POST',
				data: {
					onair_id: connect.config.onairID,
					t_user_id: connect.config.teacherID,
					s_user_id: connect.config.userID,
					chat_hash: connect.config.chatHash,
					memo: textMemo
				},
				url: url
			};
			a.restAction(object)
			.then(function(res){
				if (typeof res.data.errors != 'undefined') {
					alert('メモが追加できません。');
				} else {
					var userMemo = res.data.memo;
					var teacher = res.data.teacher;
					var student = res.data.student;

					// if does not exist
					if(!$('#lesson-memo-'+userMemo.id).length) {
						var data = {
							memo_id: userMemo.id,
							memo_text: userMemo.lesson_memo,
							memo_created: userMemo.created,				
							user_id: userMemo.admin_id,
							user_nickname: ((teacher.teacher_name !== null && teacher.teacher_name.length !== 0) ? student.name+ ' x ' + teacher.teacher_name : student.name),
							teacher_id: teacher.id,
							teacher_name: teacher.name,
							lesson_type: userMemo.lesson_type
						};

						// unshift
						if ($sc.memoLists.length !== 0) {
							$sc.memoLists.unshift(data);

						// push to memos
						} else {
							$sc.memoLists.push(data);

						}

					// if exists, update content
					} else {
						var cont = $('#lesson-memo-'+userMemo.id).find('.desc');
						$(cont).html(userMemo.lesson_memo);
					}

					// anchor link
					var anchorLink = '#lesson-memo-'+userMemo.id;
					$(anchorLink)
					.css({"background-color": "#A9D0F5", "transition":"background-color 1s ease"})
					.delay(3000)
					.queue(function() {
						$(this).css({"background-color": "#FFF", "transition":"background-color 1s ease"});
						$(this).dequeue();
					});	
				}
			});
		}
}])
.controller('userMemo', ['$scope', '$rootScope', 'Ajax', '$timeout', '$compile', '$http',
	function($sc, $rs, a, $timeout, $compile, $http) {
		$sc.textMemo = "";
		$sc.memoLists = [];
		$sc.page = 1;
		$sc.memoType = '';
		$sc.requesting = false;
		$sc.noMoreMemo = false;
		$sc.memoTypeDropdown = '0';
		$sc.memoIdSelected = null;
		$sc.textBookConnectIdChanged = null;

		$sc.changeTextbookConnectId  = function(textBookId){
			$sc.textBookConnectIdChanged = textBookId;
			$sc.memoTypeChange($sc.textBookConnectIdChanged);
		};
		
		$sc.listOfMemos = function(type) {
			var lists = [];
			object = {
				method: 'GET',
				url: '/user/ApiSetMemo/fetchAllMemos?page=' + $sc.page + '&type=' + type,
			};
			if (!$sc.requesting) {
				$sc.requesting = true;
				a.restAction(object)
				.then(function(result) {
					if (result.data.success == 1) {
						$sc.page++;
						lists = getListOfUserMemos(result.data.data);
						$sc.memoLists = lists;
					} else {
						$sc.noMoreMemo = true;
						if ($sc.page == 1) {
							$sc.noMoreMemo = false;
							$sc.memoLists = [];
						}
					}
					$sc.requesting = false;
				})
				.catch(function(error) { console.warn(error); });
			}
		}
		
		$sc.changeMemoType = function(type){
			// Debug
			$sc.page = 1;
			$sc.memoType = type;
			$sc.noMoreMemo = false;
			$('#scrollMemoList').scrollTop(0);
			$sc.listOfMemos(type);
		}

		function getListOfUserMemos(lists) {
			var listOfMemos = [];
			for (var i = 0; i < lists.length; i++) {
				if(lists[i].UsersMemo.type == 2){
					lists[i].UsersMemo.type
				}
				listOfMemos.push({
					memo_id: lists[i].UsersMemo.id,
					memo_text: lists[i].UsersMemo.memo,
					memo_created: lists[i].UsersMemo.created,				
					user_id: lists[i].User.id,
					textbook_name: lists[i].SubTextBookConnect.textbook_name ? lists[i].SubTextBookConnect.textbook_name : '',
					user_nickname: lists[i].User.nickname,
					teacher_id: lists[i].Teacher.id,
					teacher_name: lists[i].Teacher.name,
					type: lists[i].UsersMemo.type,
					screen_type: lists[i].UsersMemo.screen_type,
				});
			}

			return listOfMemos;
		}

		/*load more memo*/
		$sc.loadMoreMemos = function() {
			var lists = [];
			object = {
				method: 'GET',
				url: '/user/ApiSetMemo/fetchAllMemos?page=' + $sc.page  + '&type=' + $sc.memoType,
			};
			if (!$sc.requesting) {
				$sc.requesting = true;
				a.restAction(object)
				.then(function(result) {
					if (result.data.success == 1) {
						$sc.page++;
						lists = appendMemos(result.data.data);
					} else {
						$sc.noMoreMemo = true;
					}
					$sc.requesting = false;
				})
				.catch(function(error) { console.warn(error); });
			}
		}

		function appendMemos(lists) {
			for (var i = 0; i < lists.length; i++) {
				$sc.memoLists.push({
					memo_id: lists[i].UsersMemo.id,
					memo_text: lists[i].UsersMemo.memo,
					memo_created: lists[i].UsersMemo.created,				
					user_id: lists[i].User.id,
					textbook_name: lists[i].SubTextBookConnect.textbook_name? lists[i].SubTextBookConnect.textbook_name: '',
					user_nickname: lists[i].User.nickname,
					teacher_id: lists[i].Teacher.id,
					teacher_name: lists[i].Teacher.name,
					type: lists[i].UsersMemo.type,
				});
			}
		}

		/* Load list of memos*/
		$sc.listOfMemos('');

		/* load more */
		$('#scrollMemoList').on('scroll', function() {
			var scrollTop = $(this).scrollTop();
		  	if (!$sc.noMoreMemo && scrollTop + $(this).innerHeight() >= this.scrollHeight) {
		    	$sc.loadMoreMemos();
		  	}
		});

		$(".mod-save" ).find('button').live('click',function() {
			$( "#modify-memo-box" ).append('<div align="center"><img style="  width: 15px;" src="/user/images/loader.gif"></div>');
			var ulnid = $(this).attr("user-lesson-notes-id");
			var content =  $("#modify-memo-box .mod-content textarea").val();
			var trimContent = $.trim(content);
			var correctContent = content;
			$sc.memoTypeDropdown = $('#memo-type-select :selected').val();
			if (trimContent != "") {

				object = {
					method: 'POST',
					data: {
						ULNID: ulnid,
						content: correctContent
					},
					url: "/user/Memo/updateMemo"
				};
				a.restAction(object)
				.then(function(res){
					if (res.data == "true") {
						$sc.memoTypeChange();
						$( "#modify-memo-box" ).remove();
						$( ".data span.desc" ).show();
						for (var i=0; i < $sc.memoLists.length; i++) {
					        if ($sc.memoLists[i].memo_id === ulnid) {
					            $sc.memoLists[i].memo_text = correctContent;
					        }
					    }
					}
				});
			} else {
				$.post('/user/Memo/deleteMemo', {id: ulnid}, function (result) {
					$sc.memoTypeChange();
				})
				$("li#lesson-memo-" + ulnid).remove();
				$(".data span.desc").show();
				$("#modify-memo-box").remove();
			}
			$( ".option-arrow" ).show();

		});

		$sc.memoTypeChange = function(){
			$("#textarea_memo").val('');
			var textbookId = $sc.textBookConnectIdChanged? $sc.textBookConnectIdChanged: connectId; 
			var type  = $sc.memoTypeDropdown ? $sc.memoTypeDropdown : 0;
			var object = {
				method: 'GET',
				url: `/user/ApiSetMemo/fetchMemosTeacherAndTextbook?teacher_id=${connect.config.teacherID}&textbook_id=${textbookId}&type=${type}`,
			};
				a.restAction(object)
				.then(function(result) {
					if(result.data.success){
						var memoByType = result.data.data.find(x=> x['UsersMemo']['type'] == $sc.memoTypeDropdown);
						if(memoByType){
							$("#textarea_memo").val(memoByType['UsersMemo']['memo']);
							$sc.textMemo = memoByType['UsersMemo']['memo'];
							$sc.memoIdSelected = memoByType['UsersMemo']['id'];
						}else{
							$sc.memoIdSelected = null;
							$sc.textMemo = '';
						}
						console.log('$sc.memoIdSelected',$sc.memoIdSelected)
					}
				})
				.catch(function(error) { console.warn(error); });
		}
		
		$sc.textMemoSubmit = function(event) {
			event = event.currentTarget;
			var url = event.getAttribute('data-url');
			var textMemo = $sc.textMemo;
			var conInfo = (typeof connect.config =='undefined')? '' : connect.config;
			var memoType = $('#memo-type-select :selected').val();
			var object = {};
			var lessonOnair = null,
				userMemo = null,
				teacher = null,
				user = null;

			textMemo = textMemo.trim();
			if (textMemo.length == 0 || textMemo == null) {
				// NC -8353
				$.post('/user/Memo/deleteMemo', { id: $sc.memoIdSelected } ,function(result) {
					if (result == "false") {
					}else{
						$sc.memoTypeChange();
						$sc.changeMemoType();
					}
				});
				return false;
			}


			if ($('#textarea_memo').val() != '') {
				object = {
					method: 'POST',
					data: {
						onair_id: connect.config.onairID,
						t_user_id: connect.config.teacherID,
						s_user_id: connect.config.userID,
						chat_hash: connect.config.chatHash,
						memo: textMemo,
						textbook_connect_id: $sc.textBookConnectIdChanged? $sc.textBookConnectIdChanged: connectId,
						type: memoType,
						is_in_class : true
					},
					url: url
				};
				
				$sc.addMemoLoading = true;
			}
			
			a.restAction(object)
			.then(function(res){
				$('#textarea_memo').css('height', 'auto');
				if (typeof res.data.errors != 'undefined') {
					alert('メモが追加できません。');
				}  else {
					$sc.memoTypeChange();
					$sc.memoLists = [];
					$sc.page = 1;
					if ($sc.memoType === '' && res.data.success == 1) {
						$sc.memoType ='';
						$sc.changeMemoType('');
					} else if (res.data.success == 1) {
						$sc.memoType = memoType * 1;
						$sc.page++;
						lists = getListOfUserMemos(res.data.data);
						$sc.memoLists = lists;
					} else {
						$sc.noMoreMemo = true;
					}
					$sc.addMemoLoading = false;
				}
				
			});

		}
}]);