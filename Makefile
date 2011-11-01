MODULES	= modules/uri-template modules/mutable-uri modules/compiler modules/mon modules/engine \
            modules/ecv modules/console

DIRS	= $(MODULES)
 
UNAME := $(shell uname -s)

all: clean install test

clean:
	-for d in $(DIRS); do (cd $$d; $(MAKE) clean ); done

install:
	-for d in $(DIRS); do (cd $$d; $(MAKE) install ); done

.PHONY : test
test:
	-rm -rf reports 
	mkdir -p test
	-for d in $(DIRS); do (cd $$d; $(MAKE) test ); done

test-part:
	-rm -rf reports 
	mkdir -p test
	-for d in $(DIRS); do (cd $$d; $(MAKE) test-part ); done

publish:
	-for d in $(MODULES); do (cd $$d; $(MAKE) publish); done

unpublish:
	-for d in $(MODULES); do (cd $$d; $(MAKE) unpublish); done

