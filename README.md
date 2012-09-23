# upcoming.js

Let your visitors know what events are `upcoming` with this Javascript widget that aggregates and displays data from public Google Calendar feeds. 

  * See the demo [here](http://automatonic.github.com/upcoming).
  * See commented examples of how to embed `upcoming.js` [here](https://gist.github.com/3768803#file_upcoming_examples.html).

## Overview

[Google Calendar](http://calendar.google.com ) makes it easy to have and maintain a public calendar. There is even an official Google Calendar Widget that can be [embedded](http://www.google.com/support/calendar/bin/answer.py?hl=en&answer=41207) into a web page. However, this project seeks to be an alternative widget that is themeable, compact, and supports multiple public feeds in a single display.

Built in Javascript and HTML, this project allows a simple and dynamic embedding of aggregate event data based on the JSON version of the gdata API.

## Features

  * Aggregate multiple Google Calendar feeds into a single Javascript+HTML widget.
  * Upcoming events are ordered by "proximity" to the current date.
  * Intuitive categories of "Today", "This Week", "Next Week", etc. are used to organize and prioritize.
  * Event details are hidden and shown inline (by clicking the "+") to allow for a compact representation.
  * Use CSS Styling to customize with your own colors, text, etc.
  * Embed multiple instances on a single page
  * [MIT License](http://opensource.org/licenses/mit-license.php)

## Based On

A special thanks to the following projects:

  * [dustjs](http://linkedin.github.com/dustjs) for pre-compiled templates
  * [moment.js](https://github.com/timrwood/moment/) for better date operations