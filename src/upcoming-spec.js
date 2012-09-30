describe("Upcoming.js", function() {

	describe("when calling the exposed function", function() {
		describe("that builds 'link soup'", function() {
		
			//Trying to get all the algorithmic edge cases:
			it("should handle 'text'", function() {
				var text = "text";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(1);
				expect(linkSoup.spans[0].text).toBe("text");
				expect(linkSoup.spans[0].href).not.toBeDefined();
			});
			
			it("should handle 'http://automatonic.net'", function() {
				var text = "http://automatonic.net";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(1);
				expect(linkSoup.spans[0].text).toBeDefined();
				expect(linkSoup.spans[0].href).toBe("http://automatonic.net");
			});
			
			it("should handle '[a.com'", function() {
				var text = "[a.com";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(2);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
			});
			
			it("should handle 'a.com]'", function() {
				var text = "a.com]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(2);
				expect(linkSoup.spans[0].text).toBeDefined();
				expect(linkSoup.spans[0].href).toBe("a.com");
				expect(linkSoup.spans[1].text).toBe("]");
				expect(linkSoup.spans[1].href).not.toBeDefined();
			});
			
			it("should handle a prefix '[a.com]'", function() {
				var text = "[a.com]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(3);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
				expect(linkSoup.spans[2].text).toBe("]");
				expect(linkSoup.spans[2].href).not.toBeDefined();
			});
			
			it("should handle 'a.com,b.com]'", function() {
				var text = "a.com,b.com]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(4);
				expect(linkSoup.spans[0].text).toBeDefined();
				expect(linkSoup.spans[0].href).toBe("a.com");
				expect(linkSoup.spans[1].text).toBe(",");
				expect(linkSoup.spans[1].href).not.toBeDefined();
				expect(linkSoup.spans[2].text).toBeDefined();
				expect(linkSoup.spans[2].href).toBe("b.com");
				expect(linkSoup.spans[3].text).toBe("]");
				expect(linkSoup.spans[3].href).not.toBeDefined();
			});
			
			it("should handle '[a.com,b.com'", function() {
				var text = "[a.com,b.com";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(4);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
				expect(linkSoup.spans[2].text).toBe(",");
				expect(linkSoup.spans[2].href).not.toBeDefined();
				expect(linkSoup.spans[3].text).toBeDefined();
				expect(linkSoup.spans[3].href).toBe("b.com");
			});
			
			it("should handle '[a.com,b.com]'", function() {
				var text = "[a.com,b.com]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(5);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
				expect(linkSoup.spans[2].text).toBe(",");
				expect(linkSoup.spans[2].href).not.toBeDefined();
				expect(linkSoup.spans[3].text).toBeDefined();
				expect(linkSoup.spans[3].href).toBe("b.com");
				expect(linkSoup.spans[4].text).toBe("]");
				expect(linkSoup.spans[4].href).not.toBeDefined();
			});
			
			it("should handle 'a.com,b.com,c.net]'", function() {
				var text = "a.com,b.com,c.net]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(6);
				expect(linkSoup.spans[0].text).toBeDefined();
				expect(linkSoup.spans[0].href).toBe("a.com");
				expect(linkSoup.spans[1].text).toBe(",");
				expect(linkSoup.spans[1].href).not.toBeDefined();
				expect(linkSoup.spans[2].text).toBeDefined();
				expect(linkSoup.spans[2].href).toBe("b.com");
				expect(linkSoup.spans[3].text).toBe(",");
				expect(linkSoup.spans[3].href).not.toBeDefined();
				expect(linkSoup.spans[4].text).toBeDefined();
				expect(linkSoup.spans[4].href).toBe("c.net");
				expect(linkSoup.spans[5].text).toBe("]");
				expect(linkSoup.spans[5].href).not.toBeDefined();
			});
			
			it("should handle '[a.com,b.com,c.net'", function() {
				var text = "[a.com,b.com,c.net";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(6);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
				expect(linkSoup.spans[2].text).toBe(",");
				expect(linkSoup.spans[2].href).not.toBeDefined();
				expect(linkSoup.spans[3].text).toBeDefined();
				expect(linkSoup.spans[3].href).toBe("b.com");
				expect(linkSoup.spans[4].text).toBe(",");
				expect(linkSoup.spans[4].href).not.toBeDefined();
				expect(linkSoup.spans[5].text).toBeDefined();
				expect(linkSoup.spans[5].href).toBe("c.net");
			});
			
			it("should handle '[a.com,b.com,c.net]'", function() {
				var text = "[a.com,b.com,c.net]";
				var linkSoup = upcoming.test.toLinkSoup(text);
				expect(linkSoup).toBeDefined();
				expect(linkSoup.spans).toBeDefined();
				expect(linkSoup.spans.length).toBe(7);
				expect(linkSoup.spans[0].text).toBe("[");
				expect(linkSoup.spans[0].href).not.toBeDefined();
				expect(linkSoup.spans[1].text).toBeDefined();
				expect(linkSoup.spans[1].href).toBe("a.com");
				expect(linkSoup.spans[2].text).toBe(",");
				expect(linkSoup.spans[2].href).not.toBeDefined();
				expect(linkSoup.spans[3].text).toBeDefined();
				expect(linkSoup.spans[3].href).toBe("b.com");
				expect(linkSoup.spans[4].text).toBe(",");
				expect(linkSoup.spans[4].href).not.toBeDefined();
				expect(linkSoup.spans[5].text).toBeDefined();
				expect(linkSoup.spans[5].href).toBe("c.net");
				expect(linkSoup.spans[6].text).toBe("]");
				expect(linkSoup.spans[6].href).not.toBeDefined();
			});
		});
	});
	

	describe("when rendering", function() {
		
		//fakes a version of document.getElementById that creates an element if it does not exist
		function fakeGetElementById(id) {
			return document.getElementById(id) || document.createElement("div");
		}
		
		//fakes a version of document.write that does nothing
		function fakeWrite(ext) {
			//do nothing
		}
	
		beforeEach(function() {
			upcoming.test.reset();
		});
		describe("simulated feed data", function() {
			var config;
			var instance;

			beforeEach(function() {
				config = {
					feeds: ["usa__en@holiday.calendar.google.com"],
					getElementById: fakeGetElementById,
					write: fakeWrite,
					moment: moment(new Date(2012, 9, 26))
				};
			});
			
			it("should define the 'upcoming' API object", function() {
				expect(upcoming).toBeDefined();
			});
			
			it("should define a public 'callbacks' associative array", function() {
				expect(upcoming.callbacks).toBeDefined();
			});
			
			it("should have only one public callback defined", function() {
				instance = upcoming.render(config);
				
				var size = 0, key;
				var callbacks = upcoming.callbacks;
				for (key in callbacks) {
					if (callbacks.hasOwnProperty(key)) {
						size++;
					}
				}
				expect(size).toBe(1);
			});
			
			it("should have five events loading", function() {
				instance = upcoming.render(config);
				upcoming.callbacks.feed1(test_feeds[0]);
				expect(instance.evts.length).toBe(5);
			});
		});
		
		describe("when spying on our script tag", function() {
			var config;
			var instance;

			beforeEach(function() {
				config = {
					feeds: ["usa__en@holiday.calendar.google.com"],
					getElementById: fakeGetElementById,
					write: fakeWrite,
					moment: moment(new Date(2012, 9, 26))
				};
				//spy on the write
				spyOn(config, "write");
			});
			
			it("should reflect the query (q)", function() {
				config.q = '"Elizabeth Bennet" Darcy -Austen';
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&q=%22Elizabeth%20Bennet%22%20Darcy%20-Austen");
				expect(script).toMatch("&max-results=5"); //default max results
			});
			
			it("should reflect the (explicit) category filter", function() {
				config.category = "Fritz|Laurie";
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&category=Fritz%7CLaurie");
			});
			
			it("should reflect the author filter", function() {
				config.author = "automa/tonic";
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&author=automa%2Ftonic");
			});
			
			it("should reflect the updated-min filter (moment)", function() {
				config.updated_min = moment.utc("2005-08-09T10:57:00-08:00", "YYYY-MM-DDTHH:mm:ssZZ");
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&updated-min=2005");
			});
			
			it("should reflect the updated-min filter", function() {
				config.updated_min = new Date(2011, 9, 16);
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&updated-min=2011");
			});
			
			it("should reflect the updated-max filter", function() {
				config.updated_max = moment.utc("2005-08-09T10:57:00-08:00", "YYYY-MM-DDTHH:mm:ssZZ");
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&updated-max=2005");
			});
			
			it("should reflect the published-min filter", function() {
				config.published_min = moment.utc("2005-08-09T10:57:00-08:00", "YYYY-MM-DDTHH:mm:ssZZ");
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&published-min=2005");
			});
			
			it("should reflect the updated-min filter", function() {
				config.published_max = moment.utc("2005-08-09T10:57:00-08:00", "YYYY-MM-DDTHH:mm:ssZZ");
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&published-max=2005");
			});
			
			it("should reflect the max-results filter", function() {
				config.max_results = 17;
				instance = upcoming.render(config);
				var script = config.write.mostRecentCall.args[0];
				expect(script).toMatch("&max-results=17'");
			});
		});
	});
});