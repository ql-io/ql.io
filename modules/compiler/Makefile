all: clean install test

clean:
	-rm -fr node_modules

install:
	npm install;\
	npm link;

.PHONY : test
test: install
	node_modules/.bin/nodeunit test

test-part:
	node_modules/.bin/nodeunit test --reporter junit --output ../../reports
