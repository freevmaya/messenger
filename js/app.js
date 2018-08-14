var MsgHg = {
	views: {},
	init: function(options) {

		function time() {
			return (new Date()).getTime();
		}

		function value(val, def_val) {
			return ($.type(val) == 'undefined')?def_val:val;
		}

		function sval(name, def_val) {
			var val = value($.cookie(name), def_val);
			$.cookie(name, val);
			return val;
		}

		function channelFree(ch_id) {
			return $.type(MsgHg.views[ch_id]) == 'undefined';
		}

		function checkOption(name, onOption) {
			var v = options[name];
			var t = $.type(v);
			if (t == 'function') v()
			else onOption(t != 'undefined'?v:null);
		}

		var w = $(window);
		var base = document.location.hostname;
		var app = {
			layer: null,
			display: null,
			sendButton: null,
			textarea: null,
			pushstream: null,
			host: options.host?options.host:'auto',
			channel: options.channel?options.channel:sval(base + '.stream_channel', time()),
			uid: options.uid?options.uid:sval(base + '.stream_uid', time())
		}

		if (!channelFree(app.channel)) return;

		function initialize() {
			checkOption('broadcast', (val)=>{
				if (val == 1) {
					app.sendData({event: "get_host_id", host: app.host}, (response)=>{
						if (response.host_id) {
							app.host_id = response.host_id;
							app.broadcastListener = LongPollingCreate(app.host_id + '-broadcast', onBroadcast);
						}
					});
				} else createClient();
			});
		}

		function viewCount() {
			var c = 0;
			$.each(MsgHg.views, ()=>{c++;});
			return c;
		}

		function toUp(view_app) {
			var mz = viewCount();
			if (mz > 1)
				$.each(MsgHg.views, (i, itm)=>{
					itm.display.css('z-index', (itm == view_app)?mz:mz - 1);
				});
		}

		function onResize(){
			app.layer.removeClass('msghg-desktop');
			app.layer.removeClass('msghg-mobile');
			if (w.width() > 900) {
				app.layer.addClass('msghg-desktop');
			} else app.layer.addClass('msghg-mobile');
		}

		function createView() {
			app.layer = $('<div class="msghg_layer"></div>');
			$('body').append(app.layer);

			app.layer.html(msgTmpl);

			w.resize(onResize);

			app.display = app.layer.find('.modal');
			app.display.draggable({handle: '.title', stack: '.msghg', opacity: 0.5});
			app.display.on('mousedown', ()=>{
				toUp(app);
			});

			app.layer.find('.msghg-close').click(app.close.bind(app));

			app.sendButton = app.layer.find('.send-button');
			app.textarea = app.layer.find('textarea');

			app.sendButton.click(app.sendMsg);
			app.textarea.keydown(onKeyDown);

			checkOption('title', (t)=>{app.layer.find('.title').text(t)});
			app.show();
			onResize();
			MsgHg.views[app.channel] = app;
			if ($.type(options.onComplete) == 'function') options.onComplete.bind(app)();
		}

		function createClient() {
			app.sendData({id: app.channel, event: "new_user", uid: app.uid, host: app.host}, (response)=>{
				if (response.host_id) {
					app.host_id = response.host_id;
					app.pushstream = LongPollingCreate(app.host_id + '-' + app.channel, onReceive);
					createView();
				} else console.log(response);
			});
		}

		function onNewuser(info) {
			checkOption('broadcastNewuser', (val)=>{
				if ((val == 1) && (channelFree(info.id))) {
					var lopt = $.extend({
						channel: info.id,
						onComplete: function() {
							checkOption('welcomeText', (val)=>{
								if (val) setTimeout(()=>{client.sendText(val)}, 1000);
							});							
						}
					}, options);
					lopt.broadcast = 0;
					lopt.broadcastNewuser = 0;
					var client = MsgHg.init(lopt);
				}
			});
		}

		function onBroadcast(jsonData) {
			var data = $.parseJSON(jsonData);
			if (data) {
				if (data.event == 'new_user')
					onNewuser($.parseJSON(data.data.replace(/\\"/g, '"')));
				if (data.event == 'close') {
					data = $.parseJSON(data.data.replace(/\\"/g, '"'));
					$.each(MsgHg.views, (id, itm)=>{
						if (data.id == itm.channel) itm.removeView();
					})
				}
			}
		}

		function onReceive(jsonData) {
			if (data = $.parseJSON(jsonData)) {
				if (data.event == 'message') {
					app.add(data.data, data.uid == app.uid);
				}
			}
		}

		function createItem(textHtml, isMe) {
			var item = $(itemTmpl);
			item.html(textHtml);
			if (isMe) item.addClass('me');
			return item; 
		}

		function onKeyDown(e) {
			if ((e.keyCode == 13) && (!e.shiftKey)) {
				e.stopPropagation();
				app.sendMsg();
				return false;
			}
		}

		app.sendText=(text, onSuccess)=>{
			text = text.replace(/"/g, "&#34;").replace(/\n/g, "<br/>");
			app.sendData({id: app.channel, event: "message", text: text, uid: app.uid}, onSuccess);
		}

		app.sendData=(data, onResponse)=>{
			data.host = app.host;
			$.post(options.sendurl, data, onResponse, 'json');
		}

		app.sendMsg=()=>{
			var b = app.sendButton;
			b.attr('disabled', 1);
			setTimeout(()=>{b.removeAttr('disabled');}, 10000);

			app.sendText(app.textarea.val(), (response)=>{
				b.removeAttr('disabled');
				app.textarea.val('');
			});
		}

		app.removeView=()=>{
			delete(MsgHg.views[app.channel]);
			app.display.removeClass('on');
			app.display.addClass('off');
			setTimeout(()=>{
				app.layer.remove();
				app.layer.empty();
			}, 1000);
		}

		app.close=()=>{
			app.sendData({id: app.channel, event: "close", uid: app.uid}, ()=>{
				app.removeView();
			})
		}

		app.show=()=>{
			app.display.removeClass('off');
			app.display.addClass('on');
			setTimeout(()=>{
				app.textarea.focus();
			}, 500);
		}

		app.add=(message, isMe)=>{
			message = $.trim(message);
			if (message) {
				var list = app.display.find('.list');
				var itm = createItem(message.replace(/\n/g, "<br/>"), isMe);
				var p = list.parent();
				list.append(itm);
				setTimeout(()=>{itm.css({
					opacity: 1,
					'margin-left': 0,
					'margin-right': 0,
				})}, 100);
				p.animate({scrollTop: list.height() - p.innerHeight()}, 200);
				return true;
			} else return false;
		}


		initialize();

		return app;
	}
}


var msgTmpl = '<div class="msghg modal off" id="modal">' +
'<h3 class="title">Консультация</h3><a class="msghg-close"></a>' +
'	<div class="content">' + 
'		<div class="output">' + 
'			<div class="list">' + 
'			</div>' + 
'		</div>' + 
'		<div class="separator"></div>' + 
'		<div class="input">' + 
'			<textarea></textarea>' + 
'		</div>' + 
'	</div>' +
'	<div class="actions">' + 
'		<table><tr>' +
'			<td class="msghg-help">Внимание! В целях повышения качества обслуживание, в рамках политики конфиденциальности, ваша переписка с оператором записывается.</td>' +
'			<td class="msghg-right"><button class="send-button">OK</button></td>' +
'		</tr></table>' +
'	</div>' +
'</div>';

var itemTmpl = '<div class="item"></div>';


function LongPollingCreate(subID, onReceive) {
	var lp = {
	  etag: 0,
	  time: null,
	  baseURL: 'pjof.ru',
	  days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
	  months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
	  subID: 0,

	  init: function (subID, onReceive) {
	    var $this = this, xhr;
	    this.subID = subID;
	    if ($this.time === null) {
	      $this.time = $this.dateToUTCString(new Date());
	    }

	    if (window.XDomainRequest) {
	      setTimeout(function () {
	        $this.poll_IE($this);
	      }, 2000);
	    } else {
	      xhr = new XMLHttpRequest(); 
	      xhr.onreadystatechange = xhr.onload = function () {
	        if (4 === xhr.readyState) {
	          if (200 === xhr.status && xhr.responseText.length > 0) {
	            
	            //$this.etag = xhr.getResponseHeader('Etag');
	            $this.time = xhr.getResponseHeader('Last-Modified');
	            
	            onReceive(xhr.responseText.replace(/\\"/g, '"'));
	          }
	          if (xhr.status > 0) {
	            $this.poll($this, xhr);
	          }
	        }
	      };
	      
	      $this.poll($this, xhr);
	    }
	  },

	  poll: function ($this, xhr) {
	    var timestamp = (new Date()).getTime(),
	    url = 'http://' + this.baseURL + '/sub/' + this.subID + '?v=' + timestamp + '&secondsAgo=30';
	      // timestamp помогает защитить от кеширования в браузерах

	    xhr.open('GET', url, true);
	    xhr.withCredentials = true;
	    xhr.setRequestHeader("Accept", "application/json");
	    //xhr.setRequestHeader("If-None-Match", $this.etag);
	    //xhr.setRequestHeader("If-Modified-Since", $this.time);
	    xhr.send();
	  },

	  // То же самое что и poll(), только для IE
	  poll_IE: function ($this) {
		var xhr = new window.XDomainRequest();
		var timestamp = (new Date()).getTime(),
		url = 'http://' + this.baseURL + '/sub/' + this.subID + '?callback=?&v=' + timestamp;

		xhr.onprogress = function () {};
		xhr.onload = function () {
		  onReceive(xhr.responseText.replace(/\\"/g, '"'));
		  $this.poll_IE($this);
		};
		xhr.onerror = function () {
		  $this.poll_IE($this);
		};
		xhr.open('GET', url, true);
		xhr.send();
	  },

	  valueToTwoDigits: function (value) {
	    return ((value < 10) ? '0' : '') + value;
	  },

	  // представление даты в виде UTC
	  dateToUTCString: function (date) {
	    var time = this.valueToTwoDigits(date.getUTCHours())
	        + ':' + this.valueToTwoDigits(date.getUTCMinutes())
	        + ':' + this.valueToTwoDigits(date.getUTCSeconds());
	    return this.days[date.getUTCDay()] + ', '
	           + this.valueToTwoDigits(date.getUTCDate()) + ' '
	           + this.months[date.getUTCMonth()] + ' '
	           + date.getUTCFullYear() + ' ' + time + ' GMT';
	  }
	}
	lp.init(subID, onReceive);
	return lp;
}