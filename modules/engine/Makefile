all: clean install test

clean:
	-rm -fr node_modules

install:
	npm link ql.io-mutable-uri;\
	npm link ql.io-uri-template;\
	npm link ql.io-compiler;\
	npm install;\
	npm link;\
	mkdir -p docs;\
	node_modules/.bin/dox --title ql.io --desc "Engine APIs" lib/*.js > docs/engine.html;

.PHONY : test
test: 
	node_modules/.bin/nodeunit test;

test-part:
	node_modules/.bin/nodeunit test --reporter junit --output ../../reports

unpublish:
	npm --registry $(REGISTRY) unpublish

publish:
	npm --registry $(REGISTRY) publish

refresh:
	npm --registry $(REGISTRY) publish --force
