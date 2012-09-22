(function(Date, undefined)
{
    var moment,
        VERSION = "1.7.0",
        round = Math.round,
        i,
        languages = {},
        currentLanguage = 'en',
        hasModule = typeof module !== 'undefined' && module.exports,
        langConfigProperties = 'months|monthsShort|weekdays|weekdaysShort|weekdaysMin|longDateFormat|calendar|relativeTime|ordinal|meridiem'.split('|'),
        aspNetJsonRegex = /^\/?Date\((\-?\d+)/i,
        formattingTokens = /(\[[^\[]*\])|(\\)?(Mo|MM?M?M?|Do|DDDo|DD?D?D?|ddd?d?|do?|w[o|w]?|YYYY|YY|a|A|hh?|HH?|mm?|ss?|SS?S?|zz?|ZZ?)/g,
        localFormattingTokens = /(LT|LL?L?L?)/g,
        formattingRemoveEscapes = /(^\[)|(\\)|\]$/g,
        parseMultipleFormatChunker = /([0-9a-zA-Z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+)/gi,
        parseTokenOneOrTwoDigits = /\d\d?/,
        parseTokenOneToThreeDigits = /\d{1,3}/,
        parseTokenThreeDigits = /\d{3}/,
        parseTokenFourDigits = /\d{1,4}/,
        parseTokenWord = /[0-9a-z\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]+/i,
        parseTokenTimezone = /Z|[\+\-]\d\d:?\d\d/i,
        parseTokenT = /T/i,
        isoRegex = /^\s*\d{4}-\d\d-\d\d(T(\d\d(:\d\d(:\d\d(\.\d\d?\d?)?)?)?)?([\+\-]\d\d:?\d\d)?)?/,
        isoFormat = 'YYYY-MM-DDTHH:mm:ssZ',
        isoTimes = [['HH:mm:ss.S', /T\d\d:\d\d:\d\d\.\d{1,3}/], ['HH:mm:ss', /T\d\d:\d\d:\d\d/], ['HH:mm', /T\d\d:\d\d/], ['HH', /T\d\d/]],
        parseTimezoneChunker = /([\+\-]|\d\d)/gi,
        proxyGettersAndSetters = 'Month|Date|Hours|Minutes|Seconds|Milliseconds'.split('|'),
        unitMillisecondFactors = {
            Milliseconds: 1,
            Seconds: 1e3,
            Minutes: 6e4,
            Hours: 36e5,
            Days: 864e5,
            Months: 2592e6,
            Years: 31536e6
        },
        formatFunctions = {},
        formatFunctionStrings = {
            M: '(a=t.month()+1)',
            MMM: 'v("monthsShort",t.month())',
            MMMM: 'v("months",t.month())',
            D: '(a=t.date())',
            DDD: '(a=new Date(t.year(),t.month(),t.date()),b=new Date(t.year(),0,1),a=~~(((a-b)/864e5)+1.5))',
            d: '(a=t.day())',
            dd: 'v("weekdaysMin",t.day())',
            ddd: 'v("weekdaysShort",t.day())',
            dddd: 'v("weekdays",t.day())',
            w: '(a=new Date(t.year(),t.month(),t.date()-t.day()+5),b=new Date(a.getFullYear(),0,4),a=~~((a-b)/864e5/7+1.5))',
            YY: 'p(t.year()%100,2)',
            YYYY: 'p(t.year(),4)',
            a: 'm(t.hours(),t.minutes(),!0)',
            A: 'm(t.hours(),t.minutes(),!1)',
            H: 't.hours()',
            h: 't.hours()%12||12',
            m: 't.minutes()',
            s: 't.seconds()',
            S: '~~(t.milliseconds()/100)',
            SS: 'p(~~(t.milliseconds()/10),2)',
            SSS: 'p(t.milliseconds(),3)',
            Z: '((a=-t.zone())<0?((a=-a),"-"):"+")+p(~~(a/60),2)+":"+p(~~a%60,2)',
            ZZ: '((a=-t.zone())<0?((a=-a),"-"):"+")+p(~~(10*a/6),4)'
        },
        ordinalizeTokens = 'DDD w M D d'.split(' '),
        paddedTokens = 'M D H h m s w'.split(' ');
    while (ordinalizeTokens.length)
    {
        i = ordinalizeTokens.pop();
        formatFunctionStrings[i + 'o'] = formatFunctionStrings[i] + '+o(a)'
    }
    while (paddedTokens.length)
    {
        i = paddedTokens.pop();
        formatFunctionStrings[i + i] = 'p(' + formatFunctionStrings[i] + ',2)'
    }
    formatFunctionStrings.DDDD = 'p(' + formatFunctionStrings.DDD + ',3)';
    function Moment(date, isUTC, lang)
    {
        this._d = date;
        this._isUTC = !!isUTC;
        this._a = date._a || null;
        date._a = null;
        this._lang = lang || false
    }
    function Duration(duration)
    {
        var data = this._data = {},
            years = duration.years || duration.y || 0,
            months = duration.months || duration.M || 0,
            weeks = duration.weeks || duration.w || 0,
            days = duration.days || duration.d || 0,
            hours = duration.hours || duration.h || 0,
            minutes = duration.minutes || duration.m || 0,
            seconds = duration.seconds || duration.s || 0,
            milliseconds = duration.milliseconds || duration.ms || 0;
        this._milliseconds = milliseconds + seconds * 1e3 + minutes * 6e4 + hours * 36e5;
        this._days = days + weeks * 7;
        this._months = months + years * 12;
        data.milliseconds = milliseconds % 1000;
        seconds += absRound(milliseconds / 1000);
        data.seconds = seconds % 60;
        minutes += absRound(seconds / 60);
        data.minutes = minutes % 60;
        hours += absRound(minutes / 60);
        data.hours = hours % 24;
        days += absRound(hours / 24);
        days += weeks * 7;
        data.days = days % 30;
        months += absRound(days / 30);
        data.months = months % 12;
        years += absRound(months / 12);
        data.years = years;
        this._lang = false
    }
    function absRound(number)
    {
        if (number < 0)
            return Math.ceil(number);
        else
            return Math.floor(number)
    }
    function leftZeroFill(number, targetLength)
    {
        var output = number + '';
        while (output.length < targetLength)
            output = '0' + output;
        return output
    }
    function addOrSubtractDurationFromMoment(mom, duration, isAdding)
    {
        var ms = duration._milliseconds,
            d = duration._days,
            M = duration._months,
            currentDate;
        if (ms)
            mom._d.setTime(+mom + ms * isAdding);
        if (d)
            mom.date(mom.date() + d * isAdding);
        if (M)
        {
            currentDate = mom.date();
            mom.date(1).month(mom.month() + M * isAdding).date(Math.min(currentDate, mom.daysInMonth()))
        }
    }
    function isArray(input)
    {
        return Object.prototype.toString.call(input) === '[object Array]'
    }
    function compareArrays(array1, array2)
    {
        var len = Math.min(array1.length, array2.length),
            lengthDiff = Math.abs(array1.length - array2.length),
            diffs = 0,
            i;
        for (i = 0; i < len; i++)
            if (~~array1[i] !== ~~array2[i])
                diffs++;
        return diffs + lengthDiff
    }
    function dateFromArray(input, asUTC)
    {
        var i,
            date;
        for (i = 1; i < 7; i++)
            input[i] = input[i] == null ? i === 2 ? 1 : 0 : input[i];
        input[7] = asUTC;
        date = new Date(0);
        if (asUTC)
        {
            date.setUTCFullYear(input[0], input[1], input[2]);
            date.setUTCHours(input[3], input[4], input[5], input[6])
        }
        else
        {
            date.setFullYear(input[0], input[1], input[2]);
            date.setHours(input[3], input[4], input[5], input[6])
        }
        date._a = input;
        return date
    }
    function loadLang(key, values)
    {
        var i,
            m,
            parse = [];
        if (!values && hasModule)
            values = require('./lang/' + key);
        for (i = 0; i < langConfigProperties.length; i++)
            values[langConfigProperties[i]] = values[langConfigProperties[i]] || languages.en[langConfigProperties[i]];
        for (i = 0; i < 12; i++)
        {
            m = moment([2000, i]);
            parse[i] = new RegExp('^' + (values.months[i] || values.months(m, '')) + '|^' + (values.monthsShort[i] || values.monthsShort(m, '')).replace('.', ''), 'i')
        }
        values.monthsParse = values.monthsParse || parse;
        languages[key] = values;
        return values
    }
    function getLangDefinition(m)
    {
        var langKey = typeof m === 'string' && m || m && m._lang || null;
        return langKey ? languages[langKey] || loadLang(langKey) : moment
    }
    function replaceFormatTokens(token)
    {
        return formatFunctionStrings[token] ? "'+(" + formatFunctionStrings[token] + ")+'" : token.replace(formattingRemoveEscapes, "").replace(/\\?'/g, "\\'")
    }
    function replaceLongDateFormatTokens(input)
    {
        return getLangDefinition().longDateFormat[input] || input
    }
    function makeFormatFunction(format)
    {
        var output = "var a,b;return '" + format.replace(formattingTokens, replaceFormatTokens) + "';",
            Fn = Function;
        return new Fn('t', 'v', 'o', 'p', 'm', output)
    }
    function makeOrGetFormatFunction(format)
    {
        if (!formatFunctions[format])
            formatFunctions[format] = makeFormatFunction(format);
        return formatFunctions[format]
    }
    function formatMoment(m, format)
    {
        var lang = getLangDefinition(m);
        function getValueFromArray(key, index)
        {
            return lang[key].call ? lang[key](m, format) : lang[key][index]
        }
        while (localFormattingTokens.test(format))
            format = format.replace(localFormattingTokens, replaceLongDateFormatTokens);
        if (!formatFunctions[format])
            formatFunctions[format] = makeFormatFunction(format);
        return formatFunctions[format](m, getValueFromArray, lang.ordinal, leftZeroFill, lang.meridiem)
    }
    function getParseRegexForToken(token)
    {
        switch (token)
        {
            case'DDDD':
                return parseTokenThreeDigits;
            case'YYYY':
                return parseTokenFourDigits;
            case'S':
            case'SS':
            case'SSS':
            case'DDD':
                return parseTokenOneToThreeDigits;
            case'MMM':
            case'MMMM':
            case'dd':
            case'ddd':
            case'dddd':
            case'a':
            case'A':
                return parseTokenWord;
            case'Z':
            case'ZZ':
                return parseTokenTimezone;
            case'T':
                return parseTokenT;
            case'MM':
            case'DD':
            case'YY':
            case'HH':
            case'hh':
            case'mm':
            case'ss':
            case'M':
            case'D':
            case'd':
            case'H':
            case'h':
            case'm':
            case's':
                return parseTokenOneOrTwoDigits;
            default:
                return new RegExp(token.replace('\\', ''))
        }
    }
    function addTimeToArrayFromToken(token, input, datePartArray, config)
    {
        var a;
        switch (token)
        {
            case'M':
            case'MM':
                datePartArray[1] = input == null ? 0 : ~~input - 1;
                break;
            case'MMM':
            case'MMMM':
                for (a = 0; a < 12; a++)
                    if (getLangDefinition().monthsParse[a].test(input))
                    {
                        datePartArray[1] = a;
                        break
                    }
                break;
            case'D':
            case'DD':
            case'DDD':
            case'DDDD':
                if (input != null)
                    datePartArray[2] = ~~input;
                break;
            case'YY':
                input = ~~input;
                datePartArray[0] = input + (input > 70 ? 1900 : 2000);
                break;
            case'YYYY':
                datePartArray[0] = ~~Math.abs(input);
                break;
            case'a':
            case'A':
                config.isPm = (input + '').toLowerCase() === 'pm';
                break;
            case'H':
            case'HH':
            case'h':
            case'hh':
                datePartArray[3] = ~~input;
                break;
            case'm':
            case'mm':
                datePartArray[4] = ~~input;
                break;
            case's':
            case'ss':
                datePartArray[5] = ~~input;
                break;
            case'S':
            case'SS':
            case'SSS':
                datePartArray[6] = ~~(('0.' + input) * 1000);
                break;
            case'Z':
            case'ZZ':
                config.isUTC = true;
                a = (input + '').match(parseTimezoneChunker);
                if (a && a[1])
                    config.tzh = ~~a[1];
                if (a && a[2])
                    config.tzm = ~~a[2];
                if (a && a[0] === '+')
                {
                    config.tzh = -config.tzh;
                    config.tzm = -config.tzm
                }
                break
        }
    }
    function makeDateFromStringAndFormat(string, format)
    {
        var datePartArray = [0, 0, 1, 0, 0, 0, 0],
            config = {
                tzh: 0,
                tzm: 0
            },
            tokens = format.match(formattingTokens),
            i,
            parsedInput;
        for (i = 0; i < tokens.length; i++)
        {
            parsedInput = (getParseRegexForToken(tokens[i]).exec(string) || [])[0];
            string = string.replace(getParseRegexForToken(tokens[i]), '');
            addTimeToArrayFromToken(tokens[i], parsedInput, datePartArray, config)
        }
        if (config.isPm && datePartArray[3] < 12)
            datePartArray[3] += 12;
        if (config.isPm === false && datePartArray[3] === 12)
            datePartArray[3] = 0;
        datePartArray[3] += config.tzh;
        datePartArray[4] += config.tzm;
        return dateFromArray(datePartArray, config.isUTC)
    }
    function makeDateFromStringAndArray(string, formats)
    {
        var output,
            inputParts = string.match(parseMultipleFormatChunker) || [],
            formattedInputParts,
            scoreToBeat = 99,
            i,
            currentDate,
            currentScore;
        for (i = 0; i < formats.length; i++)
        {
            currentDate = makeDateFromStringAndFormat(string, formats[i]);
            formattedInputParts = formatMoment(new Moment(currentDate), formats[i]).match(parseMultipleFormatChunker) || [];
            currentScore = compareArrays(inputParts, formattedInputParts);
            if (currentScore < scoreToBeat)
            {
                scoreToBeat = currentScore;
                output = currentDate
            }
        }
        return output
    }
    function makeDateFromString(string)
    {
        var format = 'YYYY-MM-DDT',
            i;
        if (isoRegex.exec(string))
        {
            for (i = 0; i < 4; i++)
                if (isoTimes[i][1].exec(string))
                {
                    format += isoTimes[i][0];
                    break
                }
            return parseTokenTimezone.exec(string) ? makeDateFromStringAndFormat(string, format + ' Z') : makeDateFromStringAndFormat(string, format)
        }
        return new Date(string)
    }
    function substituteTimeAgo(string, number, withoutSuffix, isFuture, lang)
    {
        var rt = lang.relativeTime[string];
        return typeof rt === 'function' ? rt(number || 1, !!withoutSuffix, string, isFuture) : rt.replace(/%d/i, number || 1)
    }
    function relativeTime(milliseconds, withoutSuffix, lang)
    {
        var seconds = round(Math.abs(milliseconds) / 1000),
            minutes = round(seconds / 60),
            hours = round(minutes / 60),
            days = round(hours / 24),
            years = round(days / 365),
            args = seconds < 45 && ['s', seconds] || minutes === 1 && ['m'] || minutes < 45 && ['mm', minutes] || hours === 1 && ['h'] || hours < 22 && ['hh', hours] || days === 1 && ['d'] || days <= 25 && ['dd', days] || days <= 45 && ['M'] || days < 345 && ['MM', round(days / 30)] || years === 1 && ['y'] || ['yy', years];
        args[2] = withoutSuffix;
        args[3] = milliseconds > 0;
        args[4] = lang;
        return substituteTimeAgo.apply({}, args)
    }
    moment = function(input, format)
    {
        if (input === null || input === '')
            return null;
        var date,
            matched;
        if (moment.isMoment(input))
            return new Moment(new Date(+input._d), input._isUTC, input._lang);
        else if (format)
            if (isArray(format))
                date = makeDateFromStringAndArray(input, format);
            else
                date = makeDateFromStringAndFormat(input, format);
        else
        {
            matched = aspNetJsonRegex.exec(input);
            date = input === undefined ? new Date : matched ? new Date(+matched[1]) : input instanceof Date ? input : isArray(input) ? dateFromArray(input) : typeof input === 'string' ? makeDateFromString(input) : new Date(input)
        }
        return new Moment(date)
    };
    moment.utc = function(input, format)
    {
        if (isArray(input))
            return new Moment(dateFromArray(input, true), true);
        if (typeof input === 'string' && !parseTokenTimezone.exec(input))
        {
            input += ' +0000';
            if (format)
                format += ' Z'
        }
        return moment(input, format).utc()
    };
    moment.unix = function(input)
    {
        return moment(input * 1000)
    };
    moment.duration = function(input, key)
    {
        var isDuration = moment.isDuration(input),
            isNumber = typeof input === 'number',
            duration = isDuration ? input._data : isNumber ? {} : input,
            ret;
        if (isNumber)
            if (key)
                duration[key] = input;
            else
                duration.milliseconds = input;
        ret = new Duration(duration);
        if (isDuration)
            ret._lang = input._lang;
        return ret
    };
    moment.humanizeDuration = function(num, type, withSuffix)
    {
        return moment.duration(num, type === true ? null : type).humanize(type === true ? true : withSuffix)
    };
    moment.version = VERSION;
    moment.defaultFormat = isoFormat;
    moment.lang = function(key, values)
    {
        var i;
        if (!key)
            return currentLanguage;
        if (values || !languages[key])
            loadLang(key, values);
        if (languages[key])
        {
            for (i = 0; i < langConfigProperties.length; i++)
                moment[langConfigProperties[i]] = languages[key][langConfigProperties[i]];
            moment.monthsParse = languages[key].monthsParse;
            currentLanguage = key
        }
    };
    moment.langData = getLangDefinition;
    moment.isMoment = function(obj)
    {
        return obj instanceof Moment
    };
    moment.isDuration = function(obj)
    {
        return obj instanceof Duration
    };
    moment.lang('en', {
        months: "January_February_March_April_May_June_July_August_September_October_November_December".split("_"),
        monthsShort: "Jan_Feb_Mar_Apr_May_Jun_Jul_Aug_Sep_Oct_Nov_Dec".split("_"),
        weekdays: "Sunday_Monday_Tuesday_Wednesday_Thursday_Friday_Saturday".split("_"),
        weekdaysShort: "Sun_Mon_Tue_Wed_Thu_Fri_Sat".split("_"),
        weekdaysMin: "Su_Mo_Tu_We_Th_Fr_Sa".split("_"),
        longDateFormat: {
            LT: "h:mm A",
            L: "MM/DD/YYYY",
            LL: "MMMM D YYYY",
            LLL: "MMMM D YYYY LT",
            LLLL: "dddd, MMMM D YYYY LT"
        },
        meridiem: function(hours, minutes, isLower)
        {
            if (hours > 11)
                return isLower ? 'pm' : 'PM';
            else
                return isLower ? 'am' : 'AM'
        },
        calendar: {
            sameDay: '[Today at] LT',
            nextDay: '[Tomorrow at] LT',
            nextWeek: 'dddd [at] LT',
            lastDay: '[Yesterday at] LT',
            lastWeek: '[last] dddd [at] LT',
            sameElse: 'L'
        },
        relativeTime: {
            future: "in %s",
            past: "%s ago",
            s: "a few seconds",
            m: "a minute",
            mm: "%d minutes",
            h: "an hour",
            hh: "%d hours",
            d: "a day",
            dd: "%d days",
            M: "a month",
            MM: "%d months",
            y: "a year",
            yy: "%d years"
        },
        ordinal: function(number)
        {
            var b = number % 10;
            return ~~(number % 100 / 10) === 1 ? 'th' : b === 1 ? 'st' : b === 2 ? 'nd' : b === 3 ? 'rd' : 'th'
        }
    });
    moment.fn = Moment.prototype = {
        clone: function()
        {
            return moment(this)
        },
        valueOf: function()
        {
            return +this._d
        },
        unix: function()
        {
            return Math.floor(+this._d / 1000)
        },
        toString: function()
        {
            return this._d.toString()
        },
        toDate: function()
        {
            return this._d
        },
        toArray: function()
        {
            var m = this;
            return [m.year(), m.month(), m.date(), m.hours(), m.minutes(), m.seconds(), m.milliseconds(), !!this._isUTC]
        },
        isValid: function()
        {
            if (this._a)
                return !compareArrays(this._a, (this._a[7] ? moment.utc(this) : this).toArray());
            return !isNaN(this._d.getTime())
        },
        utc: function()
        {
            this._isUTC = true;
            return this
        },
        local: function()
        {
            this._isUTC = false;
            return this
        },
        format: function(inputString)
        {
            return formatMoment(this, inputString ? inputString : moment.defaultFormat)
        },
        add: function(input, val)
        {
            var dur = val ? moment.duration(+val, input) : moment.duration(input);
            addOrSubtractDurationFromMoment(this, dur, 1);
            return this
        },
        subtract: function(input, val)
        {
            var dur = val ? moment.duration(+val, input) : moment.duration(input);
            addOrSubtractDurationFromMoment(this, dur, -1);
            return this
        },
        diff: function(input, val, asFloat)
        {
            var inputMoment = this._isUTC ? moment(input).utc() : moment(input).local(),
                zoneDiff = (this.zone() - inputMoment.zone()) * 6e4,
                diff = this._d - inputMoment._d - zoneDiff,
                year = this.year() - inputMoment.year(),
                month = this.month() - inputMoment.month(),
                date = this.date() - inputMoment.date(),
                output;
            if (val === 'months')
                output = year * 12 + month + date / 30;
            else if (val === 'years')
                output = year + (month + date / 30) / 12;
            else
                output = val === 'seconds' ? diff / 1e3 : val === 'minutes' ? diff / 6e4 : val === 'hours' ? diff / 36e5 : val === 'days' ? diff / 864e5 : val === 'weeks' ? diff / 6048e5 : diff;
            return asFloat ? output : round(output)
        },
        from: function(time, withoutSuffix)
        {
            return moment.duration(this.diff(time)).lang(this._lang).humanize(!withoutSuffix)
        },
        fromNow: function(withoutSuffix)
        {
            return this.from(moment(), withoutSuffix)
        },
        calendar: function()
        {
            var diff = this.diff(moment().sod(), 'days', true),
                calendar = this.lang().calendar,
                allElse = calendar.sameElse,
                format = diff < -6 ? allElse : diff < -1 ? calendar.lastWeek : diff < 0 ? calendar.lastDay : diff < 1 ? calendar.sameDay : diff < 2 ? calendar.nextDay : diff < 7 ? calendar.nextWeek : allElse;
            return this.format(typeof format === 'function' ? format.apply(this) : format)
        },
        isLeapYear: function()
        {
            var year = this.year();
            return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0
        },
        isDST: function()
        {
            return this.zone() < moment([this.year()]).zone() || this.zone() < moment([this.year(), 5]).zone()
        },
        day: function(input)
        {
            var day = this._isUTC ? this._d.getUTCDay() : this._d.getDay();
            return input == null ? day : this.add({d: input - day})
        },
        startOf: function(val)
        {
            switch (val.replace(/s$/, ''))
            {
                case'year':
                    this.month(0);
                case'month':
                    this.date(1);
                case'day':
                    this.hours(0);
                case'hour':
                    this.minutes(0);
                case'minute':
                    this.seconds(0);
                case'second':
                    this.milliseconds(0)
            }
            return this
        },
        endOf: function(val)
        {
            return this.startOf(val).add(val.replace(/s?$/, 's'), 1).subtract('ms', 1)
        },
        sod: function()
        {
            return this.clone().startOf('day')
        },
        eod: function()
        {
            return this.clone().endOf('day')
        },
        zone: function()
        {
            return this._isUTC ? 0 : this._d.getTimezoneOffset()
        },
        daysInMonth: function()
        {
            return moment.utc([this.year(), this.month() + 1, 0]).date()
        },
        lang: function(lang)
        {
            if (lang === undefined)
                return getLangDefinition(this);
            else
            {
                this._lang = lang;
                return this
            }
        }
    };
    function makeGetterAndSetter(name, key)
    {
        moment.fn[name] = function(input)
        {
            var utc = this._isUTC ? 'UTC' : '';
            if (input != null)
            {
                this._d['set' + utc + key](input);
                return this
            }
            else
                return this._d['get' + utc + key]()
        }
    }
    for (i = 0; i < proxyGettersAndSetters.length; i++)
        makeGetterAndSetter(proxyGettersAndSetters[i].toLowerCase(), proxyGettersAndSetters[i]);
    makeGetterAndSetter('year', 'FullYear');
    moment.duration.fn = Duration.prototype = {
        weeks: function()
        {
            return absRound(this.days() / 7)
        },
        valueOf: function()
        {
            return this._milliseconds + this._days * 864e5 + this._months * 2592e6
        },
        humanize: function(withSuffix)
        {
            var difference = +this,
                rel = this.lang().relativeTime,
                output = relativeTime(difference, !withSuffix, this.lang());
            if (withSuffix)
                output = (difference <= 0 ? rel.past : rel.future).replace(/%s/i, output);
            return output
        },
        lang: moment.fn.lang
    };
    function makeDurationGetter(name)
    {
        moment.duration.fn[name] = function()
        {
            return this._data[name]
        }
    }
    function makeDurationAsGetter(name, factor)
    {
        moment.duration.fn['as' + name] = function()
        {
            return +this / factor
        }
    }
    for (i in unitMillisecondFactors)
        if (unitMillisecondFactors.hasOwnProperty(i))
        {
            makeDurationAsGetter(i, unitMillisecondFactors[i]);
            makeDurationGetter(i.toLowerCase())
        }
    makeDurationAsGetter('Weeks', 6048e5);
    if (hasModule)
        module.exports = moment;
    if (typeof ender === 'undefined')
        this['moment'] = moment;
    if (typeof define === "function" && define.amd)
        define("moment", [], function()
        {
            return moment
        })
}).call(this, Date);
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
    }();
var dust = {};
function getGlobal()
{
    return function()
        {
            return this.dust
        }.call(null)
}
(function(dust)
{
    dust.cache = {};
    dust.register = function(name, tmpl)
    {
        if (!name)
            return;
        dust.cache[name] = tmpl
    };
    dust.render = function(name, context, callback)
    {
        var chunk = new Stub(callback).head;
        dust.load(name, chunk, Context.wrap(context)).end()
    };
    dust.stream = function(name, context)
    {
        var stream = new Stream;
        dust.nextTick(function()
        {
            dust.load(name, stream.head, Context.wrap(context)).end()
        });
        return stream
    };
    dust.renderSource = function(source, context, callback)
    {
        return dust.compileFn(source)(context, callback)
    };
    dust.compileFn = function(source, name)
    {
        var tmpl = dust.loadSource(dust.compile(source, name));
        return function(context, callback)
            {
                var master = callback ? new Stub(callback) : new Stream;
                dust.nextTick(function()
                {
                    tmpl(master.head, Context.wrap(context)).end()
                });
                return master
            }
    };
    dust.load = function(name, chunk, context)
    {
        var tmpl = dust.cache[name];
        if (tmpl)
            return tmpl(chunk, context);
        else
        {
            if (dust.onLoad)
                return chunk.map(function(chunk)
                    {
                        dust.onLoad(name, function(err, src)
                        {
                            if (err)
                                return chunk.setError(err);
                            if (!dust.cache[name])
                                dust.loadSource(dust.compile(src, name));
                            dust.cache[name](chunk, context).end()
                        })
                    });
            return chunk.setError(new Error("Template Not Found: " + name))
        }
    };
    dust.loadSource = function(source, path)
    {
        return eval(source)
    };
    if (Array.isArray)
        dust.isArray = Array.isArray;
    else
        dust.isArray = function(arr)
        {
            return Object.prototype.toString.call(arr) == "[object Array]"
        };
    dust.nextTick = function()
    {
        if (typeof process !== "undefined")
            return process.nextTick;
        else
            return function(callback)
                {
                    setTimeout(callback, 0)
                }
    }();
    dust.isEmpty = function(value)
    {
        if (dust.isArray(value) && !value.length)
            return true;
        if (value === 0)
            return false;
        return !value
    };
    dust.filter = function(string, auto, filters)
    {
        if (filters)
            for (var i = 0, len = filters.length; i < len; i++)
            {
                var name = filters[i];
                if (name === "s")
                    auto = null;
                else
                    string = dust.filters[name](string)
            }
        if (auto)
            string = dust.filters[auto](string);
        return string
    };
    dust.filters = {
        h: function(value)
        {
            return dust.escapeHtml(value)
        },
        j: function(value)
        {
            return dust.escapeJs(value)
        },
        u: encodeURI,
        uc: encodeURIComponent,
        js: function(value)
        {
            if (!JSON)
                return value;
            return JSON.stringify(value)
        },
        jp: function(value)
        {
            if (!JSON)
                return value;
            return JSON.parse(value)
        }
    };
    function Context(stack, global, blocks)
    {
        this.stack = stack;
        this.global = global;
        this.blocks = blocks
    }
    dust.makeBase = function(global)
    {
        return new Context(new Stack, global)
    };
    Context.wrap = function(context)
    {
        if (context instanceof Context)
            return context;
        return new Context(new Stack(context))
    };
    Context.prototype.get = function(key)
    {
        var ctx = this.stack,
            value;
        while (ctx)
        {
            if (ctx.isObject)
            {
                value = ctx.head[key];
                if (!(value === undefined))
                    return value
            }
            ctx = ctx.tail
        }
        return this.global ? this.global[key] : undefined
    };
    Context.prototype.getPath = function(cur, down)
    {
        var ctx = this.stack,
            len = down.length;
        if (cur && len === 0)
            return ctx.head;
        if (!ctx.isObject)
            return undefined;
        ctx = ctx.head;
        var i = 0;
        while (ctx && i < len)
        {
            ctx = ctx[down[i]];
            i++
        }
        return ctx
    };
    Context.prototype.push = function(head, idx, len)
    {
        return new Context(new Stack(head, this.stack, idx, len), this.global, this.blocks)
    };
    Context.prototype.rebase = function(head)
    {
        return new Context(new Stack(head), this.global, this.blocks)
    };
    Context.prototype.current = function()
    {
        return this.stack.head
    };
    Context.prototype.getBlock = function(key, chk, ctx)
    {
        if (typeof key === "function")
        {
            key = key(chk, ctx).data;
            chk.data = ""
        }
        var blocks = this.blocks;
        if (!blocks)
            return;
        var len = blocks.length,
            fn;
        while (len--)
        {
            fn = blocks[len][key];
            if (fn)
                return fn
        }
    };
    Context.prototype.shiftBlocks = function(locals)
    {
        var blocks = this.blocks;
        if (locals)
        {
            if (!blocks)
                newBlocks = [locals];
            else
                newBlocks = blocks.concat([locals]);
            return new Context(this.stack, this.global, newBlocks)
        }
        return this
    };
    function Stack(head, tail, idx, len)
    {
        this.tail = tail;
        this.isObject = !dust.isArray(head) && head && typeof head === "object";
        this.head = head;
        this.index = idx;
        this.of = len
    }
    function Stub(callback)
    {
        this.head = new Chunk(this);
        this.callback = callback;
        this.out = ''
    }
    Stub.prototype.flush = function()
    {
        var chunk = this.head;
        while (chunk)
        {
            if (chunk.flushable)
                this.out += chunk.data;
            else if (chunk.error)
            {
                this.callback(chunk.error);
                this.flush = function(){};
                return
            }
            else
                return;
            chunk = chunk.next;
            this.head = chunk
        }
        this.callback(null, this.out)
    };
    function Stream()
    {
        this.head = new Chunk(this)
    }
    Stream.prototype.flush = function()
    {
        var chunk = this.head;
        while (chunk)
        {
            if (chunk.flushable)
                this.emit('data', chunk.data);
            else if (chunk.error)
            {
                this.emit('error', chunk.error);
                this.flush = function(){};
                return
            }
            else
                return;
            chunk = chunk.next;
            this.head = chunk
        }
        this.emit('end')
    };
    Stream.prototype.emit = function(type, data)
    {
        if (!this.events)
            return false;
        var handler = this.events[type];
        if (!handler)
            return false;
        if (typeof handler == 'function')
            handler(data);
        else
        {
            var listeners = handler.slice(0);
            for (var i = 0, l = listeners.length; i < l; i++)
                listeners[i](data)
        }
    };
    Stream.prototype.on = function(type, callback)
    {
        if (!this.events)
            this.events = {};
        if (!this.events[type])
            this.events[type] = callback;
        else if (typeof this.events[type] === 'function')
            this.events[type] = [this.events[type], callback];
        else
            this.events[type].push(callback);
        return this
    };
    Stream.prototype.pipe = function(stream)
    {
        this.on("data", function(data)
        {
            stream.write(data, "utf8")
        }).on("end", function()
        {
            stream.end()
        }).on("error", function(err)
        {
            stream.error(err)
        });
        return this
    };
    function Chunk(root, next, taps)
    {
        this.root = root;
        this.next = next;
        this.data = '';
        this.flushable = false;
        this.taps = taps
    }
    Chunk.prototype.write = function(data)
    {
        var taps = this.taps;
        if (taps)
            data = taps.go(data);
        this.data += data;
        return this
    };
    Chunk.prototype.end = function(data)
    {
        if (data)
            this.write(data);
        this.flushable = true;
        this.root.flush();
        return this
    };
    Chunk.prototype.map = function(callback)
    {
        var cursor = new Chunk(this.root, this.next, this.taps),
            branch = new Chunk(this.root, cursor, this.taps);
        this.next = branch;
        this.flushable = true;
        callback(branch);
        return cursor
    };
    Chunk.prototype.tap = function(tap)
    {
        var taps = this.taps;
        if (taps)
            this.taps = taps.push(tap);
        else
            this.taps = new Tap(tap);
        return this
    };
    Chunk.prototype.untap = function()
    {
        this.taps = this.taps.tail;
        return this
    };
    Chunk.prototype.render = function(body, context)
    {
        return body(this, context)
    };
    Chunk.prototype.reference = function(elem, context, auto, filters)
    {
        if (typeof elem === "function")
        {
            elem.isReference = true;
            elem = elem.apply(context.current(), [this, context, null, {
                    auto: auto,
                    filters: filters
                }]);
            if (elem instanceof Chunk)
                return elem
        }
        if (!dust.isEmpty(elem))
            return this.write(dust.filter(elem, auto, filters));
        else
            return this
    };
    Chunk.prototype.section = function(elem, context, bodies, params)
    {
        if (typeof elem === "function")
        {
            elem = elem.apply(context.current(), [this, context, bodies, params]);
            if (elem instanceof Chunk)
                return elem
        }
        var body = bodies.block,
            skip = bodies['else'];
        if (params)
            context = context.push(params);
        if (dust.isArray(elem))
        {
            if (body)
            {
                var len = elem.length,
                    chunk = this;
                context.stack.head['$len'] = len;
                for (var i = 0; i < len; i++)
                {
                    context.stack.head['$idx'] = i;
                    chunk = body(chunk, context.push(elem[i], i, len))
                }
                context.stack.head['$idx'] = undefined;
                context.stack.head['$len'] = undefined;
                return chunk
            }
        }
        else if (elem === true)
        {
            if (body)
                return body(this, context)
        }
        else if (elem || elem === 0)
        {
            if (body)
            {
                context.stack.head['$idx'] = 0;
                context.stack.head['$len'] = 1;
                chunk = body(this, context.push(elem));
                context.stack.head['$idx'] = undefined;
                context.stack.head['$len'] = undefined;
                return chunk
            }
        }
        else if (skip)
            return skip(this, context);
        return this
    };
    Chunk.prototype.exists = function(elem, context, bodies)
    {
        var body = bodies.block,
            skip = bodies['else'];
        if (!dust.isEmpty(elem))
        {
            if (body)
                return body(this, context)
        }
        else if (skip)
            return skip(this, context);
        return this
    };
    Chunk.prototype.notexists = function(elem, context, bodies)
    {
        var body = bodies.block,
            skip = bodies['else'];
        if (dust.isEmpty(elem))
        {
            if (body)
                return body(this, context)
        }
        else if (skip)
            return skip(this, context);
        return this
    };
    Chunk.prototype.block = function(elem, context, bodies)
    {
        var body = bodies.block;
        if (elem)
            body = elem;
        if (body)
            return body(this, context);
        return this
    };
    Chunk.prototype.partial = function(elem, context, params)
    {
        var ctx = context.stack,
            tempHead = ctx.head;
        if (params)
        {
            context = context.rebase(ctx.tail);
            context = context.push(params);
            context = context.push(tempHead)
        }
        if (typeof elem === "function")
            return this.capture(elem, context, function(name, chunk)
                {
                    dust.load(name, chunk, context).end()
                });
        return dust.load(elem, this, context)
    };
    Chunk.prototype.helper = function(name, context, bodies, params)
    {
        return dust.helpers[name](this, context, bodies, params)
    };
    Chunk.prototype.capture = function(body, context, callback)
    {
        return this.map(function(chunk)
            {
                var stub = new Stub(function(err, out)
                    {
                        if (err)
                            chunk.setError(err);
                        else
                            callback(out, chunk)
                    });
                body(stub.head, context).end()
            })
    };
    Chunk.prototype.setError = function(err)
    {
        this.error = err;
        this.root.flush();
        return this
    };
    function Tap(head, tail)
    {
        this.head = head;
        this.tail = tail
    }
    Tap.prototype.push = function(tap)
    {
        return new Tap(tap, this)
    };
    Tap.prototype.go = function(value)
    {
        var tap = this;
        while (tap)
        {
            value = tap.head(value);
            tap = tap.tail
        }
        return value
    };
    var HCHARS = new RegExp(/[&<>\"\']/),
        AMP = /&/g,
        LT = /</g,
        GT = />/g,
        QUOT = /\"/g,
        SQUOT = /\'/g;
    dust.escapeHtml = function(s)
    {
        if (typeof s === "string")
        {
            if (!HCHARS.test(s))
                return s;
            return s.replace(AMP, '&amp;').replace(LT, '&lt;').replace(GT, '&gt;').replace(QUOT, '&quot;').replace(SQUOT, '&#39;')
        }
        return s
    };
    var BS = /\\/g,
        CR = /\r/g,
        LS = /\u2028/g,
        PS = /\u2029/g,
        NL = /\n/g,
        LF = /\f/g,
        SQ = /'/g,
        DQ = /"/g,
        TB = /\t/g;
    dust.escapeJs = function(s)
    {
        if (typeof s === "string")
            return s.replace(BS, '\\\\').replace(DQ, '\\"').replace(SQ, "\\'").replace(CR, '\\r').replace(LS, '\\u2028').replace(PS, '\\u2029').replace(NL, '\\n').replace(LF, '\\f').replace(TB, "\\t");
        return s
    }
})(dust);
if (typeof exports !== "undefined")
{
    dust.helpers = require("./dust-helpers").helpers;
    if (typeof process !== "undefined")
        require('./server')(dust);
    module.exports = dust
}
(function(dust)
{
    var _console = typeof console !== 'undefined' ? console : {log: function(){}};
    function isSelect(context)
    {
        var value = context.current();
        return typeof value === "object" && value.isSelect === true
    }
    function filter(chunk, context, bodies, params, filter)
    {
        var params = params || {},
            actual,
            expected;
        if (params.key)
            actual = helpers.tap(params.key, chunk, context);
        else if (isSelect(context))
        {
            actual = context.current().selectKey;
            if (context.current().isResolved)
                filter = function()
                {
                    return false
                }
        }
        else
            throw"No key specified for filter and no key found in context from select statement";
        expected = helpers.tap(params.value, chunk, context);
        if (filter(expected, coerce(actual, params.type, context)))
        {
            if (isSelect(context))
                context.current().isResolved = true;
            return chunk.render(bodies.block, context)
        }
        else if (bodies['else'])
            return chunk.render(bodies['else'], context);
        return chunk.write('')
    }
    function coerce(value, type, context)
    {
        if (value)
            switch (type || typeof value)
            {
                case'number':
                    return +value;
                case'string':
                    return String(value);
                case'boolean':
                    return Boolean(value);
                case'date':
                    return new Date(value);
                case'context':
                    return context.get(value)
            }
        return value
    }
    var helpers = {
            sep: function(chunk, context, bodies)
            {
                if (context.stack.index === context.stack.of - 1)
                    return chunk;
                return bodies.block(chunk, context)
            },
            idx: function(chunk, context, bodies)
            {
                return bodies.block(chunk, context.push(context.stack.index))
            },
            contextDump: function(chunk, context, bodies)
            {
                _console.log(JSON.stringify(context.stack));
                return chunk
            },
            tap: function(input, chunk, context)
            {
                var output = input;
                if (typeof input === "function")
                    if (typeof input.isReference !== "undefined" && input.isReference === true)
                        output = input();
                    else
                    {
                        output = '';
                        chunk.tap(function(data)
                        {
                            output += data;
                            return ''
                        }).render(input, context).untap();
                        if (output === '')
                            output = false
                    }
                return output
            },
            "if": function(chunk, context, bodies, params)
            {
                if (params && params.cond)
                {
                    var cond = params.cond;
                    cond = this.tap(cond, chunk, context);
                    if (eval(cond))
                        return chunk.render(bodies.block, context);
                    if (bodies['else'])
                        return chunk.render(bodies['else'], context)
                }
                else
                    _console.log("No condition given in the if helper!");
                return chunk
            },
            select: function(chunk, context, bodies, params)
            {
                if (params && params.key)
                {
                    var key = this.tap(params.key, chunk, context);
                    return chunk.render(bodies.block, context.push({
                            isSelect: true,
                            isResolved: false,
                            selectKey: key
                        }))
                }
                else
                    _console.log("No key given in the select helper!");
                return chunk
            },
            eq: function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return actual === expected
                    })
            },
            lt: function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return actual < expected
                    })
            },
            lte: function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return actual <= expected
                    })
            },
            gt: function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return actual > expected
                    })
            },
            gte: function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return actual >= expected
                    })
            },
            "default": function(chunk, context, bodies, params)
            {
                return filter(chunk, context, bodies, params, function(expected, actual)
                    {
                        return true
                    })
            },
            size: function(chunk, context, bodies, params)
            {
                var subject = params.subject;
                var value = 0;
                if (!subject)
                    value = 0;
                else if (dust.isArray(subject))
                    value = subject.length;
                else if (!isNaN(subject))
                    value = subject;
                else if (Object(subject) === subject)
                {
                    var nr = 0;
                    for (var k in subject)
                        if (Object.hasOwnProperty.call(subject, k))
                            nr++;
                    value = nr
                }
                else
                    value = (subject + '').length;
                return chunk.write(value)
            }
        };
    dust.helpers = helpers
})(typeof exports !== 'undefined' ? exports : getGlobal());
(function()
{
    dust.register("upcoming_ui", body_0);
    function body_0(chk, ctx)
    {
        return chk.write("<div class=\"").reference(ctx.getPath(false, ["prog", "css"]), ctx, "h").write("\" id=\"").reference(ctx.getPath(false, ["prog", "id"]), ctx, "h").write("\"><span class=\"").reference(ctx.getPath(false, ["prog", "lbl", "css"]), ctx, "h").write("\" id=\"").reference(ctx.getPath(false, ["prog", "lbl", "id"]), ctx, "h").write("\" style=\"display: none;\">&nbsp;</span><div class=\"").reference(ctx.getPath(false, ["prog", "bdr", "css"]), ctx, "h").write("\" id=\"").reference(ctx.getPath(false, ["prog", "bdr", "id"]), ctx, "h").write("\" style=\"display: none;\"><div class=\"").reference(ctx.getPath(false, ["prog", "bar", "css"]), ctx, "h").write("\" style=\"width: 0px;\" id=\"").reference(ctx.getPath(false, ["prog", "bar", "id"]), ctx, "h").write("\"></div></div></div><div class=\"").reference(ctx.getPath(false, ["evts", "css"]), ctx, "h").write("\" id=\"").reference(ctx.getPath(false, ["evts", "id"]), ctx, "h").write("\"></div>")
    }
    return body_0
})();
(function()
{
    dust.register("upcoming_evtcats", body_0);
    function body_0(chk, ctx)
    {
        return chk.section(ctx.get("evtCats"), ctx, {block: body_1}, null)
    }
    function body_1(chk, ctx)
    {
        return chk.write(" ").exists(ctx.get("evts"), ctx, {
                "else": body_2,
                block: body_3
            }, null)
    }
    function body_2(chk, ctx)
    {
        return chk.reference(ctx.getPath(false, ["res", "no_events"]), ctx, "h")
    }
    function body_3(chk, ctx)
    {
        return chk.write(" <div class=\"evtcat\"><span class=\"caption\">").reference(ctx.get("caption"), ctx, "h").write("</span><span class=\"range\">").reference(ctx.get("range"), ctx, "h").write("</span><div class=\"evts\">").section(ctx.get("evts"), ctx, {block: body_4}, null).write("</div></div>")
    }
    function body_4(chk, ctx)
    {
        return chk.write("<div class=\"evt\"><span class=\"toggle\" id=\"evt_tgl_").reference(ctx.get("id"), ctx, "h").write("\" onclick=\"upcoming.toggleEvtDetail(").reference(ctx.get("id"), ctx, "h").write(");\">+</span><span class=\"title\">").exists(ctx.get("titleHref"), ctx, {
                "else": body_5,
                block: body_6
            }, null).write("</span><div class=\"detail\" id=\"evt_dtl_").reference(ctx.get("id"), ctx, "h").write("\" style=\"display:none;\"><strong class=\"when\">When</strong><span class=\"when\">").reference(ctx.get("when"), ctx, "h").write("</span><br /><strong class=\"where\">Where</strong><span class=\"where\">").exists(ctx.get("whereHref"), ctx, {
                "else": body_7,
                block: body_8
            }, null).write("</span><br /><strong class=\"createdBy\">Created by</strong><span class=\"createdBy\">").reference(ctx.get("createdBy"), ctx, "h").write("</span><br /><strong class=\"description\">Description</strong><span class=\"description\">").reference(ctx.get("description"), ctx, "h").write("</span></div></div>")
    }
    function body_5(chk, ctx)
    {
        return chk.reference(ctx.get("title"), ctx, "h")
    }
    function body_6(chk, ctx)
    {
        return chk.write("<a href=\"").reference(ctx.get("titleHref"), ctx, "h").write("\">").reference(ctx.get("title"), ctx, "h").write("</a>")
    }
    function body_7(chk, ctx)
    {
        return chk.reference(ctx.get("where"), ctx, "h")
    }
    function body_8(chk, ctx)
    {
        return chk.write("<a href=\"").reference(ctx.get("whereHref"), ctx, "h").write("\">").reference(ctx.get("where"), ctx, "h").write("</a>")
    }
    return body_0
})()
