/**
 * Define review filter service
 * If there is a feature that can be reused, it will be moved to the service.js.
 */
userApp.factory('reviewFilterService', function() {
    var _this = {};
    var Rating = {
        selected: [],
        min: null,
        max: null,
        annotation_default: '',
        annotation_separator: ' ～ '
    };
    const DISABLED = 'disabled';
    const DEFAULT = 'default';
    var status = DEFAULT;// DISABLED, DEFAULT
    var stars = [];
    var textbooks = [];
    /**
     * Adding star
     * @param outerTarget
     * @param innerTarget
     * @param value
     * @param status
     * @param disabled
     */
    _this.addStar = function (outerTarget, innerTarget, value, status, disabled) {
        if (!disabled) {
            disabled = false;
        }
        stars.push({
            outerTarget: outerTarget,
            innerTarget: innerTarget,
            value: value,
            status: status,
            disabled: disabled
        });
    };
    /**
     * Adding textbook radio options
     * @param target
     * @param value
     * @param status
     * @param disabled
     */
    _this.addTextbookRadio = function (target, value, status, disabled) {
        if (!disabled) {
            disabled = false;
        }
        textbooks.push({
            target: target,
            value: value,
            status: status,
            disabled: disabled
        });
    }
    _this.starClicking = function (options) {
        if (status === DISABLED) {
            return;
        }
        var selected = [];
        if (Rating.max < options.value && Rating.max !== 0) {
            selected = Rating.selected;
            for (var i = Rating.max; i <= options.value; i++) {
                if (selected.indexOf(i) === -1) {
                    selected.push(i);   
                }
            }
        } else if (Rating.max === Rating.min && Rating.min > options.value && Rating.min !== 0) {
            selected = Rating.selected;
            for (var j = options.value; j < Rating.min; j++) {
                if (selected.indexOf(j) === -1) {
                    selected.push(j);   
                }
            }
        } else if (Rating.max === Rating.min && Rating.min === options.value) {
            selected = [];
        } else {
            selected = [options.value];
        }
        
        _this.update(selected);
    };
    _this.getAnnotation = function () {
        if (!Rating.selected.length) {
            return Rating.annotation_default;
        }
        
        if (Rating.min === Rating.max) {
            return Rating.min;
        }
      
      return Rating.min + Rating.annotation_separator + Rating.max;
    };
    _this.setAnnotationDefault = function (value) {
        Rating.annotation_default = value;
    };
    _this.getRating = function () {
      return Rating.selected;  
    };
    _this.update = function (seleted) {
        if (seleted && Array.isArray(seleted)) {
            Rating.selected = seleted;
            calcMinMax();
        }
        stars.forEach(function (star) {
            changeStarStatus(star, 'inactive');
        });
        Rating.selected.forEach(function (rating) {
            stars.filter(function (star) {
                return star.value === rating;
            }).forEach(function (star) {
                changeStarStatus(star, 'active');
            });
        });
    };
    _this.getStars = function () {
        return stars;
    };
    _this.loading = function (options) {
        var convert_status = status === DISABLED ? 'hide' : 'show';
        if (!options || options.status === convert_status) {
            return ;
        } else {
            if (options.status === 'hide') {
                status = DISABLED;
            } else {
                status = DEFAULT;
            }
        }
        
        styleCursor();
        textbookOptionsSelectable();
    };
    _this.disabledTextbookOption = function (value) {
        textbooks.forEach(function (textbook) {
            if (textbook.value === value) {
                textbook.disabled = true;
                textbook.target.prop('disabled', true);
            }
        });
    };
    function changeStarStatus(star, status) {
        if (star.disabled) {
            return;
        }
        star.status = status;
        if (status === 'active') {
            star.innerTarget.css('width', '100%');
        } else {
            star.innerTarget.css('width', '0%');
        }
    }
    function calcMinMax() {
        Rating.min = Math.min(...Rating.selected);
        Rating.max = Math.max(...Rating.selected);
        if (!isFinite(Rating.min)) {
            Rating.min = 0;
        }

        if (!isFinite(Rating.max)) {
            Rating.max = 0;
        }
    }
    function styleCursor(options) {
        var cursor = 'pointer';
        if (status === DISABLED) {
            cursor = 'not-allowed';
        }
        stars.forEach(function (star) {
            if (!star.disabled && star.outerTarget.length) {
                star.outerTarget.css('cursor', cursor);
            }
        });
    }
    function textbookOptionsSelectable() {
        var selectable = false;
        if (status === DISABLED) {
            selectable = true;
        }
        textbooks.forEach(function (textbook) {
            if (!textbook.disabled && textbook.target.length) {
                textbook.target.prop('disabled', selectable);   
            }
        });
    }

    return _this;
});

/**
 * Define review comment service
 * If there is a feature that can be reused, it will be moved to the service.js.
 */
userApp.factory('reviewCommentService', ['$http', function ($http) {
    var _this = {},
        teacherId = '',
        filter = {
            textbook_type: '0',
            textbook_selected: {
                type: '', // course, series, preset, favorite
                id: null,
                type_id: null,
            },
            rates: [],
            order: '0'
        },
        filterSnapshot = null, // null | {}
        paramsSnapshot = null, // null | {}
        endPoint = '/waiting/getTeacherReviews',
        loading_status = false,
        first_load = true,
        settingOptions = {};
    
    _this.changeFilter = function (options) {
        for (var filter_key in options) {
            filter[filter_key] = options[filter_key];
        }
    };
    _this.isLoading = function () {
      return loading_status;  
    };
    _this.getReviews = function (params, successCallback, beforeCallback) {
        //NJ-20069
        if(typeof isAvatar !== 'undefined' && isAvatar){
            params['isAvatar'] = true;
        }
        $http({
            method: 'GET',
            url: endPoint + '?r='+new Date().getTime(),
            params: params,
            beforeSend: function(data) {
                loading_status = true;
                if (typeof beforeCallback === 'function') {
                    beforeCallback(data);
                }
            }
        }).then(function(res) {
            loading_status = false;
            if (typeof successCallback === 'function') {
                successCallback(res);
                $(".anchor_review_tab").hide(); //hide reviews tab on page load 
            }
        });
    };
    _this.loadReviews = function (successCallback, beforeCallback) {
        if (_this.isLoading()) {
            return;
        }
        _this.getReviews(getFilterParameters(), successCallback, beforeCallback);
    };
    _this.updateSortingFunction = function (successCallback, beforeCallback) {
        _this.getReviews(getSortingFunctionFilterParameter(), successCallback, beforeCallback);
    };
    _this.setTeacherId = function (id) {
        teacherId = parseInt(id);
        if (!isFinite(teacherId)) {
            teacherId = 0;
        }
    };
    _this.getQueryString = function (snapshot_flg, with_page) {
        var searchDefault = {
                textbook_type: '0',
                rates: [2, 3, 4, 5],
                order: '0'
            },
            build_flag = false;
        var filterOptions = filter;
        if (snapshot_flg) {
            filterOptions = filterSnapshot;
        }
        if (filterOptions.textbook_type !== searchDefault.textbook_type || filterOptions.order !== searchDefault.order || with_page) {
            build_flag = true;
        }
        
        if (filterOptions.rates.length) {
            if (filterOptions.rates.length === searchDefault.rates.length) {
                var filter_rates = filterOptions.rates,
                    default_rates = searchDefault.rates,
                    found = true;
                // Find default values in filter rates
                for (var i = 0; i < default_rates.length; i++) {
                    if (filter_rates.indexOf(default_rates[i]) === -1) {
                        found = false;
                        break;
                    }
                }
                if (!found) {
                    build_flag = true;
                }
            } else {
                build_flag = true;
            }
        }

        var query_string = '';
        if (build_flag) {
            var query = new URLSearchParams();
            // Textbook type
            query.append("textbook_type", filterOptions.textbook_type);
            if (filterOptions.textbook_type !== '0') {
                var text_book_selected_key = '',
                    text_book_selected_type_key = '';
                if (filterOptions.textbook_selected.type === 'course') {
                    text_book_selected_key = 'textbook_course';
                } else if (filterOptions.textbook_selected.type === 'series') {
                    text_book_selected_key = 'textbook_series';
                } else if (filterOptions.textbook_selected.type === 'favorite') {
                    text_book_selected_key = 'textbook_favorite';
                } else {
                    text_book_selected_key = 'textbook_preset';
                    text_book_selected_type_key = 'textbook_preset_type';
                }
                if (text_book_selected_key) {
                    query.append(text_book_selected_key, filterOptions.textbook_selected.id);    
                }
                if (text_book_selected_type_key) {
                    query.append(text_book_selected_type_key, filterOptions.textbook_selected.type_id);
                }
            }
            // Rating
            filterOptions.rates.forEach(function (rate, index) {
                query.append("rate[" + index + "]", rate);
            });
            // Page
            if (with_page) {
                query.append('page', settingOptions.page);
            }
            query_string = '#?' + query.toString();
        }
        
        return query_string;
    };
    _this.settingOptions = function (options) {
        for (var option in options) {
            settingOptions[option] = options[option];
        }
    };

    function getFilterParameters() {
        var params = {teacherId: teacherId, order: parseInt(filter.order)};
        if (!isFinite(params.order)) {
            params.order = 0;
        }
        if (filter.textbook_type !== '0') {
            if (filter.textbook_selected.type === 'course') {
                params.textbook_course = filter.textbook_selected.id;
            } else if (filter.textbook_selected.type === 'series') {
                params.textbook_series = filter.textbook_selected.id;
            }  else if (filter.textbook_selected.type === 'favorite') {
                params.textbook_favorite = filter.textbook_selected.id;
            } else {
                params['textbook_preset[category_id]'] = filter.textbook_selected.id;
                params['textbook_preset[textbook_type]'] = filter.textbook_selected.type_id;
            }
        }
        if (filter.rates.length) {
            filter.rates.forEach(function (rate, index) {
                params['rate[' + index + ']'] = rate;  
            })
        }
        if (first_load) {
            first_load = false;
            params.load_categories = true;
        }
        if (settingOptions.hasOwnProperty('limit')) {
            params.limit = settingOptions.limit;
        }
        if (settingOptions.hasOwnProperty('page')) {
            params.page = settingOptions.page;
            if(typeof avatarDetailPage == 'undefined') {
                params.load_paging = true;
            }
        }
        if(typeof isAvatar != 'undefined') {
            params.isAvatar = isAvatar
        }

        paramsSnapshot = angular.copy(params);
        filterSnapshot = angular.copy(filter);
        return params;
    }
    function getSortingFunctionFilterParameter() {
        if (!paramsSnapshot) {
            paramsSnapshot = getFilterParameters();
        }
        // Get current sorting function value
        var order = parseInt(filter.order);
        if (!isFinite(order)) {
            order = 0;
        }
        paramsSnapshot.order = order;
        
        // Reset to first page
        if (paramsSnapshot.page) {
            paramsSnapshot.page = 1;
        }

        return paramsSnapshot;
    }

    return _this;
}]);
userApp
    .controller('teacherReview', ['$scope', '$rootScope', 'Ajax', '$http', '$compile', '$location', '$window', 'reviewFilterService', 'reviewCommentService',
        function ($sc, $rs, a, $http, $compile, $location, $window, reviewFilterService, reviewCommentService) {
            // Get constant
            reviewFilterService.setAnnotationDefault(angular.element('#ng_constant_unselected_rating_annotation').val());
            reviewCommentService.setTeacherId(angular.element('#ng_constant_teacher_id').val());
            $sc.isWaitingDetail = !!angular.element('#ng_constant_search_type').val();// true: waiting detail page, false: teacher review page
            $sc.redirectUrl = angular.element('#ng_constant_redirect_url').val();
            $sc.TEXTBOOK_COURSE = angular.element('#ng_constant_textbook_course').val();
            $sc.TEXTBOOK_SERIES = angular.element('#ng_constant_textbook_series').val();
            $sc.TEXTBOOK_PRESET = angular.element('#ng_constant_textbook_preset').val();
            $sc.TEXTBOOK_FAVORITE = angular.element('#ng_constant_textbook_favorite').val();
            $sc.selectedItem = angular.element('#ng_constant_order').val();
            $sc.searchOnChange = false;
            
            // Model
            var RATING_DEFAULT_SELECTION = [];
            var ratingAnnotationElement = angular.element('#rating_annotation');
            var sortingFunctionElement = angular.element('#teacher-review-sort-select');
            $sc.rating = RATING_DEFAULT_SELECTION;
            $rs.rating_annotation = '';
            $sc.courses = {
                selected: {},
                items: []
            };
            $sc.series = {
                selected: {},
                items: []
            };
            $sc.preset = {
                selected: {},
                display_text: ''
            };
            $sc.favorites = {
                selected: {},
                items: []
            };
            $sc.textbook_option = '0';
            $sc.review_loading = false;
            // Action in scope
            var findTextbook = function (arrData, id) {
                if (!arrData || !Array.isArray(arrData)) {
                    return [];
                }
                
                return arrData.filter(function (textbook) {
                   return textbook.id === id;
                });
            };
            var successLoadReviews = function (response) {
                var resultWrap = $('.review_list_wrap'), pagingWrap = $('#teacher_reviews_paging_wrap');
                if (response && response.data) {
                    resultWrap.html('');
                    var data = response.data;
                    if (typeof data.htmlReviews != 'undefined') {
                        resultWrap.html($compile(data.htmlReviews)($rs)).closest('#anchor_review').show();   
                    }
                    if (typeof data.htmlPaging === 'string') {
                        pagingWrap.html('').html($compile(data.htmlPaging)($sc));
                    }
                    if (data.textbookCategories) {
                        var textbooks = data.textbookCategories;
                        if (textbooks.course && textbooks.course.length) {
                            var selectedCourse = textbooks.course[0];
                            if ($sc.courses.selected && $sc.courses.selected.id) {
                                var find_course = findTextbook(textbooks.course, $sc.courses.selected.id);
                                if (find_course.length) {
                                    selectedCourse = find_course[0];
                                }
                            }
                            $sc.courses = {
                                selected: selectedCourse,
                                items: textbooks.course
                            }
                        } else {
                            reviewFilterService.disabledTextbookOption(parseInt($sc.TEXTBOOK_COURSE));
                        }
                        
                        if (textbooks.series && textbooks.series.length) {
                            var selectedSeries = textbooks.series[0];
                            var find_series = findTextbook(textbooks.series, $sc.series.selected.id);
                            if (find_series.length) {
                                selectedSeries = find_series[0];
                            }
                            $sc.series = {
                                selected: selectedSeries,
                                items: textbooks.series
                            };
                        } else {
                            reviewFilterService.disabledTextbookOption(parseInt($sc.TEXTBOOK_SERIES));
                        }
                        if (textbooks.preset) {
                            $sc.preset = {
                                selected: {
                                    id: textbooks.preset.category_id,
                                    type_id: textbooks.preset.textbook_type,
                                    type: 'preset'
                                },
                                display_text: textbooks.preset.display_text
                            };
                        }

                        if (textbooks.favorite && textbooks.favorite.length) {
                            var selectedFavorite = textbooks.favorite[0];
                            if ($sc.favorites.selected && $sc.favorites.selected.id) {
                                var find_favorite = findTextbook(textbooks.favorite, $sc.favorites.selected.id);
                                if (find_favorite.length) {
                                    selectedFavorite = find_favorite[0];
                                }
                            }
                            $sc.favorites = {
                                selected: selectedFavorite,
                                items: textbooks.favorite
                            }
                        } else {
                            reviewFilterService.disabledTextbookOption(parseInt($sc.TEXTBOOK_FAVORITE));
                        }
                    }
                } else {
                    resultWrap.html('');
                    if (pagingWrap.length) {
                        pagingWrap.html('');
                    }
                }
                $sc.review_loading = false;
                reviewFilterService.loading({status: 'show'});
                sortingFunctionElement.prop('disabled', false);
            };
            var beforeLoadReviews = function (data) {
                $sc.review_loading = true;
                reviewFilterService.loading({status: 'hide'});
                $(".review_list_wrap").html('<p id="loader" class="t_center m_t_20 m_b_20 d_block"><img src="/images/ajax-loader.gif"></p>');
                $('#teacher_reviews_paging_wrap').html('');
                sortingFunctionElement.prop('disabled', true);
            };
            var changeAnnotation = function (text, rating) {
                if (!ratingAnnotationElement || !ratingAnnotationElement.length) {
                    console.warn('Rating annoation not exists');
                    return;
                }
                
                $sc.rating_annotation = text;
                if (rating && rating.length) {
                    ratingAnnotationElement.addClass('on');
                } else {
                    ratingAnnotationElement.removeClass('on');
                }
            };
            
            // Action in view
            function init() {
                var ratingStars = [2, 3, 4, 5];
                // Initial rating filter
                reviewFilterService.addStar(angular.element('#outer_star_1'), angular.element('#inner_star_1'), 1, 'inactive', true);
                ratingStars.forEach(function (rate) {
                    reviewFilterService.addStar(angular.element('#outer_star_' + rate), angular.element('#inner_star_' + rate), rate, 'inactive');
                });
                reviewFilterService.update($sc.rating);
                // Initial textbook filter options
                reviewFilterService.addTextbookRadio(angular.element('#radio_textbook_0'), 0, 'active'); // 指定なし
                reviewFilterService.addTextbookRadio(angular.element('#radio_textbook_1'), 1, 'active'); // コースを指定
                reviewFilterService.addTextbookRadio(angular.element('#radio_textbook_2'), 2, 'active'); // 教材を指定
                reviewFilterService.addTextbookRadio(angular.element('#radio_textbook_3'), 3, 'active'); // 選択中の教材でレッスン可能
                reviewFilterService.addTextbookRadio(angular.element('#radio_textbook_4'), 4, 'active'); // お気に入り教材

                var queryString = $location.search(),
                    page = 1;
                if (Object.keys(queryString).length !== 0) {
                    if (queryString.hasOwnProperty('textbook_type')) {
                        if (queryString.textbook_type !== '0') {
                            // Set selected textbook for course or series
                            if (queryString.textbook_type === $sc.TEXTBOOK_COURSE) {
                                $sc.courses.selected = {
                                    id: queryString.textbook_course,
                                    type: 'course'
                                };
                            } else if (queryString.textbook_type === $sc.TEXTBOOK_SERIES) {
                                $sc.series.selected = {
                                    id: queryString.textbook_series,
                                    type: 'series'
                                };
                            } else if (queryString.textbook_type === $sc.TEXTBOOK_FAVORITE) {
                                $sc.favorites.selected = {
                                    id: queryString.textbook_favorite,
                                    type: 'favorite'
                                };
                            } else {
                                $sc.preset.selected = {
                                    id: queryString.textbook_preset,
                                    type: 'preset',
                                    type_id: queryString.textbook_preset_type || 1
                                };
                            }
                        }
                        $sc.changeFilterTextbookType(queryString.textbook_type);
                    }
                    if (queryString.hasOwnProperty('order')) {
                        $sc.order = queryString.order;
                    }
                    if (queryString.hasOwnProperty('page')) {
                        page = queryString.page;
                    }
                    var rating = [];
                    [0, 1, 2, 3, 4].forEach(function (rate_index) {
                        if (queryString.hasOwnProperty('rate[' + rate_index + ']')) {
                            rating.push(queryString['rate[' + rate_index + ']']);
                        }
                    });
                    if (rating.length) {
                        rating.sort(function (a, b) {
                            return a - b;
                        }).forEach(function (rate) {
                            reviewFilterService.starClicking({value: parseInt(rate)});
                        });
                        $sc.rating = reviewFilterService.getRating();
                        reviewFilterService.update($sc.rating);
                    }
                }
                changeAnnotation(reviewFilterService.getAnnotation(), $sc.rating);
                reviewCommentService.changeFilter({rates: $sc.rating, textbook_type: $sc.textbook_option, order: $sc.selectedItem});
                if (!$sc.isWaitingDetail) {
                    reviewCommentService.settingOptions({limit:10, page: page});
                }
                reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
            }
            $sc.changeFilterTextbookType = function (type_id) {
                if ($sc.review_loading) {
                    return ;
                }
                $sc.textbook_option = type_id;
                var filter = {textbook_type: type_id};
                
                if (type_id === $sc.TEXTBOOK_COURSE) {
                    filter.textbook_selected = $sc.courses.selected;
                } else if (type_id === $sc.TEXTBOOK_SERIES) {
                    filter.textbook_selected = $sc.series.selected;
                } else if (type_id === $sc.TEXTBOOK_PRESET) {
                    filter.textbook_selected = $sc.preset.selected;
                } else if (type_id === $sc.TEXTBOOK_FAVORITE) {
                    filter.textbook_selected = $sc.favorites.selected;
                }
                
                reviewCommentService.changeFilter(filter);
                if ($sc.searchOnChange) {
                    reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
                }
            };
            $sc.getTeacherReviews = function (sort_type) {
                reviewCommentService.changeFilter({order: sort_type});
                reviewCommentService.settingOptions({page: 1});
                reviewCommentService.updateSortingFunction(successLoadReviews, beforeLoadReviews);
            };
            $sc.clearFilter = function () {
                // Clear rating
                $sc.rating = RATING_DEFAULT_SELECTION;
                reviewFilterService.update($sc.rating);
                changeAnnotation(reviewFilterService.getAnnotation(), $sc.rating);
                
                // Clear textbook
                $sc.textbook_option = '0';
                $sc.selectedItem = '0';
                reviewCommentService.changeFilter({rates: $sc.rating, textbook_type: $sc.textbook_option, order: $sc.selectedItem});
                reviewCommentService.settingOptions({page: 1});
                reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
            };
            $sc.starOnClick = function (value) {
                if ($sc.review_loading) {
                    return ;
                }
                reviewFilterService.starClicking({value: value});
                $sc.rating = reviewFilterService.getRating();
                changeAnnotation(reviewFilterService.getAnnotation(), $sc.rating);
                reviewCommentService.changeFilter({rates: $sc.rating});
                if ($sc.searchOnChange) {
                    reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
                }
            };
            $sc.textbookCoursesSelection = function (textbook, event) {
                $sc.courses.selected = textbook;
                reviewCommentService.changeFilter({textbook_selected: $sc.courses.selected});
                $rs.customSelectorOptionOption(event);
                if ($sc.searchOnChange) {
                    reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
                }
            };
            $sc.textbookSeriesSelection = function (textbook, event) {
                $sc.series.selected = textbook;
                reviewCommentService.changeFilter({textbook_selected: $sc.series.selected});
                $rs.customSelectorOptionOption(event);
                if ($sc.searchOnChange) {
                    reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
                }
            };
            $sc.textbookFavoriteSelection = function (textbook, event) {
                $sc.favorites.selected = textbook;
                reviewCommentService.changeFilter({textbook_selected: $sc.favorites.selected});
                $rs.customSelectorOptionOption(event);
                if ($sc.searchOnChange) {
                    reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
                }
            };
            $sc.searchReview = function () {
                reviewCommentService.settingOptions({page: 1});
                reviewCommentService.loadReviews(successLoadReviews, beforeLoadReviews);
            };
            $sc.redirectToTeacherReview = function () {
                if ($sc.review_loading) {
                    return ;
                }
                $sc.review_loading = true;
                $window.location.href = $sc.redirectUrl + reviewCommentService.getQueryString();
            };
            $sc.changePage = function (page) {
                if ($sc.review_loading) {
                    return ;
                }
                
                $sc.review_loading = true;
                reviewCommentService.settingOptions({page: page});
                $window.location.href = $sc.redirectUrl + reviewCommentService.getQueryString(true, true);
                $window.location.reload();
                $window.scrollTo(0, 0);
            };
            $sc.disableFavoriteRadio = function() {
                reviewFilterService.disabledTextbookOption(parseInt($sc.TEXTBOOK_FAVORITE));
            }
            init();
        }]);
