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
		
		function apiPost(url, data, callback) {
			if (typeof data === 'function') {
				callback = data;
				data = {};
			}

			var options = {
				method: 'POST',
				url: url,
			};

			data = data || {};

			if (data) {
				options.data = data;
			}

			$.ajax(options).done(function (msg) {
				return callback(null, msg);
			}).fail(function () {
				return callback(true);
			});
		}

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

		// faq toggle
		$('.faq-title').on('click', function (e) {
			e.preventDefault();
			$(this).toggleClass('is-active');
			$(this).next().toggleClass('is-active');
		});

		// module checkboxes
		// $('.module').on('change', function () {
		// 	var module = $(this).val(),
		// 		enabled = this.checked,
		// 		url = '/api/server/' + server + '/updateMod',
		// 		data = { module: module, enabled: enabled };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
		// 		return showSuccess("Module '" + module + "' has been " + enabledOrDisabled + '.');
		// 	});
		// });

		// $('.module-toggle').on('click', function (e) {
		// 	if (e.target !== this) return;

		// 	var $checkbox = $(this).find('input[type=checkbox]'),
		// 		checked = $checkbox.prop('checked');

		// 	$checkbox.prop('checked', checked ? false : true).attr('checked', 'checked').trigger('change');
		// });

		// Update nickname
		$('.nick').on('click', function (e) {
			e.preventDefault();
			var nick = $(this).prev('input[type=text]').val(),
				maxLength = $(this).attr('maxlength'),
				url = '/api/server/' + server + '/updateNick',
				data = { nick: nick };

			if (maxLength && nick.length > maxLength) {
				return showError('Nickname is too long.');
			}

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Nickname changed to ' + nick);
			});
		});

		$('.remove-moderator').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				id = $el.attr('id'),
				url = '/api/server/' + server + '/removeModerator',
				data = { id: id };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Removed moderator.');
				$el.closest('.mod').remove();
			});
		});

		// text box submits (when they press enter)
		$('.text-form').on('submit', function (e) {
			$(this).find('.button').click();
			e.preventDefault();
			return;
		});

		// update settings (by clicking the update button)
		$('.update-setting').on('click', function (e) {
			e.preventDefault();

			var text = $(this).prev('input[type=text]'),
				setting = text.attr('name'),
				maxLength = text.attr('maxlength'),
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: text.val() };

			if (maxLength && text.val().length > maxLength) {
				return showError('Setting length is too long.');
			}

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Changed ' + setting + ': ' + text.val());
			});
		});

		// bot setting checkboxes
		$('.setting-checkbox').on('change', function () {
			var setting = $(this).attr('name'),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: enabled };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
				return showSuccess("'" + setting + "' has been " + enabledOrDisabled + '.');
			});
		});

		// beta checkbox
		$('.beta-checkbox').on('change', function () {
			var setting = $(this).attr('name'),
				enabled = this.checked,
				url = '/api/server/' + server + '/updateSetting',
				data = { setting: setting, value: enabled };

			apiPost(url, data, function (err) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'Enabled' : 'Disabled';
				var redirect = enabled ? 'https://beta.dynobot.net' : 'https://www.dynobot.net';

				showSuccess(enabledOrDisabled + ' Dyno Beta, redirecting you to ' + redirect);

				// redirect
				window.location.href = redirect;
			});
		});

		// update module settings (by clicking the button)
		$('.update-module-setting').on('click', function (e) {
			e.preventDefault();

			var parent = $(this).closest('form'),
				text = parent.find('input[type=text], textarea'),
				module = text.attr('data-module'),
				setting = text.attr('name'),
				url = '/api/server/' + server + '/updateModSetting',
				data = { module: module, setting: setting, value: text.val() };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return showSuccess('Changed ' + setting + ': ' + text.val());
			});
		});

		// announcement setting checkboxes
		// $('.module-setting-checkbox').on('change', function () {
		// 	var setting = $(this).attr('name'),
		// 		module = $(this).attr('data-module'),
		// 		enabled = this.checked,
		// 		url = '/api/server/' + server + '/updateModSetting',
		// 		data = { module: module, setting: setting, value: enabled };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
		// 		return showSuccess("'" + setting + "' has been " + enabledOrDisabled + '.');
		// 	});
		// });

		// module setting dropdowns
		$('.setting-dropdown').on('change', function () {
			var setting = $(this).attr('name'),
				module = $(this).attr('data-module'),
				value = $(this).val(),
				endpoint = module ? '/updateModSetting' : '/updateSetting',
				url = '/api/server/' + server + endpoint,
				data = { setting: setting, value: value };

			if (module) {
				data.module = module;
			}

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
				return showSuccess(setting + " changed.");
			});
		});


		// Module channel adding
		// $('.add-module-item').on('click', function (e) {
		// 	e.preventDefault();

		// 	var data = $(this).closest('form').serializeArray(),
		// 		url = '/api/server/' + server + '/moduleItem/add';

		// 	data.push({ name: 'module', value: $(this).attr('data-module') });
		// 	data.push({ name: 'setting', value: $(this).attr('data-setting') });

		// 	apiPost(url, $.param(data), function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		showSuccess(msg.value + ' added');
		// 		return location.reload();
		// 	});
		// });

		// Module channel removing
		$('.remove-module-item').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				id = $(this).attr('data-id'),
				module = $(this).attr('data-module'),
				setting = $(this).attr('data-setting'),
				url = '/api/server/' + server + '/moduleItem/remove',
				data = { module: module, setting: setting, id: id };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(msg.value + ' removed.');
				return $el.remove();
			});
		});

		// $('.item-channel').on('change', function () {
		// 	var name = $('option:selected', this).attr('data-name');
		// 	$(this).closest('form').find('input[name=name]').val(name);
		// });


		// $('.playlist-remove').on('click', function (e) {
		// 	e.preventDefault();
		// 	var $el = $(this),
		// 		index = $el.attr('id'),
		// 		url = '/api/server/' + server + '/playlist/delete',
		// 		data = { index: index };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		return $el.closest('tr').remove();
		// 	});
		// });

		$('.playlist-clear').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				url = '/api/server/' + server + '/playlist/clear';

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				return $el.closest('tr').remove();
			});
		});


		// custom commands

		function createCommand($form) {
			var url = '/api/server/' + server + '/customCommand/create',
				data = $form.serialize();


			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				$form.find('input[type=text]').val('');
				$form.find('textarea').val('');
				showSuccess("Command created.");
				return location.reload();
			});
		}

		function editCommand(command, response) {
			var url = '/api/server/' + server + '/customCommand/edit',
				data = { command, response }
				
			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				showSuccess("Command edited.");
				return location.reload();
			});
		}

		$('.new-command a.button').on('click', function (e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			createCommand($form);
		});

		$('.new-command').on('submit', function (e) {
			e.preventDefault();
			var $form = $(this);
			createCommand($form);
		});

		// $('.command-remove').on('click', function (e) {
		// 	e.preventDefault();

		// 	var $el = $(this),
		// 		command = $el.attr('data-command'),
		// 		url = '/api/server/' + server + '/customCommand/delete',
		// 		data = { command: command };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		showSuccess('Command removed.');
		// 		return $el.closest('tr').remove();
		// 	});
		// });

		$('.command-edit').on('click', function (e) {
			e.preventDefault();

			var command = $(this).attr('data-command');
			var response = $(this).attr('data-response');

			$('.edit-command-modal input').val(command)
			$('.edit-command-modal textarea').text(response)

			$('.edit-command-modal .button').attr('data-command', command)

			$('.edit-command-modal').addClass('is-active');
		});

		$('.command-save').on('click', function(e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			var command = $(this).attr('data-command'),
				response = $('.edit-command-modal textarea').val()
			editCommand(command, response);
		});

		// $('.edit-command-modal .modal-close').on('click', function (e) {
		// 	$('.edit-command-modal').removeClass('is-active');
		// });

		// $('.edit-command-modal .modal-background').on('click', function (e) {
		// 	$('.edit-command-modal').removeClass('is-active');
		// });


		// auto responder

		function createResponse($form) {
			var url = '/api/server/' + server + '/autoResponse/create',
				data = $form.serialize();

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				$form.find('input[type=text]').val('');
				$form.find('textarea').val('');
				showSuccess("Response created.");
				return location.reload();
			});
		}

		function editResponse(command, response) {
			var url = '/api/server/' + server + '/autoResponse/edit',
				data = { command, response }

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');

				showSuccess("Command edited.");
				return location.reload();
			});
		}

		$('.new-response a.button').on('click', function (e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			createResponse($form);
		});

		$('.new-response').on('submit', function (e) {
			e.preventDefault();
			var $form = $(this);
			createResponse($form);
		});

		$('.response-remove').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				command = $el.attr('data-command'),
				url = '/api/server/' + server + '/autoResponse/delete',
				data = { command: command };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Response removed.');
				return $el.closest('tr').remove();
			});
		});

		$('.response-edit').on('click', function (e) {
			e.preventDefault();

			var command = $(this).attr('data-command');
			var response = $(this).attr('data-response');

			$('.edit-response-modal input').val(command)
			$('.edit-response-modal textarea').text(response)

			$('.edit-response-modal .button').attr('data-command', command)

			$('.edit-response-modal').addClass('is-active');
		});

		$('.response-save').on('click', function(e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			var command = $(this).attr('data-command'),
				response = $('.edit-response-modal textarea').val()
			editResponse(command, response);
		});

		// $('.edit-response-modal .modal-close').on('click', function (e) {
		// 	$('.edit-response-modal').removeClass('is-active');
		// });

		// $('.edit-response-modal .modal-background').on('click', function (e) {
		// 	$('.edit-response-modal').removeClass('is-active');
		// });


		// Tags settings

		function createTag($form) {
			var url = '/api/server/' + server + '/tags/create',
				data = $form.serialize();


			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				
				$form.find('input[type=text]').val('');
				$form.find('textarea').val('');
				showSuccess("Tag created.");
				return location.reload();
			});
		}

		function editTag(tag, content) {
			var url = '/api/server/' + server + '/tags/edit',
				data = { tag, content }

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');

				showSuccess("Tag edited.");
				return location.reload();
			});
		}

		$('.new-tag a.button').on('click', function (e) {
			e.preventDefault();
			var $form = $(this).closest('form');
			createTag($form);
		});

		$('.new-tag').on('submit', function (e) {
			e.preventDefault();
			var $form = $(this);
			createTag($form);
		});

		// $('.tag-edit').on('click', function (e) {
		// 	e.preventDefault();

		// 	var tag = $(this).attr('data-tag');
		// 	var content = $(this).attr('data-content');

		// 	$('.edit-tag-modal input').val(tag)
		// 	$('.edit-tag-modal textarea').text(content)
		// 	$('.edit-tag-modal .button').attr('data-tag', tag)
		// 	$('.edit-tag-modal').addClass('is-active');
		// });

		// $('.tag-save').on('click', function(e) {
		// 	e.preventDefault();
		// 	var $form = $(this).closest('form');
		// 	var tag = $(this).attr('data-tag'),
		// 		content = $('.edit-tag-modal textarea').val()
		// 	editTag(tag, content);
		// });

		// $('.edit-tag-modal .modal-close').on('click', function (e) {
		// 	$('.edit-tag-modal').removeClass('is-active');
		// });

		// $('.edit-tag-modal .modal-background').on('click', function (e) {
		// 	$('.edit-tag-modal').removeClass('is-active');
		// });

		// $('.remove-tag').on('click', function (e) {
		// 	e.preventDefault();

		// 	var $el = $(this),
		// 		id = $el.attr('data-id'),
		// 		name = $el.attr('data-name'),
		// 		url = '/api/server/' + server + '/tags/delete',
		// 		data = { tag: id, name: name };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		showSuccess('Tag removed.');
		// 		return $el.closest('tr').remove();
		// 	});
		// });


		// Role persist
		$('.remove-persist').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				id = $el.attr('data-id'),
				url = '/api/server/' + server + '/persist/delete',
				data = { id: id };
			
			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Role persist removed.');
				return $el.closest('tr').remove();
			});
		});


		// Automod banned words

		$('.banned-words-add .button').on('click', function (e) {
			e.preventDefault();

			var words = $(this).closest('form').find('textarea').val(),
				type = $(this).closest('form').find('input[name=type]:checked').val(),
				url = '/api/server/' + server + '/bannedWords/add',
				data = { type: type, words: words };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Words added.');
				return location.reload();
			});
		});

		$('.banned-words-remove').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('.tag'),
				word = $(this).attr('data-tag'),
				type = $(this).attr('data-type'),
				url = '/api/server/' + server + '/bannedWords/remove',
				data = { type: type, word: word };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(word + ' removed.');
				return $el.remove();
			});
		});

		$('.banned-words-clear').on('click', function (e) {
			e.preventDefault();

			var $el = $(this),
				url = '/api/server/' + server + '/bannedWords/clear';

			apiPost(url, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('Banned words cleared.');
				$el.closest('.subtab-content').find('.tag.badword').remove();
			});
		});


		// Autoroles
		// $('.add-autorole').on('click', function (e) {
		// 	e.preventDefault();

		// 	var $form = $(this).closest('form'),
		// 		role = $form.find('select[name=role]').val(),
		// 		type = $form.find('input[name=type]:checked').val(),
		// 		wait = $form.find('input[name=wait]').val(),
		// 		url = '/api/server/' + server + '/autoroles/create',
		// 		data = { type: type, role: role, wait: wait };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		showSuccess('Autorole added.');
		// 		return location.reload();
		// 	});
		// });
		// $('.remove-autorole').on('click', function (e) {
		// 	e.preventDefault();

		// 	var $el = $(this),
		// 		id = $el.attr('data-id'),
		// 		type = $el.attr('data-type'),
		// 		wait = $el.attr('data-wait'),
		// 		name = $el.attr('data-name'),
		// 		url = '/api/server/' + server + '/autoroles/delete',
		// 		data = { id: id, type: type, wait: wait, name: name };

		// 	apiPost(url, data, function (err, msg) {
		// 		if (err) return showError('An error occurred.');
		// 		showSuccess('Autorole removed: ' + name);
		// 		return $el.closest('tr').remove();
		// 	});
		// });


		// Automod whitelist urls

		$('.add-whitelist-url').on('click', function (e) {
			e.preventDefault();

			var dataUrl = $(this).prev('input[type=text]').val(),
				url = '/api/server/' + server + '/whitelistUrl/add',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('URL added.');
				return location.reload();
			});
		});

		$('.remove-whitelist-url').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				dataUrl = $(this).attr('data-url'),
				url = '/api/server/' + server + '/whitelistUrl/remove',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(dataUrl + ' removed.');
				return $el.remove();
			});
		});

		$('.add-blacklist-url').on('click', function (e) {
			e.preventDefault();

			var dataUrl = $(this).prev('input[type=text]').val(),
				url = '/api/server/' + server + '/blacklistUrl/add',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess('URL added.');
				return location.reload();
			});
		});

		$('.remove-blacklist-url').on('click', function (e) {
			e.preventDefault();

			var $el = $(this).closest('tr'),
				dataUrl = $(this).attr('data-url'),
				url = '/api/server/' + server + '/blacklistUrl/remove',
				data = { url: dataUrl };

			apiPost(url, data, function (err, msg) {
				if (err) return showError('An error occurred.');
				showSuccess(dataUrl + ' removed.');
				return $el.remove();
			});
		});

		// Thumbnail hover 

		$(document).on('mouseover', '.queue-title a', function(e) {
			const imgElement = $(this).parent().find('.queue-thumb');
			const thumbUrl = imgElement.data('thumbUrl');
			imgElement.attr('src', thumbUrl);
		})


		// Paginated lists

		// var queueList = new List('queueList', {
		// 	page: 10,
		// 	pagination: {
		// 		innerWindow: 1,
		// 		outerWindow: 1,
		// 		left: 0,
		// 		right: 0,
		// 		paginationClass: 'pagination-list',
		// 	},
		// 	valueNames: [ 'queue-index', 'queue-title' ],
		// });

		// var commandList = new List('commandList', {
		// 	page: 8,
		// 	pagination: {
		// 		innerWindow: 1,
		// 		outerWindow: 1,
		// 		left: 0,
		// 		right: 0,
		// 		paginationClass: 'pagination-list',
		// 	},
		// 	valueNames: [ 'cmd-name' ],
		// });

		// if (List) {
		// 	var responseList = new List('responseList', {
		// 		page: 10,
		// 		pagination: {
		// 			innerWindow: 1,
		// 			outerWindow: 1,
		// 			left: 0,
		// 			right: 0,
		// 			paginationClass: 'pagination-list',
		// 		},
		// 		valueNames: [ 'res-name' ],
		// 	});
		// }

		// var tagList = new List('tagList', {
		// 	page: 10,
		// 	pagination: {
		// 		innerWindow: 1,
		// 		outerWindow: 1,
		// 		left: 0,
		// 		right: 0,
		// 		paginationClass: 'pagination-list',
		// 	},
		// 	valueNames: [ 'tag-name', 'tag-author' ],
		// });

		// var webLogList = new List('webLogList', {
		// 	page: 10,
		// 	pagination: {
		// 		innerWindow: 1,
		// 		outerWindow: 1,
		// 		left: 0,
		// 		right: 0,
		// 		paginationClass: 'pagination-list',
		// 	},
		// 	valueNames: [ 'weblog-user', 'weblog-action' ],
		// });
	});

})(jQuery);