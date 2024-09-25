[no-cd]
sav WHERE:
	find {{WHERE}} -name \*.sav -type f -size +1000k -size -1005k -exec node {{justfile_directory()}}/sav.js {} \; -exec realpath -m --relative-to=. {} \; | sort -k1 -n -r
[no-cd]
cap WHERE:
	find {{WHERE}} -name \*.sav -type f -size +1k -size -3k       -exec node {{justfile_directory()}}/cap.js {} \; -exec realpath -m --relative-to=. {} \; | sort -k1 -n -r

[no-cd]
trim-cap WHERE TO:
	find {{WHERE}} -name \*.sav -type f -exec sh -c 'head -c 1528 {} > {{TO}}/$(basename {})' \;
[no-cd]
trim-sav WHERE TO:
	find {{WHERE}} -name \*.sav -size +800k -type f -exec sh -c 'head -c 1027216 {} > {{TO}}/$(basename {})' \;
