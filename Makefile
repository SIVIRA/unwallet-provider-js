.PHONY: setup
setup: deps

.PHONY: deps
deps:
	pnpm install --frozen-lockfile

.PHONY: commit
commit:
	pnpm czg

.PHONY: lint
lint:
	pnpm publint --strict

.PHONY: test
test:
	echo "WIP: migrating to vitest + msw"

.PHONY: build
build:
	pnpm tsdown

.PHONY: publish
publish:
	pnpm publish --access public --no-git-checks
