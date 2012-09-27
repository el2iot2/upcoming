describe("Upcoming.js", function() {
	beforeEach(function() {
		upcoming.reset();
	});
	describe("when simulating feed data for a single instance", function() {
		var config;
		var instance;
		
		function mockGetElementById(id) {
			return document.getElementById(id) || document.createElement("div");
		}
		
		function mockWrite(ext) {
			//do nothing
		}
		
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
});