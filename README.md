# acronym

## Installation

1. npm install
2. download ngrok https://ngrok.com/download
3. ngrok http 8000
4. copy the link to the server (https://randomstuff.ngrok.com)
5. Go to slack bots (https://api.slack.com/apps)
6. Go to your apps in top right corner of screen
6. Click on slackronym
7. Click `Slash Commands`
8. Edit the `Explain` command
9. Change the `Request URL` to the link to the ngrok server from step 4 and add `/bot` to the end so your final URL looks like `https://randomstuff.ngrok.com/bot`

## Using the bot

The bot currently has a few features, getting explanations and then defining new ones

`/explain <acronym>` will pull the explanations from the server

`/explain <acronym> <definition>` will add a new definition for the acronym

`/explain listall` will list all the acronyms of the bot (up to max HTTP size)

`/explain remove <acronym>` will remove all definitions for the acronym specified

`/explain dedupeall` will remove all duplicate acronym definitions

You can also create multiple definitions in a single Slack message by writing each command on a new line. The bot will read each line as a separate command.

## Features to work on

- [x] Host the backend somewhere for production use
- [x] Save the definitions to a database so they persist
- [x] Post to a channel when the definition does not exist so people can be notified to define it
- [x] Post to a channel when something is defined so people can add or remove definitions
- [x] Add ability to remove definitions
- [ ] Add ability to post a definition to a channel
