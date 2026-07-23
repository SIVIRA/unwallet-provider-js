.PHONY: setup
setup: deps

.PHONY: deps
deps:
	pnpm install --frozen-lockfile

.PHONY: commit
commit:
	pnpm czg

.PHONY: test
test:
	TS_NODE_COMPILER_OPTIONS='{"module":"commonjs"}' pnpm mocha -r ts-node/register test/**/*.ts

.PHONY: build
build:
	pnpm tsc

.PHONY: publish
publish:
	pnpm publish --access public --no-git-checks
