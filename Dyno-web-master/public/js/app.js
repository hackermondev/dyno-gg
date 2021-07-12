/* eslint-disable */

//globals for react
var _showSuccess, _showError
(function ($) {

	$(document).ready(function() {

		var successTimeout, errorTimeout;


		if (window.location.hash) {
			var hash = window.location.hash;

			if (hash) {
				var parts = hash.replace('module-', '').replace(/^#?\//, '').split('-'),
					tab = hash.indexOf('module-') > -1 ? 'module-' + parts.join('-') :
						(parts.length > 1 ? 'module-' + parts[0] : parts[0]);

				setTimeout(function () {
					var $tab = $('#' + tab);
					var $tabControl = $('.tab-control-legacy[href="#/' + tab + '"]');

					if (parts.length > 1) {
						var $subtab = $('#' + parts.join('-'));
						var $subtabControl = $('.subtab-control-legacy[href="' + '#/' + parts.join('-') + '"]');

						$subtabControl.closest('.tabs').find('li').removeClass('is-active');
						$subtab.closest('.tab-content').find('.subtab-content').removeClass('is-active');
						$subtabControl.parent().addClass('is-active');
						$subtab.addClass('is-active');
					}

					$('.tab-control-legacy').removeClass('is-active');
					$('.tab-content').removeClass('is-active');
					$('#loader').removeClass('is-active');
					$tabControl.addClass('is-active');
					$tab.addClass('is-active');
					
					if (parts.length <= 1) return;
				}, 200);
			} else {
				$('#loader').removeClass('is-active');
				$('#settings').addClass('is-active');
				$('.tab-control-legacy[href="#/settings"]').addClass('is-active');
			}
		} else {
			$('#loader').removeClass('is-active');
			$('#settings').addClass('is-active');
			$('.tab-control-legacy[href="#/settings"]').addClass('is-active');
		}

		function showSuccess(msg) {
			clearTimeout(successTimeout);
			$('.success').find('p').html(msg);
			$('.success').removeClass('is-hidden')

			successTimeout = setTimeout(function () {
				$('.success').addClass('is-hidden');
			}, 5000);
		}
		_showSuccess = showSuccess;

		function showError(msg) {
			clearTimeout(errorTimeout);
			$('.error').find('p').html(msg);
			$('.error').removeClass('is-hidden')

			errorTimeout = setTimeout(function () {
				$('.error').addClass('is-hidden');
			}, 10000);
		}
		_showError = showError;
		
		$('.oauth').on('click', function (e) {
			e.preventDefault();
			window.open($(this).attr('href'), 'addbotpage', 'width=495,height=600');
		});

		// handle tabs
		$('.tab-control-legacy').on('click', function (e) {
			// e.preventDefault();
			var tab = $(this).attr('href').replace(/^#?\//, '#');
			
			$('.tab-control-legacy').removeClass('is-active');
			$('.tab-content').removeClass('is-active');
			$(this).addClass('is-active');
			$(tab).addClass('is-active');
		});

		// handle subtabs
		$('.subtab-control-legacy').on('click', function (e) {
			// e.preventDefault();
			var tab = $(this).attr('href').replace(/^#?\//, '#');
			
			// $('.subtab-control-legacy').parent().removeClass('is-active');
			$(this).closest('.tabs').find('li').removeClass('is-active');
			$(this).closest('.tab-content').find('.subtab-content').removeClass('is-active');
			$(this).parent().addClass('is-active');
			$(tab).addClass('is-active');
		});

		$('.queue-control').on('click', function (e) {
			var $tab = $('#module-music');
			$tab.find('.subtab-content').removeClass('is-active');
			$tab.find('.tabs').find('li').removeClass('is-active');
			$tab.find('#music-queue').addClass('is-active');
			$(this).closest('.tabs').find('li').removeClass('is-active');
			$('.tab-control-legacy').removeClass('is-active');
			$('.tab-content').removeClass('is-active');
			$('.tab-control-legacy[href="#/module-music"]').addClass('is-active');
			$('.subtab-control-legacy[href="#/music-queue"]').closest('li').addClass('is-active');
			$tab.addClass('is-active');
		});

		// Server selector
		$('.server-select > select').on('change', function () {
			window.location.href = '/manage/' + $(this).val();
		});

		// Thumbnail hover 

		$(document).on('mouseover', '.queue-title a', function(e) {
			const imgElement = $(this).parent().find('.queue-thumb');
			const thumbUrl = imgElement.data('thumbUrl');
			imgElement.attr('src', thumbUrl);
		})
	});

})(jQuery);