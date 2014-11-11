clean:
	rm -f archwikiviewer.zip

package: clean
	7z a -r archwikiviewer.zip ./www/*
