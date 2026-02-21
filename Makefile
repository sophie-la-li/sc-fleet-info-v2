#!make
#include .env

pack-injector-script:
	bin/pack-injector-script

pack-firefox-extension:
	bin/pack-firefox-extension

pack-chrome-extension:
	bin/pack-chrome-extension

#sign-firefox-extension-unlisted:
#	cd firefox-extension && web-ext sign --api-key=${MOZILLA_USER} --api-secret=${MOZILLA_SECRET} --channel="unlisted"

pack-all: pack-injector-script pack-firefox-extension pack-chrome-extension

