# Messager

# Develop
	npm install --global nodemon
	nodemon app.js

# Test
	node app.js -debug 1
	set DEBUG=* & node app.js
	
# Install
	npm install --global pm2

# Run
	pm2 start app.js -n Messager --watch
	
	pm2 start moment.json
	
	pm2 start groups.json
	
# Logs
	tail -f /disk/www/Messager/logs/wx_groups_out.log
	
	tail -f /disk/www/Messager/logs/wx_moment_out.log
