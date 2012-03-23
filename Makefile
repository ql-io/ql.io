MODULES	= modules/uri-template modules/mutable-uri modules/compiler modules/engine \
          modules/console modules/app modules/mem-cache-local

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
	-for d in $(DIRS); do \
		cd $$d; \
		$(MAKE) test || exit;\
		cd ../..;\
	done

test-part:
	-rm -rf reports 
	mkdir -p test
	-for d in $(DIRS); do (cd $$d; $(MAKE) test-part ); done

publish:
	-for d in $(MODULES); do (cd $$d; $(MAKE) publish); done

unpublish:
	-for d in $(MODULES); do (cd $$d; $(MAKE) unpublish); done

