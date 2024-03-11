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

# Command

## Moment

	# KEEP
	保持发圈原始格式

	# SKIP
	忽略这条发圈（不发送）

# Deploy
	pm2 start run/autologin.json
	pm2 start run/heartbeat.json
	pm2 start run/forward_new.json
	pm2 start run/moment_mtl.json
	pm2 start run/moment_send.json
	pm2 start run/socket_send.json
	pm2 start run/messager.json

	pm2 start run/groups_send.json

	
# Logs
	tail -f /disk/www/Messager/logs/wx_groups_out.log
	
	tail -f /disk/www/Messager/logs/wx_moment_out.log

## Filter

	# 转链失败
	"package":"example","body"

	# 发圈成功
	"package":"example","post_id"

	# 发圈异常
	"package":"example","expection"

	# 发圈出错
	"package":"example","failed"

	# 评论成功
	"package":"example","product"

	# 评论跳出
	"package":"example","break"

	# 评论失败
	"package":"example","comment"