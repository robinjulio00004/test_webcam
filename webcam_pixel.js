var settings = {
	width:      640,
	brightness: 0,
	contrast:   0,
	size:       8,
	space:      2,
	alpha:      100,
	radius:     2
};

;(function(require, window, document, undefined) {
	require.config({
		baseUrl: '//cdn.jsdelivr.net/qoopido.js/latest'
	});

	require([ 'base' ], function() {
		require([ 'pool/module', 'pool/dom' ], function() {
			require([ 'proxy', 'renderer', 'promise/defer', 'dom/element', 'dom/collection', 'support', 'support/element/video', 'support/element/canvas', 'support/element/canvas/todataurl/png' ], function(mProxy, mRenderer, mPromiseDefer, mDomElement, mDomCollection, mSupport) {
				var MATH_PI_TIMES_TWO = 2 * Math.PI,
					options = {
						width:      0,
						height:     0,
						brightness: 0,
						contrast:   0,
						size:       0,
						space:      0,
						alpha:      0,
						radius:     0
					},
					body = mDomElement.create('body'),
					hint = mDomElement.create('<div />').addClass('hint').appendTo(body),
					qDocument = video = iCanvas = iContext = sCanvas = sContext = tCanvas = tContext = methodURL = getUserMedia = paused = imageCache = imageData = colorLookup = colorData = false,
					size = radius = factor = width = height = xOffset = yOffset = i = px = x = y = color = 0;

				function onCompatible() {
					var deferred = new mPromiseDefer();

					qDocument             = mDomElement.create(document);
					video                 = mDomElement.create('<video />').setAttribute('autoplay', 'autoplay').element;
					iCanvas               = document.createElement('canvas');
					iContext              = iCanvas.getContext('2d');
					sCanvas               = document.createElement('canvas');
					sContext              = sCanvas.getContext('2d');
					tCanvas               = mDomElement.create('<canvas />').setAttribute('id', 'canvas').addClass('curl').element;
					tContext              = tCanvas.getContext('2d');
					imageCache            = document.createElement('img');
					methodURL             = mSupport.getMethod('URL');
					getUserMedia          = mProxy.create(navigator, navigator[mSupport.getMethod('getUserMedia', navigator)]);

					hint.setContent('Please grant access!<br /><br /><small>If you happen to be using Chrome please visit chrome://settings/content, scroll down to a section labeled "media" and set it to ask for access!</small>', true);
					getUserMedia({ video: true, audio: false }, function(stream) { deferred.resolve(stream); }, function() { deferred.reject(); });

					return deferred.promise;
				}

				function onIncompatible() {
					hint.setContent('No webcam present?');
				}

				function onAccessGranted(stream) {
          if('srcObject' in video) {
            video.srcObject = stream;
          } else {
            video.src = window[methodURL].createObjectURL(stream);
          }

					hint.remove();
					body.append(tCanvas);

					initializeSettings();
					onSettingsChanged();

					mRenderer.on('tick', onTick);

					mSupport
						.test['/element/canvas/todataurl/png']()
						.then(initializePause);

					mSupport
						.testMultiple('/element/canvas/todataurl/png', mSupport.supportsProperty('download', document.createElement('a')))
						.then(initializeDownload);
				}

				function onAccessDenied() {
					hint.setContent('No access to webcam!<br /><br /><small>If you happen to be using Chrome please visit chrome://settings/content, scroll down to a section labeled "media" and set it to ask for access!</small>', true);
				}

				function onSettingsChanged() {
					colorLookup = {};

					options.width      = settings.width;
					options.height     = settings.width * 3 / 4;
					options.brightness = (255 * (settings.brightness / 100)) >> 0;
					options.contrast   = Math.pow((settings.contrast + 100) / 100, 2);
					options.size       = settings.size;
					options.space      = settings.space;
					options.alpha      = settings.alpha / 100;
					options.radius     = Math.min(settings.radius, settings.size / 2);

					size    = options.size + options.space;
					radius  = options.size / 2;
					factor  = options.width / ((options.width * size) - options.space);
					width   = (options.width * factor) >> 0;
					height  = (options.height * factor) >> 0;
					xOffset = ((options.width - (options.width - (options.width % size)) + options.space) / 2) >> 0;
					yOffset = ((options.height - (options.height - (options.height % size)) + options.space) / 2) >> 0;

					iCanvas.width  = width;
					iCanvas.height = height;

					video.width  = sCanvas.width  = tCanvas.width  = imageCache.width = options.width;
					video.height = sCanvas.height = tCanvas.height = imageCache.height = options.height;

					tCanvas.style.width  = (options.width + 40) + 'px';
					tCanvas.style.height = (options.height + 40) + 'px';

					tContext.translate(options.width, 0);
					tContext.scale(-1, 1);
				}

				function onTick() {
					try {
						iContext.drawImage((paused === false) ? video : imageCache, 0, 0, width, height);
						tContext.clearRect(0, 0, options.width, options.height);

						imageData = iContext.getImageData(0, 0, width, height);
					} catch(e) {}

					if(imageData) {
						colorData = imageData.data;

						for(i = 0; colorData[i] !== undefined; i += 4) {
							px    = i / 4;
							color = (0.299 * colorData[i] + 0.587 * colorData[i + 1] + 0.114 * colorData[i + 2] + 0.5) >> 0;
							x     = (px % width) * size + xOffset;
							y     = ((px / width) >> 0) * size + yOffset;

							tContext.drawImage(colorLookup[color] || createPixel(color), x, y);
						}
					}
				}

				function initializeSettings() {
					var definitions = {};

					mDomCollection
						.create('#console [data-setting]')
						.each(function() {
							var self      = this,
								parameter = self.getAttribute('data-setting').split(':'),
								setting   = parameter[0],
								range     = parameter[1].split(','),
								stepping  = parseFloat(range.pop()),
								previous  = mDomElement.create('<span />', { 'data-control': setting }).addClass('previous').setContent('-').appendTo(self),
								value     = mDomElement.create('<span />').addClass('value').setContent(settings[setting]).appendTo(self),
								next      = mDomElement.create('<span />', { 'data-control': setting }).addClass('next').setContent('+').appendTo(self);

							definitions[setting] = {
								value:    value,
								range:    range,
								stepping: stepping
							}
						});

					mDomElement
						.create('#console')
						.on('click', '[data-control]', function(event) {
							var self       = mDomElement.create(this),
								setting    = self.getAttribute('data-control'),
								definition = definitions[setting];

							event.preventDefault();
							event.stopPropagation();

							if(self.hasClass('previous')) {
								definition.value.setContent(settings[setting] = Math.max(definition.range[0], Math.min(definition.range[1], settings[setting] - definition.stepping)));

								onSettingsChanged();
							} else if(self.hasClass('next')) {
								definition.value.setContent(settings[setting] = Math.max(definition.range[0], Math.min(definition.range[1], settings[setting] + definition.stepping)));

								onSettingsChanged();
							}

							return false;
						});
				}

				function initializePause() {
					var element = mDomElement.create('#console [data-pause]').setStyle('display', 'inline-block'),
						states  = element.getAttribute('data-pause').split(',');

					element.on('click', function(event) {
						var self = mDomElement.create(this);

						event.preventDefault();
						event.stopPropagation();

						if(paused === true) {
							self.setContent(states[0]);

							imageCache.src = '';
							paused         = false;
						} else {
							self.setContent(states[1]);

							sContext.drawImage(video, 0, 0, options.width, options.height);

							imageCache.src = sCanvas.toDataURL('image/png');
							paused         = true;
						}

						return false;
					});
				}

				function initializeDownload() {
					var element = mDomElement.create('#console [data-download]').setStyle('display', 'inline-block'),
						link    = mDomElement.create(element.find('a')[0]);

					link.on('click', function() {
						if(paused === false) {
							paused = true;

							link.setAttribute('href', tCanvas.toDataURL('image/png'));

							paused = false;
						} else {
							link.setAttribute('href', tCanvas.toDataURL('image/png'));
						}
					});
				}

				function createPixel(color) {
					if(!colorLookup[color]) {
						var pColor   = color,
							pCanvas  = document.createElement('canvas'),
							pContext = pCanvas.getContext('2d');

						pCanvas.width = pCanvas.height = options.size;

						pColor /= 255;
						pColor -= 0.5;
						pColor *= options.contrast;
						pColor += 0.5;
						pColor *= 255;
						pColor  = (pColor + 0.5) >> 0;
						pColor += options.brightness;
						pColor  = Math.max(0, Math.min(255, pColor));

						pContext.beginPath();

						if(radius === options.radius) {
							pContext.arc(radius, radius, radius, 0, MATH_PI_TIMES_TWO, false);
						} else {
							pContext.moveTo(options.radius, 0);
							pContext.lineTo(options.size - options.radius, 0);
							pContext.quadraticCurveTo(options.size, 0, options.size, options.radius);
							pContext.lineTo(options.size, options.size - options.radius);
							pContext.quadraticCurveTo(options.size, options.size, options.size - options.radius, options.size);
							pContext.lineTo(options.radius, options.size);
							pContext.quadraticCurveTo(0, options.size, 0, options.size - options.radius);
							pContext.lineTo(0, options.radius);
							pContext.quadraticCurveTo(0, 0, options.radius, 0);
						}

						pContext.closePath();
						pContext.fillStyle = 'rgba(' + pColor + ', ' + pColor + ', ' + pColor + ', ' + options.alpha + ')';
						pContext.fill();

						colorLookup[color] = pCanvas;
					}

					return colorLookup[color];
				}

				mSupport
					.testMultiple('/element/video', '/element/canvas', mSupport.supportsMethod('URL'), mSupport.supportsMethod('getUserMedia', navigator))
					.then(onCompatible, onIncompatible)
					.then(onAccessGranted, onAccessDenied);
			});
		});
	});
}(require, window, document));
