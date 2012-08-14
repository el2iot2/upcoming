var _gcv = new Object();

//Static global function entry points
Gcv.on_feed_completed = function(root)
{
	_gcv.instance.on_feed_completed(root);
}

Gcv.render = function(params)
{
	_gcv.instance = new Gcv(params);
}

//Gcv Constructor
function Gcv(params)
{
	// Our Custom GCal functions
	this.date_format = '%a, %b %f';
	this.time_format = '%I:%M%p';

	if (params.cal_evt_max == null)
		params.cal_evt_max = 15;
	
	//An array of our GCal Feeds
	this.feeds = new Object();
	this.evts = new Array(0);
	this.div = new Object();
	this.feeds_left = -1;
	this.feeds_total = -1;
	this.evt = 0;
	this.window = null;
	this.params = params;
	this.render();
}

/**
 * Callback function for the GData json-in-script call
 * Inserts the supplied list of events into an array for later processing
 * 
 * @param {json} root is the JSON-formatted content from GData
 */ 
Gcv.prototype.on_feed_completed = function(root)
{
	var iFeed = this.feeds.length;
	this.feeds[root.feed.title.$t] = root.feed;
	var iStart = this.evts.length;
	if (root.feed.entry != null)
	{
		var iCount = root.feed.entry.length;
		this.evts[iStart + iCount - 1] = null; //Resize to hold new events
		for (var i = 0; i < iCount; i++)
		{
			var evt = root.feed.entry[i];
			evt.startDate = this.gcal_time_as_date(evt['gd$when'][0].startTime);
			if (typeof evt['gd$when'][0].endTime == 'undefined')
			{
				evt.endDate = null;
				evt.allDay = true;
			}
			else
			{
				evt.endDate = this.gcal_time_as_date(evt['gd$when'][0].endTime);
				var startDate = evt.startDate.getDate();
				var endDate = evt.endDate.getDate();
				evt.daySpan = endDate - startDate;
				if (evt.daySpan < 1)
				{
					evt.allDay = false;
				}
				else if (evt.daySpan == 1)
				{
					var startHours = evt.startDate.getHours();
					var endHours = evt.endDate.getHours();
					if ((startHours == endHours) && (startHours + endHours == 0))
					{
						evt.allDay = true;
						evt.daySpan = 1;
					}
				}
				else
					evt.allDay = false;
			}
			evt.srcFeed = iFeed;
			this.evts[iStart+i] = evt;
		}
	}
	
	this.feeds_left--;
	
	this.progress("Loading Events...", this.feeds_total-this.feeds_left, this.feeds_total+2);
	
	//If we are done loading feeds, process and output our data
	if (this.feeds_left < 1)
		this.render_evts();
}

Gcv.prototype.render = function()
{
	this.feeds_left = this.feeds_total = this.params.feeds.length;

	this.div.root = document.getElementById(this.params.id);
	
	this.div.status = document.createElement('div');
	this.div.status.setAttribute('class', 'status');
	this.div.status.setAttribute('id', 'status');
	
	this.div.evts = document.createElement('div');
	this.div.evts.setAttribute('class', 'evts');
	this.div.evts.setAttribute('id', 'evts');
	
	this.div.root.appendChild(this.div.status);
	this.div.root.appendChild(this.div.evts);
	
	this.progress("Loading Events...", 0, this.feeds_total+2);
	for (var i=0; i < this.params.feeds.length; i++ )
	{
		document.write("<script type='text/javascript' "+
						"src='http://www.google.com/calendar/feeds/"+ 
						this.params.feeds[i]+ 
						"/public/full?alt=json-in-script&callback=Gcv.on_feed_completed"+
						"&orderby=starttime"+
						"&max-results="+this.params.cal_evt_max+
						"&singleevents=true&sortorder=ascending&futureevents=true'></script>");
	}
}

Gcv.prototype.progress = function(msg, loc, total)
{
	var percentage = 100.0*loc/total;
	if (this.div.status == null)
		this.div.status = document.getElementById("status");
	
	//Clear out the previous message
	while (this.div.status.childNodes.length > 0)
	{
		this.div.status.removeChild(this.div.status.childNodes[0]);
	}
	this.div.status.appendChild(document.createTextNode(msg));
	if (percentage >= 0)
	{
		var divBorder = document.createElement('div');
		divBorder.setAttribute('class', 'progress');
		var divProgress = document.createElement('div');
		divProgress.setAttribute('style', 'width: '+percentage+'px;');
		divProgress.setAttribute('class', 'progressbar');
		divBorder.appendChild(divProgress);
		this.div.status.appendChild(divBorder);
	}
}

Gcv.prototype.status = function(msg)
{
	this.progress(msg, -1, 1);
}


Gcv.prototype.done = function()
{
	if (this.div.status == null)
		this.div.status = document.getElementById("status");
	
	//Clear out the previous message
	while (this.div.status.childNodes.length > 0)
	{
		this.div.status.removeChild(this.div.status.childNodes[0]);
	}
}

//writes the events from our feeds to the display
Gcv.prototype.render_evts = function() 
{
	//function to sort the events by date
	function sortEvt(a, b)
	{
		return a.startDate.getTime() - b.startDate.getTime();
	}

	var evts = document.getElementById("evts");
  
	this.progress("Sorting Events...", this.feeds_total, this.feeds_total+2);
	this.evts.sort(sortEvt);
	
	
	var section = null;
	var evtCats = this.build_evt_cats();
	var iCat = 0;
	var evtCat = evtCats[0]; //first category of event
	var evt = null;
	
	this.progress("Rendering Events...", this.feeds_total+1, this.feeds_total+2);
	
	// render each event in the feed
	for (var i = 0; i < this.evts.length; i++) 
	{
		evt = this.evts[i];
		//Don't stop until we've categorized the event or ran out of categories
		while(true) 
		{
			//whether or not the event can be within this category
			var inCat = this.evt_in_cat(evt, evtCat); 
			if (inCat == true)
			{
				//Display the section if we haven't already
				if (evtCat.Section == null)
					this.build_evt_section(evtCat, evts);
				//Render the event in the section
				this.render_evt(evt, evtCat);
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
	if (this.evts.length > 0)
	{
		this.done();
	}
	else
	{
		this.status("No Events Found");
	}
		
}

Gcv.prototype.evt_in_cat = function(evt, evtCat)
{
	if (evtCat.Start == null && evtCat.End == null)
		return true;
	var evtStart = evt.startDate.getTime();
	var evtEnd = evt.endDate.getTime();
	var startAfterCatEnd = evtStart - evtCat.End.getTime() > 0;
	var endBeforeCatStart = evtEnd - evtCat.Start.getTime() < 0;
	return (!startAfterCatEnd && !endBeforeCatStart);
}

Gcv.prototype.build_evt_cats = function()
{
	var now = new Date();
	var today = new Object();
	var week = new Object();
	var nextWeek = new Object();
	var month = new Object();
	var nextMonth = new Object();
	var year = new Object();
	var upcoming = new Object();
	
	var nowMonth = now.getMonth();
	var nowFullYear = now.getFullYear();
	var nowDate = now.getDate();
	var nowDay = now.getDay();
	
	today.Start = this.build_date(nowFullYear, nowMonth, nowDate, true);
	today.End = this.build_date(nowFullYear, nowMonth, nowDate, false);
	today.Section = null;
	today.DateFormat = this.time_format;
	today.TimeFormat = this.time_format;
	today.MultiDateFormat = this.date_format;
	today.Caption = "Today";
	today.Range = today.Start.print(this.date_format);
	
	week.Start = this.build_date(nowFullYear, nowMonth, nowDate - nowDay, true);
	week.End = this.build_date(nowFullYear, nowMonth, nowDate + 6 - nowDay, false);
	week.Section = null;
	week.DateFormat = this.date_format;
	week.TimeFormat = this.time_format;
	week.MultiDateFormat = this.date_format;
	week.Caption = "This Week";
	week.StartMonth = week.Start.print('%b');
	week.EndMonth = week.End.print('%b');
	if (week.StartMonth == week.EndMonth)
		week.EndMonth = "";
	else
		week.EndMonth = week.EndMonth + " ";
	week.Range = week.Start.print('%b %f - ')+week.EndMonth+week.End.print('%f');
	
	nextWeek.Start = this.build_date(nowFullYear, nowMonth, nowDate - nowDay + 7, true);
	nextWeek.End = this.build_date(nowFullYear, nowMonth, nowDate + 13 - nowDay, false);
	nextWeek.Section = null;
	nextWeek.DateFormat = this.date_format;
	nextWeek.TimeFormat = this.time_format;
	nextWeek.MultiDateFormat = this.date_format;
	nextWeek.Caption = "Next Week";
	nextWeek.StartMonth = nextWeek.Start.print('%b');
	nextWeek.EndMonth = nextWeek.End.print('%b');
	if (nextWeek.StartMonth == nextWeek.EndMonth)
		nextWeek.EndMonth = "";
	else
		nextWeek.EndMonth = nextWeek.EndMonth + " ";
	nextWeek.Range = nextWeek.Start.print('%b %f - ')+nextWeek.EndMonth+nextWeek.End.print('%f');
	
	month.Start = this.build_date(nowFullYear, nowMonth, 0, true);
	month.End = this.build_date(nowFullYear, nowMonth+1, -1, false);
	month.Section = null;
	month.DateFormat = this.date_format;
	month.TimeFormat = this.time_format;
	month.MultiDateFormat = this.date_format;
	month.Caption = "This Month";
	month.Range = month.Start.print('%b %Y');
	
	nextMonth.Start = this.build_date(nowFullYear, nowMonth+1, 1, true);
	nextMonth.End = this.build_date(nowFullYear, nowMonth+2, -1, false);
	nextMonth.Section = null;
	nextMonth.DateFormat = this.date_format;
	nextMonth.TimeFormat = this.time_format;
	nextMonth.MultiDateFormat = this.date_format;
	nextMonth.Caption = "Next Month";
	nextMonth.Range = nextMonth.Start.print('%b %Y');
	
	year.Start = this.build_date(nowFullYear, 0, 1, true);
	year.End = this.build_date(nowFullYear+1, 0, -1, false);
	year.Section = null;
	year.DateFormat = this.date_format;
	year.TimeFormat = this.time_format;
	year.MultiDateFormat = this.date_format;
	year.Caption = "This Year";
	year.Range = today.Start.print('%Y');
	
	upcoming.Start = null;
	upcoming.End = null;
	upcoming.Section = null;
	upcoming.DateFormat = this.date_format;
	upcoming.DateFormat = '%I:%M%p';
	upcoming.TimeFormat = '%I:%M%p';
	upcoming.MultiDateFormat = this.date_format;
	upcoming.Caption = "Upcoming";
	upcoming.Range = "";
	
	return new Array(today, week, nextWeek, month, nextMonth, year, upcoming);
}

Gcv.prototype.build_date = function(year, month, day, isStart)
{
	var d = new Date(year, month, day);
	if (isStart == false)
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

Gcv.prototype.render_when = function(evt, evtCat)
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
	else if (evt.daySpan == 0)
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
			startMins = ""
		else
			startMins = ":"+startMins;
			
		if (endMins == "00")
			endMins = ""
		else
			endMins = ":"+endMins;
		dateString = dateString + startHours + startMins + startAmPm + "-" + endHours + endMins + endAmPm;
	}
	return dateString;
}

Gcv.prototype.is_url = function(value)
{
	var rx = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/
	return rx.test(value);
}

Gcv.prototype.render_evt = function(evt, evtCat)
{
	var title, where, whereUrl, description, start, spanTitle, createdBy, eventUrl, when, divEvt, link, toggle, titleUrl, entryLinkHref, linki, divDetail;
	
	//Title field
	title = null;
	if (typeof evt.title.$t != undefined)
		title = evt.title.$t;
	
	//Where Field
	where = null;
	whereUrl = null;
	if (typeof evt.gd$where[0].valueString != 'undefined')
	{
		where = evt.gd$where[0].valueString;
		if (this.is_url(evt.gd$where[0].valueString))
		{
			whereUrl = where;
		}
	}
	
	//Description field
	description = null;
	if (typeof evt.content.$t != 'undefined')
		description = evt.content.$t;
	
	start = evt['gd$when'][0].startTime;
	
	//Created By field
	createdBy = null;
    if (typeof evt.author[0].name != 'undefined')
      createdBy = evt.author[0].name.$t;
  
	//Event URL field
	eventUrl = null;
	for (linki = 0; linki < evt['link'].length; linki++) 
	{
		if (evt['link'][linki]['type'] == 'text/html' && evt['link'][linki]['rel'] == 'alternate') 
		{
			eventUrl = evt['link'][linki]['href'];
		}
	}

	//When field
	when = this.render_when(evt, evtCat);
	
	//Root event element
	divEvt = document.createElement('div');
	
	//expansion toggle element
	toggle = document.createElement('span');
	toggle.setAttribute('id', 'evt_tgl_'+this.evt);
	toggle.setAttribute('class', 'toggle');
	toggle.setAttribute('onclick', "javascript:Gcv.toggle_evt_detail("+String(this.evt)+")");
	toggle.appendChild(document.createTextNode('+'));
	divEvt.appendChild(toggle);
	
	//Title element
	spanTitle = document.createElement('span');
	spanTitle.setAttribute('id', 'evt_hdr_'+this.evt);
	spanTitle.setAttribute('class', 'title');
	
	//Figure out our title URL
	titleUrl = (whereUrl != null ? whereUrl : eventUrl);
	
	//either title or title link
	spanTitle.innerHTML = (titleUrl == null ? title : "<a href='"+ encodeURI(titleUrl)+"'>"+title+"</a>");
	divEvt.appendChild(spanTitle);
	
	divDetail = document.createElement('div');
	divDetail.setAttribute('id', 'evt_div_'+this.evt);
	divDetail.setAttribute('class', 'evt_detail');
	this.evt++;
	divDetail.innerHTML = 	(when != null ? 
								"When: ".bold() + when + "<br/>" : "")+
							(where != null && whereUrl == null ? 
								"Where: ".bold() + "<a href='http://maps.google.com/maps?hl=en&q="+encodeURI(where)+"'>"+where+"</a><br/>" : "")+
							(createdBy != null ? 
								"Created by: ".bold() + createdBy + "<br/>" : "")+
							(description != null ? 
								"Description: ".bold() + "<div class='description'>"+description+"</div>" : "");
	divDetail.style.display = 'none';
	divEvt.appendChild(divDetail);
	evtCat.Section.appendChild(divEvt);
}

Gcv.toggle_evt_detail = function(evt_no)
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

Gcv.prototype.build_evt_section = function(evtCat, evts)
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

//
// GOOGLE HELPER FUNCTIONS
//

/**
 * Converts an xs:date or xs:dateTime formatted string into the local timezone
 * and outputs a human-readable form of this date or date/time.
 *
 * @param {string} gCalTime is the xs:date or xs:dateTime formatted string
 * @return {string} is the human-readable date or date/time string
 */
Gcv.prototype.gcal_time_as_date = function(gCalTime) { 
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
			if (corrPlusMinus != '') 
			{
				var corrHours = consume('\\d{2}');
				consume(':?');
				var corrMins = consume('\\d{2}');
				totalCorrMins = (corrPlusMinus=='-' ? 1 : -1) * (Number(corrHours) * 60 + (corrMins=='' ? 0 : Number(corrMins)));
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


/*Globals*/
//Day Names
_gcv._DN = new Array
("Sunday",
 "Monday",
 "Tuesday",
 "Wednesday",
 "Thursday",
 "Friday",
 "Saturday",
 "Sunday");

// Short day names
_gcv._SDN = new Array
("Sun",
 "Mon",
 "Tue",
 "Wed",
 "Thu",
 "Fri",
 "Sat",
 "Sun");

// First day of the week. "0" means display Sunday first, "1" means display
// Monday first, etc.
_gcv._FD = 0;

// Month Names
_gcv._MN = new Array
("January",
 "February",
 "March",
 "April",
 "May",
 "June",
 "July",
 "August",
 "September",
 "October",
 "November",
 "December");

// short month names
_gcv._SMN = new Array
("Jan",
 "Feb",
 "Mar",
 "Apr",
 "May",
 "Jun",
 "Jul",
 "Aug",
 "Sep",
 "Oct",
 "Nov",
 "Dec");

//Date patches
/** Adds the number of days array to the Date object. */
Date._MD = new Array(31,28,31,30,31,30,31,31,30,31,30,31);

/** Constants used for time computations */
Date.SECOND = 1000 /* milliseconds */;
Date.MINUTE = 60 * Date.SECOND;
Date.HOUR   = 60 * Date.MINUTE;
Date.DAY    = 24 * Date.HOUR;
Date.WEEK   =  7 * Date.DAY;

Date.parseDate = function(str, fmt) {
	var today = new Date();
	var y = 0;
	var m = -1;
	var d = 0;
	var a = str.split(/\W+/);
	var b = fmt.match(/%./g);
	var i = 0, j = 0;
	var hr = 0;
	var min = 0;
	for (i = 0; i < a.length; ++i) {
		if (!a[i])
			continue;
		switch (b[i]) {
		    case "%d":
		    case "%e":
			d = parseInt(a[i], 10);
			break;

		    case "%m":
			m = parseInt(a[i], 10) - 1;
			break;

		    case "%Y":
		    case "%y":
			y = parseInt(a[i], 10);
			(y < 100) && (y += (y > 29) ? 1900 : 2000);
			break;

		    case "%b":
		    case "%B":
			for (j = 0; j < 12; ++j) {
				if (_gcv._MN[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) { m = j; break; }
			}
			break;

		    case "%H":
		    case "%I":
		    case "%k":
		    case "%l":
			hr = parseInt(a[i], 10);
			break;

		    case "%P":
		    case "%p":
			if (/pm/i.test(a[i]) && hr < 12)
				hr += 12;
			else if (/am/i.test(a[i]) && hr >= 12)
				hr -= 12;
			break;

		    case "%M":
			min = parseInt(a[i], 10);
			break;
		}
	}
	if (isNaN(y)) y = today.getFullYear();
	if (isNaN(m)) m = today.getMonth();
	if (isNaN(d)) d = today.getDate();
	if (isNaN(hr)) hr = today.getHours();
	if (isNaN(min)) min = today.getMinutes();
	if (y != 0 && m != -1 && d != 0)
		return new Date(y, m, d, hr, min, 0);
	y = 0; m = -1; d = 0;
	for (i = 0; i < a.length; ++i) {
		if (a[i].search(/[a-zA-Z]+/) != -1) {
			var t = -1;
			for (j = 0; j < 12; ++j) {
				if (_gcv._MN[j].substr(0, a[i].length).toLowerCase() == a[i].toLowerCase()) { t = j; break; }
			}
			if (t != -1) {
				if (m != -1) {
					d = m+1;
				}
				m = t;
			}
		} else if (parseInt(a[i], 10) <= 12 && m == -1) {
			m = a[i]-1;
		} else if (parseInt(a[i], 10) > 31 && y == 0) {
			y = parseInt(a[i], 10);
			(y < 100) && (y += (y > 29) ? 1900 : 2000);
		} else if (d == 0) {
			d = a[i];
		}
	}
	if (y == 0)
		y = today.getFullYear();
	if (m != -1 && d != 0)
		return new Date(y, m, d, hr, min, 0);
	return today;
};

/** Returns the number of days in the current month */
Date.prototype.getMonthDays = function(month) {
	var year = this.getFullYear();
	if (typeof month == "undefined") {
		month = this.getMonth();
	}
	if (((0 == (year%4)) && ( (0 != (year%100)) || (0 == (year%400)))) && month == 1) {
		return 29;
	} else {
		return Date._MD[month];
	}
};

/** Returns the number of day in the year. */
Date.prototype.getDayOfYear = function() {
	var now = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
	var then = new Date(this.getFullYear(), 0, 0, 0, 0, 0);
	var time = now - then;
	return Math.floor(time / Date.DAY);
};

/** Returns the number of the week in year, as defined in ISO 8601. */
Date.prototype.getWeekNumber = function() {
	var d = new Date(this.getFullYear(), this.getMonth(), this.getDate(), 0, 0, 0);
	var DoW = d.getDay();
	d.setDate(d.getDate() - (DoW + 6) % 7 + 3); // Nearest Thu
	var ms = d.valueOf(); // GMT
	d.setMonth(0);
	d.setDate(4); // Thu in Week 1
	return Math.round((ms - d.valueOf()) / (7 * 864e5)) + 1;
};

/** Checks date and time equality */
Date.prototype.equalsTo = function(date) {
	return ((this.getFullYear() == date.getFullYear()) &&
		(this.getMonth() == date.getMonth()) &&
		(this.getDate() == date.getDate()) &&
		(this.getHours() == date.getHours()) &&
		(this.getMinutes() == date.getMinutes()));
};

/** Set only the year, month, date parts (keep existing time) */
Date.prototype.setDateOnly = function(date) {
	var tmp = new Date(date);
	this.setDate(1);
	this.setFullYear(tmp.getFullYear());
	this.setMonth(tmp.getMonth());
	this.setDate(tmp.getDate());
};

/** Prints the date in a string according to the given format. */
Date.prototype.print = function (str) {
	var m = this.getMonth();
	var d = this.getDate();
	var y = this.getFullYear();
	var wn = this.getWeekNumber();
	var w = this.getDay();
	var s = {};
	var hr = this.getHours();
	var pm = (hr >= 12);
	var ir = (pm) ? (hr - 12) : hr;
	var dy = this.getDayOfYear();
	if (ir == 0)
		ir = 12;
	var min = this.getMinutes();
	var sec = this.getSeconds();
	s["%a"] = _gcv._SDN[w]; // abbreviated weekday name [FIXME: I18N]
	s["%A"] = _gcv._DN[w]; // full weekday name
	s["%b"] = _gcv._SMN[m]; // abbreviated month name [FIXME: I18N]
	s["%B"] = _gcv._MN[m]; // full month name
	// FIXME: %c : preferred date and time representation for the current locale
	s["%C"] = 1 + Math.floor(y / 100); // the century number
	s["%d"] = (d < 10) ? ("0" + d) : d; // the day of the month (range 01 to 31)
	s["%f"] = String(d);
	var tenChar = s["%f"].length == 2 ? s["%f"].charAt(0) : null;
	if (tenChar == '1')
	{
		s["%f"] += "th";
	}
	else
	{
		var lastChar = s["%f"].charAt(s["%f"].length-1);
		if (lastChar == '1')
			s["%f"] += "st";
		else if (lastChar == '2')
			s["%f"] += "nd";
		else if (lastChar == '3')
			s["%f"] += "rd";
		else
			s["%f"] += "th";
	}
	s["%e"] = d; // the day of the month (range 1 to 31)
	// FIXME: %D : american date style: %m/%d/%y
	// FIXME: %E, %F, %G, %g, %h (man strftime)
	s["%H"] = (hr < 10) ? ("0" + hr) : hr; // hour, range 00 to 23 (24h format)
	s["%I"] = (ir < 10) ? ("0" + ir) : ir; // hour, range 01 to 12 (12h format)
	s["%i"] = ir; //no leading zeros
	s["%j"] = (dy < 100) ? ((dy < 10) ? ("00" + dy) : ("0" + dy)) : dy; // day of the year (range 001 to 366)
	s["%k"] = hr;		// hour, range 0 to 23 (24h format)
	s["%l"] = ir;		// hour, range 1 to 12 (12h format)
	s["%m"] = (m < 9) ? ("0" + (1+m)) : (1+m); // month, range 01 to 12
	s["%M"] = (min < 10) ? ("0" + min) : min; // minute, range 00 to 59
	s["%n"] = "\n";		// a newline character
	s["%p"] = pm ? "p" : "a";
	s["%P"] = pm ? "pm" : "am";

	// FIXME: %r : the time in am/pm notation %I:%M:%S %p
	// FIXME: %R : the time in 24-hour notation %H:%M
	s["%s"] = Math.floor(this.getTime() / 1000);
	s["%S"] = (sec < 10) ? ("0" + sec) : sec; // seconds, range 00 to 59
	s["%t"] = "\t";		// a tab character
	// FIXME: %T : the time in 24-hour notation (%H:%M:%S)
	s["%U"] = s["%W"] = s["%V"] = (wn < 10) ? ("0" + wn) : wn;
	s["%u"] = w + 1;	// the day of the week (range 1 to 7, 1 = MON)
	s["%w"] = w;		// the day of the week (range 0 to 6, 0 = SUN)
	// FIXME: %x : preferred date representation for the current locale without the time
	// FIXME: %X : preferred time representation for the current locale without the date
	s["%y"] = ('' + y).substr(2, 2); // year without the century (range 00 to 99)
	s["%Y"] = y;		// year with the century
	s["%%"] = "%";		// a literal '%' character

	var re = /%./g;
	if (!_gcv.is_ie5 && !_gcv.is_khtml)
		return str.replace(re, function (par) { return s[par] || par; });

	var a = str.match(re);
	for (var i = 0; i < a.length; i++) {
		var tmp = s[a[i]];
		if (tmp) {
			re = new RegExp(a[i], 'g');
			str = str.replace(re, tmp);
		}
	}

	return str;
};

Date.prototype.__msh_oldSetFullYear = Date.prototype.setFullYear;
Date.prototype.setFullYear = function(y) {
	var d = new Date(this);
	d.__msh_oldSetFullYear(y);
	if (d.getMonth() != this.getMonth())
		this.setDate(28);
	this.__msh_oldSetFullYear(y);
};

// detect a special case of "web browser"
_gcv.is_ie = ( /msie/i.test(navigator.userAgent) &&
		   !/opera/i.test(navigator.userAgent) );

_gcv.is_ie5 = ( _gcv.is_ie && /msie 5\.0/i.test(navigator.userAgent) );

// detect Opera browser
_gcv.is_opera = /opera/i.test(navigator.userAgent);

// detect KHTML-based browsers
_gcv.is_khtml = /Konqueror|Safari|KHTML/i.test(navigator.userAgent);
