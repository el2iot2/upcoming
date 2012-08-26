var upcoming = function () {
	"use strict";
	
	//return a closure to handle an expected JSONP callback
	function makeEmptyFunc() {
		return function() {};
	}
	
	if (!window.console) {
		(function() {
			var names = [
				"log",
				"debug", 
				"info", 
				"warn", 
				"error", 
				"assert", 
				"dir", 
				"dirxml", 
				"group", 
				"groupEnd", 
				"time", 
				"timeEnd", 
				"count", 
				"trace", 
				"profile", 
				"profileEnd"
			];
			window.console = {};
			for (var i = 0; i < names.length; ++i) {
				window.console[names[i]] = makeEmptyFunc();
			}
		}());
	}
	
	var languages = {};
	var feedIndex = 0;
	
	var res = { //load resources, or fallback EN default
		default_div_id: "upcoming",
		prog_requesting_feed: "Requesting Feed...",
		prog_loading_events: "Loading Events...",
		prog_sorting_events: "Sorting Events...",
		prog_rendering_events: "Rendering Events...",
		prog_no_events_found: "No Events Found.",
		event_cat_today: "Today",
		event_cat_this_week: "This Week",
		event_cat_next_week: "Next Week",
		event_cat_this_month: "This Month",
		event_cat_next_month: "Next Month",
		event_cat_this_year: "This Year",
		event_cat_upcoming: "Upcoming",
		time_format: "LT",
		date_format: "LL",
		err_format_cannot_render: "Upcoming.js: Error. Cannot render to element '{0}'. Does this id exist?",
		err_format_config_id_invalid: "Upcoming.js: Error. Cannot render to element '{0}'. id not supported.",
		err_config_required: "Upcoming.js: Error. Cannot render without configuration.",
		last: "placeholder"
	};
	
	languages.EN = languages["EN-us"] = res;

	var 
		instances = {}, //instances by div id
		feeds = {},  //feeds by uri
		publicCallbacks = {}; //callbacks by feedInstanceId

	//do string formats with a placeholder: format("yada{0} {1} etc.", true, 1)
	function format() {
		var s = arguments[0];
		for (var i = 0; i < arguments.length - 1; i++) {       
			var reg = new RegExp("\\{" + i + "\\}", "gm");             
			s = s.replace(reg, arguments[i + 1]);
		}
		return s;
	}
	
	//do a string format, but then raise a ui error
	function formatError() {
		error(format.apply(this, arguments));
	}
	
	//raise a ui error
	function error(msg)	{
		//For now, alert
		alert(msg);
	}	
		
	//primary entry point
	function publicRender(config) {
		//require configuration
		if (config === null) {
			error(res.err_config_required);
			return;
		}
		
		if (!isSimpleId(config.id)) {
			formatError(res.err_format_config_id_invalid, config.id);
			return;
		}
		
		
		//fallback if unspecified
		config = config || {
			//Required
			id: null, //the root div to render our upcoming widget into
			evts: null, //configuration for the events display ui
			prog: null //configuration for the status/progress ui
		};
		config.evts = config.evts || {};
		config.prog = config.prog || {};
		config.prog.bdr = config.prog.bdr || {};
		config.prog.bar = config.prog.bar || {};
		config.prog.lbl = config.prog.lbl || {};
		
		var iid = config.id || res.default_div_id;
		//Build our instance
		var instance = instances[config.id] = {
			id: iid,
			max_results: config.max_results || 5,
			expectedFeeds: [],
			ui: { //Details about html ui for instance
				div: null, //Root div
				css: config.css || "upcoming",
				prog: { //Progress/status ui
					id: iid + (config.prog.idSuffix || "_prog"),
					div: null, //Created div
					css: config.prog.css || "prog",
					steps: 0, //Total number of steps in progress
					step: 0, //Current step
					bdr: {
						id: iid + (config.prog.bdr.idSuffix || "_prog_bdr"),
						css: config.prog.bdr.css || "bdr",
						div: null
					},
					bar: {
						id: iid + (config.prog.bar.idSuffix || "_prog_bar"),
						css: config.prog.bar.css || "bar",
						div: null
					},
					lbl: {
						id: iid + (config.prog.lbl.idSuffix || "_prog_lbl"),
						css: config.prog.lbl.css || "lbl",
						div: null
					}
				},
				evts: { //Event display ui
					id: iid + (config.prog.idSuffix || "_evts"),
					div: null, //Created div
					css: config.evts.css || "evts"
				}
			},
			evts: [], //The listing of evt data
			evtCats: buildEvtCatsFrom(moment()) //Our instance event categories, relative to "now"
		};
		
		//Shortcut vars
		var ui = instance.ui;
		var prog = instance.ui.prog;
		var evts = instance.ui.evts;
		
		//Find root instance id
		ui.div = document.getElementById(instance.id);
		if (ui.div === null) {
			formatError(res.err_format_cannot_render, instance.id);
			return;
		}
		
		ui.div.setAttribute('class', ui.css);

		//render the instance template
		dust.render("upcoming_ui", ui, function(err, out) {
			ui.div.innerHTML = out;
		});
		
		prog.div = document.getElementById(prog.id);
		if (prog.div === null) {
			formatError(res.err_format_cannot_render, prog.id);
			return;
		}
		
		prog.lbl.div = document.getElementById(prog.lbl.id);
		if (prog.lbl.div === null) {
			formatError(res.err_format_cannot_render, prog.lbl.id);
			return;
		}
		
		prog.bar.div = document.getElementById(prog.bar.id);
		if (prog.bar.div === null) {
			formatError(res.err_format_cannot_render, prog.bar.id);
			return;
		}
		
		prog.bdr.div = document.getElementById(prog.bdr.id);
		if (prog.bdr.div === null) {
			formatError(res.err_format_cannot_render, prog.bdr.id);
			return;
		}
		
		evts.div = document.getElementById(evts.id);
		if (evts.div === null) {
			formatError(res.err_format_cannot_render, evts.id);
			return;
		}
		
		//process configured feeds
		var i, feedInfo, feed;
		for (i = 0; i < config.feeds.length; i++) {
			feedInfo = {
				id: config.feeds[i] + "_" + instance.id,
				feed: config.feeds[i],
				instance: instance.id,
				uri: "http://www.google.com/calendar/feeds/" +
					encodeURIComponent(config.feeds[i]) +
					"/public/full"};
			
			instance.expectedFeeds[feedInfo.uri] = feedInfo;
		
			//indicate another step
			prog.steps++;
		
			//If we haven't seen this feed before
			if (!(feedInfo.uri in feeds)) { 
				//key a new entry
				//indicates the feed is expected, and what instance expects it
				feedIndex++;
				feed = feeds[feedInfo.uri] = {
					data: null,
					expectedInstances:{},
					callback: "feed"+feedIndex
				};
				//Add a new callback that closes over the relevant instance
				publicCallbacks[feed.callback] = makeFeedInstanceCallback(feedInfo.uri);
				feed.expectedInstances[instance.id] = feedInfo;
				
				//and begin retrieving data
				document.write("<script type='text/javascript' "+
					"src='"+ 
					feedInfo.uri + //already encoded
					"?alt=json-in-script&callback=upcoming.callbacks."+
					encodeURIComponent(feed.callback)+
					"&orderby=starttime"+
					"&max-results="+encodeURIComponent(instance.max_results)+
					"&singleevents=true&sortorder=ascending&futureevents=true'></script>");
				//report our progress
				progress(instance, res.prog_requesting_feed);
			}
			else {
				//A key exists, so retrieve it
				feed = feeds[feedInfo.uri];
				feed.expectedInstances[instance.id] = feedInfo; //indicate this instance expects the feed too
				
				if (feed.data !== null) { //if we have this feed already
					//simulate a direct callback based on the existing data
					callback(null, feedInfo.uri);
				} 
			}
		}
	}
	
	//return a closure to handle an expected JSONP callback
	function makeFeedInstanceCallback(feedUri) {
		return function(root) {
			callback(root, feedUri);
		};
	}

	//full callback handler for gcal data
	function callback(root, feedUri) {
		var feed = feeds[feedUri];
		
		//capture data if we have not yet done so
		feed.data = feed.data || root.feed;
		var evts, startIndex, entryCount, instance, feedInfo, evt, i, instanceId;
		
		for (instanceId in feed.expectedInstances) {
			feedInfo = feed.expectedInstances[instanceId];
			instance = instances[feedInfo.instance];
			
			//add an event array if one does not yet exist
			evts = instance.evts;
			startIndex = evts.length;
			
			if (root.feed.entry !== null) {
				entryCount = root.feed.entry.length;
				evts[startIndex + entryCount - 1] = null; //Resize once to hold new events
				for (i = 0; i < entryCount; i++) {
					evt = root.feed.entry[i];
					evt.startMoment = xsDateTimeToMoment(evt.gd$when[0].startTime);
					if (typeof evt.gd$when[0].endTime !== 'undefined') {
						evt.endMoment = xsDateTimeToMoment(evt.gd$when[0].endTime);
					}
					else {
						evt.endMoment = moment(evt.startMoment);
					}
					evt.duration = moment.duration(evt.endMoment.diff(evt.startMoment));
					evts[startIndex+i] = evt;
				}
			}
			
			progress(instance, res.prog_loading_events);
			
			//remove this expected feed
			delete instance.expectedFeeds[feedInfo.uri];
			
			//see if anything else remains
			for(var prop in instance.expectedFeeds) {
				if (instance.expectedFeeds.hasOwnProperty(prop)) {
					continue; //wait for later callback to render
				}
			}
			renderEvts(instance);
		}
	}
	
	function progress(instance, msg) {
		prog(instance.ui.prog, msg, 100.0 * instance.ui.prog.step / instance.ui.prog.steps);
	}

	function status(instance, msg) {
		prog(instance.ui.prog, msg, -1);
	}

	function done(instance)	{
		prog(instance.ui.prog, null, -1);
	}
	
	function prog(ui, msg, percentage) {
		if (percentage >= 0) {
			//ensure progress bar is visibile
			ui.bdr.div.setAttribute('style', 'visibility: inline');
			ui.bar.div.setAttribute('style', 'width: '+percentage+'px;');
		}
		else {
			//hide progress bar
			ui.bdr.div.setAttribute('style', 'visibility: none');
		}
		
		if (msg === null) {
			ui.lbl.div.setAttribute('style', 'visibility: none');
		}
		else {
			ui.lbl.div.setAttribute('style', 'visibility: inline');
			ui.lbl.div.innerHtml = msg;
		}
	}

	//writes the events from our feeds to the display
	function renderEvts(instance) {
		//function to sort the events by date
		function sortEvt(a, b) {
			return a.startMoment.diff(b.startMoment);
		}
		
		var evts = instance.evts;
		progress(instance, res.prog_sorting_events);
		evts.sort(sortEvt);
		
		var evtCats = instance.evtCats,
			evtCatIndex,
			evtCatStartIndex = 0,			
			evtIndex,
			evtCat, 
			evt;
		
		progress(instance, res.prog_rendering_events);
		
		// partition events into categories
		for (evtIndex = 0; evtIndex < evts.length; evtIndex++) {
			evt = evts[evtIndex];
			
			for(evtCatIndex = evtCatStartIndex; evtCatIndex < evtCats.length; evtCatIndex++) {
				evtCat = evtCats[evtCatIndex];
			
				//whether or not the event can be within this category
				if (evtInCat(evt, evtCat)) {
					//since events and categories are sorted, we can skip categories that are no longer fruitful
					//evtCatStartIndex = evtIndex;
					evtCat.evts.push(evt);
					break; //Get a new event
				}
			}
		}
		
		for(evtCatIndex = 0; evtCatIndex < evtCats.length; evtCatIndex++) {
			evtCat = evtCats[evtCatIndex];
			//render the category if we haven't already
			if (evtCat.div === null) {
				renderEvtCat(instance, evtCat);
			}
			
			if (evtCat.evts.length > 0) {
				//todo display the cat
			}
			
			for (evtIndex = 0; evtIndex < evtCat.evts.length; evtIndex++) {
				evt = evtCat.evts[evtIndex];
								
				//Render the event to the category
				renderEvt(evt, evtCat);
			}
		}
		
		if (evts.length > 0) {
			done(instance);
		}
		else {
			status(instance, res.prog_no_events_found);
		}
	}

	function evtInCat(evt, evtCat) {
		if (evtCat.start === null && evtCat.end === null) {
		//	console.log("matched upcoming");
			return false;
		}
		
		var afterStart = evtCat.start.diff(evt.startMoment) <= 0;
		var beforeEnd = evtCat.end.diff(evt.startMoment) > 0;
		
		//console.log(evtCat.caption +":"+ evt.startMoment.format()+" after "+evtCat.start.format()+" and before "+evtCat.end.format()+ " = "+(afterStart && beforeEnd));
		
		return afterStart && beforeEnd;
	}

	function buildWeekRange(week) {
		week.startMonth = week.start.format('MMM')+" ";
		week.endMonth = week.end.format('MMM')+" ";
		if (week.startMonth == week.endMonth) {
			week.range = week.startMonth+
				week.start.format('Do')+
				" - "+
				week.end.format('Do');
		}
		else {
			week.range = week.startMonth+
				week.start.format('Do')+
				" - "+
				week.endMonth+
				week.end.format('Do');
		}
		return week;
	}
	
	function buildEvtCatsFrom(ctx) {
		var 
			sod = moment(ctx).sod(), //Start of day
			eod = moment(ctx).eod(), //End of day
			sow = moment(sod).subtract("days", sod.day()),//Start of week
			eow = moment(sow).add("weeks", 1), //End of week
			snw = moment(eow), //Start of next week
			enw = moment(snw).add("week", 1), //end of next week
			som = moment(ctx).startOf('month'), //Start of month
			eom = moment(som).add("months", 1), //End of month
			snm = moment(eom), //Start of next month
			enm = moment(snm).add("months", 1), //End of month
			soy = moment(ctx).startOf("year"), //Start of year
			eoy = moment(ctx).endOf("year"); //End of year
		
		return [
			{//today
				start: sod,
				end: eod,
				div: null,
				evts: [],
				dateFormat: res.time_format,
				timeFormat: res.time_format,
				multiDateFormat: res.date_format,
				caption: res.event_cat_today,
				range: sod.format(res.date_format)
			}, 
			buildWeekRange(
				{//week
					start: sow,
					end: eow,
					div: null,
					evts: [],
					dateFormat: res.date_format,
					timeFormat: res.time_format,
					multiDateFormat: res.date_format,
					caption: res.event_cat_this_week
				}
			),	
			buildWeekRange(
				{//nextWeek
					start: snw,
					end: enw,
					div: null,
					evts: [],
					dateFormat: res.date_format,
					timeFormat: res.time_format,
					multiDateFormat: res.date_format,
					caption: res.event_cat_next_week
				}
			), 
			{//month
				start: som,
				end: eom,
				div: null,
				evts: [],
				dateFormat: res.date_format,
				timeFormat: res.time_format,
				multiDateFormat: res.date_format,
				caption: res.event_cat_this_month,
				range: som.format('MMM YYYY')
			}, 
			{//nextMonth
				start: snm,
				end: enm,
				div: null,
				evts: [],
				dateFormat: res.date_format,
				timeFormat: res.time_format,
				multiDateFormat: res.date_format,
				caption: res.event_cat_next_month,
				range: snm.format('MMM YYYY')
			}, 
			{//year
				start: soy,
				end: eoy,
				div: null,
				evts: [],
				dateFormat: res.date_format,
				timeFormat: res.time_format,
				multiDateFormat: res.date_format,
				caption: res.event_cat_this_year,
				range: soy.format('YYYY')
			}, 
			{//upcoming
				start: null,
				end: null,
				div: null,
				evts: [],
				dateFormat: res.date_format,
				timeFormat: res.time_format,
				multiDateFormat: res.date_format,
				caption: res.event_cat_upcoming,
				range: ""
			}
		];
		
	}

	function renderWhen(evt, evtCat) {
		if (evt.duration.asMilliseconds() === 0) {
			return evt.startMoment.calendar();
		}
		else {
			return evt.startMoment.calendar()+
				" - "+
				evt.duration.humanize();
		}
	}

	function isUrl(value) {
		var rx = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return rx.test(value);
	}
	
	function isSimpleId(value) {
		//HTML id is: [A-Za-z][A-Za-z0-9_:.]*, but we allow a subset:
		var rx = /[A-Za-z][A-Za-z0-9_:.]*/;
		return rx.test(value);
	}

	function renderEvt(evt, evtCat) {
		var title, where, whereUrl, description, start, spanTitle, createdBy, eventUrl, when, divEvt, toggle, titleUrl, linki, divDetail;
		
		//Title field
		title = null;
		if (typeof evt.title.$t !== undefined)
			title = evt.title.$t;
		
		//Where Field
		where = null;
		whereUrl = null;
		if (typeof evt.gd$where[0].valueString != 'undefined')
		{
			where = evt.gd$where[0].valueString;
			if (isUrl(evt.gd$where[0].valueString)) {
				whereUrl = where;
			}
		}
		
		//Description field
		description = null;
		if (typeof evt.content.$t != 'undefined')
			description = evt.content.$t;
		
		start = evt.gd$when[0].startTime;
		
		//Created By field
		createdBy = null;
		if (typeof evt.author[0].name != 'undefined')
		{
			createdBy = evt.author[0].name.$t;
		}
		//Event URL field
		eventUrl = null;
		for (linki = 0; linki < evt.link.length; linki++) 
		{
			if (evt.link[linki].type == 'text/html' && evt.link[linki].type == 'alternate') 
			{
				eventUrl = evt.link[linki].href;
			}
		}

		//When field
		when = renderWhen(evt, evtCat);
		
		//Root event element
		divEvt = document.createElement('div');
		
		//expansion toggle element
		toggle = document.createElement('span');
		toggle.setAttribute('id', 'evt_tgl_'+evt);
		toggle.setAttribute('class', 'toggle');
		toggle.onclick = function() { toggleEvtDetail(evt); };
		toggle.appendChild(document.createTextNode('+'));
		divEvt.appendChild(toggle);
		
		//Title element
		spanTitle = document.createElement('span');
		spanTitle.setAttribute('id', 'evt_hdr_'+evt);
		spanTitle.setAttribute('class', 'title');
		
		//Figure out our title URL
		titleUrl = (whereUrl !== null ? whereUrl : eventUrl);
		
		//either title or title link
		spanTitle.innerHTML = (titleUrl === null ? title : "<a href='"+ encodeURI(titleUrl)+"'>"+title+"</a>");
		divEvt.appendChild(spanTitle);
		
		divDetail = document.createElement('div');
		divDetail.setAttribute('id', 'evt_div_'+evt);
		divDetail.setAttribute('class', 'evt_detail');
		evt++;
		divDetail.innerHTML = (when !== null ? 
									"When: ".bold() + when + "<br/>" : "")+
								(where !== null && whereUrl=== null ? 
									"Where: ".bold() + "<a href='http://maps.google.com/maps?hl=en&q="+encodeURI(where)+"'>"+where+"</a><br/>" : "")+
								(createdBy !== null ? 
									"Created by: ".bold() + createdBy + "<br/>" : "")+
								(description !== null ? 
									"Description: ".bold() + "<div class='description'>"+description+"</div>" : "");
		//divDetail.style.display = 'none';
		divEvt.appendChild(divDetail);
		evtCat.div.appendChild(divEvt);
	}

	function toggleEvtDetail(evt_no) {
		var evtDiv, evtLink;
		evtDiv = document.getElementById("evt_div_" + evt_no);
		evtLink = document.getElementById("evt_tgl_" + evt_no);
		if (evtDiv.style.display == 'none') {
			evtDiv.style.display = 'block';
			evtLink.innerHTML = "&minus;";
		}
		else if (evtDiv.style.display == 'block') {
			evtDiv.style.display ='none';
			evtLink.innerHTML = "+";
		}
	}

	function renderEvtCat(instance, evtCat)	{
		var divSect, divSectHeader, divSectRange, divDetail;
		divSect = document.createElement('div');
		divSect.setAttribute('class', 'timespan');
		divSectHeader = document.createElement('div');
		divSectHeader.setAttribute('class', 'caption');
		divSectHeader.appendChild(document.createTextNode(evtCat.caption));
		divSectRange = document.createElement('span');
		divSectRange.setAttribute('class', 'range');
		divSectRange.appendChild(document.createTextNode(evtCat.range));
		divSect.appendChild(divSectHeader);
		divSectHeader.appendChild(divSectRange);
		divDetail = document.createElement('div');
		divSect.appendChild(divDetail);
		instance.ui.evts.div.appendChild(divSect);
		evtCat.div = divDetail;
	}

	//Converts an xs:date or xs:dateTime formatted string into the local timezone
	//and outputs a human-readable form of this date or date/time.
	//@param {string} gCalTime is the xs:date or xs:dateTime formatted string
	//@return {string} is the human-readable date or date/time string
	function xsDateTimeToMoment(gCalTime) { 
		// text for regex matches
		var remtxt = gCalTime;

		function consume(retxt) 
		{
			var match = remtxt.match(new RegExp('^' + retxt));
			if (match) 
			{
				remtxt = remtxt.substring(match[0].length);
				return match[0];
			}
			return '';
		}

		// minutes of correction between gCalTime and GMT
		var totalCorrMins = 0;
		var year = consume('\\d{4}');
		consume('-?');
		var month = consume('\\d{2}');
		consume('-?');
		var dateMonth = consume('\\d{2}');
		var timeOrNot = consume('T');
		var hours = 0;
		var mins = 0;
		// if a DATE-TIME was matched in the regex 
		if (timeOrNot == 'T') 
		{
			hours = consume('\\d{2}');
			consume(':?');
			mins = consume('\\d{2}');
			consume('(:\\d{2})?(\\.\\d{3})?');
			var zuluOrNot = consume('Z');

			// if time from server is not already in GMT, calculate offset
			if (zuluOrNot != 'Z') 
			{
				var corrPlusMinus = consume('[\\+\\-]');
				if (corrPlusMinus !== '') 
				{
					var corrHours = consume('\\d{2}');
					consume(':?');
					var corrMins = consume('\\d{2}');
					totalCorrMins = (corrPlusMinus === '-' ? 1 : -1) * (Number(corrHours) * 60 + (corrMins ==='' ? 0 : Number(corrMins)));
				}
			} 
		}
		// get time since epoch and apply correction, if necessary
		// relies upon Date object to convert the GMT time to the local
		// timezone
		//var originalDateEpoch = Date.UTC(year, month - 1, dateMonth - 1, hours, mins);
		//var gmtDateEpoch = originalDateEpoch + totalCorrMins * 1000 * 60;
		var ld = new Date(year, month - 1, dateMonth, hours, mins);
		return moment(ld);
	}
	return {
		render: publicRender,
		callbacks: publicCallbacks
	};
}();
