# Tarkov Tools Discord Bot
Discord bot that uses the Tarkov Tools API

Requires a config.json file in the bot folder with the following format:
`{
	"discordApiToken": "API TOKEN FOR YOUR DISCORD BOT GOES HERE",
	"adminId": "18-DIGIT DISCORD ID FOR ADMIN USER GOES HERE"
}`

The adminId field can also be an array of ID values.

How to create a bot and get an API token:
https://www.howtogeek.com/364225/how-to-make-your-own-discord-bot/

If running the bot on a server, running the bot via a process manager is probably a good idea. PM2 works well enough:
https://pm2.keymetrics.io/docs/usage/pm2-doc-single-page/

Use this site to get the invite link for your bot:
https://discordapi.com/permissions.html#18496