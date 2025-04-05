.PHONY: install

install:
	node ./util/getMountsEupos.js
	node ./util/getMountsRtk2Go.js
