#http://ajaxmin.codeplex.com/
AJAXMIN:='C:\Program Files (x86)\Microsoft\Microsoft Ajax Minifier\ajaxmin.exe'
NODE:='C:\Program Files (x86)\nodejs\node.exe'

# Define the list of full files
BUILD_FILES := $(addprefix build/, upcoming.js upcoming_core.js upcoming.css index.html jasmine.html jasmine.css jasmine.js jasmine-html.js upcoming-spec.js)
BUILD_FILES += $(addprefix build/min/, upcoming.js upcoming_core.js upcoming.css index.html)

# the javascript packaged into the full, final product
JS_PARTS := $(addprefix src/, moment.js upcoming.js)
JS_PARTS += $(addprefix src/dustjs/lib/, dust-core-1.0.0.js)
JS_PARTS += $(addprefix src/dustjs/, upcoming_ui.js upcoming_evtcats.js)

# the javascript if you include third party libs separately
JS_CORE_PARTS := $(addprefix src/, upcoming.js)

# the CSS
CSS_PARTS := $(addprefix src/, upcoming.css)

# Default target
all : buildirs $(BUILD_FILES)

.PHONY : buildirs

buildirs : 
	mkdir -p build\min

src/dustjs/%.js : src/dustjs/%.dust
	$(NODE) src/dustjs/bin/dustc -n=$* $< $@ 
	
build/upcoming.css : $(CSS_PARTS)
	$(AJAXMIN) $^ -o build\upcoming.css -clobber -pretty

build/upcoming.js : $(JS_PARTS)
	$(AJAXMIN) $^ -o build\upcoming.js -clobber -pretty	

build/upcoming_core.js : $(JS_CORE_PARTS)
	$(AJAXMIN) $^ -o build\upcoming_core.js -clobber -pretty	
	
build/index.html : src/index.html
	cp $^ build

build/jasmine.html : src/jasmine/SpecRunner.html
	cp $^ build/jasmine.html
	
build/jasmine.js : src/jasmine/jasmine.js
	cp $^ build

build/jasmine-html.js : src/jasmine/jasmine-html.js
	cp $^ build

build/jasmine.css : src/jasmine/jasmine.css
	cp $^ build

build/upcoming-spec.js : src/upcoming-spec.js
	cp $^ build	
	
build/min/upcoming.css : $(CSS_PARTS)
	$(AJAXMIN) $^ -o build\min\upcoming.css -clobber

build/min/upcoming.js : $(JS_PARTS)
	$(AJAXMIN) $^ -o build\min\upcoming.js -clobber	

build/min/upcoming_core.js : $(JS_CORE_PARTS)
	$(AJAXMIN) $^ -o build\min\upcoming_core.js -clobber	
	
build/min/index.html : src/min.html
	cp $^ build/min/index.html

.PHONY : clean
clean :
	-rm -r build