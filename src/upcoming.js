var upcoming = function () {
	"use strict";
	
	var languages = {};
	
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
		error(format(arguments));
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
		
		//Build our instance
		var instance = instances[config.id] = {
			id: config.id || res.default_div_id,
			max_results: config.max_results || 15,
			expectedFeeds: [],
			ui: { //Details about html ui for instance
				div: null, //Root div
				prog: { //Progress/status ui
					div: null, //Created div
					css: config.prog.css || "prog",
					idSuffix: config.prog.idSuffix || "_prog",
					steps: 0, //Total number of steps in progress
					step: 0 //Current step 
				},
				evts: { //Event display ui
					div: null, //Created div
					css: config.evts.css || "evts",
					idSuffix: config.prog.idSuffix || "_evts"
				}
			},
			evts: [] //The listing of evt data
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

		//create progress ui
		prog.div = document.createElement('div');
		prog.div.setAttribute('class', prog.css);
		prog.div.setAttribute('id', instance.id + prog.idSuffix);
		
		//create evt ui
		evts.div = document.createElement('div');
		evts.div.setAttribute('class', evts.css);
		evts.div.setAttribute('id', instance.id + evts.idSuffix);
		
		//hook it together
		ui.div.appendChild(ui.prog.div);
		ui.div.appendChild(ui.evts.div);
		
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
				feed = feeds[feedInfo.uri] = {
					data: null,
					expectedInstances:{},
					callback: "feed"+feeds.length
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
			
			if (root.feed.entry !== null)
			{
				entryCount = root.feed.entry.length;
				evts[startIndex + entryCount - 1] = null; //Resize once to hold new events
				for (i = 0; i < entryCount; i++)
				{
					evt = root.feed.entry[i];
					evt.startMoment = xsDateTimeToMoment(evt.gd$when[0].startTime);
					if (typeof evt.gd$when[0].endTime == 'undefined') {
						evt.endMoment = null;
						evt.allDay = true;
					}
					else {
						evt.endMoment = xsDateTimeToMoment(evt.gd$when[0].endTime);
						var startMoment = evt.startMoment.getDate();
						var endMoment = evt.endMoment.getDate();
						evt.daySpan = endMoment - startMoment;
						if (evt.daySpan < 1) {
							evt.allDay = false;
						}
						else if (evt.daySpan == 1) {
							var startHours = evt.startMoment.getHours();
							var endHours = evt.endMoment.getHours();
							if ((startHours == endHours) && (startHours + endHours === 0))
							{
								evt.allDay = true;
								evt.daySpan = 1;
							}
						}
						else
							evt.allDay = false;
					}
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
		var percentage = -1;
		if (instance !== null) {
			percentage = 100.0 * instance.prog_step / instance.prog_step;
		}
				
		//Clear out the previous message
		while (instance.ui.prog.div.childNodes.length > 0) {
			instance.ui.prog.div.removeChild(instance.ui.prog.div.childNodes[0]);
		}
		if (msg !== null) {
			instance.ui.prog.div.appendChild(document.createTextNode(msg));
		}
		if (percentage >= 0)
		{
			var divBorder = document.createElement('div');
			divBorder.setAttribute('class', 'progress');
			var divProgress = document.createElement('div');
			divProgress.setAttribute('style', 'width: '+percentage+'px;');
			divProgress.setAttribute('class', 'progressbar');
			divBorder.appendChild(divProgress);
			instance.ui.prog.div.appendChild(divBorder);
		}
	}

	function status(msg) {
		progress(null, msg);
	}

	function done(instance)
	{
		progress(null, null);
	}

	//writes the events from our feeds to the display
	function renderEvts(instance) 
	{
		//function to sort the events by date
		function sortEvt(a, b)
		{
			return a.startMoment.getTime() - b.startMoment.getTime();
		}
		
		var evts = instance.evts;
		progress(instance, res.prog_sorting_events);
		evts.sort(sortEvt);
		
		var evtCats = buildEvtCats();
		var iCat = 0;
		var evtCat = evtCats[0]; //first category of event
		var evt = null;
		
		progress(instance, res.prog_rendering_events);
		
		// render each event in the feed
		for (var i = 0; i < evts.length; i++) {
			evt = evts[i];
			//Don't stop until we've categorized the event or ran out of categories
			while(true) {
				//whether or not the event can be within this category
				if (evtInCat(evt, evtCat) === true) {
					//Display the section if we haven't already
					if (evtCat.Section === null)
						renderEvtCatSection(evtCat, evts);
					//Render the event in the section
					renderEvt(evt, evtCat);
					break;
				}
				else {
					//If we still have another category
					if (iCat < evtCats.length - 1) {
						evtCat = evtCats[++iCat]; //ratchet the category and re-try the event
					}
					else {
						break; //there shouldn't be any events left, but their membership should fail too
					}
				}
			}
		}
		if (evts.length > 0) {
			done();
		}
		else {
			status(instance, res.prog_no_events_found);
		}
	}

	function evtInCat(evt, evtCat)
	{
		return ( //"upcoming" category should always match
			evtCat.Start === null && 
			evtCat.End === null
		) || ( //or we fall in the appropriate range
			evt.startMoment.diff(evtCat.Start) >= 0 &&
			evt.endMoment.diff(evtCat.End) <= 0
		);
	}

	function buildEvtCats() {
		var now = moment(); //now
		var sod = moment(now).sod(); //Start of day
		var eod = moment(now).eod(); //End of day
		var sow = moment(sod)//Start of week
			.subtract("day", sod.day()); //Offset to first day of week
		var eow = moment(sow).add("week", 1); //End of week
		var som = moment(now).startOf('month'); //Start of month
		var eom = moment(som).add("month", 1); //End of month
		
		var today = {};
		var week = {};
		var nextWeek = {};
		var month = {};
		var nextMonth = {};
		var year = {};
		var upcoming = {};
		
		today.Start = moment(sod);
		today.End = moment(eod);
		today.Section = null;
		today.DateFormat = res.time_format;
		today.TimeFormat = res.time_format;
		today.MultiDateFormat = res.date_format;
		today.Caption = res.event_cat_today;
		today.Range = today.Start.format(res.date_format);
		
		week.Start = moment(sow);
		week.End = moment(eow);
		week.Section = null;
		week.DateFormat = res.date_format;
		week.TimeFormat = res.time_format;
		week.MultiDateFormat = res.date_format;
		week.Caption = res.event_cat_this_week;
		week.StartMonth = week.Start.format('%b');
		week.EndMonth = week.End.format('%b');
		if (week.StartMonth == week.EndMonth)
			week.EndMonth = "";
		else
			week.EndMonth = week.EndMonth + " ";
		week.Range = week.Start.format('%b %f - ')+week.EndMonth+week.End.format('%f');
		
		nextWeek.Start = moment(sow).add("week", 1);
		nextWeek.End = moment(eow).add("week", 1);
		nextWeek.Section = null;
		nextWeek.DateFormat = res.date_format;
		nextWeek.TimeFormat = res.time_format;
		nextWeek.MultiDateFormat = res.date_format;
		nextWeek.Caption = res.event_cat_next_week;
		nextWeek.StartMonth = nextWeek.Start.format('%b');
		nextWeek.EndMonth = nextWeek.End.format('%b');
		if (nextWeek.StartMonth == nextWeek.EndMonth)
			nextWeek.EndMonth = "";
		else
			nextWeek.EndMonth = nextWeek.EndMonth + " ";
		nextWeek.Range = nextWeek.Start.format('%b %f - ')+nextWeek.EndMonth+nextWeek.End.format('%f');
		
		month.Start = moment(som);
		month.End = moment(eom);
		month.Section = null;
		month.DateFormat = res.date_format;
		month.TimeFormat = res.time_format;
		month.MultiDateFormat = res.date_format;
		month.Caption = res.event_cat_this_month;
		month.Range = month.Start.format('%b %Y');
		
		nextMonth.Start = moment(som).add("month", 1);
		nextMonth.End = moment(eom).add("month", 1);
		nextMonth.Section = null;
		nextMonth.DateFormat = res.date_format;
		nextMonth.TimeFormat = res.time_format;
		nextMonth.MultiDateFormat = res.date_format;
		nextMonth.Caption = res.event_cat_next_month;
		nextMonth.Range = nextMonth.Start.format('%b %Y');
		
		year.Start = moment(now).startOf("year");
		year.End = moment(now).endOf("year");
		year.Section = null;
		year.DateFormat = res.date_format;
		year.TimeFormat = res.time_format;
		year.MultiDateFormat = res.date_format;
		year.Caption = res.event_cat_this_year;
		year.Range = today.Start.format('%Y');
		
		upcoming.Start = null;
		upcoming.End = null;
		upcoming.Section = null;
		upcoming.DateFormat = res.date_format;
		upcoming.DateFormat = '%I:%M%p';
		upcoming.TimeFormat = '%I:%M%p';
		upcoming.MultiDateFormat = res.date_format;
		upcoming.Caption = res.event_cat_upcoming;
		upcoming.Range = "";
		
		return [today, week, nextWeek, month, nextMonth, year, upcoming];
	}

	function buildDate(year, month, day, isStart) {
		var d = new Date(year, month, day);
		if (isStart === false)
		{
			d.setHours(23);
			d.setMinutes(59);
			d.setSeconds(59);
			d.setMilliseconds(999);
		}
		else
		{
			d.setHours(0);
			d.setMinutes(0);
			d.setSeconds(0);
			d.setMilliseconds(0);
		}
		return moment(d);
	}

	function renderWhen(evt, evtCat)
	{
		var dateString = evt.startMoment.format(evtCat.DateFormat);
		if (evt.allDay)
		{
			dateString = evt.startMoment.format(evtCat.DateFormat);
		}
		else if (evt.daySpan > 0)
		{
			dateString = evt.startMoment.format(evtCat.DateFormat)+" - "+evt.endMoment.format(evtCat.MultiDateFormat);
		}
		else if (evt.daySpan === 0)
		{
			dateString = evt.startMoment.format(evtCat.DateFormat)+ " ";
			var startHours = evt.startMoment.format('%i');
			var startMins = evt.startMoment.format('%M');
			var startAmPm = evt.startMoment.format("%p");
			var endHours = evt.endMoment.format("%i");
			var endMins = evt.startMoment.format('%M');
			var endAmPm = evt.endMoment.format("%p");
			if (startAmPm == endAmPm)
				startAmPm = '';
			if (startMins == "00")
				startMins = "";
			else
				startMins = ":"+startMins;
				
			if (endMins == "00")
				endMins = "";
			else
				endMins = ":"+endMins;
			dateString = dateString + startHours + startMins + startAmPm + "-" + endHours + endMins + endAmPm;
		}
		return dateString;
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
			if (isUrl(evt.gd$where[0].valueString))
			{
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
		divDetail.style.display = 'none';
		divEvt.appendChild(divDetail);
		evtCat.Section.appendChild(divEvt);
	}

	function toggleEvtDetail(evt_no)
	{
		var evtDiv, evtLink;
		evtDiv = document.getElementById("evt_div_" + evt_no);
		evtLink = document.getElementById("evt_tgl_" + evt_no);
		if (evtDiv.style.display == 'none')
		{
			evtDiv.style.display = 'block';
			evtLink.innerHTML = "&minus;";
		}
		else if (evtDiv.style.display == 'block')
		{
			evtDiv.style.display ='none';
			evtLink.innerHTML = "+";
		}
	}

	function renderEvtCatSection(evtCat, evts)
	{
		var divSect, divSectHeader, divSectRange, divDetail;
		divSect = document.createElement('div');
		divSect.setAttribute('class', 'timespan');
		divSectHeader = document.createElement('div');
		divSectHeader.setAttribute('class', 'caption');
		divSectHeader.appendChild(document.createTextNode(evtCat.Caption));
		divSectRange = document.createElement('span');
		divSectRange.setAttribute('class', 'range');
		divSectRange.appendChild(document.createTextNode(evtCat.Range));
		divSect.appendChild(divSectHeader);
		divSectHeader.appendChild(divSectRange);
		divDetail = document.createElement('div');
		divSect.appendChild(divDetail);
		evts.appendChild(divSect);
		evtCat.Section = divDetail;
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
