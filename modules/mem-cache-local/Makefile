memcached := $(shell which memcached)
user := $(shell whoami)
all: clean install test

clean:
	-rm -fr node_modules test/binaries/libevent node_modules test/binaries/memcached

install:
	npm install;\
	npm link;\

.PHONY : test
test:
	@echo "You can run 'make unixtest' but it may install memcache if not there"
unixtest:
ifeq ($(memcached),)
	-mkdir -p test/binaries/libevent
	tar -xzvf test/binaries/libevent-2.0.17-stable.tar.gz -C test/binaries/libevent
	cd test/binaries/libevent/libevent-2.0.17-stable; ./configure; make; make install; cd ../../../..
	-rm -fr test/binaries/libevent

	-mkdir -p test/binaries/memcached
	tar -xzvf test/binaries/memcached-1.4.13.tar.gz -C test/binaries/memcached
	cd test/binaries/memcached/memcached-1.4.13; ./configure; make; make install; cd ../../../..
	-rm -fr test/binaries/memcached
endif
	export LD_LIBRARY_PATH=/usr/local/lib
	memcached -u $(user) -d -m 24 -p 8026 &
	node_modules/.bin/nodeunit test;
	killall memcached

test-part:
	@echo "You can run 'make unixtest' but it may install memcache if not there"

