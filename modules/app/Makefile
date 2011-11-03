all: clean install test

clean:
	-rm -fr node_modules;\

install:
	npm link ql.io-ecv;\
	npm link ql.io-compiler;\
	npm link ql.io-console;\
	npm link ql.io-mon;\
	npm link ql.io-engine;\
	npm install;\
	npm link; \

.PHONY : test
test: install

test-part:
	node_modules/.bin/nodeunit test --reporter junit --output ../../reports

unpublish:
	npm --registry $(REGISTRY) unpublish

publish:
	npm --registry $(REGISTRY) publish

refresh:
	npm --registry $(REGISTRY) publish --force
