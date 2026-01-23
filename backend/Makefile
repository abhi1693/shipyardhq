SHELL := /bin/bash

ifneq (,$(wildcard .env))
include .env
ifneq (,$(DATABASE_URL))
DATABASE_URL := $(patsubst "%",%,$(DATABASE_URL))
DATABASE_URL := $(patsubst '%,%,$(DATABASE_URL))
endif
export
endif

RUN ?=
ALEMBIC ?= alembic
ALEMBIC_CMD := $(strip $(RUN) $(ALEMBIC))

.PHONY: \
	alembic-revision \
	alembic-revision-empty \
	alembic-upgrade \
	alembic-downgrade \
	alembic-current \
	alembic-history \
	alembic-heads \
	alembic-stamp

alembic-revision:
	@if [ -z "$(message)" ]; then \
		echo "message is required: make alembic-revision message=\"init\""; \
		exit 1; \
	fi
	$(ALEMBIC_CMD) revision --autogenerate -m "$(message)"

alembic-revision-empty:
	@if [ -z "$(message)" ]; then \
		echo "message is required: make alembic-revision-empty message=\"init\""; \
		exit 1; \
	fi
	$(ALEMBIC_CMD) revision -m "$(message)"

alembic-upgrade: to ?= head
alembic-upgrade:
	$(ALEMBIC_CMD) upgrade $(to)

alembic-downgrade: to ?= -1
alembic-downgrade:
	$(ALEMBIC_CMD) downgrade $(to)

alembic-current:
	$(ALEMBIC_CMD) current

alembic-history:
	$(ALEMBIC_CMD) history $(if $(range),-r $(range),)

alembic-heads:
	$(ALEMBIC_CMD) heads

alembic-stamp: to ?= head
alembic-stamp:
	$(ALEMBIC_CMD) stamp $(to)
