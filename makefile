debug:
	flask --debug run

debug-linux:
	python -m flask run --debug

watch-ts:
	tsc -w

run:
	tsc
	flask run