var upcoming = function () {
	"use strict";
	
	var 
		instances = {}, //instances by div id
		feeds = {},  //feeds by uri
		publicCallbacks = {}, //callbacks by feedInstanceId
		res = upcoming_res || { //load resources, or fallback to EN default
			default_div_id: "upcoming",
			err_format_cannot_render: "Upcoming.js cannot render to element '{0}'. Does this id exist?",
		}; 

	//primary entry point
	function publicRender(config) {
		var i, instance, feedUri, feedInstanceId, feedId, feed;
		instance = instances[config.id] = {
			id: config.id || res.default_div_id,
			max_results: config.max_results || 15,
			feeds: {},
			ui: { //Details about html ui for instance
				div: null, //Root div
				progress: { //Progress/status ui
					div: null, //Created div
					steps: 0, //Total number of steps in progress
					step: 0 //Current step 
				},
				evts { //Event display ui
					div: null, //Created div
				},
			}
		};
		
		//Find root instance id
		instance.ui.div = document.getElementById(instance.id);
		if (instance.ui.div === null) {
			formatError(res.err_format_cannot_render, instance.id);
			return;
		}

		//create progress ui
		instance.ui.prog.div = document.createElement('div');
		instance.ui.prog.div.setAttribute('class', 'status');
		instance.ui.prog.div.setAttribute('id', instance.id + '_status');
		
		//create evt ui
		instance.ui.evts.div = document.createElement('div');
		instance.ui.evts.div.setAttribute('class', 'evts');
		instance.ui.evts.div.setAttribute('id', instance.id + '_evts');
		
		//hook it together
		instance.ui.div.appendChild(instance.ui.prog.div);
		instance.ui.div.appendChild(instance.ui.evts.div);
		
		//Start loading any configured feeds
		for (i = 0; i < config.feeds.length; i++) {
			feed = instance.feeds[feedUri] = {
				id: config.feeds[i],
				uri: "http://www.google.com/calendar/feeds/" +
					encodeURIComponent(config.feeds[i]) +
					"/public/full",
				instanceId = config.feeds[i] + "_" + instance.id;
			
			//If we haven't seen this feed before
			if (!(feed.uri in feeds)) { 
				//key a new entry
				feeds[feed.uri] = null;
				//indicate another step
				instance.prog_steps++;
				//and begin retrieving data
				document.write("<script type='text/javascript' "+
					"src='"+ 
					feedUri + //already encoded
					"?alt=json-in-script&callback=upcoming.callbacks."+
					encodeURIComponent(feedInstanceId)+
					"&orderby=starttime"+
					"&max-results="+encodeURIComponent(instance.max_results)+
					"&singleevents=true&sortorder=ascending&futureevents=true'></script>");
				progress(instance, "Requesting Feed...");
			}
			//If we haven't seen this feedInstanceId before
			if (!(feedInstanceId in publicCallbacks)) { 
				//Add a new callback that closes over the relevant instance
				publicCallbacks[feedInstanceId] = makeFeedInstanceCallback(feedUri, instance);
			}
		}
	}
	
	function format() {
		var s = arguments[0];
		for (var i = 0; i < arguments.length - 1; i++) {       
			var reg = new RegExp("\\{" + i + "\\}", "gm");             
			s = s.replace(reg, arguments[i + 1]);
		}
		return s;
	}
	
	function formatError() {
		error(format(arguments));
	}
	
	function error(msg)	{
		//For now, alert
		alert(msg);
	}	
	
	function makeFeedInstanceCallback(feedUri, instance) {
		return function(root) {
			callback(root, feedUri, instance);
		};
	}

	function callback(root, feedUri, instance) {
		var feed = feeds[feedUri] = {uri: feedUri, data: root.feed};
		var evts = instance.evts = instance.evts || [];
		var iStart = evts.length;
		if (root.feed.entry !== null)
		{
			var iCount = root.feed.entry.length;
			evts[iStart + iCount - 1] = null; //Resize to hold new events
			for (var i = 0; i < iCount; i++)
			{
				var evt = root.feed.entry[i];
				evt.startDate = gcal_time_as_date(evt.gd$when[0].startTime);
				if (typeof evt.gd$when[0].endTime == 'undefined') {
					evt.endDate = null;
					evt.allDay = true;
				}
				else {
					evt.endDate = gcal_time_as_date(evt.gd$when[0].endTime);
					var startDate = evt.startDate.getDate();
					var endDate = evt.endDate.getDate();
					evt.daySpan = endDate - startDate;
					if (evt.daySpan < 1) {
						evt.allDay = false;
					}
					else if (evt.daySpan == 1) {
						var startHours = evt.startDate.getHours();
						var endHours = evt.endDate.getHours();
						if ((startHours == endHours) && (startHours + endHours === 0))
						{
							evt.allDay = true;
							evt.daySpan = 1;
						}
					}
					else
						evt.allDay = false;
				}
				evt.srcFeed = iFeed;
				evts[iStart+i] = evt;
			}
		}
		
		feeds_left--;
		
		progress(instance, "Loading Events...");
		
		//If we are done loading feeds, process and output our data
		if (feeds_left < 1)
			render_evts();
	}

	function progress(instance, msg)
	{
		var percentage = -1;
		if (instance !== null) {
			percentage = 100.0 * instance.prog_step / instance.prog_step;
		}
				
		//Clear out the previous message
		while (instance.ui.prog.div.childNodes.length > 0) {
			instance.ui.prog.div.removeChild(instance.ui.prog.div.childNodes[0]);
		}
		if (message !== null) {
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
	function render_evts() 
	{
		//function to sort the events by date
		function sortEvt(a, b)
		{
			return a.startDate.getTime() - b.startDate.getTime();
		}
		
		var evts = document.getElementById("evts");
		progress("Sorting Events...", feeds_total, feeds_total+2);
		evts.sort(sortEvt);
		
		
		var section = null;
		var evtCats = build_evt_cats();
		var iCat = 0;
		var evtCat = evtCats[0]; //first category of event
		var evt = null;
		
		progress("Rendering Events...", feeds_total+1, feeds_total+2);
		
		// render each event in the feed
		for (var i = 0; i < evts.length; i++) 
		{
			evt = evts[i];
			//Don't stop until we've categorized the event or ran out of categories
			while(true) 
			{
				//whether or not the event can be within this category
				var inCat = evt_in_cat(evt, evtCat); 
				if (inCat === true)
				{
					//Display the section if we haven't already
					if (evtCat.Section === null)
						build_evt_section(evtCat, evts);
					//Render the event in the section
					render_evt(evt, evtCat);
					break;
				}
				else
				{
					//If we still have another category
					if (iCat < evtCats.length - 1)
					{
						evtCat = evtCats[++iCat]; //ratchet the category and re-try the event
					}
					else
					{
						break; //there shouldn't be any events left, but their membership should fail too
					}
				}
			}
		}
		if (evts.length > 0)
		{
			done();
		}
		else
		{
			status("No Events Found");
		}
			
	}

	function evt_in_cat(evt, evtCat)
	{
		if (evtCat.Start === null && evtCat.End === null)
			return true;
		var evtStart = evt.startDate.getTime();
		var evtEnd = evt.endDate.getTime();
		var startAfterCatEnd = evtStart - evtCat.End.getTime() > 0;
		var endBeforeCatStart = evtEnd - evtCat.Start.getTime() < 0;
		return (!startAfterCatEnd && !endBeforeCatStart);
	}

	function build_evt_cats()
	{
		var now = new Date();
		var today = {};
		var week = {};
		var nextWeek = {};
		var month = {};
		var nextMonth = {};
		var year = {};
		var upcoming = {};
		
		var nowMonth = now.getMonth();
		var nowFullYear = now.getFullYear();
		var nowDate = now.getDate();
		var nowDay = now.getDay();
		
		today.Start = build_date(nowFullYear, nowMonth, nowDate, true);
		today.End = build_date(nowFullYear, nowMonth, nowDate, false);
		today.Section = null;
		today.DateFormat = time_format;
		today.TimeFormat = time_format;
		today.MultiDateFormat = date_format;
		today.Caption = "Today";
		today.Range = today.Start.print(date_format);
		
		week.Start = build_date(nowFullYear, nowMonth, nowDate - nowDay, true);
		week.End = build_date(nowFullYear, nowMonth, nowDate + 6 - nowDay, false);
		week.Section = null;
		week.DateFormat = date_format;
		week.TimeFormat = time_format;
		week.MultiDateFormat = date_format;
		week.Caption = "This Week";
		week.StartMonth = week.Start.print('%b');
		week.EndMonth = week.End.print('%b');
		if (week.StartMonth == week.EndMonth)
			week.EndMonth = "";
		else
			week.EndMonth = week.EndMonth + " ";
		week.Range = week.Start.print('%b %f - ')+week.EndMonth+week.End.print('%f');
		
		nextWeek.Start = build_date(nowFullYear, nowMonth, nowDate - nowDay + 7, true);
		nextWeek.End = build_date(nowFullYear, nowMonth, nowDate + 13 - nowDay, false);
		nextWeek.Section = null;
		nextWeek.DateFormat = date_format;
		nextWeek.TimeFormat = time_format;
		nextWeek.MultiDateFormat = date_format;
		nextWeek.Caption = "Next Week";
		nextWeek.StartMonth = nextWeek.Start.print('%b');
		nextWeek.EndMonth = nextWeek.End.print('%b');
		if (nextWeek.StartMonth == nextWeek.EndMonth)
			nextWeek.EndMonth = "";
		else
			nextWeek.EndMonth = nextWeek.EndMonth + " ";
		nextWeek.Range = nextWeek.Start.print('%b %f - ')+nextWeek.EndMonth+nextWeek.End.print('%f');
		
		month.Start = build_date(nowFullYear, nowMonth, 0, true);
		month.End = build_date(nowFullYear, nowMonth+1, -1, false);
		month.Section = null;
		month.DateFormat = date_format;
		month.TimeFormat = time_format;
		month.MultiDateFormat = date_format;
		month.Caption = "This Month";
		month.Range = month.Start.print('%b %Y');
		
		nextMonth.Start = build_date(nowFullYear, nowMonth+1, 1, true);
		nextMonth.End = build_date(nowFullYear, nowMonth+2, -1, false);
		nextMonth.Section = null;
		nextMonth.DateFormat = date_format;
		nextMonth.TimeFormat = time_format;
		nextMonth.MultiDateFormat = date_format;
		nextMonth.Caption = "Next Month";
		nextMonth.Range = nextMonth.Start.print('%b %Y');
		
		year.Start = build_date(nowFullYear, 0, 1, true);
		year.End = build_date(nowFullYear+1, 0, -1, false);
		year.Section = null;
		year.DateFormat = date_format;
		year.TimeFormat = time_format;
		year.MultiDateFormat = date_format;
		year.Caption = "This Year";
		year.Range = today.Start.print('%Y');
		
		upcoming.Start = null;
		upcoming.End = null;
		upcoming.Section = null;
		upcoming.DateFormat = date_format;
		upcoming.DateFormat = '%I:%M%p';
		upcoming.TimeFormat = '%I:%M%p';
		upcoming.MultiDateFormat = date_format;
		upcoming.Caption = "Upcoming";
		upcoming.Range = "";
		
		return new Array(today, week, nextWeek, month, nextMonth, year, upcoming);
	}

	function build_date(year, month, day, isStart)
	{
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
		return d;
	}

	function render_when(evt, evtCat)
	{
		var dateString = evt.startDate.print(evtCat.DateFormat);
		if (evt.allDay)
		{
			dateString = evt.startDate.print(evtCat.DateFormat);
		}
		else if (evt.daySpan > 0)
		{
			dateString = evt.startDate.print(evtCat.DateFormat)+" - "+evt.endDate.print(evtCat.MultiDateFormat);
		}
		else if (evt.daySpan === 0)
		{
			dateString = evt.startDate.print(evtCat.DateFormat)+ " ";
			var startHours = evt.startDate.print('%i');
			var startMins = evt.startDate.print('%M');
			var startAmPm = evt.startDate.print("%p");
			var endHours = evt.endDate.print("%i");
			var endMins = evt.startDate.print('%M');
			var endAmPm = evt.endDate.print("%p");
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

	function is_url(value)
	{
		var rx = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
		return rx.test(value);
	}

	function render_evt(evt, evtCat)
	{
		var title, where, whereUrl, description, start, spanTitle, createdBy, eventUrl, when, divEvt, link, toggle, titleUrl, entryLinkHref, linki, divDetail;
		
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
			if (is_url(evt.gd$where[0].valueString))
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
		when = render_when(evt, evtCat);
		
		//Root event element
		divEvt = document.createElement('div');
		
		//expansion toggle element
		toggle = document.createElement('span');
		toggle.setAttribute('id', 'evt_tgl_'+evt);
		toggle.setAttribute('class', 'toggle');
		toggle.onclick = function() { toggle_evt_detail(evt); };
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

	function toggle_evt_detail(evt_no)
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

	function build_evt_section(evtCat, evts)
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
	function gcal_time_as_date(gCalTime) { 
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
		return ld;
	}
	return {
		render: publicRender,
		callbacks: publicCallbacks
	};
};
