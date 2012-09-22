var upcoming = function()
    {
        function makeEmptyFunc()
        {
            return function(){}
        }
        function renderToElement(template, ctx, el)
        {
            dust.render(template, ctx, function(err, out)
            {
                if (err !== null)
                    error(err);
                else
                    el.innerHTML = out
            })
        }
        if (!window.console)
            (function()
            {
                var names = ["log", "debug", "info", "warn", "error", "assert", "dir", "dirxml", "group", "groupEnd", "time", "timeEnd", "count", "trace", "profile", "profileEnd"];
                window.console = {};
                for (var i = 0; i < names.length; ++i)
                    window.console[names[i]] = makeEmptyFunc()
            })();
        var languages = {},
            feedIndex = 0,
            nextEvtId = 0;
        var res = {
                default_div_id: "upcoming",
                prog_init: "Initializing...",
                prog_process_feed: "Processing Feed {0}...",
                prog_sort: "Sorting Events...",
                prog_render: "Rendering Events...",
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
        var instances = {},
            feeds = {},
            publicCallbacks = {};
        function getNextEvtId()
        {
            return nextEvtId++
        }
        function format()
        {
            var s = arguments[0];
            for (var i = 0; i < arguments.length - 1; i++)
            {
                var reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i + 1])
            }
            return s
        }
        function formatError()
        {
            error(format.apply(this, arguments))
        }
        function error(msg)
        {
            alert(msg)
        }
        function publicRender(config)
        {
            if (config === null)
            {
                error(res.err_config_required);
                return
            }
            if (!isSimpleId(config.id))
            {
                formatError(res.err_format_config_id_invalid, config.id);
                return
            }
            config = config || {
                id: null,
                evts: null,
                prog: null
            };
            config.evts = config.evts || {};
            config.prog = config.prog || {};
            config.prog.bdr = config.prog.bdr || {};
            config.prog.bar = config.prog.bar || {};
            config.prog.lbl = config.prog.lbl || {};
            var iid = config.id || res.default_div_id;
            var instance = instances[config.id] = {
                    id: iid,
                    max_results: config.max_results || 5,
                    expectedFeeds: [],
                    ui: {
                        div: null,
                        css: config.css || "upcoming",
                        prog: {
                            id: iid + (config.prog.idSuffix || "_prog"),
                            div: null,
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
                        evts: {
                            id: iid + (config.prog.idSuffix || "_evts"),
                            div: null,
                            css: config.evts.css || "evts"
                        }
                    },
                    evts: [],
                    evtCats: buildEvtCatsFrom(moment())
                };
            var ui = instance.ui;
            var prog = instance.ui.prog;
            var evts = instance.ui.evts;
            expectStep(instance, "init", res.prog_init);
            expectStep(instance, "sort", res.prog_sort);
            expectStep(instance, "render", res.prog_render);
            ui.div = document.getElementById(instance.id);
            if (ui.div === null)
            {
                formatError(res.err_format_cannot_render, instance.id);
                return
            }
            ui.div.setAttribute('class', ui.css);
            renderToElement("upcoming_ui", ui, ui.div);
            prog.div = document.getElementById(prog.id);
            if (prog.div === null)
            {
                formatError(res.err_format_cannot_render, prog.id);
                return
            }
            prog.lbl.div = document.getElementById(prog.lbl.id);
            if (prog.lbl.div === null)
            {
                formatError(res.err_format_cannot_render, prog.lbl.id);
                return
            }
            prog.bar.div = document.getElementById(prog.bar.id);
            if (prog.bar.div === null)
            {
                formatError(res.err_format_cannot_render, prog.bar.id);
                return
            }
            prog.bdr.div = document.getElementById(prog.bdr.id);
            if (prog.bdr.div === null)
            {
                formatError(res.err_format_cannot_render, prog.bdr.id);
                return
            }
            evts.div = document.getElementById(evts.id);
            if (evts.div === null)
            {
                formatError(res.err_format_cannot_render, evts.id);
                return
            }
            var i,
                feedInfo,
                feed;
            for (i = 0; i < config.feeds.length; i++)
            {
                feedInfo = {
                    id: config.feeds[i] + "_" + instance.id,
                    feed: config.feeds[i],
                    instance: instance.id,
                    uri: "http://www.google.com/calendar/feeds/" + encodeURIComponent(config.feeds[i]) + "/public/full"
                };
                instance.expectedFeeds[feedInfo.uri] = feedInfo;
                expectStep(instance, feedInfo.id, format(res.prog_process_feed, i + 1));
                if (!(feedInfo.uri in feeds))
                {
                    feedIndex++;
                    feed = feeds[feedInfo.uri] = {
                        data: null,
                        expectedInstances: {},
                        callback: "feed" + feedIndex
                    };
                    publicCallbacks[feed.callback] = makeFeedInstanceCallback(feedInfo.uri);
                    feed.expectedInstances[instance.id] = feedInfo;
                    document.write("<script type='text/javascript' " + "src='" + feedInfo.uri + "?alt=json-in-script&callback=upcoming.callbacks." + encodeURIComponent(feed.callback) + "&orderby=starttime" + "&max-results=" + encodeURIComponent(instance.max_results) + "&singleevents=true&sortorder=ascending&futureevents=true'></script>")
                }
                else
                {
                    feed = feeds[feedInfo.uri];
                    feed.expectedInstances[instance.id] = feedInfo;
                    if (feed.data !== null)
                        callback(null, feedInfo.uri)
                }
            }
            reportStep(instance, "init")
        }
        function makeFeedInstanceCallback(feedUri)
        {
            return function(root)
                {
                    callback(root, feedUri)
                }
        }
        function buildEvtCtx(evt)
        {
            var i,
                ctx = {
                    title: evt.title.$t || null,
                    where: evt.gd$where[0].valueString || null,
                    description: evt.content.$t || null,
                    startMoment: xsDateTimeToMoment(evt.gd$when[0].startTime) || moment(),
                    startTime: evt.gd$when[0].startTime,
                    endMoment: xsDateTimeToMoment(evt.gd$when[0].endTime) || moment(evt.startMoment),
                    endTime: evt.gd$when[0].endTime,
                    createdBy: evt.author[0].name.$t || null,
                    id: getNextEvtId()
                };
            ctx.duration = moment.duration(ctx.endMoment.diff(ctx.startMoment));
            if (isUrl(ctx.where))
                ctx.whereHref = ctx.where;
            else
                ctx.whereHref = "http://maps.google.com/maps?hl=en&q=" + encodeURI(ctx.where);
            ctx.href = null;
            for (i = 0; i < evt.link.length; i++)
                if (evt.link[i].type == 'text/html' && evt.link[i].type == 'alternate')
                    ctx.href = encodeURI(evt.link[i].href);
            if (isUrl(ctx.title))
                ctx.titleHref = ctx.title;
            else
                ctx.titleHref = ctx.href;
            if (ctx.duration.asMilliseconds() === 0)
                ctx.when = ctx.startMoment.calendar();
            else
                ctx.when = ctx.startMoment.calendar() + " - " + ctx.duration.humanize();
            return ctx
        }
        function buildEvtCtxs(entry)
        {
            var evtCtxs = [];
            if (entry !== null)
            {
                evtCtxs[entry.length - 1] = null;
                for (var i = 0; i < entry.length; i++)
                    evtCtxs[i] = buildEvtCtx(entry[i])
            }
            return evtCtxs
        }
        function callback(root, feedUri)
        {
            var feed = feeds[feedUri];
            feed.evts = feed.evts || buildEvtCtxs(root.feed.entry);
            var instanceEvts,
                startIndex,
                entryCount,
                instance,
                feedInfo,
                evt,
                i,
                instanceId;
            for (instanceId in feed.expectedInstances)
            {
                feedInfo = feed.expectedInstances[instanceId];
                instance = instances[feedInfo.instance];
                reportStep(instance, feedInfo.id);
                instanceEvts = instance.evts;
                startIndex = instanceEvts.length;
                entryCount = feed.evts.length;
                instanceEvts[startIndex + entryCount - 1] = null;
                for (i = 0; i < entryCount; i++)
                    instanceEvts[startIndex + i] = feed.evts[i];
                delete instance.expectedFeeds[feedInfo.uri];
                delete feed.expectedInstances[instanceId];
                for (var prop in instance.expectedFeeds)
                    if (instance.expectedFeeds.hasOwnProperty(prop))
                        return;
                renderEvts(instance);
                reportStep(instance, "render")
            }
        }
        function expectStep(instance, step, msg)
        {
            var ui = instance.ui.prog;
            ui.msgs[step] = msg;
            ui.steps++
        }
        function reportStep(instance, step)
        {
            var ui = instance.ui.prog;
            if (ui.step === 0)
                instance.ui.prog.div.style.display = "block";
            var msg = ui.msgs[step];
            ui.step++;
            if (ui.step >= ui.steps)
                instance.ui.prog.div.style.display = "none";
            else
                prog(ui, msg, 100.0 * ui.step / ui.steps)
        }
        function prog(ui, msg, percentage)
        {
            if (percentage >= 0)
            {
                ui.bdr.div.style.display = "block";
                ui.bar.div.style.width = percentage + '%'
            }
            else
                ui.bdr.div.style.display = "none";
            if (msg !== null)
                ui.lbl.div.innerHtml = msg
        }
        function renderEvts(instance)
        {
            function sortEvt(a, b)
            {
                return a.startMoment.diff(b.startMoment)
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
            for (evtIndex = 0; evtIndex < evts.length; evtIndex++)
            {
                evt = evts[evtIndex];
                for (evtCatIndex = evtCatStartIndex; evtCatIndex < evtCats.length; evtCatIndex++)
                {
                    evtCat = evtCats[evtCatIndex];
                    if (evtInCat(evt, evtCat))
                    {
                        evtCatStartIndex = evtIndex;
                        evtCat.evts.push(evt);
                        break
                    }
                }
            }
            renderToElement("upcoming_evtcats", {
                res: res,
                evtCats: evtCats
            }, instance.ui.evts.div)
        }
        function evtInCat(evt, evtCat)
        {
            if (evtCat.start === null && evtCat.end === null)
                return false;
            var afterStart = evtCat.start.diff(evt.startMoment) <= 0;
            var beforeEnd = evtCat.end.diff(evt.startMoment) > 0;
            return afterStart && beforeEnd
        }
        function buildWeekRange(week)
        {
            week.startMonth = week.start.format('MMM') + " ";
            week.endMonth = week.end.format('MMM') + " ";
            if (week.startMonth === week.endMonth)
                week.range = week.startMonth + week.start.format('Do') + " - " + week.end.format('Do');
            else
                week.range = week.startMonth + week.start.format('Do') + " - " + week.endMonth + week.end.format('Do');
            return week
        }
        function buildEvtCatsFrom(ctx)
        {
            var sod = moment(ctx).sod(),
                eod = moment(ctx).eod(),
                sow = moment(sod).subtract("days", sod.day()),
                eow = moment(sow).add("weeks", 1),
                snw = moment(eow),
                enw = moment(snw).add("week", 1),
                som = moment(ctx).startOf('month'),
                eom = moment(som).add("months", 1),
                snm = moment(eom),
                enm = moment(snm).add("months", 1),
                soy = moment(ctx).startOf("year"),
                eoy = moment(ctx).endOf("year");
            return [{
                        start: sod,
                        end: eod,
                        div: null,
                        evts: [],
                        dateFormat: res.time_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_today,
                        range: sod.format(res.date_format)
                    }, buildWeekRange({
                        start: sow,
                        end: eow,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_this_week
                    }), buildWeekRange({
                        start: snw,
                        end: enw,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_next_week
                    }), {
                        start: som,
                        end: eom,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_this_month,
                        range: som.format('MMM YYYY')
                    }, {
                        start: snm,
                        end: enm,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_next_month,
                        range: snm.format('MMM YYYY')
                    }, {
                        start: soy,
                        end: eoy,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_this_year,
                        range: soy.format('YYYY')
                    }, {
                        start: null,
                        end: null,
                        div: null,
                        evts: [],
                        dateFormat: res.date_format,
                        timeFormat: res.time_format,
                        multiDateFormat: res.date_format,
                        caption: res.event_cat_upcoming,
                        range: ""
                    }]
        }
        function isUrl(value)
        {
            var rx = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-\/]))?/;
            return rx.test(value)
        }
        function isSimpleId(value)
        {
            var rx = /[A-Za-z][A-Za-z0-9_:.]*/;
            return rx.test(value)
        }
        function publicToggleEvtDetail(id)
        {
            var evtDiv,
                evtLink;
            evtDiv = document.getElementById("evt_dtl_" + id);
            evtLink = document.getElementById("evt_tgl_" + id);
            if (evtDiv.style.display == 'none')
            {
                evtDiv.style.display = 'block';
                evtLink.innerHTML = "&minus;"
            }
            else if (evtDiv.style.display == 'block')
            {
                evtDiv.style.display = 'none';
                evtLink.innerHTML = "+"
            }
        }
        function xsDateTimeToMoment(gCalTime)
        {
            var remtxt = gCalTime;
            if (typeof gCalTime === 'undefined')
                return gCalTime;
            function consume(retxt)
            {
                var match = remtxt.match(new RegExp('^' + retxt));
                if (match)
                {
                    remtxt = remtxt.substring(match[0].length);
                    return match[0]
                }
                return ''
            }
            var totalCorrMins = 0;
            var year = consume('\\d{4}');
            consume('-?');
            var month = consume('\\d{2}');
            consume('-?');
            var dateMonth = consume('\\d{2}');
            var timeOrNot = consume('T');
            var hours = 0;
            var mins = 0;
            if (timeOrNot == 'T')
            {
                hours = consume('\\d{2}');
                consume(':?');
                mins = consume('\\d{2}');
                consume('(:\\d{2})?(\\.\\d{3})?');
                var zuluOrNot = consume('Z');
                if (zuluOrNot != 'Z')
                {
                    var corrPlusMinus = consume('[\\+\\-]');
                    if (corrPlusMinus !== '')
                    {
                        var corrHours = consume('\\d{2}');
                        consume(':?');
                        var corrMins = consume('\\d{2}');
                        totalCorrMins = (corrPlusMinus === '-' ? 1 : -1) * (Number(corrHours) * 60 + (corrMins === '' ? 0 : Number(corrMins)))
                    }
                }
            }
            var ld = new Date(year, month - 1, dateMonth, hours, mins);
            return moment(ld)
        }
        return {
                render: publicRender,
                toggleEvtDetail: publicToggleEvtDetail,
                callbacks: publicCallbacks
            }
    }()
