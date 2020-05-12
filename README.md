# Messager

# Develop
	npm install --global nodemon
	nodemon app.js

# Test
	node app.js -debug 1
	set DEBUG=* & node app.js

# Run
	npm install --global pm2
	pm2 start app.js -n Messager --watch
