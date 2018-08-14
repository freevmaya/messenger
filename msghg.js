var msghg_script = $('head').find('[data-indent="msghg"]');
(function(baseURL) {
	var w = $(window);
	var h = $('head');
	h.append('<link rel="stylesheet" href="' + baseURL + 'css/msghg.css" type="text/css" />');

	function loadScript(src, onload) {
		var d = document;
		var w = window;
	  	var n = d.getElementsByTagName("script")[0],
		s = d.createElement("script"),
	    f = function () { n.parentNode.insertBefore(s, n); };
	  	s.type = "text/javascript";
	  	s.async = true;
	  	s.src = src;
	  	s.onload = onload;

	  	if (w.opera == "[object Opera]") {
			d.addEventListener("DOMContentLoaded", f, false);
	  	} else {f();}
	}

	function value(val, def_val) {
		return ($.type(val) == 'undefined')?def_val:val;
	}

	var list = ['js/app.js', 'js/jquery.cookie.js', 'js/jquery-ui.min.js'];
	var bload = 0;
	function checkLoaded() {
		bload--;
		if (bload == 0) {
			MsgHg.init($.extend({
				title: 'Сообщения',
				sendurl: baseURL + 'send.php'
			}, msghg_script.data()));
		}
	}
	$.each(list, (i, itm)=>{
		bload++;
		loadScript(baseURL + itm, checkLoaded);
	});
})('http://pjof.ru/messenger/');