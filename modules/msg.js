module.exports = {
  async send(id, msg, moreExtra, then) {
    await bot.telegram.sendMessage(id, msg, { parse_mode: "HTML", ...moreExtra }).then(then)
  },

  editLast(ctx, msg, moreExtra) {
    ctx.deleteMessage()
    ctx.reply(msg, { parse_mode: "HTML", ...moreExtra })
  },

  delLast(ctx) {
    ctx.deleteMessage()
  }
}