NS ?= chiradeeptest/
VERSION ?= latest

IMAGE_NAME = qubeviz-server
NAME = qubeviz-server
INSTANCE = default
PORTS = -p 80:80/tcp
ENV = -e GET_HOSTS_FROM=env  -e REDIS_VIZ_SERVICE_HOST=localhost
VOLUMES = 

.PHONY: build push shell run start stop rm release

build:
	docker build -t $(NS)$(IMAGE_NAME):$(VERSION) .

push:
	docker push $(NS)$(IMAGE_NAME):$(VERSION)

shell:
	docker run --rm --name $(NAME)-$(INSTANCE) -i -t $(PORTS) $(VOLUMES) $(ENV) $(NS)$(IMAGE_NAME):$(VERSION) /bin/bash

run:
	docker run --rm -it  --name $(NAME)-$(INSTANCE) --net=host --privileged $(PORTS) $(VOLUMES) $(ENV) $(NS)$(IMAGE_NAME):$(VERSION)

start:
	docker run -d --name $(NAME)-$(INSTANCE) $(PORTS) $(VOLUMES) $(ENV) $(NS)$(IMAGE_NAME):$(VERSION)

stop:
	docker stop $(NAME)-$(INSTANCE)

rm:
	docker rm $(NAME)-$(INSTANCE)

release: build
	make push -e VERSION=$(VERSION)

save:
	docker save -o $(IMAGE_NAME).tar  $(NS)$(IMAGE_NAME)

default: build
