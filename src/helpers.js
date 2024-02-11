const { defaultUtcOffset } = require('../config')
const crypto = require('crypto')
const moment = require('moment')

const localMoment = (...args) => {
  return moment(...args).utcOffset(defaultUtcOffset)
}

const nowIsNight = () => {
  const hour = localMoment().hour()
  return hour > 20 || hour < 9
}

const randomInt = (min, max) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min) + min)
}

const randomHex256 = () => {
  return crypto.randomBytes(32).toString('hex')
}

const getSha256 = (...items) => {
  const hash = crypto.createHash('sha256')
  for (const item of items) {
    hash.update(item)
  }
  return hash.digest('hex')
}

const shuffleItems = (items, salt) => {
  const pairs = items.map((item) => ({ key: getSha256(`${item}`, `${salt}`), item }))
  pairs.sort((left, right) => left.key.localeCompare(right.key))
  return pairs.map(({ item }) => item)
}

const pickShuffledItem = (items, index, salt) => {
  const round = Math.floor(index / items.length)
  return shuffleItems(items, `${round};${salt}`)[index % items.length]
}

const pickRandomItem = (items) => {
  return items[randomInt(0, items.length)]
}

module.exports = {
  localMoment,
  nowIsNight,
  randomInt,
  randomHex256,
  getSha256,
  shuffleItems,
  pickShuffledItem,
  pickRandomItem
}
