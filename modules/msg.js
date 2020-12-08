module.exports = {
  send(id, msg, moreExtra) {
    bot.telegram.sendMessage(id, msg, { parse_mode: "HTML", ...moreExtra })
  },

  editLast(ctx, msg, moreExtra) {
    ctx.deleteMessage()
    ctx.reply(msg, { parse_mode: "HTML", ...moreExtra })
  },

  delLast(ctx) {
    ctx.deleteMessage()
  }
}