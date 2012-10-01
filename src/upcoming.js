var upcoming = function () {
	//"use strict";
	
	//return a closure to handle an expected JSONP callback
	function makeEmptyFunc() {
		return function() {};
	}
	
	function renderToElement(template, ctx, el) {
		//render the event categories
		dust.render(template, ctx, function(err, out) {
			if (err !== null) {
				error(err);
			}
			else {
				el.innerHTML = out;
			}
		});
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
	
	var 
		languages = {}, //language data
		feedIndex, //feed counter
		nextEvtId, //event counter
		instances = {}, //instances by div id
		feeds = {},  //feeds by uri
		publicCallbacks = {}; //callbacks by feedInstanceId
	
	var res = { //load resources, or fallback EN default
		default_div_id: "upc",
		prog_init: "Initializing...",
		prog_process_feed: "Processing Feed {0}...",
		prog_sort: "Sorting Events...",
		prog_render: "Rendering Events...",
		prog_no_events_found: "No Events Found.",
		event_cat_today: "Today",
		event_cat_tomorrow: "Tomorrow",
		event_cat_this_week: "This Week",
		event_cat_next_week: "Next Week",
		event_cat_this_month: "This Month",
		event_cat_next_month: "Next Month",
		event_cat_this_year: "This Year",
		event_cat_upcoming: "Upcoming",
		date_format_today: "MMM Do",
		date_format_tomorrow: "MMM Do",
		date_format_month: "MMM",
		date_format_month_year: "MMM YYYY",
		err_format_cannot_render: "Upcoming.js: Error. Cannot render to element '{0}'. Does this id exist?",
		err_format_config_id_invalid: "Upcoming.js: Error. Cannot render to element '{0}'. id not supported.",
		err_config_required: "Upcoming.js: Error. Cannot render without configuration.",
		when: "When",
		where: "Where",
		created_by: "Created By",
		description: "Description",
		link_symbol: ">",
		last: "placeholder"
	};

	function publicReset() {
		//reset so that the module closure doesn't get stuck with an out-of-date object
		resetObject(languages);
		feedIndex = 0;
		nextEvtId = 0;
		languages.EN = languages["EN-us"] = res;
		resetObject(instances);
		resetObject(feeds);
		resetObject(publicCallbacks);
	}
	
	function resetObject(obj) {
		for (var prop in obj) { 
			if (obj.hasOwnProperty(prop)) { 
				delete obj[prop]; 
			} 
		}
	}
	
	publicReset();

	function getNextEvtId()
	{
		return (nextEvtId++);
	}
		
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
		
		config.query = {};
		config.feeds = config.feeds || [];
		config.evts = config.evts || {};
		config.prog = config.prog || {};
		config.prog.bdr = config.prog.bdr || {};
		config.prog.bar = config.prog.bar || {};
		config.prog.lbl = config.prog.lbl || {};
		
		//prepare our query parameters for use
		
		//Always define max-results with a suitable default
		config.query.max_results = "&max-results="+encodeURIComponent(config.max_results || 5);
		
		//general query
		if ("q" in config) {
			config.query.q = "&q="+encodeURIComponent(config.q || "q");
		}
		
		//if category is explicitly specified, use it directly
		if ("category" in config) {
			config.query.category = "&category="+encodeURIComponent(config.category || "category");
		} 
		//otherwise look for an array and process 
		else if ("categories" in config) {
			//todo
		}
		
		//only include a specific author
		if ("author" in config) {
			config.query.author = "&author="+encodeURIComponent(config.author || "author");
		}
		
		if ("updated_min" in config) {			
			config.query.updated_min = "&updated-min="+
			toRFC3339(config.updated_min || "updated_min");
		}
		
		if ("updated_max" in config) {
			config.query.updated_max = "&updated-max="+
			toRFC3339(config.updated_max || "updated_max");
		}
		
		if ("published_min" in config) {
			config.query.published_min = "&published-min="+
			toRFC3339(config.published_min || "published_min");
		}
		
		if ("published_max" in config) {
			config.query.published_max = "&published-max="+
			toRFC3339(config.published_max || "published_max");
		}
		
		var iid = config.id || res.default_div_id;
		//Build our instance
		var instance = instances[iid] = {
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
					msgs: {}, 
					step: 0,
					steps: 0,
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
			evtCats: buildEvtCatsFrom(config.moment || moment()), //Our instance event categories, relative to either the supplied moment, or "now"
			getElementById: config.getElementById || 
				function(id) { //closure to prevent losing "this" of document
					return document.getElementById(id); },
			write: config.write ||
				function(exp) { //closure to prevent losing "this" of document
					document.write(exp); }
		};
		
		//Shortcut vars
		var ui = instance.ui;
		var prog = instance.ui.prog;
		var evts = instance.ui.evts;
		
		//specify known steps
		expectStep(instance, "init", res.prog_init);
		expectStep(instance, "sort", res.prog_sort);
		expectStep(instance, "render", res.prog_render);
		
		//Find root instance id
		ui.div = instance.getElementById(instance.id);
		if (ui.div === null) {
			formatError(res.err_format_cannot_render, instance.id);
			return;
		}
		
		ui.div.setAttribute('class', ui.css);

		//render the instance template
		renderToElement("upcoming_ui", ui, ui.div);
		
		prog.div = instance.getElementById(prog.id);
		if (prog.div === null) {
			formatError(res.err_format_cannot_render, prog.id);
			return null;
		}
		
		prog.lbl.div = instance.getElementById(prog.lbl.id);
		if (prog.lbl.div === null) {
			formatError(res.err_format_cannot_render, prog.lbl.id);
			return null;
		}
		
		prog.bar.div = instance.getElementById(prog.bar.id);
		if (prog.bar.div === null) {
			formatError(res.err_format_cannot_render, prog.bar.id);
			return null;
		}
		
		prog.bdr.div = instance.getElementById(prog.bdr.id);
		if (prog.bdr.div === null) {
			formatError(res.err_format_cannot_render, prog.bdr.id);
			return null;
		}
		
		evts.div = instance.getElementById(evts.id);
		if (evts.div === null) {
			formatError(res.err_format_cannot_render, evts.id);
			return null;
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
			expectStep(instance, feedInfo.id, format(res.prog_process_feed, i+1));
		
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
				instance.write("<script type='text/javascript' "+
					"src='"+ 
					feedInfo.uri + //already encoded
					buildQueryString(config, feed.callback) +
					"'></script>");
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
		
		//display the progress ui
		reportStep(instance, "init");
		return instance;
	}
	
	function toRFC3339(input) {
		if (input instanceof Date) {
			return moment(input).format("YYYY-MM-DDTHH:mm:ssZZ");
		}
		if (moment.isMoment(input)) {
			return input.format("YYYY-MM-DDTHH:mm:ssZZ");
		}
		return encodeURIComponent(value);
	}
	
	//Inject relevant query parameters: https://developers.google.com/gdata/docs/1.0/reference#Queries
	function buildQueryString(config, callback) {
		return "?alt=json-in-script&callback=upcoming.callbacks."+encodeURIComponent(callback)+
			"&singleevents=true"+
			"&sortorder=ascending"+
			"&futureevents=true"+
			"&orderby=starttime"+
			(config.query.q || "") + 
			(config.query.category || "") + 
			(config.query.author || "") + 
			(config.query.updated_min || "") + 
			(config.query.updated_max || "") + 
			(config.query.published_min || "") + 
			(config.query.published_max || "") + 
			(config.query.max_results || "");
	}
	
	//return a closure to handle an expected JSONP callback
	function makeFeedInstanceCallback(feedUri) {
		return function(root) {
			callback(root, feedUri);
		};
	}

	//Build context (template view model) for our passed event
	function buildEvtCtx(evt) {
		var 
			i,
			ctx = {
				createdBy: evt.author[0].name.$t || null,
				id: getNextEvtId()
			};
		
		//default a "when" context
		ctx.when = {};
		
		//process the "when" structure into the context
		if ("gd$when" in evt && 
			evt.gd$when instanceof Array &&
			evt.gd$when.length >= 1) {
			
			var evtWhen = evt.gd$when[0] || {};
			if ("startTime" in evtWhen) {
				ctx.when.start = xsDateTimeToMoment(evtWhen.startTime);
				//is it an "all day" event?
				ctx.when.allDay = evtWhen.startTime.length <= 10; //is there time specified? i.e: "1970-01-01" vs "1970-01-01T..."
			}
			if ("endTime" in evtWhen) {
				ctx.when.end = xsDateTimeToMoment(evtWhen.endTime);
				//is it still an "all day" event?
				ctx.when.allDay = 
					(ctx.when.allDay || true) && 
					evtWhen.endTime.length <= 10; //if the endTime has relevant hours, we shouldn't go "all day"
			}
		}
				
		//fallback on when data
		ctx.when.start = ctx.when.start || moment();
		ctx.when.end = ctx.when.end || ctx.when.start.add('d', 1);
		if (!("allDay" in ctx.when)) {
			ctx.when.allDay = true; 
		}
		
		//process the "where" structure into the context if it exists
		//https://developers.google.com/gdata/docs/1.0/elements#gdWhere
		if ("gd$where" in evt && evt.gd$where instanceof Array) {
			var evtWhereArray = evt.gd$where;
			if (evtWhereArray.length >= 1 &&
				"valueString" in evtWhereArray[0] &&
				evtWhereArray[0].valueString &&
				evtWhereArray[0].valueString.trim()) {
				ctx.where = publicToLinkSoup(evtWhereArray[0].valueString);
				//if we found no links (and only have one span), inject a maps link
				if (ctx.where.spans.length === 1) {
					ctx.where.spans[0].href = "http://maps.google.com/maps?hl=en&q="+encodeURI(evtWhereArray[0].valueString);
				}
			}
		}
		
		//process the "content" structure into the context's description (if it exists)
		if ("content" in evt && "$t" in evt.content) {
			ctx.description = publicToLinkSoup(evt.content.$t);
		}
					
		//process interesting links from the
		//atom structures:
		//http://tools.ietf.org/html/rfc4287#section-3.1.1
		ctx.href = null;
		for (i = 0; i < evt.link.length; i++) {
			if (evt.link[i].type == 'text/html') {
				if (evt.link[i].rel == 'alternate') {
					ctx.href = encodeURI(evt.link[i].href);
				}
				else if (evt.link[i].rel == "related") {
					ctx.related = ctx.related || [];
					ctx.related.push({text: evt.link[i].title || evt.link[i].href, href: evt.link[i].href});
				}
			}
		}
		
		//process the "content" structure into the context's description (if it exists)
		if ("title" in evt && "$t" in evt.title) {
			ctx.title = publicToLinkSoup(evt.title.$t);
			//if we found no links (and only have one span), inject the event link
			if (ctx.title.spans.length === 1) {
				ctx.title.spans[0].text += " ";
				ctx.title.spans.push({href: ctx.href, text: res.link_symbol });
			}
		}
		
		return ctx;
	}
	
	//Build contexts (template view models) for our passed events
	//uses: https://github.com/twitter/twitter-text-js
	function publicToLinkSoup(text) {
		var links = twttr.txt.extractUrlsWithIndices(text);
		/*Represented as
		[{
			url: url,
			indices: [startPosition, endPosition]
		}]*/
		var spans = [];
		
		function addTextSpan(textSpan) {
			spans.push({ text: textSpan });
		}
		
		function addLinkSpan(linkSpan) {
			spans.push({ text: linkSpan.url, href: linkSpan.url });
		}
		
		//No links found, all text
		if (links.length === 0) {
			spans.push({ text: text });
		}
		else {
			var firstLink = links[0],
				lastLink = links[links.length - 1];
			
			//Was there text before the first link?
			if (firstLink.indices[0] > 0) {
				
				addTextSpan(text.substring(0, firstLink.indices[0]));
			}
			//Handle single link
			if (links.length === 1) {
				addLinkSpan(firstLink);
			}
			else {
				//push the firstLink
				addLinkSpan(firstLink);
				var prevLink = firstLink;
			
				//loop from the second
				for (var i = 1; i<links.length; i++) {
					//is there text between?
					if (links[i].indices[0] - prevLink.indices[1] >= 1) {
						addTextSpan(text.substring(prevLink.indices[1], links[i].indices[0]));
					}
					//add link
					addLinkSpan(prevLink = links[i]);
				}
			}
			//Was there text after the links?
			if (lastLink.indices[1] < (text.length)) {
				spans.push({ text: text.substring(lastLink.indices[1])});
			}
		}
		return { spans: spans };
	}
	
	//Build contexts (template view models) for our passed events
	function buildEvtCtxs(entry) {
		var evtCtxs = [];
		if (entry !== null && typeof entry !== "undefined") {
			evtCtxs[entry.length-1] = null; //Resize once to hold new events
			for (var i = 0; i < entry.length; i++) {
				evtCtxs[i] = buildEvtCtx(entry[i]);
			}
		}
		return evtCtxs;
	}
	
	//full callback handler for gcal data
	function callback(root, feedUri) {
		var feed = feeds[feedUri];
		
		//capture data if we have not yet done so
		feed.evts = feed.evts || buildEvtCtxs(root.feed.entry);
		var instanceEvts, startIndex, entryCount, instance, feedInfo, evt, i, instanceId;
		
		//process every instance that is expecting this feed data
		for (instanceId in feed.expectedInstances) {
			feedInfo = feed.expectedInstances[instanceId];
			if (!(instanceId in instances)) {
				throw "could not find instance with id " + instanceId;
			}
			instance = instances[instanceId];
			
			//show processing of feed
			reportStep(instance, feedInfo.id);
			
			instanceEvts = instance.evts;
			startIndex = instanceEvts.length;
			entryCount = feed.evts.length;
			
			//make room for new events
			instanceEvts[startIndex + entryCount - 1] = null; 
			//then copy them over
			for (i = 0; i < entryCount; i++) {
				instanceEvts[startIndex+i] = feed.evts[i];
			}
			
			//instance should no longer expect this feed
			delete instance.expectedFeeds[feedInfo.uri];
			
			//feed should no longer expect this instance
			delete feed.expectedInstances[instanceId];
			
			//are we waiting for any more feeds?
			for(var prop in instance.expectedFeeds) {
				if (instance.expectedFeeds.hasOwnProperty(prop)) {
					return; //yes. procrastinate.
				}
			}
			renderEvts(instance);
			reportStep(instance, "render");
		}
	}
	
	function expectStep(instance, step, msg) {
		var ui = instance.ui.prog;
		ui.msgs[step] = msg;
		ui.steps++;
	}
	
	function reportStep(instance, step) {
		var ui = instance.ui.prog;
		//show progress ui
		if (ui.step === 0) {
			instance.ui.prog.div.style.display = "block";
		}
		var msg = ui.msgs[step];
		ui.step++;
		
		if (ui.step >= ui.steps) {
			//hide the ui
			instance.ui.prog.div.style.display = "none";
		}
		else {
			prog(ui, msg, 100.0 * ui.step / ui.steps);
		}
	}
	
	function prog(ui, msg, percentage) {
		if (percentage >= 0) {
			//ensure progress bar is visibile
			ui.bdr.div.style.display = "block";
			ui.bar.div.style.width = percentage+'%';
		}
		else {
			//hide progress bar
			ui.bdr.div.style.display = "none";
		}
		
		if (msg !== null) {
			ui.lbl.div.innerHtml = msg;
		}
	}

	//writes the events from our feeds to the display
	function renderEvts(instance) {
	
		//function to sort the events by date
		function sortEvt(a, b) {
			return a.when.start.diff(b.when.start);
		}
		
		var evts = instance.evts;
		evts.sort(sortEvt);
		
		
		var evtCats = instance.evtCats,
			evtCatIndex,
			evtCatStartIndex = 0,			
			evtIndex,
			evtCat, 
			evt;
		
		reportStep(instance, "sort");
		
		// partition events into categories
		for (evtIndex = 0; evtIndex < evts.length; evtIndex++) {
			evt = evts[evtIndex];
			
			for(evtCatIndex = evtCatStartIndex; evtCatIndex < evtCats.length; evtCatIndex++) {
				evtCat = evtCats[evtCatIndex];
			
				//whether or not the event can be within this category
				if (evtInCat(evt, evtCat)) {
					//since events and categories are sorted, we can skip categories that are no longer fruitful
					evtCatStartIndex = evtIndex;
					evtCat.formatEvt(evt);
					evtCat.evts.push(evt);
					break; //Get a new event
				}
			}
		}
		
		renderToElement("upcoming_evtcats", {res: res, evtCats: evtCats}, instance.ui.evts.div);
	}

	function evtInCat(evt, evtCat) {
		if (evtCat.start === null && evtCat.end === null) {
			return false;
		}
		
		var afterStart = evtCat.start.diff(evt.when.start) <= 0;
		var beforeEnd = evtCat.end.diff(evt.when.start) > 0;
		
		return afterStart && beforeEnd;
	}
	
	function buildEvtCatsFrom(ctx) {
		var 
			sod = moment(ctx).sod(), //Start of day
			eod = moment(ctx).eod(), //End of day
			sot = moment(ctx).eod(), //Start of tomorrow
			eot = moment(ctx).eod().add("day", 1), //End of tomorrow
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
	
		function formatEvt(evt, showDate) {
			evt.twix = new Twix(evt.when.start, evt.when.end, evt.when.allDay),
			evt.duration = evt.twix.duration();
			evt.subtitle = evt.twix.format({showDate: showDate});
		}
		
		function defaultFormatEvt(evt) {
			formatEvt(evt, true);
		}
		
		function noDateFormatEvt(evt) {
			formatEvt(evt, false);
		}
	
		return [
			{//today
				start: sod,
				end: eod,
				div: null,
				evts: [],
				caption: res.event_cat_today,
				range: sod.format(res.date_format_today),
				formatEvt: noDateFormatEvt
			}, 
			{//tomorrow
				start: sot,
				end: eot,
				div: null,
				evts: [],
				caption: res.event_cat_tomorrow,
				range: sot.format(res.date_format_tomorrow),
				formatEvt: noDateFormatEvt
			}, 
			{//week
				start: sow,
				end: eow,
				div: null,
				evts: [],
				caption: res.event_cat_this_week,
				range: new Twix(sow, eow, true).format(),
				formatEvt: defaultFormatEvt
			},	
			{//nextWeek
				start: snw,
				end: enw,
				div: null,
				evts: [],
				caption: res.event_cat_next_week,
				range: new Twix(snw, enw, true).format(),
				formatEvt: defaultFormatEvt
			}, 
			{//month
				start: som,
				end: eom,
				div: null,
				evts: [],
				caption: res.event_cat_this_month,
				range: som.format(res.date_format_month),
				formatEvt: defaultFormatEvt
			}, 
			{//nextMonth
				start: snm,
				end: enm,
				div: null,
				evts: [],
				caption: res.event_cat_next_month,
				range: (sod.year() === snm.year()) ? snm.format(res.date_format_month) : snm.format(res.date_format_month_year),
				formatEvt: defaultFormatEvt
			}, 
			{//year
				start: soy,
				end: eoy,
				div: null,
				evts: [],
				caption: res.event_cat_this_year,
				range: soy.format('YYYY'),
				formatEvt: defaultFormatEvt
			}, 
			{//upcoming
				start: null,
				end: null,
				div: null,
				evts: [],
				caption: res.event_cat_upcoming,
				range: null,
				formatEvt: defaultFormatEvt
			}
		];
	}
	
	function isSimpleId(value) {
		//HTML id is: [A-Za-z][A-Za-z0-9_:.]*, but we allow a subset:
		var rx = /[A-Za-z][A-Za-z0-9_:.]*/;
		return rx.test(value);
	}

	function publicToggleEvtDetail(id) {
		var evtDiv, evtLink;
		evtDiv = document.getElementById("evt_dtl_" + id);
		evtLink = document.getElementById("evt_tgl_" + id);
		if (evtDiv.style.display == 'none') {
			evtDiv.style.display = 'block';
			evtLink.innerHTML = "&minus;";
		}
		else if (evtDiv.style.display == 'block') {
			evtDiv.style.display ='none';
			evtLink.innerHTML = "+";
		}
	}

	//Converts an xs:date or xs:dateTime formatted string into the local timezone
	//and outputs a human-readable form of this date or date/time.
	//@param {string} gCalTime is the xs:date or xs:dateTime formatted string
	//@return {string} is the human-readable date or date/time string
	function xsDateTimeToMoment(gCalTime) { 
		// text for regex matches
		var remtxt = gCalTime;
		
		if (typeof gCalTime === 'undefined')
			return gCalTime; //return undefined

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
		toggleEvtDetail: publicToggleEvtDetail,
		callbacks: publicCallbacks,
		test: {
			reset: publicReset,
			toLinkSoup: publicToLinkSoup
		}
	};
}();
