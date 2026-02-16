#!make
include .env

pack-inject-script:
	bin/pack-inject-script

pack-firefox-extension:
	bin/pack-firefox-extension

pack-chrome-extension:
	bin/pack-chrome-extension

sign-firefox-extension-unlisted:
	cd firefox-extension && web-ext sign --api-key=${MOZILLA_USER} --api-secret=${MOZILLA_SECRET} --channel="unlisted"

pack-all: pack-inject-script pack-firefox-extension pack-chrome-extension

