describe("Upcoming.js", function() {
	beforeEach(function() {
		upcoming.reset();
	});
	describe("when simulating feed data for a single instance", function() {
		var config;
		var instance;
		
		function getElementById(id) {
			return document.getElementById(id) || document.createElement("div");
		}
		
		beforeEach(function() {
			config = {
				id: "testDiv",
				requestFeeds: false,
				getElementById: getElementById,
				moment: moment()
			};
		});
		it("should have five events", function() {
			instance = upcoming.render(config);
			upcoming.callbacks.feed0({});
			expect(instance.evts.length).toBe(5);
		});
	});
});