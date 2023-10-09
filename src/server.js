const { strings, animations, ...config } = require('../config')
const { localMoment, ...helpers } = require('./helpers')
const { loadContexts, pushContext, pullContext, findContexts, deleteContext } = require('./storage')
const { Telegraf, Markup } = require('telegraf')

const HEARTBEAT_DELAY_MIN = 1000 * 60 * 5 // 5 minutes
const HEARTBEAT_DELAY_MAX = 1000 * 60 * 15 // 15 minutes

let heartbeatTimeout

const bot = new Telegraf(process.env.BOT_TOKEN)

bot.start(async (ctx) => {
  try {
    if (ctx.payload !== config.password) {
      await ctx.reply('🤨')
      return
    }
    const chatId = ctx.message.chat.id
    if (pullContext(chatId)) {
      await ctx.reply('👌')
      return
    }
    const salt = helpers.randomHex256()
    await pushContext({ chatId, salt, sequence: 0, restartDay: null })
    await sendIntroduction({ chatId })
  } catch (err) {
    console.log('Error:', err.message)
  }
})

bot.command('stop', async (ctx) => {
  const chatId = ctx.message.chat.id
  const context = pullContext(chatId)
  if (!context) return // Unknown chat
  const release = await context.mutex.acquire()
  try {
    await deleteContext(context)
    await ctx.reply('👋')
  } finally {
    release()
  }
})

/**
 * Save setting autostart day.
 * Bot restart poll every week
 */
bot.command('setRestartDay', async (ctx) => {
  try {
    const chatId = ctx.message.chat.id,
      context = pullContext(chatId),
      message = ctx.payload;

    const daySettings = message.match(/^(\w{3}) (\d\d):(\d\d)$/);

    if (daySettings === null) {
      await ctx.reply('Day must be set by format: «Mon 10:30»')
      return;
    }

    let [all, weekDay, hour, min] = daySettings;

    // check send settings
    if (!['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].includes(weekDay)) {
      await ctx.reply('Fail week day name. Day must be set by format: «Mon 10:30».')
      return;
    }

    if (parseInt(hour) > 23) {
      await ctx.reply('Fail hour value. Day must be set by format: «Mon 10:30».')
      return;
    }

    if (parseInt(min) > 59) {
      await ctx.reply('Fail minute value. Day must be set by format: «Mon 10:30».')
      return;
    }

    context.restartDay = message
    await pushContext(context)

    await ctx.reply('Settings update')
  } catch (err) {
    console.log('Error:', err.message)
  }
})

bot.on('migrate_to_chat_id', async ({ message }) => {
  const oldChatId = message.chat.id
  const oldContext = pullContext(oldChatId)
  if (!oldContext) return // Unknown chat
  const release = await oldContext.mutex.acquire()
  try {
    const newChatId = message.migrate_to_chat_id
    console.log(`Chat ID migration from ${oldChatId} to ${newChatId}`)
    const newContext = pushContext({ ...oldContext, chatId: newChatId })
    deleteContext(oldContext)
    await sendIntroduction(newContext)
  } catch (err) {
    console.log('Error:', err.message)
  } finally {
    release()
  }
})

bot.on('callback_query', async (ctx) => {
  const { from, message, data } = ctx.callbackQuery
  const context = pullContext(message.chat.id)
  if (!context) {
    try {
      await ctx.answerCbQuery()
      return
    } catch (err) {
      console.log('Error:', err.message)
      return
    }
  }
  const release = await context.mutex.acquire()
  try {
    if (data === 'propose') {
      const now = localMoment()
      const week = now.isoWeekday() <= 5
        ? now.clone().startOf('week')
        : now.clone().endOf('week')
      const when = week.clone().add(4, 'days').add(12, 'hours') // Next friday
      if (context?.proposal?.when === when.format('YYYY-MM-DD')) {
        await ctx.answerCbQuery(helpers.pickRandomItem(strings.proposeExcessive))
        return
      }
      await sendProposal(context, when)
      await ctx.answerCbQuery(helpers.pickRandomItem(strings.proposeConfirmations))
      console.log(`Manual proposal created for chat ${context.chatId}`)
      return
    }
    if (!context?.proposal) {
      await ctx.answerCbQuery()
      return
    }
    const proposal = context.proposal
    const messageId = message.message_id
    if (proposal.messageId !== messageId) {
      await ctx.answerCbQuery()
      return
    }
    const accepts = new Map(proposal.accepts || [])
    const rejects = new Map(proposal.rejects || [])
    const userId = from.id
    const userTitle = getUserTitle(from)
    let modified = false
    let confirmation
    switch (data) {
      case 'accept':
        if (!accepts.has(userId)) {
          accepts.set(userId, userTitle)
          rejects.delete(userId)
          confirmation = helpers.pickRandomItem(strings.acceptConfirmations)
          modified = true
        }
        break
      case 'reject':
        if (!rejects.has(userId)) {
          rejects.set(userId, userTitle)
          accepts.delete(userId)
          confirmation = helpers.pickRandomItem(strings.rejectConfirmations)
          modified = true
        }
        break
    }
    if (modified) {
      proposal.accepts = Array.from(accepts)
      proposal.rejects = Array.from(rejects)
      pushContext(context)
      const { text, extra } = getProposalMessage(context)
      await bot.telegram.editMessageCaption(context.chatId, messageId, undefined, text, extra)
    }
    await ctx.answerCbQuery(confirmation)
  } catch (err) {
    console.log('Error:', err.message)
  } finally {
    release()
  }
})

// Miscellaneous

const getUserTitle = (user) => {
  if (!user) return strings.userUnknown
  const {
    first_name: firstName,
    last_name: lastName,
    username
  } = user
  const parts = []
  if (firstName) parts.push(firstName)
  if (lastName) parts.push(lastName)
  if (parts.length === 0) {
    if (username) parts.push(`@${username}`)
    else parts.push(strings.userUnknown)
  }
  return parts.join(' ')
}

const getProposalMessage = ({ proposal }) => {
  const accepts = helpers.shuffleItems(proposal.accepts || [], proposal.messageId)
  const rejects = helpers.shuffleItems(proposal.rejects || [], proposal.messageId)
  const getUserList = (items) => {
    return items.map(([id, title]) => `• [${title}](tg://user?id=${id})`)
  }
  const lines = [proposal.question]
  if (accepts.length >= config.quorumSize) {
    lines.push(
      '',
      `${strings.accepts} (${accepts.length}):`,
      ...getUserList(accepts)
    )
    if (rejects.length > 0) {
      lines.push(
        '',
        `${strings.rejects} (${rejects.length}):`,
        ...getUserList(rejects)
      )
    }
  } else {
    lines.push(
      '',
      `${strings.accepts}: ${accepts.length}`,
      `${strings.rejects}: ${rejects.length}`
    )
  }
  return {
    text: lines.join('\n'),
    extra: {
      parse_mode: 'Markdown',
      ...!proposal.closed && Markup.inlineKeyboard([
        Markup.button.callback(strings.accept, 'accept'),
        Markup.button.callback(strings.reject, 'reject')
      ])
    }
  }
}

const sendIntroduction = async ({ chatId }) => {
  await bot.telegram.sendMessage(chatId, strings.introduction, {
    disable_notification: helpers.nowIsNight(),
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      Markup.button.callback(strings.proposeButton, 'propose')
    ])
  })
}

const sendProposal = async (context, when) => {
  try {
    await maybeCloseProposal(context)
    const sequence = context.sequence + 1
    const template = helpers.pickShuffledItem(strings.questions, sequence, context.salt)
    const question = template.replace(/{{(.+)}}/, (match, format) => when.format(format))
    const proposal = {
      when: when.format('YYYY-MM-DD'),
      question,
      accepts: [],
      rejects: []
    }
    const animation = helpers.pickShuffledItem(animations, context.sequence, context.salt)
    const { text, extra } = getProposalMessage({ ...context, sequence, proposal })
    const result = await bot.telegram.sendAnimation(context.chatId, animation, {
      disable_notification: helpers.nowIsNight(),
      caption: text,
      ...extra
    })
    proposal.messageId = result.message_id
    context.proposal = proposal
    context.sequence = sequence
    pushContext(context)
  } catch (err) {
    console.log('Error:', err.message)
  }
}

const maybeCloseProposal = async (context) => {
  try {
    if (!context?.proposal || context.proposal.closed) return
    context.proposal.closed = true
    pushContext(context)
    const chatId = context.chatId
    const messageId = context.proposal.messageId
    await bot.telegram.unpinChatMessage(chatId, messageId)
    const { text, extra } = getProposalMessage(context)
    await bot.telegram.editMessageCaption(chatId, messageId, undefined, text, extra)
  } catch (err) {
    console.log('Error:', err.message)
  }
}

const pinUnpinnedProposals = async () => {
  if (helpers.nowIsNight()) return
  const contexts = findContexts((context) => {
    return context?.proposal && !context.proposal.pinned
  })
  for (const context of contexts) {
    const release = await context.mutex.acquire()
    try {
      context.proposal.pinned = true
      pushContext(context)
      await bot.telegram.pinChatMessage(context.chatId, context.proposal.messageId)
    } catch (err) {
      console.log('Error:', err.message)
    } finally {
      release()
    }
  }
}

const closeObsoleteProposals = async () => {
  const now = localMoment()
  const contexts = findContexts((context) => {
    if (!context?.proposal) return false
    return now > localMoment(context.proposal.when).add(22, 'h')
  })
  for (const context of contexts) {
    const release = await context.mutex.acquire()
    try {
      await maybeCloseProposal(context)
    } finally {
      release()
    }
  }
}

const maybeSendProposals = async () => {
  try {
    const now = localMoment()
    const weekday = now.isoWeekday()
    const hour = now.hour()
    if ((weekday > 3) || (hour < 12) || (hour > 18)) return
    const week = now.clone().startOf('week')
    const contexts = findContexts((context) => {
      if (context.proposal && (week.diff(localMoment(context.proposal.when), 'days') <= 7)) {
        return false
      }
      const nonce = helpers.getSha256(context.salt, week.format('YYYY-MM-DD'))
      const day = parseInt(nonce.substring(0, 4), 16) % 3
      const minute = parseInt(nonce.substring(4, 8), 16) % 300
      const schedule = week.clone().add(day, 'days').add(720 + minute, 'minutes')
      return now > schedule
    })
    const when = week.clone().add(4, 'days').add(12, 'hours') // Next friday
    for (const context of contexts) {
      const release = await context.mutex.acquire()
      try {
        await sendProposal(context, when)
        console.log(`Automatic proposal created for chat ${context.chatId}`)
      } finally {
        release()
      }
    }
  } catch (err) {
    console.log('Error:', err.message)
  }
}

// Heartbeat

const execHeartbeat = async (later = false) => {
  try {
    stopHearbeat()
    if (later) return
    await pinUnpinnedProposals()
    await closeObsoleteProposals()
    await maybeSendProposals()
  } catch (err) {
    console.log('Error:', err.message)
  } finally {
    const delay = helpers.randomInt(HEARTBEAT_DELAY_MIN, HEARTBEAT_DELAY_MAX)
    heartbeatTimeout = setTimeout(execHeartbeat, delay)
  }
}

const stopHearbeat = () => {
  clearTimeout(heartbeatTimeout)
  heartbeatTimeout = undefined
}

// Process

const start = async () => {
  try {
    console.log('Starting...')
    loadContexts()
    bot.launch()
    execHeartbeat(true)
  } catch (err) {
    console.log(`Error: ${err.message}`)
    return process.exit(1)
  }
}

const shutdown = async () => {
  try {
    console.log('\nShutting down...')
    stopHearbeat()
    bot.stop()
    process.exit()
  } catch (err) {
    console.log(`Error: ${err.message}`)
    return process.exit(1)
  }
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
