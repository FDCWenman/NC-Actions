userApp.controller('recruitTeacherExam', ['$scope', '$rootScope', '$interval', '$timeout', 'Ajax', '$http', function($sc, $rs, $interval, $timeout, a, $http) {
	
	$sc.examTemplate = {
		exams : [{
			id: '',
			answer: '',
			exam: '',
			selection1: '',
			selection2: '',
			selection3: '',
			selection4: '',
			no: '',
			id: '',
			correct_message: '',
			correct: '',
			show_correct_message: false
		}],
		page: '',
		next_page: '',
		prev_page: '',
		has_next: false,
		next_page_class: "button next disabled",
		submit_class: "button success disabled next_page_trigger",
		back_page_class : "button back",
		exam_passed: ''
	};

	$sc.submitAndNextPageProcess = null;
	
	$sc.recruit_id = typeof recruitId == "undefined" ? '' : recruitId;

	$sc.questionHide = true;
	
	$sc.noEmptyAnswer = function(arr) {
		var noEmptyAnswer = true;
		for (var i = 0; i < arr.length; i++) {
			if (arr[i].answer == "") {
				noEmptyAnswer = false;
				break;
			}
		}
		$sc.examTemplate.next_page_class = noEmptyAnswer ? "button next" : "button next disabled";
		$sc.examTemplate.submit_class = noEmptyAnswer ? "button success next_page_trigger" : "button successdisabled next_page_trigger";
	};
	
	$sc.submitAndNextPage = function(arr, page, link) {
		// make button disable
		$sc.examTemplate.next_page_class = "button next disabled";
		$sc.examTemplate.back_page_class = "button back disabled";
		$sc.examTemplate.submit_class = "button success disabled next_page_trigger disabled";

		if ($sc.submitAndNextPageProcess != null) {
			return;
		}

		// submit answers
		$sc.submitAndNextPageProcess = $http({
			method: 'POST',
			url   : '/user/recruit/test-input/submitAnswer',
			data  : {recruit_id: $sc.recruit_id, exam: arr.exams, exam_category: exam_category}
		}).then(function(result) {
			if (!result.data.error) {
				// classes
				$sc.examTemplate.back_page_class = "button back";
				$sc.examTemplate.submit_class = "button success disabled next_page_trigger";

				// process result
				if (typeof page == "number") {
					// proceed to whatever page is given
					$sc.getQuestions(page);

					// scroll top
					$('html, body').animate({scrollTop: 0});

				} else if (page == '' && link) {
					// proceed to link
					location.href = link;
				}
			} else {
				console.warn('error occured, kindly resubmit your answer');
			}

			$sc.submitAndNextPageProcess = null;
		});
	};
	
	$sc.submitAndResult = function(category) {
		var url = "/user/recruit/quiz-input/" + category;
		$http({
			method: 'POST',
			url   : url,
			data  : {recruit_id: $sc.recruit_id}
		}).then(function(result) {

			if (typeof result != 'undefined' && typeof result.data != 'undefined' && typeof result.data.questions != 'undefined') {
				// correct answers
				var correctAnswers = result.data.questions;
				for (var idx=0; idx < $sc.examTemplate.exams.length; idx++) {
					var examId = $sc.examTemplate.exams[idx].id;

					// set correct answer
					$sc.examTemplate.exams[idx].correct = correctAnswers[examId].correct;

					// set exam passed
					$sc.examTemplate.exam_passed = result.data.score_percentage == 100 ? 'passed' : 'failed';

					// set show correct message if the answer is incorrect
					if (( $sc.examTemplate.exam_passed == 'failed' &&
							correctAnswers[examId].correct != correctAnswers[examId].answered ) ||
						(correctAnswers[examId].correct != correctAnswers[examId].answered) )
					{
						$sc.examTemplate.exams[idx].show_correct_message = true;
					}
				}
			}

		});
	}
	
	$sc.getQuestions = function(page, link) {
		var getExamResult = typeof result != "undefined" && result == true ? true : false;
		var li = typeof link == "undefined" ? '' : link;

		if (page =='' && link) {
			location.href = link;
			return;
		}

		$http({
			method: 'POST',
			url   : '/user/recruit/test-input/getExamQuestions',
			data  : {recruit_id: $sc.recruit_id, page: page, exam_category: exam_category, include_exam_result: getExamResult}
		}).then(function(result) {
			$sc.examTemplate.exams = result.data.questions;
			$sc.examTemplate.page = result.data.page;
			$sc.examTemplate.next_page = result.data.page + 1;
			$sc.examTemplate.prev_page = result.data.page - 1;
			$sc.examTemplate.has_next = result.data.has_next;
			$sc.noEmptyAnswer($sc.examTemplate.exams);

			$sc.questionHide = false;
		});
	};
	
	$sc.initQuestionnaire = function(page) {
		$sc.getQuestions(page);
		if (typeof remainingTime != "undefined" && remainingTime > 0) {
			$sc.initiateTimeLimit();
		}
	};

	$sc.initiateTimeLimit = function() {
		// set the timer logic
		var clock = $('#cnt_time');
		clock.show();
		
		// if interval exists
		if (timeInterval !== null) { clearInterval(timeInterval); }

		var seconds = remainingTime;

		// start interval
		timeInterval = $interval(function() {
			var minutes = seconds / 60;

			// set remaining times
			var remMins = Math.floor(seconds / 60);
			var remSecs = Math.floor(seconds % 60);
			
			// set html value
			remMins = remMins < 10 ? "0" + remMins : remMins;
			remSecs = remSecs < 10 ? "0" + remSecs : remSecs;
			remMins = (seconds < 0) ? "--" : remMins;
			remSecs = (seconds < 0) ? "--" : remSecs;
			
			// set html value
			if (timeStop === false) { clock.html(remMins + ":" + remSecs); }
			else { clock.html("--:--"); }
			
			// set attr
			clock.attr('remMins', remMins);
			clock.attr('remSecs', remSecs);
			
			// if seconds is less than 0
			if ((seconds) <= 0) {
				/* clear interval */
				$interval.cancel(timeInterval);

				// no more next page
				$sc.examTemplate.has_next = false;
				$sc.examTemplate.submit_class = "button success next_page_trigger";

				alert('Viewing Exam Result in 3 seconds..');
				$timeout(function() {
					$sc.submitAndNextPage($sc.examTemplate, '', '/user/recruit/test-result');
				}, 3000);
				timeStop = true;
			}
			
			// deduct seconds
			seconds = seconds - 1;
		}, 1000);
	};
	
	$sc.initQuestionnaire(1);
}]);