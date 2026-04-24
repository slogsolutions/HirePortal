# Final Production Architecture
client (nginx)
server (API)
worker (BullMQ worker)
redis (queue)

# now when running redis container dont user 127.0.01 as docker share conn using docker name 