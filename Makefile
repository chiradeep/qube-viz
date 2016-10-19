NS ?= chiradeep
VERSION ?= latest

.PHONY: build push shell run start stop rm release

build:
	$(MAKE) -C collector build
	$(MAKE) -C visualizer build

push:
	$(MAKE) -C collector push
	$(MAKE) -C visualizer push

start:
	$(MAKE) -C collector start
	$(MAKE) -C visualizer start

stop:
	$(MAKE) -C collector stop
	$(MAKE) -C visualizer  stop

rm:
	$(MAKE) -C collector rm
	$(MAKE) -C visualizer  rm
	

release: build
	$(MAKE) -C collector push -e VERSION=$(VERSION)
	$(MAKE) -C visualizer push -e VERSION=$(VERSION)

default: build
