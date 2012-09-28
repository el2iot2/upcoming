describe("Upcoming.js", function() {

	function mockGetElementById(id) {
		return document.getElementById(id) || document.createElement("div");
	}
	
	function mockWrite(ext) {
		//do nothing
	}

	beforeEach(function() {
		upcoming.reset();
	});
	describe("when simulating feed data for a single instance", function() {
		var config;
		var instance;

		beforeEach(function() {
			config = {
				feeds: ["usa__en@holiday.calendar.google.com"],
				getElementById: mockGetElementById,
				write: mockWrite,
				moment: moment(new Date(2012, 9, 26))
			};
		});
		
		it("upcoming should be defined", function() {
			expect(upcoming).toBeDefined();
		});
		
		it("callbacks should be defined", function() {
			expect(upcoming.callbacks).toBeDefined();
		});
		
		it("should have one callback", function() {
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
		
		it("should have five events", function() {
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
				getElementById: mockGetElementById,
				write: mockWrite,
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