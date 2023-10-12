// Uncomment the following code if you need time format localization
// const moment = require('moment')
// require('moment/locale/ru')
// moment.locale('ru')

module.exports = {
  password: '123', // Use command "/start <password>" to start the bot
  defaultUtcOffset: 180, // Adjust this to your time zone
  quorumSize: 8, // Adjust this to your company size
  strings: {
    userUnknown: 'Unknown',
    introduction: 'Hi, I\'m Trickster! Sometimes I\'ll invite you to hang out for a while and you can vote up or down. Voting will be secret until a quorum is reached (8 votes in favor), then open. What to do with the results - you decide! 😜',
    proposeButton: 'I want a party! 🥳',
    questions: [
      '🍕 Let\'s hang out on Friday {{D MMMM}}?',
      '🍕 Let\'s get together on Friday {{D MMMM}}?',
      '🥳 How about we hang out on Friday ({{D MMMM}})?',
      '🥳 Let\'s party hard on Friday ({{D MMMM}})?',
      '🎉 Maybe we can have a Friday party ({{D MMMM}})?',
      '🎉 Maybe we can meet on Friday ({{D MMMM}})?',
      '🍷 Let\'s celebrate the end of the work week {{D MMMM}}?',
      '🍺 I suggest you get drunk on Friday {{D MMMM}}.',
      '🍺 I suggest drinking on Friday ({{D MMMM}}).'
      // TODO: Add more similar variants here
    ],
    proposeConfirmations: [
      '👍 Good!',
      '👍 Let\'s try to arrange it!',
      '🙌 Great!',
      '🙂 Excellent!',
      '👍 Awesome!',
      '👌 Ok!',
      '✅ Accepted!'
    ],
    proposeExcessive: [
      '😁 Already offered!',
      '😎 Check your chat history!',
      '😈 Already done!'
    ],
    proposalNotifications: [
      '👆 Make your choice!',
      '👆 Please do not forget about the poll!',
      '👆 Please vote!'
    ],
    accept: '👍 Accept',
    reject: '👎 Reject',
    withGuest: '✌️ Will bring guest',
    accepts: 'Accepts',
    rejects: 'Rejects',
    acceptConfirmations: [
      '👏 Great!',
      '🤩 Awesome!',
      '🙂 Good!',
      '🍺 Excellent!',
      '🤘 Cool!',
      '👍 Way to go!'
    ],
    rejectConfirmations: [
      '🔮 Maybe next time...',
      '⏳ Maybe you\'ll change your mind...',
      '🙄 Well, okay...',
      '😔 It\'s a pity...'
    ],
    dayMustBe: 'Day must be set by format:',
    errorFailWeekDayFormat: 'Fail week day name',
    errorFailHourFormat: 'Fail hour value',
    errorFailMinuteFormat: 'Fail minute value',
    nextRestartMessage: 'Next restart {{D MMMM at HH:mm}}',
    clearRestartMessage: 'Restart poll in random time from monday to wednesday'
  },
  animations: [
    'https://media.tenor.com/_QsyK0soR0QAAAAC/dogville-booze.gif',
    'https://media.tenor.com/-A8Wjyk_iiEAAAAC/party-pusheen.gif',
    'https://media.tenor.com/0jxXFUxn7lEAAAAC/drinking-inna.gif'
    // TODO: Add more GIF links here
  ]
}
