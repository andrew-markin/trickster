# Trickster

Trickster is a simple telegram bot that will live in your friends group chat and periodically suggest that everyone meet at the Friday party. This should help to avoid any hesitation if no one wants to be the initiator. In the proposal there will be two buttons for accept and decline. Everyone can vote. The first few votes will be hidden until a quorum is reached, and then everyone will see who has accepted the party and who has not. Hopefully this will be enough for a final decision.

## Project setup

### Install dependencies

    $ npm install

### Prepare environment variables

Create an *.env* file in the project root (.env.example can be used as a reference). Make sure you provide the correct mandatory BOT_TOKEN and STORAGE_DIR values. Provide the DEPLOY_TARGET variable if you want to deploy the bot on a remote server.

### Prepare configuration file

Create a *config.js* file in the project root (config-example.js can be used as a reference). Customize the internal content to your needs. You can change the bot start password, update the quorum size, write your own messages, translate them to your language, adjust the time format localization, add your own funny animations, etc.

### Launch bot for development

    $ npm start

### Deploy to remote server

    $ npm run deploy

## License

## Support commands
/start - Start the bot
/setRestartDay - Set fixed date-time to restart poll
/clearRestartDay - Clear fixed date-time to restart poll. Use random day and time between Mon-Wed

This repository is available under the [GNU General Public License](./LICENSE).
