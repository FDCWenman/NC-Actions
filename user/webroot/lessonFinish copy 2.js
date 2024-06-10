userApp
.controller('lessonFinish', ['$scope', '$rootScope', 'Ajax',
	function($sc, $rs, a) {

	$sc.buttonClicked = false;


	$rs.sendProblem = function(event) {
		var modalId = "#dialog_lesson_apology";
		var target = $(event.currentTarget);
		var showModal = true;
		//on process
		if ($sc.buttonClicked) {
			target.addClass('disabled');
			return;
		}
		$sc.buttonClicked = true;

		var userProblem = $("#voice_trouble").val().trim();
		if (userProblem.length == 0) {
			showModal = false;
			userProblem = '[the user did not input some comments]';
		}
		var obj = {};
		obj.method = 'POST';
		obj.url = '/user/LessonFinish/reportProblem';
		//data
		obj.data = {
			problem: userProblem,
			chatHash: chatHash
		};
		a.restAction(obj).then(function(res) {
			var result = res.data;
			if (!result.success) {
				console.log("Something happen.");
			}
			//close modal
			$sc.buttonClicked = false;
			//show modal if user put comment
			if (showModal) {
				$('#dialog_lesson_apology').hide();
				$('#trigger_modal_lesson_apology_send').click();
			} else {
				$("#modal_overlay").click();
			}
		});
	}

}]);	